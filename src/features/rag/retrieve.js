// src/features/rag/retrieve.js
// Arma la consulta a partir del caso y recupera los fragmentos más relevantes.

import protocols from '../../data/protocols.json' with { type: 'json' };
import { buildIndex, search } from './bm25.js';

const TYPE_TERMS = {
  atrapados: 'atrapados inundación rescate embarcación personas',
  heridos: 'heridos triage ambulancia sanitario',
  sin_agua: 'sin agua potable cisterna',
  incendio: 'incendio bomberos',
  estructura: 'estructura riesgo colapso',
  ruta_cortada: 'ruta cortada acceso aislada',
  ok: '',
};

const KIND_TERMS = {
  geriatrico: 'adultos mayores movilidad reducida medicación',
  escuela: 'escuela niños menores',
  hospital: 'servicio crítico pacientes energía',
  centro_salud: 'servicio crítico pacientes',
  refugio: 'refugio albergue',
  zona_inundable: 'inundación anegamiento',
  planta_agua: 'servicio crítico agua potable energía',
};

export function buildQuery(report, place) {
  const groups = [[TYPE_TERMS[report.type] ?? '', 2]]; // el tipo pesa doble
  if (place) {
    groups.push([KIND_TERMS[place.kind] ?? '', 1]);
    if (place.inundable) groups.push(['inundación', 1]);
    if (place.servicioCritico) groups.push(['servicio crítico', 1]);
  }
  if (report.vulnerable) groups.push(['niños adultos mayores', 0.5]);
  if (report.access === false || report.access == null) {
    groups.push(['aislada acceso bote', 0.5]);
  }
  return groups;
}

// Se arma una sola vez, al cargar el módulo
const byId = Object.fromEntries(protocols.map((p) => [p.id, p]));
const index = buildIndex(protocols.map((p) => ({ id: p.id, text: `${p.title} ${p.text}` })));

export function retrieveProtocols(report, place, topK = 3) {
  const groups = buildQuery(report, place);
  const hits = search(index, groups).slice(0, topK);
  return {
    query: groups.map((g) => g[0]).join(' '),
    results: hits.map((h) => ({ ...h, protocol: byId[h.id] })),
  };
}