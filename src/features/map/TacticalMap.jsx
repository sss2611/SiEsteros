// src/features/map/TacticalMap.jsx
// Mapa Táctico 2D Offline de Santiago del Estero para POSTA
// Sobrio, militar y de alta legibilidad para centros de operaciones de emergencia.

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLevel, KIND_ICON, RESOURCE_INFO } from '../../shared/constants.js';
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
function makeTacticalPinIcon(level, selected, isNew = false, type = '', isArrived = false) {
  // Caso 1: Reporte donde el recurso ya llegó al lugar (Anillo verde pulsando + Pin azul con check)
  if (isArrived) {
    const html = `
      <div class="relative flex items-center justify-center" style="width:34px;height:34px">
        <span class="absolute -inset-3 rounded-full bg-emerald-500/75 animate-tactical-ping pointer-events-none"></span>
        <div class="relative flex items-center justify-center rounded-full border-2 border-sky-200 bg-sky-600 text-white shadow-[0_0_16px_rgba(14,165,233,0.95)]"
             style="width:30px;height:30px">
          <span class="font-bold text-xs select-none">✓</span>
        </div>
        <div class="absolute -bottom-1 w-1.5 h-1.5 rotate-45 bg-sky-500"></div>
      </div>
    `;
    return L.divIcon({
      html,
      iconSize: [34, 38],
      iconAnchor: [17, 19],
      className: 'tactical-arrived-pin',
    });
  }

  // Caso 2: Reportes de RUTA CORTADA -> Segmento y X roja
  if (type === 'ruta_cortada') {
    const selRing = selected ? 'ring-2 ring-cyan-400 scale-110 z-50' : '';
    const animSpawn = isNew ? 'animate-pin-spawn' : '';
    const html = `
      <div class="relative flex items-center justify-center ${animSpawn} ${selRing}" style="width:32px;height:32px">
        <div class="relative flex items-center justify-center rounded-full border-2 border-red-500 bg-red-950 text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.95)]"
             style="width:28px;height:28px">
          <span class="font-black text-sm select-none text-red-400">✕</span>
        </div>
        <div class="absolute -bottom-1 w-1.5 h-1.5 rotate-45 bg-red-600"></div>
      </div>
    `;
    return L.divIcon({
      html,
      iconSize: [32, 36],
      iconAnchor: [16, 18],
      className: 'tactical-cut-pin',
    });
  }

  const isCritical = level === 'critica';
  const isHigh     = level === 'alta';
  const isMedium   = level === 'media';

  // Sincronización EXACTA de colores con la leyenda (Punto 4):
  // CRÍTICA: Rojo bg-red-600
  // ALTA: Naranja bg-orange-500
  // MEDIA: Amarillo bg-yellow-500
  // BAJA: Gris bg-slate-500
  let bgClass = 'bg-slate-500 border-slate-300 text-white shadow-[0_0_6px_rgba(100,116,139,0.5)]';
  let letter  = 'B';
  let size    = 28;

  if (isCritical) {
    bgClass = 'bg-red-600 border-red-300 text-white shadow-[0_0_18px_rgba(239,68,68,0.95)]';
    letter  = 'C';
    size    = 34;
  } else if (isHigh) {
    bgClass = 'bg-orange-500 border-orange-200 text-white shadow-[0_0_12px_rgba(249,115,22,0.85)]';
    letter  = 'A';
    size    = 30;
  } else if (isMedium) {
    bgClass = 'bg-yellow-500 border-yellow-200 text-slate-950 font-black shadow-[0_0_10px_rgba(234,179,8,0.8)]';
    letter  = 'M';
    size    = 28;
  }

  const animSpawn = isNew ? 'animate-pin-spawn' : '';
  const animStrobe = isCritical ? 'animate-critical-strobe' : '';
  // Borde destacado (ring-2 ring-cyan-400) SOLO al reporte seleccionado
  const selRing = selected ? 'ring-2 ring-cyan-400 scale-110 z-50' : '';

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
      <div class="absolute -bottom-1 w-1.5 h-1.5 rotate-45 ${isCritical ? 'bg-red-600' : isHigh ? 'bg-orange-500' : isMedium ? 'bg-yellow-500' : 'bg-slate-500'}"></div>
    </div>
  `;

  return L.divIcon({
    html,
    iconSize: [size, size + 4],
    iconAnchor: [size / 2, size / 2 + 2],
    className: 'tactical-report-pin',
  });
}

/* ── Icono Reducido para Recurso Sugerido / En Tránsito ─────────── */
function makeSuggestedResourceIcon(type) {
  const info = RESOURCE_INFO[type] ?? { icon: '🚗' };
  const html = `
    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 border-2 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)] text-xs select-none animate-pulse">
      <span>${info.icon}</span>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'tactical-suggested-res',
  });
}

