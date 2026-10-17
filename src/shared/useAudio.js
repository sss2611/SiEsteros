// src/shared/useAudio.js
// Beep de alarma con WebAudio API (sin archivos de audio externos ni CDN).
// Emite dos tonos UNA SOLA VEZ (sin loop) con protección contra disparo múltiple.

import { useRef } from 'react';

export function useAudio() {
  const ctxRef = useRef(null);
  const isPlayingRef = useRef(false);

  function unlock() {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctxRef.current = new AudioCtx();
      }
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
  }

  function beep() {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Evitar que se solapen o entre en loop
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setTimeout(() => {
      isPlayingRef.current = false;
    }, 900);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Dos tonos de alerta de emergencia
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);          // Tono 1: A5 (880 Hz)
    osc.frequency.setValueAtTime(660, now + 0.18);    // Tono 2: E5 (660 Hz)
    osc.frequency.setValueAtTime(880, now + 0.36);    // Retorno breve a A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.02);
    gain.gain.setValueAtTime(0.20, now + 0.48);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    // Suena exactamente una vez y se detiene en 0.65 s
    osc.start(now);
    osc.stop(now + 0.65);
  }

  return { unlock, beep };
}
