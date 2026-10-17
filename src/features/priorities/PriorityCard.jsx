// src/features/priorities/PriorityCard.jsx
import { useEffect, useRef, useState } from 'react';
import { TYPE_INFO, LEVEL_INFO, WHY_LABELS, RESOURCE_INFO, getLevel } from '../../shared/constants.js';
import { findBestMatchingResource, computeAdjustedScore } from '../../shared/helpers.js';

const fmt = (v) => (v == null ? '—' : v);
const yesNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '—');

export default function PriorityCard({
  report: r,
  allReports = [],
  places,
  resources,
  nowMs,
  isNew,
  selected,
  weights,
  onSelect,
  onStatus,
  onAssign,
  onPreAssign,
}) {
  const [expanded, setExpanded] = useState(false);
  const [animPhase, setAnimPhase] = useState(null); // 'flash-assign' | 'slide-out' | 'flash-atendido' | 'flash-descartado'

  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Score recalculado según sliders de ponderación
  const score = weights ? computeAdjustedScore(r, weights) : r.score;
  const level = getLevel(score);
  const info  = LEVEL_INFO[level];
  const type  = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const place = places.find((p) => p.id === r.placeId);
  const waitMin = Math.max(0, Math.round((nowMs - r.receivedAt) / 60000));

  // Datos incompletos (null)
  const hasIncompleteData = r.people == null || r.vulnerable == null || r.access == null;

  // Recurso sugerido más cercano y afín con detección de penalidad por ruta cortada
  const suggestion = selected && resources ? findBestMatchingResource(r, resources, allReports) : null;

  /* ── 1. Acción: ASIGNAR ────────────────────────────────────────── */
  const handleAssignClick = (e) => {
    e.stopPropagation();
    if (animPhase || !suggestion?.resource) return;

    const assignedRes = suggestion.resource;

    onPreAssign?.(r, assignedRes);
    setAnimPhase('flash-assign');

    const t1 = setTimeout(() => {
      setAnimPhase('slide-out');
    }, 350);
    timersRef.current.push(t1);

    const t2 = setTimeout(() => {
      if (onAssign) {
        onAssign(r, assignedRes.id, suggestion);
      } else {
        onStatus(r.id, 'asignado');
      }
    }, 650);
    timersRef.current.push(t2);
  };

  /* ── 2. Acción: ATENDIDO ───────────────────────────────────────── */
  const handleAtendidoClick = (e) => {
    e.stopPropagation();
    if (animPhase) return;

    setAnimPhase('flash-atendido');
    const t1 = setTimeout(() => setAnimPhase('slide-out'), 350);
    const t2 = setTimeout(() => onStatus(r.id, 'atendido'), 650);
    timersRef.current.push(t1, t2);
  };

  /* ── 3. Acción: DESCARTAR ──────────────────────────────────────── */
  const handleDescartarClick = (e) => {
    e.stopPropagation();
    if (animPhase) return;

    setAnimPhase('flash-descartado');
    const t1 = setTimeout(() => setAnimPhase('slide-out'), 250);
    const t2 = setTimeout(() => onStatus(r.id, 'descartado'), 550);
    timersRef.current.push(t1, t2);
  };

  const isAssigning   = animPhase === 'flash-assign';
  const isAtendido    = animPhase === 'flash-atendido';
  const isDescartado  = animPhase === 'flash-descartado';
  const isSlidingOut  = animPhase === 'slide-out';
  const isLocked      = Boolean(animPhase);

  let dynamicClasses = '';
  if (isAssigning) {
    dynamicClasses = 'ring-2 ring-green-500 border-green-500 bg-green-950/80 shadow-[0_0_24px_rgba(34,197,94,0.6)]';
  } else if (isAtendido) {
    dynamicClasses = 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-950/80 shadow-[0_0_18px_rgba(52,211,153,0.5)]';
  } else if (isDescartado) {
    dynamicClasses = 'ring-2 ring-slate-500 border-slate-600 bg-slate-900/90 opacity-50';
  }

  const slideClasses = isSlidingOut
    ? 'translate-x-full opacity-0 pointer-events-none scale-95 duration-500'
    : 'translate-x-0 opacity-100 duration-300';

  // Ícono y color de confianza de señal LoRa
  const conf = r.confidence ?? 'media';
  const confInfo = {
    alta:  { icon: '📶', label: 'Alta',  cls: 'text-emerald-400' },
    media: { icon: '📶', label: 'Media', cls: 'text-amber-400'   },
    baja:  { icon: '📶', label: 'Baja',  cls: 'text-red-400'     },
  }[conf] || { icon: '📶', label: conf, cls: 'text-slate-400' };

  return (
    <li
      className={[
        'rounded-lg border-l-4 border transition-all ease-in-out',
        slideClasses,
        dynamicClasses || [info.borderCls, info.bgCls].join(' '),
        selected && !animPhase ? 'ring-1 ring-slate-300/40' : '',
        isNew && !animPhase ? 'animate-report-new animate-slide-in' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* ── Fila principal ───────────────────────────────────────── */}
      <button
        onClick={() => !isLocked && onSelect(selected ? null : r.id)}
        disabled={isLocked}
        className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-default"
      >
        {/* Puntuación */}
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-mono text-base font-bold ${
            isAssigning
              ? 'border-green-400 text-green-400 bg-green-900/40'
              : `${info.textCls} ${info.borderCls}`
          }`}
        >
          {score}
        </span>

        {/* Tipo + lugar + origen LoRa */}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-100">
            <span>{type.icon}</span>
            <span className="truncate">{type.label}</span>
          </span>
          <span className="block truncate text-xs text-slate-300">
            {place?.name ?? '— sin lugar registrado'}
          </span>
          {/* Metadata de Origen: vía Nodo y Confianza */}
          <span className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            <span>vía Nodo {r.nodeId ?? '01'}</span>
            <span className="text-slate-600">·</span>
            <span className={`flex items-center gap-0.5 font-medium ${confInfo.cls}`}>
              <span>{confInfo.icon}</span>
              <span>{confInfo.label}</span>
            </span>
          </span>
        </span>

        {/* Nivel + tiempo + chip incompleto */}
        <span className="shrink-0 text-right flex flex-col items-end gap-1">
          <span className={`block text-xs font-bold tracking-widest ${isAssigning ? 'text-green-400' : info.textCls}`}>
            {isAssigning ? 'ASIGNADO' : `${info.letter} · ${info.label}`}
          </span>
          <span className="block font-mono text-xs text-slate-400">
            {waitMin} min
          </span>
          {hasIncompleteData && (
            <span className="bg-red-900/50 text-red-200 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-700/60 leading-none">
              DATO INCOMPLETO
            </span>
          )}
        </span>
      </button>

      {/* ── Detalle expandido ───────────────────────────────────── */}
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
            disabled={isLocked}
            onClick={() => setExpanded((v) => !v)}
            className="min-h-[36px] w-full rounded-md bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            {expanded ? '▲ Ocultar' : '▼ Por qué este score'}
          </button>

          {/* Barras de factores adaptadas a los sliders */}
          {expanded && (
            <div className="space-y-1.5">
              {Object.entries(WHY_LABELS).map(([key, label]) => {
                const baseVal = r.why?.[key] ?? 0;
                const factorWeight = ((weights?.[key] ?? 100) / 100);
                const displayVal = Math.round(baseVal * factorWeight);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono text-slate-300">
                        {displayVal}
                        {factorWeight !== 1 && (
                          <span className="text-sky-400 text-[9px] ml-1">
                            ({Math.round(factorWeight * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-slate-300 transition-all duration-300"
                        style={{ width: `${Math.min(100, displayVal)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sugerencia táctica y ETA */}
          <div className="rounded border border-sky-500/30 bg-sky-950/40 px-2.5 py-1.5 text-xs">
            {suggestion ? (
              <div>
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="font-semibold text-sky-200">
                    <span className="font-bold text-sky-400">SUGERIDO: </span>
                    {suggestion.resource.agency} · {RESOURCE_INFO[suggestion.resource.type]?.label ?? suggestion.resource.type}
                  </span>
                  <span className="font-mono text-sky-300 font-bold">
                    Llega en ~{suggestion.etaMin} min
                  </span>
                </div>
                {/* Penalidad por ruta cortada activa en la trayectoria */}
                {suggestion.adjustedByCutRoute && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                    <span>⚠️</span>
                    <span>ETA ajustado por ruta cortada (+40%)</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="font-semibold text-slate-400">
                SIN RECURSOS DISPONIBLES
              </span>
            )}
          </div>

          {/* Acciones principales */}
          <div className="flex gap-1.5 pt-0.5">
            <button
              onClick={handleAssignClick}
              disabled={isLocked || !suggestion}
              className={`min-h-[44px] flex-1 rounded-md text-xs font-bold transition-all duration-200 ${
                isAssigning
                  ? 'bg-green-600 text-white shadow-[0_0_12px_rgba(34,197,94,0.8)]'
                  : !suggestion
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-sky-700 text-white hover:bg-sky-600 active:scale-95'
              }`}
            >
              {isAssigning ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  DESPACHANDO...
                </span>
              ) : (
                'ASIGNAR'
              )}
            </button>

            <button
              onClick={handleAtendidoClick}
              disabled={isLocked}
              className="min-h-[44px] flex-1 rounded-md text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95 transition-all duration-200"
            >
              {isAtendido ? '✓ ATENDIDO' : 'ATENDIDO'}
            </button>

            <button
              onClick={handleDescartarClick}
              disabled={isLocked}
              className="min-h-[44px] flex-1 rounded-md border border-slate-600 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 active:scale-95 transition-all duration-200"
            >
              {isDescartado ? '✕ DESCARTADO' : 'DESCARTAR'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
