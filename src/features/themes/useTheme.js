// src/features/themes/useTheme.js
import { useEffect, useState } from 'react';

export const THEMES = [
  { id: 'sobria', label: 'Sobria' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'semaforo', label: 'Semáforo' },
  { id: 'hibrida', label: 'Híbrida' },
];

const KEY = 'siesteros-theme';

function readSaved() {
  try {
    const t = localStorage.getItem(KEY);
    if (THEMES.some((x) => x.id === t)) return t;
  } catch {
    // almacenamiento bloqueado: usamos el tema por defecto
  }
  return 'sobria';
}

export function useTheme() {
  const [theme, setTheme] = useState(readSaved);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // no pasa nada si no se puede guardar
    }
  }, [theme]);

  return [theme, setTheme];
}