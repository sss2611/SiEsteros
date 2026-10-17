// src/features/urgency/score.js
// Índice de Urgencia (0-100). Función pura: sin efectos secundarios.

export const DEFAULT_WEIGHTS = {
  riesgoVida: 30,
  vulnerabilidad: 15,
  personas: 15,
  tiempo: 10,
  aislamiento: 10,
  contexto: 10,
  corroboracion: 5,
  historico: 5,
};

const RIESGO_VIDA = {
  atrapados: 1.0,
  heridos: 0.9,
  incendio: 0.85,
  estructura: 0.7,
  sin_agua: 0.55,
  ruta_cortada: 0.3,
  ok: 0.05,
};

const DEFAULT_PEOPLE = 5;
const TOPE_OK = 24; // un "estamos bien" nunca pasa de nivel baja
const CAMPOS_CLAVE = ['people', 'vulnerable', 'access'];
const CONFIANZA = { alta: 1.0, media: 0.85, baja: 0.7 };

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export function getLevel(score) {
  if (score >= 75) return 'critica';
  if (score >= 50) return 'alta';
  if (score >= 25) return 'media';
  return 'baja';
}

// ctx = { place, now, samePlaceCount }
export function computeFactors(report, ctx = {}) {
  const { place = null, now = Date.now(), samePlaceCount = 1 } = ctx;

  const minutos = report.receivedAt
  ? (now - report.receivedAt) / 60000
  : report.receivedMinutesAgo ?? 0;

  const vulnPlace = place ? clamp01(place.vulnerables / 100) : 0;
  const vulnerabilidad = clamp01(
    (report.vulnerable ? 0.7 : 0) + vulnPlace * 0.3
  );

  const contexto = place
    ? clamp01((place.inundable ? 0.6 : 0) + (place.servicioCritico ? 0.4 : 0))
    : 0;

  return {
    riesgoVida: RIESGO_VIDA[report.type] ?? 0,
    vulnerabilidad,
    personas: clamp01((report.people ?? DEFAULT_PEOPLE) / 20),
    tiempo: clamp01(minutos / 60),
    aislamiento: report.access === false || report.access == null ? 1 : 0,
    contexto,
    corroboracion: clamp01((samePlaceCount - 1) / 4),
    historico: place ? clamp01(place.vecesAfectado / 5) : 0,
  };
}

export function computeScore(report, ctx = {}, weights = DEFAULT_WEIGHTS) {
  const factors = computeFactors(report, ctx);
  const confianza = CONFIANZA[report.confidence] ?? CONFIANZA.media;

  const parts = Object.keys(weights).map((key) => ({
    key,
    value: factors[key],
    weight: weights[key],
    contribution: factors[key] * weights[key] * confianza,
  }));

  const rawScore = Math.round(
    parts.reduce((sum, p) => sum + p.contribution, 0)
  );
  const score = report.type === 'ok' ? Math.min(rawScore, TOPE_OK) : rawScore;

  const missing = CAMPOS_CLAVE.filter((k) => report[k] == null);

  return {
    score,
    level: getLevel(score),
    why: [...parts].sort((a, b) => b.contribution - a.contribution),
    missing,
    incomplete: missing.length > 0,
  };
}