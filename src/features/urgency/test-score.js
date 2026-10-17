// src/features/urgency/test-score.js
import { readFileSync } from 'node:fs';
import { prioritizeReports } from './prioritize.js';

const load = (rel) =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));

const places = load('../../data/places.json');
const reports = load('../../data/reports.seed.json');

const ranked = prioritizeReports(reports, places);

console.table(
  ranked.map((r) => ({
    id: r.id,
    lugar: r.place ? r.place.name.slice(0, 28) : '(sin lugar)',
    tipo: r.type,
    min: r.receivedMinutesAgo,
    puntaje: r.score,
    nivel: r.level,
    faltan: r.missing.join(',') || '-',
  }))
);