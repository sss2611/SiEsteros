// src/features/resources/ResourcePanel.jsx
import { RESOURCE_INFO, RESOURCE_STATUS_INFO } from '../../shared/constants.js';

function ResourceChip({ resource: r }) {
  const info   = RESOURCE_INFO[r.type]   ?? { icon: '❔', label: r.type };
  const status = RESOURCE_STATUS_INFO[r.status] ?? { label: r.status, cls: 'text-slate-400 bg-slate-800 border-slate-600' };

  return (
    <div className={`flex min-h-[48px] flex-col justify-center rounded-md border px-2.5 py-1.5 ${status.cls}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <span>{info.icon}</span>
        <span className="truncate">{info.label}</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] font-medium opacity-80">{r.agency}</div>
      <div className="mt-0.5 text-[9px] font-bold tracking-wider uppercase">{status.label}</div>
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
