/**
 * lib/geo-serviceability.ts
 *
 * Mati FoodFinder - PostGIS Coordinate Parsing, Mati Barangay Centroids,
 * Straight-Line vs. Road Route Calculation, and Delivery Serviceability Engine.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/** Canonical Mati City Hall / Poblacion Center GPS coordinates */
export const MATI_CITY_HALL_COORDS: GeoCoordinates = {
  latitude: 6.9550,
  longitude: 126.2165,
};

/**
 * Canonical centroids for Mati City barangays used for delivery zone calculation
 * and fallback customer address pinning.
 */
export const MATI_BARANGAY_CENTROIDS: Record<string, GeoCoordinates> = {
  "Central (City Proper/Poblacion)": { latitude: 6.9550, longitude: 126.2165 },
  "Central (Poblacion)": { latitude: 6.9550, longitude: 126.2165 },
  "Central": { latitude: 6.9550, longitude: 126.2165 },
  "Badas": { latitude: 6.9400, longitude: 126.1700 },
  "Bobon": { latitude: 6.8450, longitude: 126.2800 },
  "Buso": { latitude: 6.9750, longitude: 126.1550 },
  "Cabuaya": { latitude: 6.7850, longitude: 126.2650 },
  "Culian": { latitude: 7.0100, longitude: 126.2400 },
  "Dahican": { latitude: 6.9180, longitude: 126.2750 },
  "Danao": { latitude: 6.9050, longitude: 126.1400 },
  "Dawan": { latitude: 6.9450, longitude: 126.1200 },
  "Don Enrique Lopez": { latitude: 6.9850, longitude: 126.2150 },
  "Don Martin Marundan": { latitude: 6.9750, longitude: 126.2300 },
  "Don Salvador Lopez, Sr.": { latitude: 7.0300, longitude: 126.2200 },
  "Langka": { latitude: 6.9250, longitude: 126.1850 },
  "Lawigan": { latitude: 6.7550, longitude: 126.2550 },
  "Libudon": { latitude: 6.9850, longitude: 126.2500 },
  "Luban": { latitude: 6.8050, longitude: 126.2700 },
  "Macambol": { latitude: 6.8750, longitude: 126.3400 },
  "Mamali": { latitude: 6.9550, longitude: 126.1600 },
  "Matiao": { latitude: 6.9700, longitude: 126.2050 },
  "Mayo": { latitude: 6.9850, longitude: 126.3100 },
  "Sainz": { latitude: 6.9600, longitude: 126.2200 },
  "Sanghay": { latitude: 6.9950, longitude: 126.3350 },
  "Tagabakid": { latitude: 7.0050, longitude: 126.1950 },
  "Tagbinonga": { latitude: 7.0250, longitude: 126.2050 },
  "Taguibo": { latitude: 6.9550, longitude: 126.1800 },
  "Tamisan": { latitude: 6.8850, longitude: 126.2850 },
};

/**
 * Geographic bounding box for Mati City map visualization.
 * Spans north to Matiao/Sainz, south to Pujada Bay, and east to Dahican Beach.
 */
export const MATI_MAP_BOUNDS = {
  minLat: 6.9100, // South (Pujada Bay / South Dahican)
  maxLat: 6.9750, // North (Matiao / North Sainz)
  minLng: 126.2000, // West (City Hall / Poblacion)
  maxLng: 126.2850, // East (Dahican Coastline)
};

/**
 * Parse PostGIS geography(Point, 4326) or geometry representations into
 * standard { latitude, longitude } numbers.
 *
 * Handles:
 * 1. Hex EWKB strings (standard Supabase PostGIS column output)
 * 2. GeoJSON objects { type: "Point", coordinates: [lng, lat] }
 * 3. WKT strings "POINT(126.2165 6.9550)"
 * 4. Coordinate objects { latitude, longitude } / { lat, lng }
 */
