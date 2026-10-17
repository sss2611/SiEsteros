// src/dataSource/useDemo.js
// Hook para control del simulador en Modo Automático o Modo Director (manual con barra espaciadora).

import { useState, useCallback, useEffect, useRef } from 'react';

export function useDemo({ simulator, unlockAudio, onReportReceived }) {
  const [directorMode, setDirectorMode] = useState(false);
  const [running, setRunning] = useState(false);
  const [stepInfo, setStepInfo] = useState({ current: 0, total: 10, done: false });
  const audioUnlockedRef = useRef(false);

  // Garantizar desbloqueo del AudioContext en la primera interacción
  const ensureAudio = useCallback(() => {
    if (!audioUnlockedRef.current) {
      unlockAudio?.();
      audioUnlockedRef.current = true;
    }
  }, [unlockAudio]);

  // Avanzar manualmente (Barra espaciadora o botón)
  const advanceNext = useCallback(() => {
    ensureAudio();
    if (!running) {
      setRunning(true);
      simulator.startManual();
    }
    const info = simulator.next();
    setStepInfo({ current: info.current, total: info.total, done: info.done });
  }, [ensureAudio, running, simulator]);

  // Iniciar automático
  const startAuto = useCallback(() => {
    ensureAudio();
    setRunning(true);
    simulator.start();
  }, [ensureAudio, simulator]);

  // Detener / Resetear
  const stopDemo = useCallback(() => {
    simulator.stop();
    setRunning(false);
    setStepInfo({ current: 0, total: 10, done: false });
  }, [simulator]);

  // Escuchar tecla Espacio cuando Modo Director está activo
  useEffect(() => {
    if (!directorMode) return;

    const handleKeyDown = (e) => {
      // Evitar interceptar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        advanceNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [directorMode, advanceNext]);

  return {
    directorMode,
    setDirectorMode,
    running,
    stepInfo,
    startAuto,
    advanceNext,
    stopDemo,
  };
}
