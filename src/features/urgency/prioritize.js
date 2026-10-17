// src/features/urgency/prioritize.js
// Calcula el puntaje de cada reporte y devuelve la lista ordenada.
// Desempate: 1) puntaje, 2) riesgo de vida, 3) más tiempo esperando.

import { computeScore, DEFAULT_WEIGHTS } from './score.js';

export function prioritizeReports(reports, places, weights = DEFAULT_WEIGHTS) {
  const placeById = Object.fromEntries(places.map((p) => [p.id, p]));

  // Cantidad de reportes por lugar (factor corroboración)
  const countByPlace = {};
  for (const r of reports) {
    if (r.placeId) {
      countByPlace[r.placeId] = (countByPlace[r.placeId] ?? 0) + 1;
    }
  }

  return reports
    .map((r) => {
      const place = placeById[r.placeId] ?? null;
      const samePlaceCount = r.placeId ? countByPlace[r.placeId] : 1;
      const res = computeScore(r, { place, samePlaceCount }, weights);
      const riesgoVida = res.why.find((p) => p.key === 'riesgoVida')?.value ?? 0;
      return { ...r, place, ...res, riesgoVida };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.riesgoVida - a.riesgoVida ||
        (b.receivedMinutesAgo ?? 0) - (a.receivedMinutesAgo ?? 0)
    );
}