// src/features/priorities/PriorityPanel.jsx
import PriorityCard from './PriorityCard.jsx';
import { getLevel, LEVEL_INFO } from '../../shared/constants.js';

export default function PriorityPanel({ reports, places, newIds, nowMs, selectedId, onSelect, onStatus }) {
  // Conteos por nivel para el resumen
  const counts = { critica: 0, alta: 0, media: 0, baja: 0 };
  reports.forEach((r) => { counts[getLevel(r.score)] += 1; });

  return (
    <div className="flex h-full flex-col">
      {/* Encabezado del panel */}
      <div className="shrink-0 border-b border-slate-700 px-3 py-2">
        <h2 className="mb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          Prioridades · {reports.length} activos
        </h2>
        {/* Resumen por nivel */}
        <div className="grid grid-cols-4 gap-1">
          {['critica', 'alta', 'media', 'baja'].map((l) => (
            <div key={l} className={`rounded-md border px-1.5 py-1 text-center ${LEVEL_INFO[l].bgCls} ${LEVEL_INFO[l].borderCls}`}>
              <p className={`font-mono text-lg font-bold leading-none ${LEVEL_INFO[l].textCls}`}>
                {counts[l]}
              </p>
              <p className="mt-0.5 text-[9px] font-bold tracking-wider text-slate-400">
                {LEVEL_INFO[l].letter} · {LEVEL_INFO[l].label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de tarjetas */}
      <ul className="flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {reports.length === 0 && (
          <li className="pt-8 text-center text-sm text-slate-500">
            Sin reportes activos
          </li>
        )}
        {reports.map((r) => (
          <PriorityCard
            key={r.id}
            report={r}
            places={places}
            nowMs={nowMs}
            isNew={newIds.has(r.id)}
            selected={r.id === selectedId}
            onSelect={onSelect}
            onStatus={onStatus}
          />
        ))}
      </ul>
    </div>
  );
}
