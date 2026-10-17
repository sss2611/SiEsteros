// src/shared/state/reducer.js
// Estado de la app. Funciones puras: la hora siempre llega por parámetro.

import { DEFAULT_WEIGHTS } from '../../features/urgency/score.js';

export const STATUS_FLOW = [
  'nuevo',
  'en_cola',
  'asignado',
  'en_camino',
  'atendido',
  'descartado',
];

export const CLOSED_STATUSES = ['atendido', 'descartado'];

// Convierte "hace N minutos" de los datos semilla en una hora fija (receivedAt),
// así el cronómetro de espera puede avanzar solo.
export function createInitialState({ reports, resources, now = Date.now() }) {
  return {
    reports: reports.map(({ receivedMinutesAgo, ...r }) => ({
      ...r,
      receivedAt: now - (receivedMinutesAgo ?? 0) * 60000,
    })),
    resources,
    weights: DEFAULT_WEIGHTS,
    decisions: [], // registro de decisiones con hora
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_REPORT_STATUS': {
      const { id, status, now } = action;
      const report = state.reports.find((r) => r.id === id);
      if (!report || report.status === status) return state;
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === id ? { ...r, status } : r
        ),
        decisions: [
          { at: now, reportId: id, from: report.status, to: status },
          ...state.decisions,
        ],
      };
    }

    case 'ADD_REPORT':
      return { ...state, reports: [...state.reports, action.report] };

    case 'SET_RESOURCE_STATUS':
      return {
        ...state,
        resources: state.resources.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r
        ),
      };

    case 'SET_WEIGHTS':
      return { ...state, weights: action.weights };

    case 'RESET':
      return action.initial;

    default:
      return state;
  }
}