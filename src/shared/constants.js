// src/shared/constants.js

export const TYPE_INFO = {
  atrapados:    { icon: '🆘', label: 'Atrapados'          },
  heridos:      { icon: '🩹', label: 'Heridos'            },
  sin_agua:     { icon: '💧', label: 'Sin agua'           },
  incendio:     { icon: '🔥', label: 'Incendio'           },
  estructura:   { icon: '🏚', label: 'Estructura en riesgo' },
  ruta_cortada: { icon: '🚧', label: 'Ruta cortada'       },
  ok:           { icon: '✅', label: 'Estamos bien'        },
};

// Nivel según score: >=80 C · 60-79 A · 40-59 M · <40 B
export function getLevel(score) {
  if (score >= 80) return 'critica';
  if (score >= 60) return 'alta';
  if (score >= 40) return 'media';
  return 'baja';
}

export const LEVEL_INFO = {
  critica: { label: 'CRÍTICA', letter: 'C', pinFill: '#dc2626', textCls: 'text-red-400',    borderCls: 'border-red-500',    bgCls: 'bg-red-950/60'    },
  alta:    { label: 'ALTA',    letter: 'A', pinFill: '#ea580c', textCls: 'text-orange-400', borderCls: 'border-orange-500', bgCls: 'bg-orange-950/60' },
  media:   { label: 'MEDIA',   letter: 'M', pinFill: '#ca8a04', textCls: 'text-yellow-400', borderCls: 'border-yellow-500', bgCls: 'bg-yellow-950/40' },
  baja:    { label: 'BAJA',    letter: 'B', pinFill: '#475569', textCls: 'text-slate-400',  borderCls: 'border-slate-600',  bgCls: 'bg-slate-900/60'  },
};

export const RESOURCE_INFO = {
  ambulancia:    { icon: '🚑', label: 'Ambulancia'    },
  bomberos:      { icon: '🚒', label: 'Bomberos'      },
  defensa_civil: { icon: '🛡️', label: 'Defensa Civil' },
  policia:       { icon: '🚔', label: 'Policía'       },
};

export const RESOURCE_STATUS_INFO = {
  disponible: { label: 'Disponible', cls: 'text-emerald-400 bg-emerald-950/60 border-emerald-700' },
  asignado:   { label: 'Asignado',   cls: 'text-yellow-400  bg-yellow-950/60  border-yellow-700'  },
  en_camino:  { label: 'En camino',  cls: 'text-sky-400     bg-sky-950/60     border-sky-700'     },
};

export const WHY_LABELS = {
  riesgoVida:    'Riesgo de vida',
  vulnerabilidad: 'Vulnerabilidad',
  personas:      'Personas',
  tiempo:        'Tiempo esp.',
};

export const KIND_ICON = {
  hospital:   '🏥',
  escuela:    '🏫',
  geriatrico: '🏡',
  refugio:    '⛺',
};