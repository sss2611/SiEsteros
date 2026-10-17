// src/dataSource/simulator.js
// Fuente de datos: simulador de reportes entrantes.
// La UI interactúa con subscribe/start/stop; no sabe que esto es un simulador.

import { PLACES } from './mockData.js';

const p = (id) => PLACES.find((x) => x.id === id);

// Construye el cronograma de reportes al momento de iniciar la simulación.
// 9 reportes normales cada 1.5 s + 1 CRÍTICO exactamente a los 8 s (total 10).
function buildSchedule() {
  const t = Date.now();

  const regular = [
    // t=0 s · estructura · MEDIA 52
    { delay: 0, report: { id: 'sim-1', nodeId: 'n03', placeId: 'p3', lat: p('p3').lat, lng: p('p3').lng, type: 'estructura', people: 12, vulnerable: false, access: true,  confidence: 'media', receivedAt: t,        status: 'nuevo', score: 52, why: { riesgoVida: 70, vulnerabilidad: 20, personas: 12, tiempo: 0 } } },
    // t=1.5 s · sin_agua · BAJA 28 · people=null
    { delay: 1500, report: { id: 'sim-2', nodeId: 'n01', placeId: 'p7', lat: p('p7').lat, lng: p('p7').lng, type: 'sin_agua', people: null, vulnerable: false, access: true,  confidence: 'baja',  receivedAt: t + 1500, status: 'nuevo', score: 28, why: { riesgoVida: 55, vulnerabilidad: 10, personas: 15, tiempo: 0 } } },
    // t=3 s · heridos · ALTA 74
    { delay: 3000, report: { id: 'sim-3', nodeId: 'n04', placeId: 'p8', lat: p('p8').lat, lng: p('p8').lng, type: 'heridos',  people: 7,    vulnerable: true,  access: false, confidence: 'alta',  receivedAt: t + 3000, status: 'nuevo', score: 74, why: { riesgoVida: 90, vulnerabilidad: 70, personas: 35, tiempo: 0 } } },
    // t=4.5 s · incendio · ALTA 61 · access=null
    { delay: 4500, report: { id: 'sim-4', nodeId: 'n02', placeId: 'p6', lat: p('p6').lat, lng: p('p6').lng, type: 'incendio', people: 8,    vulnerable: false, access: null,  confidence: 'media', receivedAt: t + 4500, status: 'nuevo', score: 61, why: { riesgoVida: 85, vulnerabilidad: 10, personas: 40, tiempo: 0 } } },
    // t=6 s · ruta_cortada · BAJA 30
    { delay: 6000, report: { id: 'sim-5', nodeId: 'n05', placeId: null, lat: -27.795, lng: -64.252, type: 'ruta_cortada', people: 0, vulnerable: false, access: null,  confidence: 'alta', receivedAt: t + 6000, status: 'nuevo', score: 30, why: { riesgoVida: 30, vulnerabilidad: 0,  personas: 0,  tiempo: 0 } } },
    // t=7.5 s · ok · BAJA 18
    { delay: 7500, report: { id: 'sim-6', nodeId: 'n01', placeId: 'p5', lat: p('p5').lat, lng: p('p5').lng, type: 'ok',       people: 20,   vulnerable: false, access: true,  confidence: 'alta',  receivedAt: t + 7500, status: 'nuevo', score: 18, why: { riesgoVida: 5,  vulnerabilidad: 0,  personas: 20, tiempo: 0 } } },
    // t=9 s · atrapados · ALTA 78 · primer reporte superpuesto (mismo lugar que sim-8)
    { delay: 9000, report: { id: 'sim-7', nodeId: 'n03', placeId: 'p1', lat: p('p1').lat, lng: p('p1').lng, type: 'atrapados', people: 4,   vulnerable: true,  access: false, confidence: 'media', receivedAt: t + 9000,  status: 'nuevo', score: 78, why: { riesgoVida: 100, vulnerabilidad: 70, personas: 20, tiempo: 0 } } },
    // t=10.5 s · atrapados · ALTA 75 · segundo superpuesto (<50 m, mismo lugar) · confidence=null
    { delay: 10500, report: { id: 'sim-8', nodeId: 'n04', placeId: 'p1', lat: p('p1').lat, lng: p('p1').lng, type: 'atrapados', people: 2, vulnerable: false, access: false, confidence: null,    receivedAt: t + 10500, status: 'nuevo', score: 75, why: { riesgoVida: 100, vulnerabilidad: 10, personas: 10, tiempo: 0 } } },
    // t=12 s · sin_agua · MEDIA 43
    { delay: 12000, report: { id: 'sim-9', nodeId: 'n02', placeId: 'p4', lat: p('p4').lat, lng: p('p4').lng, type: 'sin_agua', people: 15,   vulnerable: true,  access: true,  confidence: 'alta',  receivedAt: t + 12000, status: 'nuevo', score: 43, why: { riesgoVida: 55, vulnerabilidad: 70, personas: 15, tiempo: 0 } } },
  ];

  // Reporte CRÍTICO exactamente a los 8 s (entre los reportes 6 y 7 del intervalo regular)
  const critical = {
    delay: 8000,
    report: {
      id: 'sim-CRITICO', nodeId: 'n05', placeId: 'p2',
      lat: p('p2').lat, lng: p('p2').lng,
      type: 'atrapados', people: 6, vulnerable: true, access: false, confidence: 'alta',
      receivedAt: t + 8000, status: 'nuevo', score: 95,
      why: { riesgoVida: 100, vulnerabilidad: 85, personas: 30, tiempo: 0 },
    },
  };

  return [...regular, critical];
}

export function createSimulator() {
  let subscribers = [];
  let timers = [];

  return {
    /** Suscribirse a nuevos reportes. Devuelve función de unsuscribe. */
    subscribe(onReport) {
      subscribers.push(onReport);
      return () => { subscribers = subscribers.filter((s) => s !== onReport); };
    },

    /** Inicia la simulación. audioUnlocked = true si el AudioContext ya fue habilitado. */
    start() {
      timers.forEach(clearTimeout);
      timers = [];
      const schedule = buildSchedule();
      schedule.forEach(({ delay, report }) => {
        timers.push(
          setTimeout(() => subscribers.forEach((fn) => fn(report)), delay),
        );
      });
    },

    stop() {
      timers.forEach(clearTimeout);
      timers = [];
    },
  };
}
