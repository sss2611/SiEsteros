// src/features/map/TacticalMap.jsx
// Mapa Táctico 2D Offline de Santiago del Estero para POSTA
// Sobrio, militar y de alta legibilidad para centros de operaciones de emergencia.

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLevel, KIND_ICON } from '../../shared/constants.js';
import {
  TACTICAL_CENTER,
  TACTICAL_ZOOM,
  RIO_DULCE,
  MAIN_AVENUES,
  BARRIOS,
  RADAR_RINGS,
} from './geoData.js';

/* ── Capa de Cuadrícula Táctica Oscura (Ultra Dark Canvas sin red) ── */
const TacticalGridLayer = L.GridLayer.extend({
  createTile(coords) {
    const size = this.getTileSize();
    const canvas = document.createElement('canvas');
    canvas.width = size.x;
    canvas.height = size.y;
    const ctx = canvas.getContext('2d');

    // Fondo ultra oscuro (#090d16)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size.x, size.y);

    // Sub-cuadrícula fina (gris/verde táctico muy sutil)
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.04)';
    ctx.lineWidth = 0.5;
    const subStep = 32;
    for (let x = 0; x <= size.x; x += subStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.y); ctx.stroke();
    }
    for (let y = 0; y <= size.y; y += subStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.x, y); ctx.stroke();
    }

    // Cuadrícula principal (verde/gris con mayor visibilidad)
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
    ctx.lineWidth = 0.75;
    const mainStep = 160;
    for (let x = 0; x <= size.x; x += mainStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.y); ctx.stroke();
    }
    for (let y = 0; y <= size.y; y += mainStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.x, y); ctx.stroke();
    }

    // Puntos de mira / cruces tácticas en intersecciones mayores (+)
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.28)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= size.x; x += mainStep) {
      for (let y = 0; y <= size.y; y += mainStep) {
        ctx.beginPath();
        ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
        ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
        ctx.stroke();
      }
    }

    // Coordenada táctica sutil en esquina del tile
    ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
    ctx.font = '8px ui-monospace, monospace';
    ctx.fillText(`Z${coords.z} [${coords.x},${coords.y}]`, 6, 12);

    return canvas;
  },
});

/* ── Pines Tácticos según Nivel de Prioridad (Color + Letra) ─────── */
function makeTacticalPinIcon(level, selected, isNew = false) {
  const isCritical = level === 'critica';
  const isHigh     = level === 'alta';
  const isMedium   = level === 'media';
  // baja

  // Tamaños y estilos según nivel
  let bgClass     = 'bg-slate-600 border-slate-400 text-white shadow-[0_0_6px_rgba(100,116,139,0.5)]';
  let letter      = 'B';
  let size        = 28;

  if (isCritical) {
    bgClass = 'bg-red-600 border-red-200 text-white shadow-[0_0_18px_rgba(239,68,68,0.95)]';
    letter  = 'C';
    size    = 34;
  } else if (isHigh) {
    bgClass = 'bg-orange-600 border-orange-300 text-white shadow-[0_0_12px_rgba(234,88,12,0.8)]';
    letter  = 'A';
    size    = 30;
  } else if (isMedium) {
    bgClass = 'bg-amber-500 border-amber-200 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.7)]';
    letter  = 'M';
    size    = 28;
  }

  const animSpawn = isNew ? 'animate-pin-spawn' : '';
  const animStrobe = isCritical ? 'animate-critical-strobe' : '';
  const selRing = selected
    ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-110 z-50'
    : '';

  // HTML con efecto de pulso para CRÍTICA (animate-tactical-ping)
  const pingHtml = isCritical
    ? `<span class="absolute -inset-3 rounded-full bg-red-500/60 animate-tactical-ping pointer-events-none"></span>`
    : '';

  const html = `
    <div class="relative flex items-center justify-center ${animSpawn}" style="width:${size}px;height:${size}px">
      ${pingHtml}
      <div class="relative flex items-center justify-center rounded-full border-2 ${bgClass} ${animStrobe} ${selRing} transition-all duration-200"
           style="width:${size}px;height:${size}px">
        <span class="font-mono font-black text-xs sm:text-sm tracking-tight select-none">${letter}</span>
      </div>
      <!-- Indicador de aguja/pin inferior sutil -->
      <div class="absolute -bottom-1 w-1.5 h-1.5 rotate-45 ${isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : isMedium ? 'bg-amber-400' : 'bg-slate-500'}"></div>
    </div>
  `;

  return L.divIcon({
    html,
    iconSize: [size, size + 4],
    iconAnchor: [size / 2, size / 2 + 2],
    className: 'tactical-report-pin',
  });
}

