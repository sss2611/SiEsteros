// src/features/priorities/PriorityPanel.jsx
import { useMemo, useState } from 'react';
import PriorityCard from './PriorityCard.jsx';
import CriteriaPanel from './CriteriaPanel.jsx';
import { getLevel, LEVEL_INFO, TYPE_INFO, RESOURCE_INFO } from '../../shared/constants.js';
import { calculateRiskZones, computeAdjustedScore } from '../../shared/helpers.js';

export default function PriorityPanel({
  reports,
  allReports = [],
  enCursoList = [],
  onCompleteEnCurso,
  places,
  resources,
  newIds,
  nowMs,
  selectedId,
  weights,
  onChangeWeights,
  onResetWeights,
  activeZone,
  onSelectZone,
  onClearZone,
  onSelect,
  onStatus,
  onAssign,
  onPreAssign,
}) {
  const [showCriteria, setShowCriteria] = useState(false);
  const [showZones, setShowZones] = useState(true);

  // Calcular zonas de riesgo de concentración (~500m)
  const riskZones = useMemo(() => {
    return calculateRiskZones(allReports.length ? allReports : reports, places);
  }, [allReports, reports, places]);

  const top3Zones = useMemo(() => riskZones.slice(0, 3), [riskZones]);

  // Recalcular scores según pesos para ordenar y contar
  const scoredReports = useMemo(() => {
    return reports
      .map((r) => ({
        ...r,
        currentScore: weights ? computeAdjustedScore(r, weights) : r.score,
      }))
      .sort((a, b) => b.currentScore - a.currentScore);
  }, [reports, weights]);

  // Filtrar si hay una zona activa seleccionada
  const filteredReports = useMemo(() => {
    if (!activeZone) return scoredReports;
    return scoredReports.filter((r) => activeZone.reportIds.has(r.id));
  }, [scoredReports, activeZone]);

  // Conteos por nivel
  const counts = { critica: 0, alta: 0, media: 0, baja: 0 };
  scoredReports.forEach((r) => {
    counts[getLevel(r.currentScore)] += 1;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-900">
      {/* ── Encabezado del panel: Resumen de Prioridades + Botón Criterios ── */}
      <div className="shrink-0 border-b border-slate-700 px-3 py-2 bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            Prioridades · {reports.length} activos
          </h2>
          <button
            onClick={() => setShowCriteria((v) => !v)}
            className={`min-h-[28px] px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 border ${
              showCriteria
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Ajustar ponderación de factores de riesgo"
          >
            <span>⚖️</span>
            <span>Criterios</span>
          </button>
        </div>

        {/* Resumen por nivel */}
        <div className="grid grid-cols-4 gap-1">
          {['critica', 'alta', 'media', 'baja'].map((l) => (
            <div
              key={l}
              className={`rounded-md border px-1.5 py-1 text-center ${LEVEL_INFO[l].bgCls} ${LEVEL_INFO[l].borderCls}`}
            >
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

      {/* ── Panel Desplegable de Sliders de Criterios (Pesos Ajustables) ── */}
      {showCriteria && weights && (
        <CriteriaPanel
          weights={weights}
          onChangeWeights={onChangeWeights}
          onReset={onResetWeights}
          onClose={() => setShowCriteria(false)}
        />
      )}

      {/* ── Mini-Panel: Top 3 ZONAS DE REFUERZO ───────────────────── */}
      {top3Zones.length > 0 && (
        <div className="shrink-0 border-b border-slate-800 bg-slate-950/70 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1">
              <span>🎯</span>
              <span>Zonas de Refuerzo (Top 3)</span>
            </span>
            <button
              onClick={() => setShowZones((v) => !v)}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              {showZones ? '▲' : '▼'}
            </button>
          </div>

          {showZones && (
            <div className="grid grid-cols-3 gap-1.5">
              {top3Zones.map((z, i) => {
                const isSelected = activeZone?.id === z.id;
                return (
                  <button
                    key={z.id}
                    onClick={() => onSelectZone?.(isSelected ? null : z)}
                    className={`rounded border p-1.5 text-left transition-all text-[10px] ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/80 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : i === 0
                        ? 'border-amber-500/50 bg-slate-900/90 hover:border-amber-400'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold text-slate-200 truncate flex items-center gap-1">
                      <span className="text-amber-400 font-mono text-[9px]">#{i + 1}</span>
                      <span className="truncate">{z.name}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {z.casesCount} casos · {z.totalPeople} pers.
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Banner de filtro activo de zona */}
          {activeZone && (
            <div className="mt-1.5 flex items-center justify-between rounded bg-amber-950/50 border border-amber-600/40 px-2 py-1 text-[10px] text-amber-200">
              <span className="truncate">
                Filtrando: <strong>{activeZone.name}</strong> ({activeZone.casesCount} casos)
              </span>
              <button
                onClick={onClearZone}
                className="font-bold text-amber-400 hover:text-amber-300 ml-2 underline"
              >
                ✕ Ver todas
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Lista de Tarjetas de Prioridad ───────────────────────── */}
      <ul className="flex-1 space-y-1.5 overflow-y-auto px-2 py-2 min-h-0">
        {filteredReports.length === 0 && (
          <li className="pt-6 text-center text-sm text-slate-500">
            {activeZone ? 'Sin reportes en esta zona' : 'Sin reportes en espera'}
          </li>
        )}
        {filteredReports.map((r) => (
          <PriorityCard
            key={r.id}
            report={r}
            allReports={allReports}
            places={places}
            resources={resources}
            nowMs={nowMs}
            isNew={newIds.has(r.id)}
            selected={r.id === selectedId}
            weights={weights}
            onSelect={onSelect}
            onStatus={onStatus}
            onAssign={onAssign}
            onPreAssign={onPreAssign}
          />
        ))}
      </ul>

      {/* ── Sección EN CURSO (Despachos en progreso) ─────────────── */}
      {enCursoList.length > 0 && (
        <div className="shrink-0 border-t-2 border-slate-700 bg-slate-950/95 px-3 py-2 space-y-2 max-h-64 overflow-y-auto shadow-inner">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-widest text-sky-400 uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              En Curso · {enCursoList.length} {enCursoList.length === 1 ? 'despacho' : 'despachos'}
            </h3>
            <span className="text-[10px] font-mono text-slate-400">EN TRÁNSITO</span>
          </div>

          <div className="space-y-1.5">
            {enCursoList.map((item) => {
              const typeInfo = TYPE_INFO[item.report.type] ?? { icon: '🆘', label: item.report.type };
              const resInfo  = RESOURCE_INFO[item.resource.type] ?? { icon: '🚗', label: item.resource.type };
              const pct = Math.min(100, Math.round(item.progress * 100));
              const isArrived = item.arrived || pct >= 100;
              const dynamicEta = Math.max(1, Math.round(item.etaMin * (1 - item.progress)));

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                    isArrived
                      ? 'border-emerald-500 bg-emerald-950/50 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                      : 'border-sky-500/50 bg-slate-900 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                      <span>{typeInfo.icon}</span>
                      <span className="truncate">{typeInfo.label}</span>
                    </span>
                    <span className="truncate text-slate-400 text-[11px]">
                      {item.placeName}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-sky-300 flex items-center gap-1 truncate">
                      <span>{resInfo.icon}</span>
                      <span className="truncate">{item.resource.agency} · {resInfo.label}</span>
                    </span>
                    <span className="font-mono font-bold">
                      {isArrived ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LLEGÓ ✓
                        </span>
                      ) : (
                        <span className="text-sky-300">
                          ETA ~{dynamicEta} min
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        isArrived ? 'bg-emerald-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => onCompleteEnCurso(item.id)}
                      disabled={!isArrived}
                      className={`min-h-[30px] px-3 rounded text-[11px] font-bold transition flex items-center gap-1.5 ${
                        isArrived
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-md cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-50'
                      }`}
                      title={isArrived ? 'Completar y archivar reporte' : 'En tránsito hacia el destino...'}
                    >
                      <span>ATENDIDO</span>
                      <span>✓</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
