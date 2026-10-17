// src/shared/constants.js
export const TYPE_INFO = {
  atrapados: { icon: '🆘', label: 'Atrapados' },
  heridos: { icon: '🩹', label: 'Heridos' },
  sin_agua: { icon: '💧', label: 'Sin agua' },
  incendio: { icon: '🔥', label: 'Incendio' },
  estructura: { icon: '🏚️', label: 'Estructura en riesgo' },
  ruta_cortada: { icon: '🚧', label: 'Ruta cortada' },
  ok: { icon: '✅', label: 'Estamos bien' },
};

// Clases completas, para que Tailwind las detecte.
// box = caja neutra (igual para todos los niveles)
// text / bar / ring / edge = los únicos lugares donde aparece el color del nivel
export const LEVEL_STYLE = {
  critica: {
    label: 'CRÍTICA',
    box: 'border-slate-700 bg-slate-900/60',
    text: 'text-red-400',
    bar: 'bg-red-500',
    ring: 'border-red-500',
    edge: 'border-l-red-500',
  },
  alta: {
    label: 'ALTA',
    box: 'border-slate-700 bg-slate-900/60',
    text: 'text-orange-400',
    bar: 'bg-orange-500',
    ring: 'border-orange-500',
    edge: 'border-l-orange-500',
  },
  media: {
    label: 'MEDIA',
    box: 'border-slate-700 bg-slate-900/60',
    text: 'text-yellow-300',
    bar: 'bg-yellow-400',
    ring: 'border-yellow-400',
    edge: 'border-l-yellow-400',
  },
  baja: {
    label: 'BAJA',
    box: 'border-slate-700 bg-slate-900/60',
    text: 'text-slate-300',
    bar: 'bg-slate-400',
    ring: 'border-slate-500',
    edge: 'border-l-slate-500',
  },
};

export const FACTOR_LABEL = {
  riesgoVida: 'Riesgo de vida',
  vulnerabilidad: 'Vulnerabilidad',
  personas: 'Personas afectadas',
  tiempo: 'Tiempo de espera',
  aislamiento: 'Aislamiento',
  contexto: 'Contexto del lugar',
  corroboracion: 'Corroboración',
  historico: 'Antecedentes',
};

export const FIELD_LABEL = {
  people: 'personas',
  vulnerable: 'vulnerables',
  access: 'acceso',
};