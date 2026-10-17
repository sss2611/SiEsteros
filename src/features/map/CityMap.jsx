// src/features/map/CityMap.jsx
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';

// Estilo del mapa: 'light' se parece a Google Maps. Para uno oscuro, cambiar a 'dark'.
const FLAVOR = 'light';

// Los colores de prioridad NO cambian con la paleta
const LEVEL_COLOR = {
  critica: '#ef4444',
  alta: '#f97316',
  media: '#facc15',
  baja: '#94a3b8',
};

const CENTER = [-64.24, -27.8];
const BOUNDS = [
  [-64.36, -27.9],
  [-64.12, -27.7],
];

// Registra una sola vez el lector de archivos .pmtiles
let protocolReady = false;
function ensureProtocol() {
  if (protocolReady) return;
  maplibregl.setWorkerUrl(workerUrl);
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolReady = true;
}

function buildStyle() {
  return {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${FLAVOR}`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${window.location.origin}/maps/santiago.pmtiles`,
        attribution:
          '<a href="https://protomaps.com" target="_blank">Protomaps</a> © <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
      },
    },
    layers: layers('protomaps', namedFlavor(FLAVOR), { lang: 'es' }),
  };
}

// Mancha de agua con contorno irregular (determinista: siempre la misma forma)
function floodPolygon(place, index) {
  const km = 0.45 + (place.vecesAfectado ?? 0) * 0.2;
  const p1 = index * 1.7 + 0.5;
  const p2 = index * 2.3 + 1.1;
  const p3 = index * 0.9 + 2.0;
  const N = 40;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const a = ((i % N) / N) * Math.PI * 2;
    const k =
      1 + 0.18 * Math.sin(2 * a + p1) + 0.12 * Math.sin(3 * a + p2) + 0.08 * Math.sin(5 * a + p3);
    pts.push([place.lng + (Math.cos(a) * km * k) / 98, place.lat + (Math.sin(a) * km * k) / 111]);
  }
  return {
    type: 'Feature',
    properties: { id: place.id },
    geometry: { type: 'Polygon', coordinates: [pts] },
  };
}

// Si varios reportes caen en el mismo punto, los abre en espiral para que no se tapen
function spread(lng, lat, k) {
  if (k === 0) return [lng, lat];
  const ang = k * 2.4;
  const r = 0.00045 * Math.sqrt(k);
  return [lng + Math.cos(ang) * r, lat + Math.sin(ang) * r];
}

// Dibuja la chinche (SVG) solo si cambió algo, para que no parpadee
function paintPin(el, r, selected) {
  const sig = `${r.score}|${r.level}|${selected}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  const color = LEVEL_COLOR[r.level];
  const critical = r.level === 'critica';
  el.style.zIndex = selected ? '20' : critical ? '10' : '1';
  el.innerHTML = `
    <div style="position:relative;width:32px;height:42px;transform:scale(${selected ? 1.3 : 1});transform-origin:50% 100%;transition:transform .2s;">
      ${
        critical
          ? `<span class="animate-ping" style="position:absolute;left:4px;top:3.5px;width:24px;height:24px;border-radius:9999px;background:${color};opacity:.45"></span>`
          : ''
      }
      <svg width="32" height="42" viewBox="0 0 32 42" style="position:absolute;inset:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
        <path d="M16 1C8 1 1.5 7.4 1.5 15.3c0 10.6 14.5 25.7 14.5 25.7s14.5-15.1 14.5-25.7C30.5 7.4 24 1 16 1z" fill="${color}" stroke="#0a0a0b" stroke-width="1.5"/>
        <circle cx="16" cy="15.5" r="9" fill="#ffffff"/>
        <text x="16" y="19" text-anchor="middle" font-size="10" font-weight="700" font-family="ui-monospace,monospace" fill="#0a0a0b">${r.score}</text>
      </svg>
    </div>`;
}

export default function CityMap({ reports, places, selectedId, onSelect }) {
  const box = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const reportsRef = useRef(reports);

  // Mantiene al día lo último recibido, sin recrear el mapa
  useEffect(() => {
    onSelectRef.current = onSelect;
    reportsRef.current = reports;
  });

  // Crea el mapa una sola vez
  useEffect(() => {
    ensureProtocol();
    const markers = markersRef.current;
    const map = new maplibregl.Map({
      container: box.current,
      style: buildStyle(),
      center: CENTER,
      zoom: 12.2,
      minZoom: 10,
      maxZoom: 17.5,
      maxBounds: BOUNDS,
    });
    mapRef.current = map;

    map.on('load', () => {
      const flood = {
        type: 'FeatureCollection',
        features: places.filter((p) => p.inundable).map((p, i) => floodPolygon(p, i)),
      };
      // Debajo de los textos del mapa, pero encima de calles y manzanas
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      map.addSource('flood', { type: 'geojson', data: flood });
      map.addLayer(
        {
          id: 'flood-fill',
          type: 'fill',
          source: 'flood',
          paint: { 'fill-color': '#3b82a6', 'fill-opacity': 0.35 },
        },
        firstSymbol
      );
      map.addLayer(
        {
          id: 'flood-line',
          type: 'line',
          source: 'flood',
          paint: { 'line-color': '#2b6a8c', 'line-width': 1.5 },
        },
        firstSymbol
      );
    });

    // Tocar el fondo del mapa deselecciona
    map.on('click', () => onSelectRef.current(null));

    return () => {
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [places]);

  // Chinches: crea, mueve y borra según los reportes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const live = new Set();
    const groups = new Map();

    reports.forEach((r) => {
      live.add(r.id);
      const key = `${r.lat},${r.lng}`;
      const k = groups.get(key) ?? 0;
      groups.set(key, k + 1);
      const [lng, lat] = spread(r.lng, r.lat, k);

      let m = markers.get(r.id);
      if (!m) {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRef.current(r.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        m = { marker, el };
        markers.set(r.id, m);
      } else {
        m.marker.setLngLat([lng, lat]);
      }
      paintPin(m.el, r, r.id === selectedId);
    });

    for (const [id, m] of markers) {
      if (!live.has(id)) {
        m.marker.remove();
        markers.delete(id);
      }
    }
  }, [reports, selectedId]);

  // Vuela hacia el caso elegido
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = reportsRef.current.find((x) => x.id === selectedId);
    if (!r) return;
    map.flyTo({
      center: [r.lng, r.lat],
      zoom: Math.max(map.getZoom(), 15),
      speed: 0.9,
      essential: true,
    });
  }, [selectedId]);

  return <div ref={box} style={{ position: 'absolute', inset: 0 }} />;
}