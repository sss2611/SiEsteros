// src/features/alert/CriticalBanner.jsx
// Banner de alerta crítica. Aparece cuando llega un reporte de nivel C.
// Pulso lento (~1 Hz) sobre fondo rojo. No es parpadeo rápido.

import { TYPE_INFO } from '../../shared/constants.js';

export default function CriticalBanner({ report: r, places, onDismiss, onView }) {
  const type  = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const place = places.find((p) => p.id === r.placeId);

  return (
    <div className="animate-critical-banner shrink-0 border-b-2 border-red-500 bg-red-700 px-4 py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-bold text-white text-sm">
          🚨 ALERTA CRÍTICA &nbsp;·&nbsp; {type.icon} {type.label}
          {place && <span className="font-normal"> — {place.name}</span>}
          &nbsp;·&nbsp; {r.people ?? '?'} personas
          &nbsp;·&nbsp; Score: <span className="font-mono">{r.score}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onView(r.id)}
            className="min-h-[44px] rounded-md bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Ver caso
          </button>
          <button
            onClick={onDismiss}
            className="min-h-[44px] rounded-md border border-red-400 bg-red-800 px-4 text-sm font-semibold text-white hover:bg-red-900"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
