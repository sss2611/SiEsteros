// src/shared/state/reducer.js
// Estado de la app. La UI NO calcula scores: los reportes ya los traen calculados.

export const CLOSED_STATUSES = ['atendido', 'descartado']; // 'asignado' se mueve a 'EN CURSO'

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
    resources: resources.map((res) => ({ ...res, destination: null })),
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
        reports: state.reports.map((r) => (r.id === id ? { ...r, status } : r)),
      };
    }

    // Despacho de recurso: cambia reporte a 'asignado' y recurso específico a 'en_camino' con destino
    case 'DISPATCH_RESOURCE': {
      const { reportId, resourceId, destination } = action;
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === reportId ? { ...r, status: 'asignado' } : r,
        ),
        resources: state.resources.map((res) =>
          res.id === resourceId ? { ...res, status: 'en_camino', destination } : res,
        ),
      };
    }

    // Cierre de intervención: reporte a 'atendido', recurso liberado a 'disponible' en su base
    case 'RESOLVE_DISPATCH': {
      const { reportId, resourceId } = action;
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === reportId ? { ...r, status: 'atendido' } : r,
        ),
        resources: state.resources.map((res) =>
          res.id === resourceId ? { ...res, status: 'disponible', destination: null } : res,
        ),
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