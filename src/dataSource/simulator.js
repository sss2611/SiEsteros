// src/dataSource/simulator.js
// Fuente de datos: simulador de reportes entrantes.
// Soporta modo automático con línea de tiempo precisa y modo manual paso a paso (Modo Director).

import { PLACES } from './mockData.js';

const p = (id) => PLACES.find((x) => x.id === id);

// Genera el listado ordenado de los 10 reportes de la simulación
export function getScheduleReports() {
  const t = Date.now();

  return [
    // 0.0s · sim-1 · estructura · MEDIA 52
    { delay: 0, report: { id: 'sim-1', nodeId: 'n03', placeId: 'p3', lat: p('p3').lat, lng: p('p3').lng, type: 'estructura', people: 12, vulnerable: false, access: true, confidence: 'media', receivedAt: t, status: 'nuevo', score: 52, why: { riesgoVida: 70, vulnerabilidad: 20, personas: 12, tiempo: 0 } } },
    // 1.0s · sim-2 · sin_agua · BAJA 28
    { delay: 1000, report: { id: 'sim-2', nodeId: 'n01', placeId: 'p7', lat: p('p7').lat, lng: p('p7').lng, type: 'sin_agua', people: null, vulnerable: false, access: true, confidence: 'baja', receivedAt: t + 1000, status: 'nuevo', score: 28, why: { riesgoVida: 55, vulnerabilidad: 10, personas: 15, tiempo: 0 } } },
    // 2.0s · sim-3 · heridos · ALTA 74
    { delay: 2000, report: { id: 'sim-3', nodeId: 'n04', placeId: 'p8', lat: p('p8').lat, lng: p('p8').lng, type: 'heridos', people: 7, vulnerable: true, access: false, confidence: 'alta', receivedAt: t + 2000, status: 'nuevo', score: 74, why: { riesgoVida: 90, vulnerabilidad: 70, personas: 35, tiempo: 0 } } },
    // 3.0s · sim-4 · incendio · ALTA 61
    { delay: 3000, report: { id: 'sim-4', nodeId: 'n02', placeId: 'p6', lat: p('p6').lat, lng: p('p6').lng, type: 'incendio', people: 8, vulnerable: false, access: null, confidence: 'media', receivedAt: t + 3000, status: 'nuevo', score: 61, why: { riesgoVida: 85, vulnerabilidad: 10, personas: 40, tiempo: 0 } } },
    // 4.0s · sim-5 · ruta_cortada · BAJA 30
    { delay: 4000, report: { id: 'sim-5', nodeId: 'n05', placeId: null, lat: -27.795, lng: -64.252, type: 'ruta_cortada', people: 0, vulnerable: false, access: null, confidence: 'alta', receivedAt: t + 4000, status: 'nuevo', score: 30, why: { riesgoVida: 30, vulnerabilidad: 0, personas: 0, tiempo: 0 } } },
    // 8.0s · sim-CRITICO · atrapados · CRÍTICA 95 (Exactamente a los 8 segundos)
    { delay: 8000, report: { id: 'sim-CRITICO', nodeId: 'n05', placeId: 'p2', lat: p('p2').lat, lng: p('p2').lng, type: 'atrapados', people: 6, vulnerable: true, access: false, confidence: 'alta', receivedAt: t + 8000, status: 'nuevo', score: 95, why: { riesgoVida: 100, vulnerabilidad: 85, personas: 30, tiempo: 0 } } },
    // 9.5s · sim-7 · atrapados · ALTA 78
    { delay: 9500, report: { id: 'sim-7', nodeId: 'n03', placeId: 'p1', lat: p('p1').lat, lng: p('p1').lng, type: 'atrapados', people: 4, vulnerable: true, access: false, confidence: 'media', receivedAt: t + 9500, status: 'nuevo', score: 78, why: { riesgoVida: 100, vulnerabilidad: 70, personas: 20, tiempo: 0 } } },
    // 11.0s · sim-8 · atrapados · ALTA 75 (Superpuesto en p1)
    { delay: 11000, report: { id: 'sim-8', nodeId: 'n04', placeId: 'p1', lat: p('p1').lat, lng: p('p1').lng, type: 'atrapados', people: 2, vulnerable: false, access: false, confidence: null, receivedAt: t + 11000, status: 'nuevo', score: 75, why: { riesgoVida: 100, vulnerabilidad: 10, personas: 10, tiempo: 0 } } },
    // 12.5s · sim-9 · sin_agua · MEDIA 43
    { delay: 12500, report: { id: 'sim-9', nodeId: 'n02', placeId: 'p4', lat: p('p4').lat, lng: p('p4').lng, type: 'sin_agua', people: 15, vulnerable: true, access: true, confidence: 'alta', receivedAt: t + 12500, status: 'nuevo', score: 43, why: { riesgoVida: 55, vulnerabilidad: 70, personas: 15, tiempo: 0 } } },
  ];
}

export function createSimulator() {
  let subscribers = [];
  let timers = [];
  let manualIndex = 0;
  let activeSchedule = [];

  function notify(report) {
    subscribers.forEach((fn) => fn(report));
  }

  return {
    subscribe(onReport) {
      subscribers.push(onReport);
      return () => {
        subscribers = subscribers.filter((s) => s !== onReport);
      };
    },

    // Modo automático por línea de tiempo
    start() {
      timers.forEach(clearTimeout);
      timers = [];
      manualIndex = 0;
      activeSchedule = getScheduleReports();

      activeSchedule.forEach(({ delay, report }) => {
        timers.push(
          setTimeout(() => {
            manualIndex++;
            notify(report);
          }, delay),
        );
      });
    },

    // Inicia en modo director (manual, sin temporizadores)
    startManual() {
      timers.forEach(clearTimeout);
      timers = [];
      manualIndex = 0;
      activeSchedule = getScheduleReports();
    },

    // Avanza al siguiente reporte manualmente (Barra espaciadora o botón)
    next() {
      if (!activeSchedule.length) {
        activeSchedule = getScheduleReports();
      }
      if (manualIndex < activeSchedule.length) {
        const item = activeSchedule[manualIndex];
        manualIndex++;
        notify(item.report);
        return {
          current: manualIndex,
          total: activeSchedule.length,
          report: item.report,
          done: manualIndex >= activeSchedule.length,
        };
      }
      return {
        current: manualIndex,
        total: activeSchedule.length,
        done: true,
      };
    },

    getStepInfo() {
      return {
        current: manualIndex,
        total: activeSchedule.length || 9,
        done: manualIndex >= (activeSchedule.length || 9),
      };
    },

    stop() {
      timers.forEach(clearTimeout);
      timers = [];
      manualIndex = 0;
    },
  };
}
