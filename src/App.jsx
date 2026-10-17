// src/App.jsx
// Componente raíz. Gestiona estado, simulador y layout sin scroll a 1366×768.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { PLACES, RESOURCES, SEED_REPORTS }  from './dataSource/mockData.js';
import { createSimulator }                  from './dataSource/simulator.js';
import { reducer, createInitialState, CLOSED_STATUSES } from './shared/state/reducer.js';
import { useAudio }                         from './shared/useAudio.js';
import { getLevel }                         from './shared/constants.js';
import CityMap                              from './features/map/CityMap.jsx';
import PriorityPanel                        from './features/priorities/PriorityPanel.jsx';
import ResourcePanel                        from './features/resources/ResourcePanel.jsx';
import CriticalBanner                       from './features/alert/CriticalBanner.jsx';

// Estado inicial
const makeInit = () => createInitialState({ reports: SEED_REPORTS, resources: RESOURCES });

// Simulador: singleton fuera del componente para no recrearlo en cada render
const simulator = createSimulator();

export default function App() {
  const [state, dispatch]         = useReducer(reducer, null, makeInit);
  const [simRunning, setSimRunning] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [selectedId, setSelectedId]       = useState(null);
  const [newIds, setNewIds]               = useState(new Set());
  const [activeTab, setActiveTab]         = useState('map'); // solo para móvil
  const [tick, setTick]                   = useState(0);     // fuerza re-render cada 1 s
  const { unlock, beep }                  = useAudio();
  const seenCritical                      = useRef(new Set());

  // Reloj de 1 segundo para actualizar tiempos de espera
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Suscribirse al simulador
  useEffect(() => {
    const unsub = simulator.subscribe((report) => {
      dispatch({ type: 'ADD_REPORT', report });

      // Highlight 2 segundos
      setNewIds((prev) => new Set([...prev, report.id]));
      setTimeout(() => {
        setNewIds((prev) => { const n = new Set(prev); n.delete(report.id); return n; });
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

  /* ── Handlers ───────────────────────────────────────────────── */

  const handleSimStart = () => {
    unlock();                             // habilitar AudioContext antes de los beeps
    dispatch({ type: 'RESET', initial: makeInit() });
    setSelectedId(null);
    setCriticalAlert(null);
    seenCritical.current = new Set();
    setNewIds(new Set());
    simulator.stop();
    setSimRunning(true);
    simulator.start();
  };

  const handleReset = () => {
    simulator.stop();
    setSimRunning(false);
    dispatch({ type: 'RESET', initial: makeInit() });
    setSelectedId(null);
    setCriticalAlert(null);
    seenCritical.current = new Set();
    setNewIds(new Set());
  };

  const handleStatus = useCallback((id, status) => {
    dispatch({ type: 'SET_REPORT_STATUS', id, status });
    if (id === selectedId) setSelectedId(null);
  }, [selectedId]);

  /* ── Datos derivados ─────────────────────────────────────────── */

  const nowMs = Date.now(); // fresco en cada render (el tick fuerza re-render)

  // Reportes abiertos, ordenados por score descendente
  const openReports = [...state.reports]
    .filter((r) => !CLOSED_STATUSES.includes(r.status))
    .sort((a, b) => b.score - a.score);

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
          {/* SIN CONEXIÓN permanente (es una app offline) */}
          <span className="flex items-center gap-1.5 rounded border border-red-700 bg-red-950 px-2.5 py-1 text-xs font-bold text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            SIN CONEXIÓN
          </span>
          {/* Cartel de demostración */}
          <span className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wide">
            DEMOSTRACIÓN · DATOS SIMULADOS
          </span>
        </div>

        {/* Botones de control */}
        <div className="flex gap-2">
          <button
            onClick={simRunning ? undefined : handleSimStart}
            disabled={simRunning}
            className={`min-h-[44px] rounded-md px-4 text-sm font-bold transition ${
              simRunning
                ? 'cursor-not-allowed border border-slate-600 bg-slate-800 text-slate-500'
                : 'bg-sky-600 text-white hover:bg-sky-500'
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
          <button
            onClick={handleReset}
            className="min-h-[44px] rounded-md border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-700"
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
      <main className="flex flex-1 overflow-hidden">

        {/* Mapa (desktop: siempre visible; móvil: pestaña) */}
        <section
          className={`relative flex-1 overflow-hidden ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}
        >
          <CityMap
            reports={openReports}
            places={PLACES}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        {/* Panel de prioridades (desktop: barra derecha; móvil: pestaña) */}
        <aside
          className={`flex flex-col border-l border-slate-700 bg-slate-900 ${
            activeTab !== 'priorities' ? 'hidden lg:flex' : 'flex flex-1'
          } w-full lg:w-80 xl:w-96`}
        >
          <PriorityPanel
            reports={openReports}
            places={PLACES}
            newIds={newIds}
            nowMs={nowMs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onStatus={handleStatus}
          />
        </aside>

        {/* Recursos (móvil: pestaña de pantalla completa) */}
        {activeTab === 'resources' && (
          <div className="flex flex-1 flex-col overflow-auto p-3 lg:hidden">
            <ResourcePanel resources={state.resources} />
          </div>
        )}
      </main>

      {/* ── Panel de recursos (desktop: fijo abajo) ──────────────── */}
      <div className="hidden lg:block">
        <ResourcePanel resources={state.resources} />
      </div>
    </div>
  );
}