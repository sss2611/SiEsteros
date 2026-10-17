// src/features/priorities/PriorityCard.jsx
import { useState } from 'react';
import { TYPE_INFO, LEVEL_INFO, WHY_LABELS, getLevel } from '../../shared/constants.js';

const fmt = (v) => (v == null ? '—' : v);
const yesNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '—');

export default function PriorityCard({ report: r, places, nowMs, isNew, selected, onSelect, onStatus }) {
  const [expanded, setExpanded] = useState(false);

  const level = getLevel(r.score);
  const info  = LEVEL_INFO[level];
  const type  = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const place = places.find((p) => p.id === r.placeId);
  const waitMin = Math.max(0, Math.round((nowMs - r.receivedAt) / 60000));

  return (
    <li
      className={[
        'rounded-lg border-l-4 border border-slate-700 transition-all duration-300',
        info.borderCls,
        info.bgCls,
        selected ? 'ring-1 ring-slate-300/40' : '',
        isNew ? 'animate-report-new animate-slide-in' : '',
      ].join(' ')}
    >
      {/* ── Fila principal: clic selecciona ────────────────────── */}
      <button
        onClick={() => onSelect(selected ? null : r.id)}
        className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left"
      >
        {/* Puntuación */}
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-mono text-base font-bold ${info.textCls} ${info.borderCls}`}>
          {r.score}
        </span>

        {/* Tipo + lugar */}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-100">
            <span>{type.icon}</span>
            <span className="truncate">{type.label}</span>
          </span>
          <span className="block truncate text-xs text-slate-400">
            {place?.name ?? '— sin lugar registrado'}
          </span>
        </span>

        {/* Nivel + tiempo */}
        <span className="shrink-0 text-right">
          <span className={`block text-xs font-bold tracking-widest ${info.textCls}`}>
            {info.letter} · {info.label}
          </span>
          <span className="block font-mono text-xs text-slate-400">
            {waitMin} min
          </span>
        </span>
      </button>

      {/* ── Detalle expandido (clic en "Por qué") ─────────────── */}
      {selected && (
        <div className="border-t border-slate-700/60 px-3 pb-3 pt-2 space-y-3">
          {/* Datos del reporte */}
          <div className="grid grid-cols-3 gap-x-2 text-xs text-slate-300">
            <span>👥 {fmt(r.people)} pers.</span>
            <span>⚠️ {yesNo(r.vulnerable)}</span>
            <span>🛤 {yesNo(r.access)}</span>
          </div>

          {/* Botón Por qué */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="min-h-[36px] w-full rounded-md bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            {expanded ? '▲ Ocultar' : '▼ Por qué este score'}
          </button>

          {/* Barras de factores */}
          {expanded && (
            <div className="space-y-1.5">
              {Object.entries(WHY_LABELS).map(([key, label]) => {
                const val = r.why?.[key] ?? 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono text-slate-300">{val}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-slate-300 transition-all duration-300"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-1.5">
            <button
              onClick={() => onStatus(r.id, 'asignado')}
              className="min-h-[44px] flex-1 rounded-md bg-sky-700 text-xs font-bold text-white hover:bg-sky-600"
            >
              ASIGNAR
            </button>
            <button
              onClick={() => onStatus(r.id, 'atendido')}
              className="min-h-[44px] flex-1 rounded-md bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-600"
            >
              ATENDIDO
            </button>
            <button
              onClick={() => onStatus(r.id, 'descartado')}
              className="min-h-[44px] flex-1 rounded-md border border-slate-600 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              DESCARTAR
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
