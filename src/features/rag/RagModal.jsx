// src/features/rag/RagModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { retrieveProtocols } from './retrieve.js';
import { buildAction, RESOURCE_LABEL } from './action.js';
import { TYPE_INFO, LEVEL_STYLE, FACTOR_LABEL } from '../../shared/constants.js';

function Step({ n, title, children }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-300">
        {n}. {title}
      </p>
      {children}
    </section>
  );
}

export default function RagModal({ report: r, onClose }) {
  const [showAll, setShowAll] = useState(false);

  const { query, results } = useMemo(
    () => retrieveProtocols(r, r.place, 3),
    [r]
  );
  const action = buildAction(r, r.place, results);
  const best = results[0]?.score ?? 1;
  const lvl = LEVEL_STYLE[r.level];
  const type = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const factors = showAll ? r.why : r.why.slice(0, 4);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bloquea el scroll de la página mientras la ventana está abierta
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl space-y-3 overflow-y-auto overscroll-contain rounded-t-2xl border border-cyan-400/30 bg-slate-900 p-4 text-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-cyan-300">ASISTENTE DE DECISIÓN · SIMULADO</p>
            <p className="text-lg font-bold">
              {type.icon} {type.label}
            </p>
            <p className="text-sm text-slate-300">{r.place?.name ?? 'Ubicación sin lugar cargado'}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-extrabold ${lvl.text}`}>{r.score}</p>
            <p className={`text-xs font-bold ${lvl.text}`}>{lvl.label}</p>
          </div>
        </div>

        <Step n="1" title="Por qué este puntaje">
          <div className="space-y-2">
            {factors.map((f) => (
              <div key={f.key}>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{FACTOR_LABEL[f.key]}</span>
                  <span>+{f.contribution.toFixed(1)} pts</span>
                </div>
                <div className="h-2 rounded bg-slate-700">
                  <div
                    className={`h-2 rounded ${lvl.bar}`}
                    style={{ width: `${Math.round(f.value * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-1 min-h-12 text-sm text-cyan-300 underline"
          >
            {showAll ? 'ver solo los 4 principales' : 'ver todos'}
          </button>
        </Step>

        <Step n="2" title="Consulta armada desde el caso">
          <p className="rounded bg-slate-800 p-2 font-mono text-xs text-slate-200">{query}</p>
        </Step>

        <Step n="3" title="Protocolos recuperados">
          <ul className="space-y-2">
            {results.map((h) => (
              <li key={h.id} className="rounded-lg bg-slate-800 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{h.protocol.title}</p>
                  <span className="text-xs text-cyan-300">
                    {Math.round((h.score / best) * 100)}% rel.
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{h.protocol.text}</p>
              </li>
            ))}
            {results.length === 0 && (
              <li className="text-sm text-slate-400">Sin protocolos relevantes para este caso.</li>
            )}
          </ul>
        </Step>

        <Step n="4" title="Acción sugerida (la autoridad confirma)">
          <p className="text-sm font-semibold">{action.summary}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
            {action.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {action.resources.length > 0 && (
            <p className="mt-2 text-xs text-slate-300">
              Recursos sugeridos: {action.resources.map((k) => RESOURCE_LABEL[k]).join(' · ')}
            </p>
          )}
        </Step>

        <button
          onClick={onClose}
          className="min-h-12 w-full rounded-lg bg-slate-700 font-semibold hover:bg-slate-600"
        >
          Cerrar
        </button>
      </div>
    </div>,
    document.body
  );
}
