// src/features/demo/useDemo.js
// Simula la llegada de reportes, uno cada cierto intervalo.
import { useCallback, useEffect, useRef, useState } from 'react';

const TOTAL = 30;
const INTERVAL_MS = 2000;

const TYPES = [
  'atrapados', 'atrapados', 'heridos', 'sin_agua', 'sin_agua',
  'estructura', 'incendio', 'ruta_cortada', 'ok',
];
const CONFIDENCE = ['alta', 'media', 'media', 'baja'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// 20% de las veces el dato falta (null), para probar reportes incompletos
const maybe = (value) => (Math.random() < 0.2 ? null : value);

function makeReport(places, i) {
  const useCoords = Math.random() < 0.15; // algunos sin lugar cargado
  const place = useCoords ? null : pick(places);
  const type = pick(TYPES);
  return {
    id: `sim-${Date.now()}-${i}`,
    nodeId: `n0${1 + Math.floor(Math.random() * 5)}`,
    placeId: place?.id ?? null,
    lat: place ? place.lat : -27.8 + (Math.random() - 0.5) * 0.08,
    lng: place ? place.lng : -64.24 + (Math.random() - 0.5) * 0.1,
    type,
    people: type === 'ruta_cortada' ? 0 : maybe(1 + Math.floor(Math.random() * 25)),
    vulnerable: maybe(Math.random() < 0.5),
    access: maybe(Math.random() < 0.5),
    confidence: pick(CONFIDENCE),
    receivedAt: Date.now(),
    status: 'nuevo',
  };
}

export function useDemo(dispatch, places, reset) {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const timer = useRef(null);

  const stop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    reset(); // arranca desde los datos semilla
    setCount(0);
    setRunning(true);
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      dispatch({ type: 'ADD_REPORT', report: makeReport(places, n) });
      setCount(n);
      if (n >= TOTAL) stop();
    }, INTERVAL_MS);
  }, [dispatch, places, reset, stop]);

  useEffect(() => () => clearInterval(timer.current), []);

  return { running, count, total: TOTAL, start, stop };
}