import { useEffect, useRef, useState } from 'react';
import { TYPE_INFO, LEVEL_STYLE, FACTOR_LABEL } from './shared/constants.js';
import { useApp } from './shared/state/AppContext.jsx';
import { useNow } from './shared/useNow.js';
import { useOnline } from './shared/useOnline.js';
import { useTheme } from './features/themes/useTheme.js';
import { useDemo } from './features/demo/useDemo.js';
import ThemeSelector from './features/themes/ThemeSelector.jsx';
import { prioritizeReports } from './features/urgency/prioritize.js';
import { CLOSED_STATUSES } from './shared/state/reducer.js';
import PriorityCard from './features/urgency/PriorityCard.jsx';
import places from './data/places.json';
import CityMap from './features/map/CityMap.jsx';

function App() {
  const { state, dispatch, reset } = useApp();
  const now = useNow();
  const online = useOnline();
  const [theme, setTheme] = useTheme();
  const [selectedId, setSelectedId] = useState(null);
  const [streetOpen, setStreetOpen] = useState(false);
  const [alert, setAlert] = useState(null);
  const demo = useDemo(dispatch, places, reset);

  // Solo casos abiertos: así la corroboración tampoco cuenta los cerrados
  const open = state.reports.filter((r) => !CLOSED_STATUSES.includes(r.status));
  const ranked = prioritizeReports(open, places, state.weights);
  const selected = ranked.find((r) => r.id === selectedId);

  // Alerta: aparece cuando un caso pasa a nivel crítico por primera vez
  const seenCritical = useRef(null);
  useEffect(() => {
    const crit = ranked.filter((r) => r.level === 'critica');
    if (seenCritical.current === null) {
      seenCritical.current = new Set(crit.map((r) => r.id)); // los de arranque no alertan
      return;
    }
    const fresh = crit.filter((r) => !seenCritical.current.has(r.id));
    crit.forEach((r) => seenCritical.current.add(r.id));
    if (fresh.length > 0) setAlert(fresh[0]);
  });

  const setStatus = (id, status) =>
    dispatch({ type: 'SET_REPORT_STATUS', id, status, now: Date.now() });

  const closeCase = () => {
    setSelectedId(null);
    setStreetOpen(false);
  };

  // Street View: el visor incrustado (sin clave) y el enlace de respaldo
  const streetEmbed = selected
    ? `https://maps.google.com/maps?layer=c&cbll=${selected.lat},${selected.lng}&cbp=11,0,0,0,0&source=embed&output=svembed`
    : '';
  const streetLink = selected
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selected.lat},${selected.lng}`
    : '';

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-900 text-white lg:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-950 px-3 py-2 sm:px-4">
        <h1 className="text-2xl font-bold tracking-wide text-cyan-400 sm:text-3xl">POSTA</h1>
        <span className="rounded border border-slate-500 bg-slate-800 px-3 py-1 text-xs font-bold tracking-wide text-slate-200 sm:text-sm">
          <span className="text-yellow-400">●</span> DATOS SIMULADOS · SANTIAGO DEL ESTERO
        </span>
        <span className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 sm:text-sm">
          <span className={online ? 'text-emerald-400' : 'text-red-400'}>●</span>{' '}
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeSelector theme={theme} onChange={setTheme} />
          <button
            onClick={demo.running ? demo.stop : demo.start}
            className={`min-h-12 rounded-lg px-4 font-semibold ${
              demo.running
                ? 'border border-slate-500 bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {demo.running ? (
              <>
                <span className="mr-2 animate-pulse text-red-400">●</span>
                {`Detener (${demo.count}/${demo.total})`}
              </>
            ) : (
              'Simular desastre'
            )}
          </button>
          <button
            onClick={() => {
              demo.stop();
              reset();
              setAlert(null);
              closeCase();
              seenCritical.current = null;
            }}
            className="min-h-12 rounded-lg bg-slate-700 px-4 hover:bg-slate-600"
          >
            Reiniciar datos
          </button>
        </div>
      </header>

      {alert && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/60 bg-red-950/80 px-4 py-2 text-white">
          <p className="font-bold">
            <span className="animate-pulse">🚨</span> CASO CRÍTICO: {(TYPE_INFO[alert.type] ?? {}).label} ·{' '}
            {alert.place?.name ?? 'ubicación sin lugar cargado'} · {alert.score} pts
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedId(alert.id);
                setAlert(null);
              }}
              className="min-h-12 rounded-lg bg-white px-4 font-semibold text-slate-900"
            >
              Ver caso
            </button>
            <button
              onClick={() => setAlert(null)}
              className="min-h-12 rounded-lg bg-slate-800 px-4 font-semibold hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <main className="grid flex-1 gap-3 p-3 sm:p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_30rem]">
        {/* Mapa */}
        <section className="relative h-[60vh] min-h-[22rem] overflow-hidden rounded-2xl border border-slate-700 lg:h-full">
          {/* "isolate": las chinches del mapa quedan por debajo de los paneles de encima */}
          <div className="absolute inset-0 isolate">
            <CityMap
              reports={ranked}
              places={places}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <div className="pointer-events-none absolute left-3 top-3 hidden space-y-1 rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-slate-200 backdrop-blur sm:block">
            <p className="font-semibold">Prioridad</p>
            <p><span className="text-red-400">●</span> Crítica</p>
            <p><span className="text-orange-400">●</span> Alta</p>
            <p><span className="text-yellow-300">●</span> Media</p>
            <p><span className="text-slate-400">●</span> Baja</p>
            <p><span className="text-sky-400">■</span> Zona inundable</p>
          </div>

          <p className="pointer-events-none absolute bottom-2 left-3 hidden rounded bg-slate-950/60 px-2 py-1 text-[10px] text-slate-200 sm:block">
            Arrastrá para mover · rueda o pellizco para zoom · tocá una chinche
          </p>

          {selected && (
            <div className="absolute inset-x-3 top-3 z-20 max-h-[70%] overflow-y-auto rounded-xl border border-slate-600 bg-slate-950/90 p-3 text-sm text-white backdrop-blur sm:inset-x-auto sm:right-3 sm:w-64">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {(TYPE_INFO[selected.type] ?? {}).icon}{' '}
                    {(TYPE_INFO[selected.type] ?? {}).label}
                  </p>
                  <p className="text-xs text-slate-300">
                    {selected.place?.name ?? 'Ubicación sin lugar cargado'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-extrabold ${LEVEL_STYLE[selected.level].text}`}>
                    {selected.score}
                  </p>
                  <p className={`text-[10px] font-bold ${LEVEL_STYLE[selected.level].text}`}>
                    {LEVEL_STYLE[selected.level].label}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-300">
                👥 {selected.people ?? '?'} personas · ⏱{' '}
                {Math.max(0, Math.round((now - selected.receivedAt) / 60000))} min
              </p>

              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {selected.why.slice(0, 3).map((f) => (
                  <li key={f.key} className="flex justify-between">
                    <span>{FACTOR_LABEL[f.key]}</span>
                    <span>+{f.contribution.toFixed(1)}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setStreetOpen((v) => !v)}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-200 font-semibold text-slate-900 hover:bg-white"
              >
                🧭 {streetOpen ? 'Ocultar calle' : 'Ver calle'}
              </button>

              <button
                onClick={closeCase}
                className="mt-2 min-h-12 w-full rounded-lg bg-slate-700 font-semibold hover:bg-slate-600"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Street View dentro de la app */}
          {selected && streetOpen && (
            <div className="absolute inset-x-3 bottom-3 z-20 flex h-[55%] flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-950 shadow-lg sm:inset-x-auto sm:left-3 sm:w-[30rem]">
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2 text-xs">
                <p className="truncate font-semibold text-slate-200">
                  🧭 Vista de calle · {selected.place?.name ?? 'ubicación del reporte'}
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  {online && (
                    <a
                      href={streetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 underline hover:text-white"
                    >
                      Abrir aparte
                    </a>
                  )}
                  <button
                    onClick={() => setStreetOpen(false)}
                    className="min-h-8 rounded px-2 font-bold text-slate-200 hover:bg-slate-800"
                    aria-label="Cerrar vista de calle"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {online ? (
                <iframe
                  key={selected.id}
                  title="Vista de calle"
                  src={streetEmbed}
                  className="h-full w-full flex-1 border-0"
                  loading="lazy"
                  allowFullScreen
                />
              ) : (
                <p className="m-auto p-4 text-center text-sm text-slate-400">
                  La vista de calle necesita internet.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Prioridades */}
        <aside className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/50 p-3 backdrop-blur lg:overflow-y-auto">
          <div className="mb-3 grid grid-cols-4 gap-2">
            {['critica', 'alta', 'media', 'baja'].map((l) => (
              <div key={l} className={`rounded-lg border p-2 text-center ${LEVEL_STYLE[l].box}`}>
                <p className={`font-mono text-2xl font-bold ${LEVEL_STYLE[l].text}`}>
                  {ranked.filter((r) => r.level === l).length}
                </p>
                <p className="text-[10px] font-bold tracking-wide text-slate-400">
                  {LEVEL_STYLE[l].label}
                </p>
              </div>
            ))}
          </div>

          <ul className="space-y-2">
            {ranked.map((r) => (
              <PriorityCard
                key={r.id}
                report={r}
                now={now}
                selected={r.id === selectedId}
                onSelect={setSelectedId}
                onStatus={setStatus}
              />
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

export default App;