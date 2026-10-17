// src/features/resources/ResourcePanel.jsx
import { RESOURCE_INFO, RESOURCE_STATUS_INFO } from '../../shared/constants.js';

function ResourceChip({ resource: r }) {
  const info   = RESOURCE_INFO[r.type]   ?? { icon: '❔', label: r.type };
  const status = RESOURCE_STATUS_INFO[r.status] ?? {
    label: r.status,
    icon: '⚪',
    cls: 'text-slate-400 bg-slate-800 border-slate-600',
  };
  const isEnCamino = r.status === 'en_camino';

  return (
    <div
      className={`flex min-h-[50px] flex-col justify-center rounded-md border px-2.5 py-1.5 transition-all ${status.cls} ${
        isEnCamino
          ? 'ring-2 ring-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.5)]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1.5 truncate">
          <span>{info.icon}</span>
          <span className="truncate">{info.label}</span>
        </span>
        <span className="text-[10px]">{status.icon}</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] font-medium opacity-80">{r.agency}</div>
      <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] font-bold tracking-wider uppercase">
        <span className="shrink-0">{status.label}</span>
      </div>
      {r.destination && (
        <div className="truncate text-[8.5px] text-sky-300 font-semibold" title={r.destination}>
          → {r.destination}
        </div>
      )}
    </div>
  );
}

export default function ResourcePanel({ resources }) {
  return (
    <div className="shrink-0 border-t border-slate-700 bg-slate-900 px-3 py-2">
      <h2 className="mb-1.5 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
        Recursos · {resources.length} unidades
      </h2>
      <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-8">
        {resources.map((r) => (
          <ResourceChip key={r.id} resource={r} />
        ))}
      </div>
    </div>
  );
}
