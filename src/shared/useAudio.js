// src/shared/useAudio.js
// Beep de alarma con WebAudio API (sin archivos de audio externos).
// IMPORTANTE: unlock() debe llamarse dentro de un gesto del usuario (click).

import { useRef } from 'react';

export function useAudio() {
  const ctxRef = useRef(null);

  function unlock() {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
  }

  function beep() {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.36);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.22, ctx.currentTime + 0.50);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.65);
  }

  return { unlock, beep };
}
