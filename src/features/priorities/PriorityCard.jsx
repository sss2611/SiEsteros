// src/features/priorities/PriorityCard.jsx
import { useState } from 'react';
import { TYPE_INFO, LEVEL_INFO, WHY_LABELS, getLevel } from '../../shared/constants.js';

const fmt = (v) => (v == null ? '—' : v);
const yesNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '—');

export default function PriorityCard({
  report: r,
  places,
  nowMs,
  isNew,
  selected,
  onSelect,
  onStatus,
  onAssign,
  onPreAssign,
}) {
  const [expanded, setExpanded] = useState(false);
  const [animPhase, setAnimPhase] = useState(null); // 'flash-assign' | 'slide-out' | 'flash-atendido' | 'flash-descartado'

  const level = getLevel(r.score);
  const info  = LEVEL_INFO[level];
  const type  = TYPE_INFO[r.type] ?? { icon: '❔', label: r.type };
  const place = places.find((p) => p.id === r.placeId);
  const waitMin = Math.max(0, Math.round((nowMs - r.receivedAt) / 60000));

  /* ── 1. Acción: ASIGNAR ────────────────────────────────────────── */
  const handleAssignClick = (e) => {
    e.stopPropagation();
    if (animPhase) return;

    // A) Actualización instantánea del recurso en el panel inferior (al mismo tiempo)
    onPreAssign?.(r.type);

    // B) Flash y borde verde (ring-2 ring-green-500) por 1 segundo
    setAnimPhase('flash-assign');

    // C) Transición de salida suave hacia la derecha
    setTimeout(() => {
      setAnimPhase('slide-out');
    }, 700);

    // D) Finalizar y descontar de activos
    setTimeout(() => {
      if (onAssign) {
        onAssign(r.id, r.type);
      } else {
        onStatus(r.id, 'asignado');
      }
    }, 1000);
  };

  /* ── 2. Acción: ATENDIDO ───────────────────────────────────────── */
  const handleAtendidoClick = (e) => {
    e.stopPropagation();
    if (animPhase) return;

    setAnimPhase('flash-atendido');
    setTimeout(() => {
      setAnimPhase('slide-out');
    }, 350);
    setTimeout(() => {
      onStatus(r.id, 'atendido');
    }, 650);
  };

  /* ── 3. Acción: DESCARTAR ──────────────────────────────────────── */
  const handleDescartarClick = (e) => {
    e.stopPropagation();
    if (animPhase) return;

    setAnimPhase('flash-descartado');
    setTimeout(() => {
      setAnimPhase('slide-out');
    }, 250);
    setTimeout(() => {
      onStatus(r.id, 'descartado');
    }, 550);
  };

  const isAssigning   = animPhase === 'flash-assign';
  const isAtendido    = animPhase === 'flash-atendido';
  const isDescartado  = animPhase === 'flash-descartado';
  const isSlidingOut  = animPhase === 'slide-out';
  const isLocked      = Boolean(animPhase);

  // Clases dinámicas para efectos visuales de video pitch
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
      {/* ── Fila principal: clic selecciona/deselecciona ─────────── */}
      <button
        onClick={() => !isLocked && onSelect(selected ? null : r.id)}
        disabled={isLocked}
        className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-default"
      >
        {/* Puntuación */}
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-mono text-base font-bold ${
            isAssigning
              ? 'border-green-400 text-green-400 bg-green-900/40'
              : `${info.textCls} ${info.borderCls}`
          }`}
        >
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
          <span className={`block text-xs font-bold tracking-widest ${isAssigning ? 'text-green-400' : info.textCls}`}>
            {isAssigning ? 'ASIGNADO' : `${info.letter} · ${info.label}`}
          </span>
          <span className="block font-mono text-xs text-slate-400">
            {waitMin} min
          </span>
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

          {/* Acciones principales */}
          <div className="flex gap-1.5 pt-1">
            {/* 1. Botón ASIGNAR */}
            <button
              onClick={handleAssignClick}
              disabled={isLocked}
              className={`min-h-[44px] flex-1 rounded-md text-xs font-bold transition-all duration-200 ${
                isAssigning
                  ? 'bg-green-600 text-white shadow-[0_0_12px_rgba(34,197,94,0.8)]'
                  : 'bg-sky-700 text-white hover:bg-sky-600 active:scale-95'
              }`}
            >
              {isAssigning ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  ASIGNADO
                </span>
              ) : (
                'ASIGNAR'
              )}
            </button>

            {/* 2. Botón ATENDIDO */}
            <button
              onClick={handleAtendidoClick}
              disabled={isLocked}
              className={`min-h-[44px] flex-1 rounded-md text-xs font-bold transition-all duration-200 ${
                isAtendido
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95'
              }`}
            >
              {isAtendido ? '✓ ATENDIDO' : 'ATENDIDO'}
            </button>

            {/* 3. Botón DESCARTAR */}
            <button
              onClick={handleDescartarClick}
              disabled={isLocked}
              className={`min-h-[44px] flex-1 rounded-md border text-xs font-semibold transition-all duration-200 ${
                isDescartado
                  ? 'border-slate-500 bg-slate-700 text-slate-300'
                  : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
              }`}
            >
              {isDescartado ? '✕ DESCARTADO' : 'DESCARTAR'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
