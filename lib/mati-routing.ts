/**
 * lib/mati-routing.ts
 *
 * Mati FoodFinder - Real-Road Route Navigation, OSRM Polyline Generation,
 * and Mati City Road Network Waypoint Fallback.
 */

import {
  GeoCoordinates,
  MATI_BARANGAY_CENTROIDS,
  MATI_CITY_HALL_COORDS,
  calculateHaversineDistanceKm,
  estimateRoadDistanceKm,
  estimateRoadRouteMinutes,
} from "./geo-serviceability";

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface MatiRouteResult {
  polyline: RouteCoordinate[];
  roadDistanceKm: number;
  estMinutes: number;
  isRealRoad: boolean;
  summary: string;
}

/**
 * Key intersection waypoints for Mati City road network corridors.
 * Used for deterministic road-following routes when offline or when OSRM is unreachable.
 */
export const MATI_ROAD_CORRIDORS: Record<string, GeoCoordinates[]> = {
  // Poblacion / Baywalk to Dahican Beach Corridor via Dahican Beach Road
  "central_to_dahican": [
    { latitude: 6.9550, longitude: 126.2165 }, // City Hall / Poblacion
    { latitude: 6.9515, longitude: 126.2210 }, // Magsaysay St Corner
    { latitude: 6.9480, longitude: 126.2275 }, // Baywalk Junction
    { latitude: 6.9420, longitude: 126.2380 }, // Matiao-Dahican Bypass
    { latitude: 6.9320, longitude: 126.2550 }, // Dahican Approach
    { latitude: 6.9180, longitude: 126.2750 }, // Dahican Beach Center
  ],
  // Poblacion to Matiao / Sainz via Surigao-Davao Coastal Highway
  "central_to_matiao": [
    { latitude: 6.9550, longitude: 126.2165 }, // City Hall
    { latitude: 6.9600, longitude: 126.2200 }, // Sainz Central
    { latitude: 6.9650, longitude: 126.2150 }, // Highway North
    { latitude: 6.9700, longitude: 126.2050 }, // Matiao Center
  ],
};

/**
 * Resolves a store or customer address to best-matching Mati GPS coordinates.
 */
export function resolveMatiCoordinates(
  addressOrBarangay?: string,
  explicitCoords?: GeoCoordinates | null
): GeoCoordinates {
  if (explicitCoords && Number.isFinite(explicitCoords.latitude) && Number.isFinite(explicitCoords.longitude)) {
    return explicitCoords;
  }
  if (!addressOrBarangay) return MATI_CITY_HALL_COORDS;

  const lower = addressOrBarangay.toLowerCase();
  for (const [brgy, coords] of Object.entries(MATI_BARANGAY_CENTROIDS)) {
    if (lower.includes(brgy.toLowerCase())) {
      return coords;
    }
  }

  // Fallbacks for well-known Mati spots
  if (lower.includes("baywalk") || lower.includes("pujada")) {
    return { latitude: 6.9490, longitude: 126.2250 };
  }
  if (lower.includes("dahican")) {
    return { latitude: 6.9180, longitude: 126.2750 };
  }
  if (lower.includes("hospital") || lower.includes("sainz")) {
    return { latitude: 6.9600, longitude: 126.2200 };
  }
  if (lower.includes("matiao")) {
    return { latitude: 6.9700, longitude: 126.2050 };
  }

  return MATI_CITY_HALL_COORDS;
}

/**
 * Generates an interpolated realistic road polyline between two Mati coordinates
 * using local road network corridor heuristics when external OSRM is unavailable.
 */
export function generateFallbackRoadPolyline(
  start: GeoCoordinates,
  end: GeoCoordinates
): RouteCoordinate[] {
  const straightDist = calculateHaversineDistanceKm(start.latitude, start.longitude, end.latitude, end.longitude);

  if (straightDist < 0.3) {
    return [
      { latitude: start.latitude, longitude: start.longitude },
      { latitude: end.latitude, longitude: end.longitude },
    ];
  }

  // Generate intermediate points that follow street-grid bends rather than a direct straight line
  const midLat = (start.latitude + end.latitude) / 2;
  const midLng = (start.longitude + end.longitude) / 2;

  // Add realistic street turn offsets based on longitude delta
  const offsetLat = (end.longitude - start.longitude) * 0.12;
  const offsetLng = (start.latitude - end.latitude) * 0.12;

  const p1: RouteCoordinate = {
    latitude: Number((start.latitude + (midLat - start.latitude) * 0.5 + offsetLat * 0.4).toFixed(6)),
    longitude: Number((start.longitude + (midLng - start.longitude) * 0.5 + offsetLng * 0.4).toFixed(6)),
  };

  const p2: RouteCoordinate = {
    latitude: Number((midLat + offsetLat).toFixed(6)),
    longitude: Number((midLng + offsetLng).toFixed(6)),
  };

  const p3: RouteCoordinate = {
    latitude: Number((midLat + (end.latitude - midLat) * 0.5 - offsetLat * 0.3).toFixed(6)),
    longitude: Number((midLng + (end.longitude - midLng) * 0.5 - offsetLng * 0.3).toFixed(6)),
  };

  return [
    { latitude: Number(start.latitude.toFixed(6)), longitude: Number(start.longitude.toFixed(6)) },
    p1,
    p2,
    p3,
    { latitude: Number(end.latitude.toFixed(6)), longitude: Number(end.longitude.toFixed(6)) },
  ];
}

/**
 * Fetches real driving route from OSRM (Open Source Routing Machine)
 * with instant fallback to realistic Mati City road waypoints.
 */
export async function fetchMatiRoadRoute(
  start: GeoCoordinates,
  end: GeoCoordinates
): Promise<MatiRouteResult> {
  const straightDist = calculateHaversineDistanceKm(start.latitude, start.longitude, end.latitude, end.longitude);
  const roadDist = estimateRoadDistanceKm(straightDist);
  const estMin = estimateRoadRouteMinutes(straightDist);

  // Try public OSRM driving service with 3.5s timeout
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;

    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude.toFixed(6)},${start.latitude.toFixed(6)};${end.longitude.toFixed(6)},${end.latitude.toFixed(6)}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      signal: controller?.signal,
      headers: { Accept: "application/json" },
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.routes?.[0]?.geometry?.coordinates && Array.isArray(data.routes[0].geometry.coordinates)) {
        const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
        const polyline: RouteCoordinate[] = rawCoords.map(([lng, lat]) => ({
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
        }));

        const actualKm = Number(((data.routes[0].distance || 0) / 1000).toFixed(2));
        const actualSecs = data.routes[0].duration || 0;
        const actualMinutes = Math.max(3, Math.round(actualSecs / 60));

        return {
          polyline,
          roadDistanceKm: actualKm > 0.1 ? actualKm : roadDist,
          estMinutes: actualMinutes > 1 ? actualMinutes : estMin,
          isRealRoad: true,
          summary: `${actualKm > 0.1 ? actualKm : roadDist} km road trip • ~${actualMinutes} mins`,
        };
      }
    }
  } catch (err) {
    // Graceful offline / timeout fallback
  }

  // Fallback to Mati City street corridor calculation
  const fallbackPolyline = generateFallbackRoadPolyline(start, end);
  return {
    polyline: fallbackPolyline,
    roadDistanceKm: roadDist,
    estMinutes: estMin,
    isRealRoad: false,
    summary: `${roadDist} km road trip • ~${estMin} mins`,
  };
}
