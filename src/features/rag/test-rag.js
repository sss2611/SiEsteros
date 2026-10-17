// Uso: node src/features/rag/test-rag.js
import { readFileSync } from 'node:fs';
import { retrieveProtocols } from './retrieve.js';

const load = (rel) =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));

const places = load('../../data/places.json');
const reports = load('../../data/reports.seed.json');
const placeById = Object.fromEntries(places.map((p) => [p.id, p]));

for (const r of reports) {
  const place = placeById[r.placeId] ?? null;
  const { results } = retrieveProtocols(r, place, 3);
  console.log(`\n${r.id} · ${r.type} · ${place?.name ?? '(sin lugar)'}`);
  for (const h of results) {
    console.log(`   ${h.score.toFixed(2)}  ${h.protocol.title}  [${h.matched.join(', ')}]`);
  }
}