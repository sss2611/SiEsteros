// src/features/map/geoData.js
// Referencias geográficas vectoriales de Santiago del Estero para modo Offline táctico.
// Incluye Río Dulce (polígono), Avenidas Principales (polylines) y Barrios (puntos).

export const TACTICAL_CENTER = [-27.7900, -64.2600];
export const TACTICAL_ZOOM = 13;

/* ── Río Dulce (Polígono ancho y ondulado este de la ciudad) ─────── */
// Cruza de NNE hacia SSE bordeando la costanera de Santiago del Estero y separándola de La Banda
export const RIO_DULCE = {
  name: 'Río Dulce',
  labelPosition: [-27.7650, -64.2360],
  // Polígono cerrado que simula ambas márgenes del río con meandros característicos
  polygon: [
    [-27.7400, -64.2280],
    [-27.7520, -64.2330],
    [-27.7650, -64.2390],
    [-27.7760, -64.2435], // Cerca de Parque Aguirre y Puente Carretero
    [-27.7880, -64.2465],
    [-27.8000, -64.2505],
    [-27.8120, -64.2545],
    [-27.8250, -64.2600],
    [-27.8380, -64.2670], // Sur
    [-27.8420, -64.2690],
    // Retorno por la margen este (La Banda)
    [-27.8400, -64.2640],
    [-27.8240, -64.2550],
    [-27.8100, -64.2490],
    [-27.7980, -64.2440],
    [-27.7850, -64.2390],
    [-27.7730, -64.2360],
    [-27.7610, -64.2310],
    [-27.7480, -64.2250],
    [-27.7380, -64.2200],
  ],
};

/* ── Avenidas Principales (Trazados tácticos) ────────────────────── */
export const MAIN_AVENUES = [
  {
    id: 'av_belgrano',
    name: 'AV. BELGRANO',
    labelPos: [-27.7620, -64.2645], // Norte despejado
    style: { color: '#00ff66', weight: 2.2, opacity: 0.55 },
    coords: [
      [-27.7480, -64.2660], // Norte (Huaico Hondo)
      [-27.7650, -64.2640],
      [-27.7800, -64.2625],
      [-27.7920, -64.2610], // Centro (Plaza Libertad)
      [-27.8100, -64.2595],
      [-27.8300, -64.2580],
      [-27.8460, -64.2565], // Sur
    ],
  },
  {
    id: 'av_colon',
    name: 'AV. COLÓN',
    labelPos: [-27.7660, -64.2725],
    style: { color: '#38bdf8', weight: 2.0, opacity: 0.5 },
    coords: [
      [-27.7530, -64.2735],
      [-27.7720, -64.2715],
      [-27.7900, -64.2695],
      [-27.8120, -64.2675],
      [-27.8340, -64.2655],
    ],
  },
  {
    id: 'av_aguirre',
    name: 'AV. AGUIRRE',
    labelPos: [-27.7700, -64.2830],
    style: { color: '#22c55e', weight: 1.8, opacity: 0.45 },
    coords: [
      [-27.7580, -64.2835],
      [-27.7750, -64.2825],
      [-27.7920, -64.2810],
      [-27.8150, -64.2790],
      [-27.8360, -64.2770],
    ],
  },
  {
    id: 'av_lugones',
    name: 'AV. LUGONES',
    labelPos: [-27.8250, -64.2740],
    style: { color: '#a3e635', weight: 2.0, opacity: 0.5 },
    coords: [
      [-27.7650, -64.2930], // Noroeste
      [-27.7850, -64.2900],
      [-27.8050, -64.2845],
      [-27.8220, -64.2760],
      [-27.8320, -64.2660], // Curva hacia el sur/este
    ],
  },
  {
    id: 'ruta_9',
    name: 'RUTA 9',
    labelPos: [-27.7460, -64.2925],
    style: { color: '#fbbf24', weight: 2.2, opacity: 0.55, dashArray: '6, 4' },
    coords: [
      [-27.7380, -64.2950], // Ingreso norte desde Termas / Tucumán
      [-27.7550, -64.2900],
      [-27.7750, -64.2870],
      [-27.8000, -64.2750],
      [-27.8250, -64.2600],
      [-27.8480, -64.2480], // Salida sur hacia Córdoba
    ],
  },
  // Conectores transversales para realismo táctico
  {
    id: 'av_rivadavia',
    name: 'AV. RIVADAVIA',
    labelPos: null, // Evitar saturación en el centro
    style: { color: '#64748b', weight: 1.5, opacity: 0.35 },
    coords: [
      [-27.7875, -64.2820],
      [-27.7868, -64.2698],
      [-27.7862, -64.2612],
      [-27.7855, -64.2470],
    ],
  },
  {
    id: 'av_alsina',
    name: 'AV. ALSINA',
    labelPos: [-27.7975, -64.2550],
    style: { color: '#64748b', weight: 1.5, opacity: 0.35 },
    coords: [
      [-27.7985, -64.2815],
      [-27.7978, -64.2685],
      [-27.7970, -64.2600],
      [-27.7960, -64.2485],
    ],
  },
];

/* ── Marcadores de Barrios (Tooltips fijos) ───────────────────────── */
export const BARRIOS = [
  { id: 'b_centro',      name: 'B° Centro',        lat: -27.7885, lng: -64.2610 },
  { id: 'b_catolica',    name: 'B° La Católica',   lat: -27.8060, lng: -64.2520 },
  { id: 'b_reconquista', name: 'B° Reconquista',   lat: -27.8120, lng: -64.2630 },
  { id: 'b_cabildo',     name: 'B° Cabildo',       lat: -27.8220, lng: -64.2730 },
  { id: 'b_pque_aguirre',name: 'B° Pque. Aguirre', lat: -27.7820, lng: -64.2460 },
  { id: 'b_alvear',      name: 'B° Alvear',        lat: -27.7770, lng: -64.2740 },
  { id: 'b_inmigrantes', name: 'B° Inmigrantes',   lat: -27.7980, lng: -64.2780 },
  { id: 'b_autonomia',   name: 'B° Autonomía',     lat: -27.7860, lng: -64.2960 },
];

/* ── Círculos de Radar Táctico ───────────────────────────────────── */
export const RADAR_RINGS = [
  { radius: 1000, label: '1 KM', ringId: 'r1km' },
  { radius: 2000, label: '2 KM', ringId: 'r2km' },
  { radius: 3000, label: '3 KM', ringId: 'r3km' },
];
