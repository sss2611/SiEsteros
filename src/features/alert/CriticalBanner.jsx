// src/features/alert/CriticalBanner.jsx
// Banner de alerta crítica. Desaparece automáticamente a los 6 segundos o con el botón [X].

import { useEffect } from 'react';
import { TYPE_INFO } from '../../shared/constants.js';

export default function CriticalBanner({ report: r, places, onDismiss, onView }) {
  const type  = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const place = places.find((p) => p.id === r.placeId);

  // Auto-cierre a los 6 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="animate-critical-banner shrink-0 border-b-2 border-red-500 bg-red-700 px-4 py-2 shadow-lg z-50">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-bold text-white text-sm flex items-center gap-1.5">
          <span>🚨 ALERTA CRÍTICA</span>
          <span className="opacity-75">·</span>
          <span>{type.icon} {type.label}</span>
          {place && <span className="font-normal opacity-90"> — {place.name}</span>}
          <span className="opacity-75">·</span>
          <span>{r.people ?? '?'} personas</span>
          <span className="opacity-75">·</span>
          <span>Score: <span className="font-mono">{r.score}</span></span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(r.id)}
            className="min-h-[40px] rounded-md bg-white px-3.5 text-xs font-bold text-red-700 hover:bg-red-50 active:scale-95 transition"
          >
            Ver caso
          </button>
          <button
            onClick={onDismiss}
            className="min-h-[40px] px-3 rounded-md border border-red-400 bg-red-800 text-xs font-bold text-white hover:bg-red-900 active:scale-95 transition flex items-center gap-1"
            title="Cerrar alerta (o se cerrará en 6 s)"
          >
            <span>Cerrar</span>
            <span className="font-mono text-sm leading-none ml-1">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