export function parsePostGisPoint(rawLocation: unknown): GeoCoordinates | null {
  if (!rawLocation) return null;

  // 1. Direct coordinate object
  if (typeof rawLocation === "object" && rawLocation !== null) {
    const obj = rawLocation as Record<string, any>;
    if (typeof obj.latitude === "number" && typeof obj.longitude === "number") {
      return { latitude: obj.latitude, longitude: obj.longitude };
    }
    if (typeof obj.lat === "number" && typeof obj.lng === "number") {
      return { latitude: obj.lat, longitude: obj.lng };
    }
    // GeoJSON { type: "Point", coordinates: [lng, lat] }
    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lng = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  // 2. String representation
  if (typeof rawLocation === "string") {
    const trimmed = rawLocation.trim();

    // WKT: POINT(126.2165 6.9550) or POINT (126.2165 6.9550)
    const wktMatch = trimmed.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      const lng = parseFloat(wktMatch[1]);
      const lat = parseFloat(wktMatch[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    // Hex EWKB / WKB (e.g. 0101000020E610000060E5D022DB8D5F4052B81E85EBD11B40)
    const cleanHex = trimmed.replace(/^0x/i, "");
    if (/^[0-9a-fA-F]{42,}$/.test(cleanHex)) {
      try {
        const byteCount = cleanHex.length / 2;
        const bytes = new Uint8Array(byteCount);
        for (let i = 0; i < byteCount; i++) {
          bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const isLittle = view.getUint8(0) === 1;
        const geomType = view.getUint32(1, isLittle);
        const hasSrid = (geomType & 0x20000000) !== 0;
        const offset = hasSrid ? 9 : 5;

        if (offset + 16 <= bytes.length) {
          const lng = view.getFloat64(offset, isLittle);
          const lat = view.getFloat64(offset + 8, isLittle);
          if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
          }
        }
      } catch {
        // Fall through to null
      }
    }
  }

  return null;
}

/**
 * Projects real GPS coordinates (latitude, longitude) onto a 2D percentage-based
 * map canvas (0-100% X, 0-100% Y) relative to the Mati City bounding box.
 */
export function projectGeoToMapPercent(
  latitude: number,
  longitude: number
): { xPercent: number; yPercent: number } {
  const { minLat, maxLat, minLng, maxLng } = MATI_MAP_BOUNDS;

  const rawX = ((longitude - minLng) / (maxLng - minLng)) * 100;
  // Latitude increases northward, so higher lat is closer to the top (0% Y)
  const rawY = ((maxLat - latitude) / (maxLat - minLat)) * 100;

  // Clamp with padding to prevent pins overflowing map container
  const xPercent = Math.min(92, Math.max(8, Number(rawX.toFixed(1))));
  const yPercent = Math.min(88, Math.max(12, Number(rawY.toFixed(1))));

  return { xPercent, yPercent };
}

/**
 * Computes exact straight-line Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Estimates realistic road network distance in Mati City.
 * Local road navigation typically spans ~1.25x straight-line distance.
 */
export function estimateRoadDistanceKm(straightLineKm: number): number {
  return Number(Math.max(0.3, straightLineKm * 1.25).toFixed(2));
}

/**
 * Estimates motorcycle / tricycle / car road transit time in minutes.
 * Average city transit speed in Mati is ~25-30 km/h (~2.65 min/road km),
 * representing realistic travel and ride time across Mati City streets.
 */
export function estimateRoadRouteMinutes(straightLineKm: number): number {
  const roadKm = estimateRoadDistanceKm(straightLineKm);
  return Math.max(1, Math.round(roadKm * 2.65));
}

/**
 * Formats straight-line distance with explicit distinction from road distance.
 */
export function formatStraightLineDistance(straightLineKm: number): string {
  if (straightLineKm < 1) {
    return `${Math.round(straightLineKm * 1000)} m straight-line`;
  }
  return `${straightLineKm.toFixed(1)} km straight-line`;
}

/**
 * Formats realistic road travel & transit ETA.
 */
export function formatRoadRouteEta(estMinutes: number): string {
  const safeMin = Math.max(1, Math.round(estMinutes));
  if (safeMin <= 2) {
    return "~1–3 min road trip";
  }
  const minRange = Math.max(1, Math.round(safeMin * 0.8));
  const maxRange = Math.max(minRange + 1, Math.round(safeMin * 1.2));
  return `~${minRange}–${maxRange} min road trip`;
}

export interface StoreDeliveryEvaluation {
  isServiceable: boolean;
  straightLineKm: number;
  roadDistanceKm: number;
  estRoadMinutes: number;
  statusBadge: "serviceable" | "outside_radius" | "delivery_disabled";
  badgeText: string;
  badgeColor: string; // Tailwind color token
  notice: string;
  straightLineFormatted: string;
  roadRouteFormatted: string;
  effectiveRadiusKm: number;
}

/**
 * Evaluates whether a customer's location is within an establishment's delivery
 * serviceability boundary, providing clear road route travel time estimates.
 */
export function evaluateStoreDeliveryServiceability(
  userCoords: GeoCoordinates,
  store: {
    latitude: number;
    longitude: number;
    deliveryEnabled: boolean;
    deliveryRadiusKm?: number;
    barangay?: string;
    name?: string;
  }
): StoreDeliveryEvaluation {
  const straightLineKm = calculateHaversineDistanceKm(
    userCoords.latitude,
    userCoords.longitude,
    store.latitude,
    store.longitude
  );

  const roadDistanceKm = estimateRoadDistanceKm(straightLineKm);
  const estRoadMinutes = estimateRoadRouteMinutes(straightLineKm);
  const straightLineFormatted = formatStraightLineDistance(straightLineKm);
  const roadRouteFormatted = formatRoadRouteEta(estRoadMinutes);

  // Establish effective delivery radius (Dahican coastal spots have wider 12km coverage; Central/Sainz default to 6km)
  const isCoastal = (store.barangay || "").toLowerCase().includes("dahican") ||
    (store.name || "").toLowerCase().includes("dahican");
  const effectiveRadiusKm = store.deliveryRadiusKm || (isCoastal ? 12.0 : 6.0);

  // 1. Delivery Disabled by Merchant
  if (!store.deliveryEnabled) {
    return {
      isServiceable: false,
      straightLineKm,
      roadDistanceKm,
      estRoadMinutes,
      statusBadge: "delivery_disabled",
      badgeText: "Dine-In & Pickup Only",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
      notice: "Store does not offer motorcycle delivery. Dine-in table reservations and counter pickup are welcome.",
      straightLineFormatted,
      roadRouteFormatted,
      effectiveRadiusKm,
    };
  }

  // 2. Outside Delivery Radius Boundary
  if (straightLineKm > effectiveRadiusKm) {
    return {
      isServiceable: false,
      straightLineKm,
      roadDistanceKm,
      estRoadMinutes,
      statusBadge: "outside_radius",
      badgeText: `Outside Delivery Zone (${straightLineKm.toFixed(1)} km / ${effectiveRadiusKm} km limit)`,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
      notice: `Your location is outside this store's ${effectiveRadiusKm} km delivery radius. Table reservation and self-pickup are available.`,
      straightLineFormatted,
      roadRouteFormatted,
      effectiveRadiusKm,
    };
  }

  // 3. Serviceable within Delivery Zone
  return {
    isServiceable: true,
    straightLineKm,
    roadDistanceKm,
    estRoadMinutes,
    statusBadge: "serviceable",
    badgeText: `Within Delivery Zone (${roadRouteFormatted})`,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    notice: `Delivery available to your location in Mati City (${roadRouteFormatted}, ${straightLineFormatted}).`,
    straightLineFormatted,
    roadRouteFormatted,
    effectiveRadiusKm,
  };
}

export interface StoreHoursEvaluation {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  formattedHours: string;
  message: string;
}

/**
 * Parses time string like "7:30 AM" or "07:30" or "9:00 PM" into minutes from midnight (0..1439).
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const clean = timeStr.trim().toUpperCase();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match12) return null;

  let hours = parseInt(match12[1], 10);
  const minutes = parseInt(match12[2], 10);
  const period = match12[3];

  if (period) {
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Evaluates whether a restaurant is currently open based on operating hours string.
 * Example strings: "7:30 AM - 9:00 PM Daily", "07:00 - 21:00", "7:00 AM - 8:30 PM".
 * Default Mati City restaurant window: 7:00 AM to 9:00 PM Daily.
 */
export function isStoreCurrentlyOpen(
  hoursString?: string | null,
  refDate: Date = new Date()
): StoreHoursEvaluation {
  const fallbackHours = "7:00 AM - 9:00 PM Daily";
  const raw = hoursString?.trim() || fallbackHours;

  if (/24\s*hours?/i.test(raw)) {
    return {
      isOpen: true,
      opensAt: "Open 24 Hours",
      closesAt: "Daily",
      formattedHours: raw,
      message: "Store is open 24 hours.",
    };
  }

  // Split on hyphen or en-dash
  const parts = raw.split(/[-–—]/);
  let openMin = 7 * 60; // 7:00 AM default
  let closeMin = 21 * 60; // 9:00 PM default
  let opensAt = "7:00 AM";
  let closesAt = "9:00 PM";

  if (parts.length >= 2) {
    const startStr = parts[0].trim();
    // Strip trailing days like "Daily", "Mon-Sun"
    const endStr = parts[1].replace(/(Daily|Mon|Tue|Wed|Thu|Fri|Sat|Sun|[.,()])/gi, "").trim();

    const parsedStart = parseTimeToMinutes(startStr);
    const parsedEnd = parseTimeToMinutes(endStr);

    if (parsedStart !== null && parsedEnd !== null) {
      openMin = parsedStart;
      closeMin = parsedEnd;
      opensAt = startStr;
      closesAt = endStr;
    }
  }

  const currentMin = refDate.getHours() * 60 + refDate.getMinutes();
  const isOpen =
    closeMin >= openMin
      ? currentMin >= openMin && currentMin < closeMin
      : currentMin >= openMin || currentMin < closeMin;

  return {
    isOpen,
    opensAt,
    closesAt,
    formattedHours: raw,
    message: isOpen
      ? `Store is open. Operating hours: ${opensAt} – ${closesAt}.`
      : `Store is currently closed. Operating hours: ${opensAt} – ${closesAt}. Please order during open hours.`,
  };
}
