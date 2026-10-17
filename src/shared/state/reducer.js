// src/shared/state/reducer.js
// Estado de la app. La UI NO calcula scores: los reportes ya los traen calculados.

export const CLOSED_STATUSES = ['atendido', 'descartado'];

export function createInitialState({ reports, resources }) {
  const now = Date.now();
  return {
    // Convierte receivedMinutesAgo → receivedAt relativo al momento del reset
    reports: reports.map(({ receivedMinutesAgo, receivedAt, ...r }) => ({
      ...r,
      receivedAt: receivedMinutesAgo != null
        ? now - receivedMinutesAgo * 60000
        : (receivedAt ?? now),
    })),
    resources,
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_REPORT':
      return { ...state, reports: [...state.reports, action.report] };

    case 'SET_REPORT_STATUS': {
      const { id, status } = action;
      return {
        ...state,
        reports: state.reports.map((r) => r.id === id ? { ...r, status } : r),
      };
    }

    case 'SET_RESOURCE_STATUS':
      return {
        ...state,
        resources: state.resources.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r,
        ),
      };

    case 'RESET':
      return action.initial;

    default:
      return state;
  }
}