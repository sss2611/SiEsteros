// src/shared/state/AppContext.jsx
import { createContext, useContext, useEffect, useReducer } from 'react';
import { reducer, createInitialState } from './reducer.js';
import reportsSeed from '../../data/reports.seed.json';
import resourcesSeed from '../../data/resources.json';

const STORAGE_KEY = 'siesteros-state-v1';

const AppContext = createContext(null);

function init() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // si el guardado está corrupto, arrancamos de cero
  }
  return createInitialState({ reports: reportsSeed, resources: resourcesSeed });
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // almacenamiento lleno o bloqueado: la app sigue funcionando
    }
  }, [state]);

  const reset = () =>
    dispatch({
      type: 'RESET',
      initial: createInitialState({
        reports: reportsSeed,
        resources: resourcesSeed,
      }),
    });

  return (
    <AppContext.Provider value={{ state, dispatch, reset }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}