// src/shared/helpers.js
// Funciones auxiliares para cálculo táctico de distancias, ETA, asignación de recursos y zonas de riesgo.

/**
 * Distancia en línea recta (Haversine) entre dos coordenadas geográficas en kilómetros.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Distancia mínima en kilómetros desde un punto P hasta un segmento de recta AB.
 */
export function distancePointToSegmentKm(pLat, pLng, aLat, aLng, bLat, bLng) {
  const meanLat = (((aLat + bLat + pLat) / 3) * Math.PI) / 180;
  const kx = 111.32 * Math.cos(meanLat);
  const ky = 110.574;

  const ax = aLng * kx, ay = aLat * ky;
  const bx = bLng * kx, by = bLat * ky;
  const px = pLng * kx, py = pLat * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Tiempo estimado de llegada (ETA) en minutos a velocidad fija de 30 km/h.
 */
export function calculateEtaMinutes(distKm, speedKmh = 30) {
  const hours = distKm / speedKmh;
  const mins = Math.round(hours * 60);
  return Math.max(1, mins); // Mínimo 1 minuto
}

/**
 * BUGFIX CRÍTICO (0): Busca el recurso disponible respetando el ORDEN ESTRICTO de typeMap.
 * Busca primero disponibles del primer tipo preferido (ej: heridos -> ambulancia;
 * atrapados/incendio -> bomberos). Si hay varios, elige el más cercano de ese tipo.
 * SOLO si no hay ninguno disponible de ese tipo, pasa al segundo tipo preferido.
 *
 * Verificación Punto 0:
 * En un reporte de "heridos", aunque Defensa Civil esté a 200m y la Ambulancia esté a 1.5km,
 * el algoritmo devolverá estrictamente la Ambulancia (tipo prioritario 1) antes que Defensa Civil.
 */
export function findBestMatchingResource(report, resources, activeReports = []) {
  if (!report || !resources) return null;

  const typeMap = {
    incendio:     ['bomberos', 'defensa_civil'],
    atrapados:    ['bomberos', 'defensa_civil', 'ambulancia'],
    estructura:   ['bomberos', 'defensa_civil'],
    heridos:      ['ambulancia', 'bomberos', 'defensa_civil'],
    sin_agua:     ['defensa_civil', 'bomberos'],
    ruta_cortada: ['policia', 'defensa_civil'],
    ok:           ['defensa_civil', 'policia'],
  };

  const preferred = typeMap[report.type] || [];
  const available = resources.filter((r) => r.status === 'disponible');
  if (available.length === 0) return null;

  let best = null;
  let minDist = Infinity;

  // 1. Iterar en ORDEN ESTRICTO de preferencia
  for (const preferredType of preferred) {
    const ofThisType = available.filter((r) => r.type === preferredType);
    if (ofThisType.length > 0) {
      // Elegir el más cercano DENTRO de este tipo prioritario
      for (const res of ofThisType) {
        const dist = calculateDistanceKm(res.lat, res.lng, report.lat, report.lng);
        if (dist < minDist) {
          minDist = dist;
          best = res;
        }
      }
      // Detener búsqueda: ya encontramos la unidad con la mayor idoneidad funcional
      break;
    }
  }

  // 2. Si ninguno de los tipos preferidos tiene unidades libres, fallback general
  if (!best) {
    for (const res of available) {
      const dist = calculateDistanceKm(res.lat, res.lng, report.lat, report.lng);
      if (dist < minDist) {
        minDist = dist;
        best = res;
      }
    }
  }

  if (!best) return null;

  let etaMin = calculateEtaMinutes(minDist, 30);
  let adjustedByCutRoute = false;

  // 3. Heurística de Ruta Cortada: Si la recta pasa a menos de 300m de una ruta_cortada activa
  if (activeReports && activeReports.length > 0) {
    const cutRoutes = activeReports.filter(
      (r) => r.type === 'ruta_cortada' && r.status !== 'atendido' && r.status !== 'descartado',
    );
    for (const cr of cutRoutes) {
      const distToRoute = distancePointToSegmentKm(
        cr.lat,
        cr.lng,
        best.lat,
        best.lng,
        report.lat,
        report.lng,
      );
      if (distToRoute < 0.3) {
        adjustedByCutRoute = true;
        etaMin = Math.ceil(etaMin * 1.4);
        break;
      }
    }
  }

  return {
    resource: best,
    distanceKm: minDist,
    etaMin,
    adjustedByCutRoute,
  };
}

/**
 * Agrupa reportes activos (status no 'ok', 'atendido', 'descartado') por proximidad (~500m).
 * Retorna las zonas ordenadas por carga (casos, personas, suma de scores).
 */
export function calculateRiskZones(reports, places, radiusKm = 0.5) {
  if (!reports || reports.length === 0) return [];

  const activeReports = reports.filter(
    (r) => r.status !== 'atendido' && r.status !== 'descartado' && r.type !== 'ok',
  );
  if (activeReports.length === 0) return [];

  const clusters = [];

  activeReports.forEach((r) => {
    let matchedCluster = null;
    let minDist = Infinity;

    for (const c of clusters) {
      const d = calculateDistanceKm(r.lat, r.lng, c.center[0], c.center[1]);
      if (d <= radiusKm && d < minDist) {
        minDist = d;
        matchedCluster = c;
      }
    }

    if (matchedCluster) {
      matchedCluster.reports.push(r);
      const n = matchedCluster.reports.length;
      matchedCluster.center = [
        matchedCluster.reports.reduce((sum, item) => sum + item.lat, 0) / n,
        matchedCluster.reports.reduce((sum, item) => sum + item.lng, 0) / n,
      ];
    } else {
      clusters.push({
        id: `zone-${clusters.length + 1}`,
        center: [r.lat, r.lng],
        reports: [r],
      });
    }
  });

  const enrichedZones = clusters.map((c, idx) => {
    const casesCount = c.reports.length;
    const totalPeople = c.reports.reduce((acc, r) => acc + (r.people || 0), 0);
    const totalScore = c.reports.reduce((acc, r) => acc + (r.score || 0), 0);
    const maxScore = Math.max(...c.reports.map((r) => r.score || 0));

    // Nombre representativo del lugar
    const placeIds = c.reports.map((r) => r.placeId).filter(Boolean);
    let zoneName = `Sector #${idx + 1}`;
    if (placeIds.length > 0 && places) {
      const foundPlace = places.find((p) => p.id === placeIds[0]);
      if (foundPlace) zoneName = foundPlace.name;
    } else if (places) {
      let nearest = null;
      let minD = Infinity;
      for (const pl of places) {
        const d = calculateDistanceKm(c.center[0], c.center[1], pl.lat, pl.lng);
        if (d < minD) {
          minD = d;
          nearest = pl;
        }
      }
      if (nearest && minD < 1.0) zoneName = nearest.name;
    }

    return {
      id: c.id,
      name: zoneName,
      center: c.center,
      reportIds: new Set(c.reports.map((r) => r.id)),
      casesCount,
      totalPeople,
      totalScore,
      maxScore,
    };
  });

  // Ordenar de mayor a menor carga: suma de scores + peso por cantidad de casos
  enrichedZones.sort(
    (a, b) => b.totalScore + b.casesCount * 10 - (a.totalScore + a.casesCount * 10),
  );

  return enrichedZones;
}

/**
 * Recalcula el score en vivo multiplicando los factores del objeto 'why' por los sliders (0-100).
 */
export function computeAdjustedScore(
  report,
  weights = { riesgoVida: 100, vulnerabilidad: 100, personas: 100, tiempo: 100 },
) {
  if (!report || !report.why) return report?.score ?? 0;

  const wLife   = (weights.riesgoVida ?? 100) / 100;
  const wVuln   = (weights.vulnerabilidad ?? 100) / 100;
  const wPeople = (weights.personas ?? 100) / 100;
  const wTime   = (weights.tiempo ?? 100) / 100;

  if (wLife === 1 && wVuln === 1 && wPeople === 1 && wTime === 1) {
    return report.score;
  }

  const rawLife   = (report.why.riesgoVida ?? 0) * wLife;
  const rawVuln   = (report.why.vulnerabilidad ?? 0) * wVuln;
  const rawPeople = (report.why.personas ?? 0) * wPeople;
  const rawTime   = (report.why.tiempo ?? 0) * wTime;

  const sumWeights = wLife + wVuln + wPeople + wTime;
  if (sumWeights === 0) return 0;

  const scoreCalculated =
    (rawLife * 0.45 + rawVuln * 0.25 + rawPeople * 0.20 + rawTime * 0.10) *
    (4 / sumWeights);

  return Math.min(99, Math.max(1, Math.round(scoreCalculated)));
}