/* ── Icono Neutro para Lugares de Ejemplo (Escuelas, Hospitales) ─── */
function makePlaceIcon(kind) {
  const icon = KIND_ICON[kind] ?? '📍';
  const html = `
    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 border border-sky-400/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-xs select-none hover:scale-110 transition-transform">
      <span>${icon}</span>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'tactical-place-pin',
  });
}

/* ── Offset Espiral para Reportes Superpuestos ───────────────────── */
function spread(lat, lng, k) {
  if (k === 0) return [lat, lng];
  const ang = k * 2.4;
  const r = 0.00035; // ~35 m de separación visual
  return [lat + Math.cos(ang) * r, lng + Math.sin(ang) * r];
}

/* ── Componente Principal: TacticalMap ───────────────────────────── */
export default function TacticalMap({ reports, places, selectedId, onSelect }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef(new Map()); // id → L.marker
  const onSelectRef     = useRef(onSelect);
  const knownReportIds  = useRef(new Set()); // Para animar solo los recién llegados
  const lastCriticalRef = useRef(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  /* ── 1. Inicialización del Mapa Leaflet Offline ─────────────────── */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Instancia Leaflet sin capas externas ni CDN
    const map = L.map(mapContainerRef.current, {
      center: TACTICAL_CENTER,
      zoom: TACTICAL_ZOOM,
      minZoom: 11,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

    // Deseleccionar al hacer click en el fondo del mapa
    map.on('click', () => onSelectRef.current?.(null));

    // A) Capa Canvas Ultra Oscura con Cuadrícula Militar (#090d16)
    new TacticalGridLayer({ maxZoom: 18, minZoom: 10 }).addTo(map);

    // B) Círculos Concéntricos de Radar (1km, 2km, 3km)
    RADAR_RINGS.forEach((ring) => {
      L.circle(TACTICAL_CENTER, {
        radius: ring.radius,
        color: '#00ff66',
        weight: 1.2,
        opacity: 0.16,
        fill: true,
        fillColor: '#00ff66',
        fillOpacity: 0.012,
        dashArray: '4, 8',
      }).addTo(map);

      // Etiqueta táctica en el borde del anillo (Norte)
      const latOffset = ring.radius / 111320; // 1° latitud ≈ 111.32 km
      const labelPos = [TACTICAL_CENTER[0] + latOffset, TACTICAL_CENTER[1]];
      L.marker(labelPos, {
        icon: L.divIcon({
          html: `<div class="tactical-radar-range">[${ring.label}]</div>`,
          iconSize: [40, 14],
          iconAnchor: [20, 7],
          className: '',
        }),
        interactive: false,
      }).addTo(map);
    });

    // C) Retícula central de Radar (+)
    L.circle(TACTICAL_CENTER, {
      radius: 60,
      color: '#00ff66',
      weight: 1.5,
      opacity: 0.35,
      fill: true,
      fillColor: '#00ff66',
      fillOpacity: 0.08,
    }).addTo(map);

    // D) Río Dulce: Polígono ancho y ondulado (azul/cian apagado)
    L.polygon(RIO_DULCE.polygon, {
      color: '#0284c7',
      weight: 1.5,
      opacity: 0.6,
      fillColor: '#083344',
      fillOpacity: 0.45,
    }).addTo(map);

    // Etiqueta táctica visible de Río Dulce
    L.marker(RIO_DULCE.labelPosition, {
      icon: L.divIcon({
        html: `<div class="tactical-river-tooltip">RÍO DULCE</div>`,
        iconSize: [84, 18],
        iconAnchor: [42, 9],
        className: '',
      }),
      interactive: false,
    }).addTo(map);

    // E) Avenidas Principales (Trazados y etiquetas tácticas)
    MAIN_AVENUES.forEach((av) => {
      L.polyline(av.coords, {
        color: av.style.color,
        weight: av.style.weight,
        opacity: av.style.opacity,
        dashArray: av.style.dashArray || null,
      }).addTo(map);

      if (av.labelPos) {
        L.marker(av.labelPos, {
          icon: L.divIcon({
            html: `<div class="tactical-street-tooltip">${av.name}</div>`,
            iconSize: [80, 16],
            iconAnchor: [40, 8],
            className: '',
          }),
          interactive: false,
        }).addTo(map);
      }
    });

    // F) Marcadores de Barrios (Tooltips fijos)
    BARRIOS.forEach((b) => {
      L.marker([b.lat, b.lng], {
        icon: L.divIcon({
          html: `<div class="w-1.5 h-1.5 rounded-full bg-emerald-400/50"></div>`,
          iconSize: [6, 6],
          iconAnchor: [3, 3],
          className: '',
        }),
      })
        .bindTooltip(b.name, {
          permanent: true,
          direction: 'bottom',
          offset: [0, 4],
          className: 'tactical-barrio-tooltip',
        })
        .addTo(map);
    });

    // G) 8 Lugares de Ejemplo (Escuelas, Hospitales) con tooltips visibles
    places.forEach((pl) => {
      L.marker([pl.lat, pl.lng], { icon: makePlaceIcon(pl.kind) })
        .bindTooltip(pl.name, {
          permanent: true,
          direction: 'top',
          offset: [0, -12],
          className: 'tactical-place-tooltip',
        })
        .addTo(map);
    });

    const currentMarkers = markersRef.current;
    const currentKnownIds = knownReportIds.current;

    return () => {
      map.remove();
      mapRef.current = null;
      currentMarkers.clear();
      currentKnownIds.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2. Renderizado Dinámico de Reportes (Pines C/A/M/B) ────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const currentLiveIds = new Set();

    // Contabilizar reportes superpuestos para offset espiral
    const coordCounts = new Map();
    reports.forEach((r) => {
      const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      coordCounts.set(key, (coordCounts.get(key) ?? 0) + 1);
    });
    const coordIndices = new Map();

    reports.forEach((r) => {
      currentLiveIds.add(r.id);
      const level = getLevel(r.score);
      const selected = r.id === selectedId;
      const isNew = !knownReportIds.current.has(r.id);

      // Desplazamiento si están superpuestos
      const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      const k = coordIndices.get(key) ?? 0;
      coordIndices.set(key, k + 1);
      const [lat, lng] = spread(r.lat, r.lng, k);

      const icon = makeTacticalPinIcon(level, selected, isNew);
      const zIndex = selected ? 1500 : level === 'critica' ? 1000 : 500;

      if (!markers.has(r.id)) {
        // Marcador nuevo
        const marker = L.marker([lat, lng], { icon, zIndexOffset: zIndex }).addTo(map);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRef.current?.(r.id);
        });
        markers.set(r.id, marker);

        // Interacción especial si es reporte CRÍTICO inyectado
        if (level === 'critica' && lastCriticalRef.current !== r.id) {
          lastCriticalRef.current = r.id;
          // Centrado suave del mapa para el video
          map.panTo([lat, lng], { animate: true, duration: 1.2 });
        }
      } else {
        // Actualizar marcador existente
        const marker = markers.get(r.id);
        marker.setIcon(icon);
        marker.setLatLng([lat, lng]);
        marker.setZIndexOffset(zIndex);
      }

      knownReportIds.current.add(r.id);
    });

    // Limpiar marcadores removidos
    for (const [id, marker] of markers) {
      if (!currentLiveIds.has(id)) {
        marker.remove();
        markers.delete(id);
        knownReportIds.current.delete(id);
      }
    }
  }, [reports, selectedId]);

  /* ── 3. Centrado al seleccionar reporte ─────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = reports.find((x) => x.id === selectedId);
    if (!r) return;
    map.flyTo([r.lat, r.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [selectedId, reports]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Contenedor del mapa Leaflet */}
      <div id="map" ref={mapContainerRef} className="absolute inset-0 bg-[#090d16]" />

      {/* HUD Táctico Superior (Estilo Central de Operaciones) */}
      <div className="pointer-events-none absolute top-3 left-14 z-[400] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-[#090d16]/85 px-2.5 py-1 backdrop-blur-sm shadow-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
            MAPA TÁCTICO 2D · SANTIAGO DEL ESTERO
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded border border-slate-700/60 bg-slate-900/85 px-2 py-1 text-[9px] font-mono text-slate-400">
          <span>RADAR:</span>
          <span className="font-bold text-emerald-400">3 KM</span>
          <span className="text-slate-600">|</span>
          <span>GRID:</span>
          <span className="text-slate-300">27°47'S 64°15'W</span>
        </div>
      </div>

      {/* Brackets Tácticos en las esquinas para estética militar */}
      <div className="pointer-events-none absolute top-2 right-2 z-[400] w-4 h-4 border-t-2 border-r-2 border-emerald-500/40" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] w-4 h-4 border-b-2 border-l-2 border-emerald-500/40" />
      <div className="pointer-events-none absolute bottom-2 right-2 z-[400] w-4 h-4 border-b-2 border-r-2 border-emerald-500/40" />
    </div>
  );
}
