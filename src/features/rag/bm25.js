// src/features/rag/bm25.js
// Buscador BM25 mínimo. Sin dependencias, funciona offline.

const STOP = new Set([
  'para', 'con', 'los', 'las', 'del', 'por', 'una', 'uno', 'que', 'como',
  'ante', 'sin', 'sus', 'hay', 'mas', 'muy', 'esta', 'este', 'son', 'ser',
  'tras', 'sobre', 'cuando', 'sea', 'antes', 'hasta',
]);

// Minúsculas, sin acentos, sin plural simple
export function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
}

export function buildIndex(docs) {
  const items = docs.map((d) => {
    const tokens = tokenize(d.text);
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
    return { id: d.id, len: tokens.length, tf };
  });
  const df = {};
  for (const it of items) {
    for (const t of Object.keys(it.tf)) df[t] = (df[t] ?? 0) + 1;
  }
  const avgdl = items.reduce((s, i) => s + i.len, 0) / (items.length || 1);
  return { items, df, avgdl, N: items.length };
}

export function search(index, query, { k1 = 1.5, b = 0.75 } = {}) {
  // query: string, o lista de [texto, peso]
  const groups = typeof query === 'string' ? [[query, 1]] : query;
  const weights = new Map();
  for (const [text, w] of groups) {
    for (const t of tokenize(text)) {
      weights.set(t, Math.max(weights.get(t) ?? 0, w));
    }
  }

  return index.items
    .map((it) => {
      let score = 0;
      const matched = [];
      for (const [t, w] of weights) {
        const f = it.tf[t];
        if (!f) continue;
        const n = index.df[t];
        const idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
        score +=
          w * ((idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * it.len) / index.avgdl)));
        matched.push(t);
      }
      return { id: it.id, score, matched };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}