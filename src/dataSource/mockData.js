// src/dataSource/mockData.js
// Datos de ejemplo fijos para la demostración.

export const PLACES = [
  { id: 'p1', name: 'Hospital Regional Zonal',  kind: 'hospital',   lat: -27.782,  lng: -64.258,  vulnerables: 45  },
  { id: 'p2', name: 'Escuela Belgrano Nº 1',    kind: 'escuela',    lat: -27.7950, lng: -64.2700, vulnerables: 280 },
  { id: 'p3', name: 'Escuela San Martín Nº 5',  kind: 'escuela',    lat: -27.8010, lng: -64.2450, vulnerables: 310 },
  { id: 'p4', name: 'Geriátrico Los Abuelos',   kind: 'geriatrico', lat: -27.7880, lng: -64.2780, vulnerables: 62  },
  { id: 'p5', name: 'Refugio Municipal Norte',  kind: 'refugio',    lat: -27.7750, lng: -64.2620, vulnerables: 0   },
  { id: 'p6', name: 'Escuela Juan XXIII',        kind: 'escuela',    lat: -27.8080, lng: -64.2550, vulnerables: 240 },
  { id: 'p7', name: 'Refugio Barrio Sur',        kind: 'refugio',    lat: -27.8120, lng: -64.2680, vulnerables: 0   },
  { id: 'p8', name: 'Hospital Independencia',    kind: 'hospital',   lat: -27.7780, lng: -64.2480, vulnerables: 38  },
];

export const RESOURCES = [
  { id: 'r1', type: 'ambulancia',    agency: 'SAME',                status: 'disponible', lat: -27.783, lng: -64.260 },
  { id: 'r2', type: 'ambulancia',    agency: 'Cruz Roja',           status: 'asignado',   lat: -27.796, lng: -64.271 },
  { id: 'r3', type: 'bomberos',      agency: 'Bomberos Voluntarios', status: 'disponible', lat: -27.790, lng: -64.252 },
  { id: 'r4', type: 'bomberos',      agency: 'Bomberos Oficiales',  status: 'en_camino',  lat: -27.803, lng: -64.265 },
  { id: 'r5', type: 'defensa_civil', agency: 'Def. Civil Prov.',    status: 'disponible', lat: -27.777, lng: -64.258 },
  { id: 'r6', type: 'defensa_civil', agency: 'Def. Civil Mun.',     status: 'asignado',   lat: -27.805, lng: -64.248 },
  { id: 'r7', type: 'policia',       agency: 'Policía Provincial',  status: 'disponible', lat: -27.793, lng: -64.275 },
  { id: 'r8', type: 'policia',       agency: 'Gendarmería Nacional', status: 'en_camino', lat: -27.787, lng: -64.242 },
];

// Reportes iniciales (se muestran antes de simular).
// receivedMinutesAgo se convierte a receivedAt en createInitialState.
export const SEED_REPORTS = [
  {
    id: 'seed-1', nodeId: 'n01', placeId: 'p5',
    lat: -27.7750, lng: -64.2620,
    type: 'sin_agua', people: 35, vulnerable: false, access: true, confidence: 'alta',
    receivedMinutesAgo: 18, status: 'nuevo', score: 42,
    why: { riesgoVida: 55, vulnerabilidad: 10, personas: 35, tiempo: 30 },
  },
  {
    id: 'seed-2', nodeId: 'n02', placeId: 'p4',
    lat: -27.7880, lng: -64.2780,
    type: 'heridos', people: 3, vulnerable: true, access: false, confidence: 'media',
    receivedMinutesAgo: 5, status: 'nuevo', score: 67,
    why: { riesgoVida: 90, vulnerabilidad: 70, personas: 15, tiempo: 8 },
  },
];
