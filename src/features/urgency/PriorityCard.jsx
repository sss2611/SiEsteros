// src/features/urgency/PriorityCard.jsx
import { useState } from 'react';
import { TYPE_INFO, LEVEL_STYLE, FIELD_LABEL } from '../../shared/constants.js';
import RagModal from '../rag/RagModal.jsx';

const yesNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '?');

export default function PriorityCard({ report: r, now, selected, onSelect, onStatus }) {
  const [rag, setRag] = useState(false);

  const type = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const lvl = LEVEL_STYLE[r.level];
  const waitMin = Math.max(0, Math.round((now - r.receivedAt) / 60000));
  const waitPct = Math.min(100, (waitMin / 60) * 100);

  return (
    <li
      className={`rounded-xl border border-l-4 transition ${lvl.box} ${lvl.edge} ${
        selected ? 'ring-1 ring-slate-300/60' : ''
      }`}
    >
      <button
        onClick={() => onSelect(selected ? null : r.id)}
        className="flex min-h-12 w-full items-center gap-3 p-2 text-left"
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-mono text-lg font-bold ${lvl.ring} ${lvl.text}`}
        >
          {r.score}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {type.icon} {type.label}
            {r.incomplete && (
              <span className="ml-1 text-slate-300" title="Datos incompletos">⚠</span>
            )}
          </span>
          <span className="block truncate text-xs text-slate-400">
            {r.place?.name ?? 'Ubicación sin lugar cargado'}
          </span>
          <span className="mt-1 block h-1 rounded bg-slate-800">
            <span className="block h-1 rounded bg-slate-400" style={{ width: `${waitPct}%` }} />
          </span>
        </span>
        <span className="shrink-0 text-right font-mono text-xs text-slate-400">
          <span className="block font-bold tracking-wide text-slate-300">{lvl.label}</span>
          {waitMin} min
        </span>
      </button>

      {selected && (
        <div className="space-y-2 border-t border-slate-700 p-2">
          <p className="font-mono text-xs text-slate-300">
            👥 {r.people ?? '?'} personas · Vulnerables: {yesNo(r.vulnerable)} · Acceso: {yesNo(r.access)}
          </p>
          {r.incomplete && (
            <p className="inline-block rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
              ⚠ Faltan: {r.missing.map((k) => FIELD_LABEL[k]).join(', ')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRag(true)}
              className="min-h-12 flex-1 rounded-lg bg-slate-700 px-3 text-sm font-semibold hover:bg-slate-600"
            >
              Por qué
            </button>
            <button
              onClick={() => onStatus(r.id, 'atendido')}
              className="min-h-12 flex-1 rounded-lg bg-slate-200 px-3 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              Atendido
            </button>
            <button
              onClick={() => onStatus(r.id, 'descartado')}
              className="min-h-12 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {rag && <RagModal report={r} onClose={() => setRag(false)} />}
    </li>
  );
}