/* ── Icono Neutro para Lugares de Ejemplo (Escuelas, Hospitales) ─── */
function makePlaceIcon(kind) {
  const icon = KIND_ICON[kind] ?? '📍';
  const html = `
    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 border border-sky-400/50 shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-xs select-none hover:scale-110 hover:border-sky-300 transition-all">
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
export default function TacticalMap({
  reports,
  places,
  selectedId,
  onSelect,
  suggestedRoute,
  enCursoList = [],
  topZone,
  focusCoords,
}) {
  const mapContainerRef   = useRef(null);
  const mapRef            = useRef(null);
  const markersRef        = useRef(new Map()); // id → L.marker
  const cutBarricadesRef  = useRef(new Map()); // id → L.polyline (segmento rojo de ruta cortada)
  const placesMarkersRef  = useRef(new Map()); // placeId → L.marker
  const staticRouteRef    = useRef({ line: null, marker: null });
  const movingLayersRef   = useRef(new Map()); // itemId → { solidLine, dashedLine, marker }
  const topZoneCircleRef  = useRef(null);      // Círculo de Concentración de Refuerzos
  const onSelectRef       = useRef(onSelect);
  const knownReportIds    = useRef(new Set());
  const lastCriticalRef   = useRef(null);
  const tempPlaceTimerRef = useRef(null);
  const [tempPlaceId, setTempPlaceId] = useState(null);

  useEffect(() => {
    return () => {
      if (tempPlaceTimerRef.current) clearTimeout(tempPlaceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  /* ── 1. Inicialización del Mapa Leaflet Offline ─────────────────── */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: TACTICAL_CENTER,
      zoom: TACTICAL_ZOOM,
      minZoom: 11,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

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

      const latOffset = ring.radius / 111320;
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

    // D) Río Dulce
    L.polygon(RIO_DULCE.polygon, {
      color: '#0284c7',
      weight: 1.5,
      opacity: 0.6,
      fillColor: '#083344',
      fillOpacity: 0.45,
    }).addTo(map);

    L.marker(RIO_DULCE.labelPosition, {
      icon: L.divIcon({
        html: `<div class="tactical-river-tooltip">RÍO DULCE</div>`,
        iconSize: [84, 18],
        iconAnchor: [42, 9],
        className: '',
      }),
      interactive: false,
    }).addTo(map);

    // E) Avenidas Principales
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

    // F) Marcadores de Barrios
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

    // G) Lugares de Ejemplo (Escuelas, Hospitales)
    places.forEach((pl) => {
      const m = L.marker([pl.lat, pl.lng], { icon: makePlaceIcon(pl.kind) })
        .bindTooltip(pl.name, {
          direction: 'top',
          offset: [0, -12],
          className: 'tactical-place-tooltip',
        })
        .addTo(map);
      placesMarkersRef.current.set(pl.id, m);
    });

    const currentMarkers = markersRef.current;
    const currentBarricades = cutBarricadesRef.current;
    const currentPlaces = placesMarkersRef.current;
    const currentMoving = movingLayersRef.current;
    const currentKnownIds = knownReportIds.current;

    return () => {
      map.remove();
      mapRef.current = null;
      currentMarkers.clear();
      currentBarricades.clear();
      currentPlaces.clear();
      currentMoving.clear();
      currentKnownIds.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2. Renderizado Dinámico de Reportes y Rutas Cortadas ────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const barricades = cutBarricadesRef.current;
    const currentLiveIds = new Set();

    const arrivedIds = new Set(
      enCursoList.filter((item) => item.arrived).map((item) => item.report.id),
    );

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
      const isArrived = arrivedIds.has(r.id);

      const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      const k = coordIndices.get(key) ?? 0;
      coordIndices.set(key, k + 1);
      const [lat, lng] = spread(r.lat, r.lng, k);

      const icon = makeTacticalPinIcon(level, selected, isNew, r.type, isArrived);
      const zIndex = isArrived ? 2500 : selected ? 1500 : level === 'critica' ? 1000 : 500;

      // Dibujar o actualizar marcador del reporte
      if (!markers.has(r.id)) {
        const marker = L.marker([lat, lng], { icon, zIndexOffset: zIndex }).addTo(map);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRef.current?.(r.id);
        });
        markers.set(r.id, marker);

        if (r.placeId) {
          if (tempPlaceTimerRef.current) clearTimeout(tempPlaceTimerRef.current);
          setTempPlaceId(r.placeId);
          tempPlaceTimerRef.current = setTimeout(() => {
            setTempPlaceId((prev) => (prev === r.placeId ? null : prev));
          }, 3000);
        }

        if (level === 'critica' && lastCriticalRef.current !== r.id) {
          lastCriticalRef.current = r.id;
          map.panTo([lat, lng], { animate: true, duration: 1.2 });
        }
      } else {
        const marker = markers.get(r.id);
        marker.setIcon(icon);
        marker.setLatLng([lat, lng]);
        marker.setZIndexOffset(zIndex);
      }

      // Dibujo de segmento transversal para RUTAS CORTADAS (Punto 3)
      if (r.type === 'ruta_cortada') {
        const seg = [
          [lat - 0.0006, lng - 0.0008],
          [lat + 0.0006, lng + 0.0008],
        ];
        if (!barricades.has(r.id)) {
          const poly = L.polyline(seg, {
            color: '#ef4444',
            weight: 5,
            opacity: 0.95,
          }).addTo(map);
          barricades.set(r.id, poly);
        } else {
          barricades.get(r.id).setLatLngs(seg);
        }
      }

      knownReportIds.current.add(r.id);
    });

    // Limpiar marcadores y barricadas removidas
    for (const [id, marker] of markers) {
      if (!currentLiveIds.has(id)) {
        marker.remove();
        markers.delete(id);
        knownReportIds.current.delete(id);
      }
    }
    for (const [id, poly] of barricades) {
      if (!currentLiveIds.has(id)) {
        poly.remove();
        barricades.delete(id);
      }
    }
  }, [reports, selectedId, enCursoList]);

  /* ── 3. Tooltips de Lugares ─────────────────────────────────────── */
  useEffect(() => {
    const selectedReport = reports.find((x) => x.id === selectedId);
    const selectedPlaceId = selectedReport?.placeId;

    placesMarkersRef.current.forEach((marker, placeId) => {
      const shouldShow = placeId === selectedPlaceId || placeId === tempPlaceId;
      if (shouldShow) {
        marker.openTooltip();
      } else {
        marker.closeTooltip();
      }
    });
  }, [selectedId, tempPlaceId, reports]);

  /* ── 4. Ruta Táctica Sugerida Estática ───────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (staticRouteRef.current.line) {
      staticRouteRef.current.line.remove();
      staticRouteRef.current.line = null;
    }
    if (staticRouteRef.current.marker) {
      staticRouteRef.current.marker.remove();
      staticRouteRef.current.marker = null;
    }

    const isAlreadyMoving = enCursoList.some((item) => item.id === suggestedRoute?.report?.id);

    if (suggestedRoute?.from && suggestedRoute?.to && suggestedRoute?.resource && !isAlreadyMoving) {
      const line = L.polyline([suggestedRoute.from, suggestedRoute.to], {
        color: '#38bdf8',
        weight: 2,
        opacity: 0.75,
        dashArray: '5, 5',
      }).addTo(map);

      const marker = L.marker(suggestedRoute.from, {
        icon: makeSuggestedResourceIcon(suggestedRoute.resource.type),
        zIndexOffset: 2000,
        interactive: false,
      }).addTo(map);

      staticRouteRef.current = { line, marker };
    }
  }, [suggestedRoute, enCursoList]);

  /* ── 5. Animación de Despacho en Tránsito ────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const movingMap = movingLayersRef.current;
    const activeItemIds = new Set(enCursoList.map((item) => item.id));

    enCursoList.forEach((item) => {
      const from = [item.resource.lat, item.resource.lng];
      const to   = [item.report.lat, item.report.lng];
      const p    = Math.min(1, Math.max(0, item.progress));

      let layers = movingMap.get(item.id);

      // Si ya llegó a destino: remover capas de tránsito para revelar el pin de llegada
      if (item.arrived) {
        if (layers) {
          if (layers.solidLine) layers.solidLine.remove();
          if (layers.dashedLine) layers.dashedLine.remove();
          if (layers.marker) layers.marker.remove();
          movingMap.delete(item.id);
        }
        return;
      }

      const curLat = from[0] + (to[0] - from[0]) * p;
      const curLng = from[1] + (to[1] - from[1]) * p;
      const curPos = [curLat, curLng];

      if (!layers) {
        const solidLine = L.polyline([from, curPos], {
          color: '#00ff66',
          weight: 2.8,
          opacity: 0.9,
        }).addTo(map);

        const dashedLine = L.polyline([curPos, to], {
          color: '#38bdf8',
          weight: 2.2,
          opacity: 0.6,
          dashArray: '5, 5',
        }).addTo(map);

        const marker = L.marker(curPos, {
          icon: makeSuggestedResourceIcon(item.resource.type),
          zIndexOffset: 3000,
          interactive: false,
        }).addTo(map);

        layers = { solidLine, dashedLine, marker };
        movingMap.set(item.id, layers);
      } else {
        if (layers.solidLine) layers.solidLine.setLatLngs([from, curPos]);
        if (layers.dashedLine) layers.dashedLine.setLatLngs([curPos, to]);
        if (layers.marker) layers.marker.setLatLng(curPos);
      }
    });

    for (const [id, layers] of movingMap) {
      if (!activeItemIds.has(id)) {
        if (layers.solidLine) layers.solidLine.remove();
        if (layers.dashedLine) layers.dashedLine.remove();
        if (layers.marker) layers.marker.remove();
        movingMap.delete(id);
      }
    }
  }, [enCursoList]);

  /* ── 6. Círculo de Concentración de Refuerzos: Grupo #1 (Punto 1) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (topZoneCircleRef.current) {
      topZoneCircleRef.current.remove();
      topZoneCircleRef.current = null;
    }

    if (topZone && topZone.casesCount >= 1 && topZone.center) {
      const circle = L.circle(topZone.center, {
        radius: 500, // 500 metros
        color: '#f59e0b',
        weight: 2,
        dashArray: '6, 6',
        fill: true,
        fillColor: '#f59e0b',
        fillOpacity: 0.08,
      }).addTo(map);

      circle.bindTooltip(
        `CONCENTRAR REFUERZOS · ${topZone.casesCount} ${
          topZone.casesCount === 1 ? 'caso' : 'casos'
        } · ${topZone.totalPeople} pers.`,
        {
          permanent: true,
          direction: 'top',
          offset: [0, -12],
          className: 'tactical-reinforce-tooltip',
        },
      );

      topZoneCircleRef.current = circle;
    }
  }, [topZone]);

  /* ── 7. Centrado al seleccionar reporte o zona ──────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focusCoords) {
      map.flyTo(focusCoords, 14, { duration: 0.8 });
    } else if (selectedId) {
      const r = reports.find((x) => x.id === selectedId);
      if (r) map.flyTo([r.lat, r.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [selectedId, focusCoords, reports]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div id="map" ref={mapContainerRef} className="absolute inset-0 bg-[#090d16]" />

      {/* HUD Táctico Superior */}
      <div className="pointer-events-none absolute top-3 left-14 z-[400] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-[#090d16]/85 px-2.5 py-1 backdrop-blur-sm shadow-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
            MAPA TÁCTICO 2D ESQUEMÁTICO · SANTIAGO DEL ESTERO
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

      {/* Brackets Tácticos */}
      <div className="pointer-events-none absolute top-2 right-2 z-[400] w-4 h-4 border-t-2 border-r-2 border-emerald-500/40" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] w-4 h-4 border-b-2 border-l-2 border-emerald-500/40" />
      <div className="pointer-events-none absolute bottom-2 right-2 z-[400] w-4 h-4 border-b-2 border-r-2 border-emerald-500/40" />
    </div>
  );
}
