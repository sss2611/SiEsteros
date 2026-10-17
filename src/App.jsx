// src/App.jsx
// Componente raíz. Gestiona estado, simulador, rutas tácticas y despacho en curso.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PLACES, RESOURCES, SEED_REPORTS }  from './dataSource/mockData.js';
import { createSimulator }                  from './dataSource/simulator.js';
import { reducer, createInitialState }      from './shared/state/reducer.js';
import { useAudio }                         from './shared/useAudio.js';
import { getLevel, RESOURCE_INFO }          from './shared/constants.js';
import { findBestMatchingResource, calculateRiskZones } from './shared/helpers.js';
import TacticalMap                          from './features/map/TacticalMap.jsx';
import PriorityPanel                        from './features/priorities/PriorityPanel.jsx';
import ResourcePanel                        from './features/resources/ResourcePanel.jsx';
import CriticalBanner                       from './features/alert/CriticalBanner.jsx';

// Estado inicial con deep copy
const makeInit = () =>
  createInitialState({
    reports: JSON.parse(JSON.stringify(SEED_REPORTS)),
    resources: JSON.parse(JSON.stringify(RESOURCES)),
  });

// Simulador: singleton fuera del componente
const simulator = createSimulator();

export default function App() {
  const [state, dispatch]         = useReducer(reducer, null, makeInit);
  const [simRunning, setSimRunning] = useState(false);
  const [directorMode, setDirectorMode] = useState(false);
  const [manualStep, setManualStep]     = useState({ current: 0, total: 9, done: false });
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [selectedId, setSelectedId]       = useState(null);
  const [newIds, setNewIds]               = useState(new Set());
  const [activeTab, setActiveTab]         = useState('map'); // móvil
  const [nowMs, setNowMs]                 = useState(() => Date.now());
  const [lockedRoute, setLockedRoute]     = useState(null);  // Ruta estática pre-despacho
  const [enCursoList, setEnCursoList]     = useState([]);    // Despachos en tránsito animado
  const [toast, setToast]                 = useState(null);  // Toast flotante de despacho
  const [weights, setWeights]             = useState({
    riesgoVida: 100,
    vulnerabilidad: 100,
    personas: 100,
    tiempo: 100,
  }); // Sliders de ponderación on-the-fly (Punto 5)
  const [activeZone, setActiveZone]       = useState(null);  // Zona de concentración seleccionada
  const [focusCoords, setFocusCoords]     = useState(null);  // Centrado de cámara por zona
  const { unlock, beep }                  = useAudio();
  const seenCritical                      = useRef(new Set());
  const audioUnlockedRef                  = useRef(false);
  const toastTimerRef                     = useRef(null);
  const lockedRouteTimerRef               = useRef(null);

  // Asegura desbloqueo de audio en primer gesto
  const ensureAudio = useCallback(() => {
    if (!audioUnlockedRef.current) {
      unlock();
      audioUnlockedRef.current = true;
    }
  }, [unlock]);

  // Reloj de 1 segundo para tiempos de espera
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Animación suave de progreso de vehículos en tránsito (50ms ~ 20fps)
  useEffect(() => {
    if (enCursoList.length === 0) return;

    // Si todos ya llegaron a destino, no ejecutar el intervalo para evitar re-renders innecesarios
    const hasActiveMoving = enCursoList.some((item) => !item.arrived);
    if (!hasActiveMoving) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setEnCursoList((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          if (item.arrived) return item;
          const elapsed = now - item.startTime;
          const rawProgress = Math.min(1, elapsed / item.durationMs);
          const arrived = rawProgress >= 1;
          changed = true;
          return {
            ...item,
            progress: rawProgress,
            arrived,
          };
        });
        return changed ? next : prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [enCursoList]);

  // Suscripción al simulador
  useEffect(() => {
    const unsub = simulator.subscribe((report) => {
      dispatch({ type: 'ADD_REPORT', report });

      // Highlight 2 segundos
      setNewIds((prev) => new Set([...prev, report.id]));
      setTimeout(() => {
        setNewIds((prev) => {
          const n = new Set(prev);
          n.delete(report.id);
          return n;
        });
      }, 2000);

      // Alerta crítica (solo la primera vez que se ve)
      if (getLevel(report.score) === 'critica' && !seenCritical.current.has(report.id)) {
        seenCritical.current.add(report.id);
        setCriticalAlert(report);
        beep();
      }
    });
    return unsub;
  }, [beep]);

  /* ── Handlers de Simulación ──────────────────────────────────── */

  // Iniciar automático
  const handleSimStart = () => {
    ensureAudio();
    dispatch({ type: 'RESET', initial: makeInit() });
    setSelectedId(null);
    setLockedRoute(null);
    setEnCursoList([]);
    setToast(null);
    setCriticalAlert(null);
    seenCritical.current = new Set();
    setNewIds(new Set());
    simulator.stop();
    setSimRunning(true);
    simulator.start();
  };

  // Avanzar manualmente en Modo Director (Blindado contra animaciones en curso)
  const handleManualNext = useCallback(() => {
    ensureAudio();
    if (!simRunning) {
      setSimRunning(true);
      simulator.startManual();
    }
    const info = simulator.next();
    setManualStep({ current: info.current, total: info.total, done: info.done });
  }, [ensureAudio, simRunning]);

  const handleResetWeights = useCallback(() => {
    setWeights({ riesgoVida: 100, vulnerabilidad: 100, personas: 100, tiempo: 100 });
  }, []);

  // Reiniciar datos robusto (limpia animaciones, rutas, en curso y estado profundo)
  const handleReset = () => {
    simulator.stop();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (lockedRouteTimerRef.current) clearTimeout(lockedRouteTimerRef.current);
    setSimRunning(false);
    setManualStep({ current: 0, total: 9, done: false });
    setEnCursoList([]);
    setToast(null);
    setLockedRoute(null);
    setSelectedId(null);
    setActiveZone(null);
    setFocusCoords(null);
    handleResetWeights();
    setCriticalAlert(null);
    seenCritical.current = new Set();
    setNewIds(new Set());
    dispatch({ type: 'RESET', initial: makeInit() });
  };

  // Escuchar tecla Espacio en Modo Director
  useEffect(() => {
    if (!directorMode) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleManualNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [directorMode, handleManualNext]);

  /* ── Asignación Estricta y Despacho en Curso (Bugfix 0 & Secuencia 1) ── */

  // Bloqueo visual de 1s al presionar ASIGNAR
  const handlePreAssign = useCallback((report, suggestedRes) => {
    if (suggestedRes) {
      if (lockedRouteTimerRef.current) clearTimeout(lockedRouteTimerRef.current);
      setLockedRoute({
        report,
        resource: suggestedRes,
        from: [suggestedRes.lat, suggestedRes.lng],
        to: [report.lat, report.lng],
      });
      lockedRouteTimerRef.current = setTimeout(() => setLockedRoute(null), 1000);
    }
  }, []);

  // Asignación estricta usando el ID exacto del recurso sugerido (Resta garantizada de 1)
  const handleAssign = useCallback((report, resourceId, suggestion) => {
    // 1. Verificar recurso disponible exacto
    const targetResource = state.resources.find(
      (r) => r.id === resourceId && r.status === 'disponible',
    );
    if (!targetResource) return;

    const place = PLACES.find((p) => p.id === report.placeId);
    const placeName = place?.name ?? 'Sector de emergencia';
    const etaMin = suggestion?.etaMin ?? 3;
    const durationSec = Math.min(7, Math.max(4, etaMin * 1.2));

    // 2. Despachar recurso en el estado global
    dispatch({
      type: 'DISPATCH_RESOURCE',
      reportId: report.id,
      resourceId: targetResource.id,
      destination: placeName,
    });

    // 3. Crear ítem de animación en curso
    const enCursoItem = {
      id: report.id,
      report,
      resource: targetResource,
      placeName,
      etaMin,
      durationMs: durationSec * 1000,
      startTime: Date.now(),
      progress: 0,
      arrived: false,
    };
    setEnCursoList((prev) => [...prev, enCursoItem]);

    // 4. Aviso flotante (Toast) sobre el mapa por 4 segundos
    const resLabel = RESOURCE_INFO[targetResource.type]?.label ?? targetResource.type;
    const toastMsg = `✔ DESPACHADO · ${targetResource.agency} ${resLabel} → ${placeName} · ETA ~${etaMin} min`;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message: toastMsg });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t?.message === toastMsg ? null : t));
    }, 4000);

    if (report.id === selectedId) setSelectedId(null);
  }, [state.resources, selectedId]);

  // Cierre de ciclo: botón ATENDIDO en el ítem EN CURSO
  const handleCompleteEnCurso = useCallback((itemId) => {
    const item = enCursoList.find((x) => x.id === itemId);
    if (!item) return;

    // Quitar de lista en curso
    setEnCursoList((prev) => prev.filter((x) => x.id !== itemId));

    // Resolver en reducer: reporte a 'atendido', recurso liberado a 'disponible' en su base
    dispatch({
      type: 'RESOLVE_DISPATCH',
      reportId: item.report.id,
      resourceId: item.resource.id,
    });
  }, [enCursoList]);

  const handleStatus = useCallback((id, status) => {
    dispatch({ type: 'SET_REPORT_STATUS', id, status });
    if (id === selectedId) setSelectedId(null);
  }, [selectedId]);

  /* ── Datos derivados ─────────────────────────────────────────── */

  const activeEnCursoIds = new Set(enCursoList.map((item) => item.id));

  // Reportes activos en espera (excluye 'ok', cerrados y reportes ya despachados en curso)
  const priorityReports = [...state.reports]
    .filter(
      (r) =>
        r.status === 'nuevo' &&
        r.type !== 'ok' &&
        !activeEnCursoIds.has(r.id),
    )
    .sort((a, b) => b.score - a.score);

  // Reportes a renderizar en el mapa (incluye reportes en tránsito y 'ok')
  const mapReports = [...state.reports]
    .filter((r) => r.status !== 'atendido' && r.status !== 'descartado')
    .sort((a, b) => b.score - a.score);

  // Cálculo de zonas de riesgo espacial (~500m) para concentración de refuerzos
  const allRiskZones = useMemo(() => calculateRiskZones(state.reports, PLACES), [state.reports]);
  const topZone = allRiskZones[0] ?? null;

  // Ruta táctica sugerida estática (con penalidad si cruza ruta cortada)
  const activeReport = lockedRoute?.report ?? priorityReports.find((r) => r.id === selectedId);
  const suggestedInfo = activeReport
    ? findBestMatchingResource(activeReport, state.resources, state.reports)
    : null;
  const activeRoute = lockedRoute ?? (suggestedInfo && activeReport ? {
    report: activeReport,
    resource: suggestedInfo.resource,
    from: [suggestedInfo.resource.lat, suggestedInfo.resource.lng],
    to: [activeReport.lat, activeReport.lng],
    etaMin: suggestedInfo.etaMin,
  } : null);

  /* ── JSX ─────────────────────────────────────────────────────── */

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">

      {/* ── Encabezado ───────────────────────────────────────────── */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2">
        {/* Identidad */}
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-100 sm:text-xl">
            POSTA
          </h1>
          <span className="hidden text-slate-600 sm:inline">·</span>
          <span className="hidden text-sm font-medium text-slate-400 sm:inline">
            Sistema de coordinación post-emergencia
          </span>
        </div>

        {/* Indicadores de estado */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nodos activos (Punto 2) */}
          <span className="flex items-center gap-1.5 rounded border border-emerald-700/60 bg-emerald-950/80 px-2.5 py-1 text-xs font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            NODOS ACTIVOS 6/8
          </span>
          <span className="flex items-center gap-1.5 rounded border border-red-700 bg-red-950 px-2.5 py-1 text-xs font-bold text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            SIN CONEXIÓN
          </span>
          <span className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wide">
            DEMOSTRACIÓN · DATOS SIMULADOS
          </span>
        </div>

        {/* Botones de control y Modo Director */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Modo Director */}
          <button
            onClick={() => {
              setDirectorMode((prev) => !prev);
              if (simRunning) handleReset();
            }}
            className={`min-h-[44px] rounded-md px-3 text-xs font-bold transition flex items-center gap-1.5 ${
              directorMode
                ? 'border border-amber-500 bg-amber-950/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Modo Director: controla manualmente cada reporte con la barra espaciadora"
          >
            <span>🎬</span>
            <span>Modo Director: {directorMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Control de avance */}
          {directorMode ? (
            <button
              onClick={handleManualNext}
              disabled={manualStep.done}
              className={`min-h-[44px] rounded-md px-3.5 text-xs font-bold transition flex items-center gap-2 ${
                manualStep.done
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-500 active:scale-95 shadow-md'
              }`}
            >
              <span>{manualStep.done ? '✓ Demo Completa' : '⏭ Siguiente (Espacio)'}</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">
                {manualStep.current}/{manualStep.total}
              </span>
            </button>
          ) : (
            <button
              onClick={simRunning ? undefined : handleSimStart}
              disabled={simRunning}
              className={`min-h-[44px] rounded-md px-4 text-sm font-bold transition ${
                simRunning
                  ? 'cursor-not-allowed border border-slate-600 bg-slate-800 text-slate-500'
                  : 'bg-sky-600 text-white hover:bg-sky-500 active:scale-95'
              }`}
            >
              {simRunning ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                  Simulando…
                </span>
              ) : (
                'Simular desastre'
              )}
            </button>
          )}

          <button
            onClick={handleReset}
            className="min-h-[44px] rounded-md border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-700 active:scale-95 transition"
          >
            Reiniciar datos
          </button>
        </div>

        {/* Pestañas solo en móvil */}
        <div className="flex w-full gap-1 lg:hidden">
          {['map', 'priorities', 'resources'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded py-1.5 text-xs font-semibold ${
                activeTab === tab
                  ? 'bg-sky-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {{ map: 'Mapa', priorities: 'Prioridades', resources: 'Recursos' }[tab]}
            </button>
          ))}
        </div>
      </header>

      {/* ── Banner de alerta crítica ──────────────────────────────── */}
      {criticalAlert && (
        <CriticalBanner
          report={criticalAlert}
          places={PLACES}
          onDismiss={() => setCriticalAlert(null)}
          onView={(id) => { setSelectedId(id); setCriticalAlert(null); setActiveTab('map'); }}
        />
      )}

      {/* ── Contenido principal ──────────────────────────────────── */}
      <main className="relative flex flex-1 overflow-hidden">

        {/* Aviso Flotante (Toast de Despacho apilado sobre el mapa) */}
        {toast && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-[500] animate-slide-in">
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/60 bg-[#090d16]/95 px-4 py-2 text-xs font-bold text-emerald-400 shadow-[0_4px_20px_rgba(0,0,0,0.85)] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Mapa Táctico 2D */}
        <section
          className={`relative flex-1 overflow-hidden ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}
        >
          <TacticalMap
            reports={mapReports}
            places={PLACES}
            selectedId={selectedId}
            onSelect={setSelectedId}
            suggestedRoute={activeRoute}
            enCursoList={enCursoList}
            topZone={topZone}
            focusCoords={focusCoords}
          />
        </section>

        {/* Panel de Prioridades + Sección EN CURSO */}
        <aside
          className={`flex flex-col border-l border-slate-700 bg-slate-900 ${
            activeTab !== 'priorities' ? 'hidden lg:flex' : 'flex flex-1'
          } w-full lg:w-80 xl:w-96`}
        >
          <PriorityPanel
            reports={priorityReports}
            allReports={state.reports}
            enCursoList={enCursoList}
            onCompleteEnCurso={handleCompleteEnCurso}
            places={PLACES}
            resources={state.resources}
            newIds={newIds}
            nowMs={nowMs}
            selectedId={selectedId}
            weights={weights}
            onChangeWeights={setWeights}
            onResetWeights={handleResetWeights}
            activeZone={activeZone}
            onSelectZone={(z) => {
              setActiveZone(z);
              if (z) setFocusCoords(z.center);
            }}
            onClearZone={() => {
              setActiveZone(null);
              setFocusCoords(null);
            }}
            onSelect={setSelectedId}
            onStatus={handleStatus}
            onAssign={handleAssign}
            onPreAssign={handlePreAssign}
          />
        </aside>

        {/* Recursos (móvil) */}
        {activeTab === 'resources' && (
          <div className="flex flex-1 flex-col overflow-auto p-3 lg:hidden">
            <ResourcePanel resources={state.resources} />
          </div>
        )}
      </main>

      {/* ── Panel de Recursos (desktop: fijo abajo) ──────────────── */}
      <div className="hidden lg:block">
        <ResourcePanel resources={state.resources} />
      </div>
    </div>
  );
}