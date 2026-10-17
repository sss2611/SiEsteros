// src/features/map/CityMap.jsx
// Mapa Leaflet con capa oscura de cuadrícula (sin tiles externos).
// Soporta /public/tiles/{z}/{x}/{y}.png si existen; si no, usa la cuadrícula.

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLevel, LEVEL_INFO, TYPE_INFO, KIND_ICON } from '../../shared/constants.js';

const CENTER = [-27.7900, -64.2600];

/* ── Capa de cuadrícula oscura (tipo radar, sin requests externos) ─── */
const DarkGridLayer = L.GridLayer.extend({
  createTile() {
    const size = this.getTileSize();
    const canvas = document.createElement('canvas');
    canvas.width  = size.x;
    canvas.height = size.y;
    const ctx = canvas.getContext('2d');

    // Fondo oscuro
    ctx.fillStyle = '#0c1b2e';
    ctx.fillRect(0, 0, size.x, size.y);

    // Cuadrícula menor
    ctx.strokeStyle = 'rgba(60,100,70,0.18)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size.x; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size.y); ctx.stroke();
    }
    for (let i = 0; i <= size.y; i += 32) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size.x, i); ctx.stroke();
    }

    // Cuadrícula mayor (cada 5 celdas)
    ctx.strokeStyle = 'rgba(70,120,80,0.35)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i <= size.x; i += 160) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size.y); ctx.stroke();
    }
    for (let i = 0; i <= size.y; i += 160) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size.x, i); ctx.stroke();
    }

    return canvas;
  },
});

/* ── Construcción de pin SVG ─────────────────────────────────────── */
function makePinIcon(level, selected) {
  const info = LEVEL_INFO[level];
  const fill   = info.pinFill;
  const letter = info.letter;
  const sc = selected ? 1.28 : 1.0;
  const w  = Math.round(32 * sc);
  const h  = Math.round(40 * sc);
  const pulse = level === 'critica'
    ? 'style="animation:pin-pulse 1s ease-in-out infinite;transform-origin:50% 100%"'
    : '';

  const html = `<div ${pulse} style="width:${w}px;height:${h}px">
    <svg width="${w}" height="${h}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 1C8.3 1 2 7.3 2 15C2 25.3 16 39 16 39S30 25.3 30 15C30 7.3 23.7 1 16 1Z"
            fill="${fill}" stroke="rgba(0,0,0,0.45)" stroke-width="1.5"/>
      <circle cx="16" cy="15" r="8.5" fill="rgba(0,0,0,0.32)"/>
      <text x="16" y="19.2" text-anchor="middle" font-size="9.5" font-weight="700"
            font-family="ui-monospace,monospace,sans-serif" fill="white">${letter}</text>
    </svg>
  </div>`;

  return L.divIcon({ html, iconSize: [w, h], iconAnchor: [w / 2, h], className: '' });
}

/* ── Icono de lugar ──────────────────────────────────────────────── */
function makePlaceIcon(kind) {
  const icon = KIND_ICON[kind] ?? '📍';
  const html = `<div style="width:22px;height:22px;border-radius:50%;
    background:#1e3a5f;border:1px solid #2563eb;display:flex;
    align-items:center;justify-content:center;font-size:12px;
    line-height:1;box-shadow:0 1px 4px rgba(0,0,0,0.6)">${icon}</div>`;
  return L.divIcon({ html, iconSize: [22, 22], iconAnchor: [11, 11], className: '' });
}

/* ── Offset espiral para pines superpuestos ──────────────────────── */
function spread(lat, lng, k) {
  if (k === 0) return [lat, lng];
  const ang = k * 2.4;
  const r = 0.0003; // ~30 m
  return [lat + Math.cos(ang) * r, lng + Math.sin(ang) * r];
}

/* ── Componente ──────────────────────────────────────────────────── */
export default function CityMap({ reports, places, selectedId, onSelect }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markersRef    = useRef(new Map()); // id → { marker, el }
  const placeMarkers  = useRef([]);
  const onSelectRef   = useRef(onSelect);

  useEffect(() => { onSelectRef.current = onSelect; });

  /* Inicializar mapa una sola vez */
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CENTER,
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;

    // Intentar cargar tiles locales; si fallan, usar cuadrícula
    const tileUrl = '/tiles/{z}/{x}/{y}.png';
    const testImg = new Image();
    testImg.onload = () => {
      L.tileLayer(tileUrl, { maxZoom: 18, minZoom: 10 }).addTo(map);
    };
    testImg.onerror = () => {
      new DarkGridLayer({ maxZoom: 18, minZoom: 10 }).addTo(map);
    };
    testImg.src = '/tiles/14/5424/9689.png'; // tile aproximado para Santiago

    // Clic en fondo del mapa → deseleccionar
    map.on('click', () => onSelectRef.current(null));

    // Marcadores de lugares
    places.forEach((pl) => {
      const m = L.marker([pl.lat, pl.lng], { icon: makePlaceIcon(pl.kind) })
        .bindTooltip(pl.name, { direction: 'top', className: 'posta-tooltip' })
        .addTo(map);
      placeMarkers.current.push(m);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      placeMarkers.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Actualizar pines de reportes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const live = new Set();

    // Contar cuántos reportes comparten la misma coordenada (para offset espiral)
    const coordCount = new Map();
    reports.forEach((r) => {
      const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      coordCount.set(key, (coordCount.get(key) ?? 0) + 1);
    });
    const coordIdx = new Map();

    reports.forEach((r) => {
      live.add(r.id);
      const level    = getLevel(r.score);
      const selected = r.id === selectedId;

      const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      const k   = coordIdx.get(key) ?? 0;
      coordIdx.set(key, k + 1);
      const [lat, lng] = spread(r.lat, r.lng, k);

      const icon = makePinIcon(level, selected);

      if (!markers.has(r.id)) {
        const marker = L.marker([lat, lng], { icon, zIndexOffset: selected ? 1000 : level === 'critica' ? 500 : 0 })
          .addTo(map);
        marker.on('click', (e) => { L.DomEvent.stopPropagation(e); onSelectRef.current(r.id); });
        markers.set(r.id, marker);
      } else {
        const marker = markers.get(r.id);
        marker.setIcon(icon);
        marker.setLatLng([lat, lng]);
        marker.setZIndexOffset(selected ? 1000 : level === 'critica' ? 500 : 0);
      }
    });

    // Eliminar marcadores de reportes que ya no están
    for (const [id, marker] of markers) {
      if (!live.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [reports, selectedId]);

  /* Volar hacia el reporte seleccionado */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = reports.find((x) => x.id === selectedId);
    if (!r) return;
    map.flyTo([r.lat, r.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={containerRef} className="absolute inset-0" />;
}