/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parsePostGisPoint,
  projectGeoToMapPercent,
  calculateHaversineDistanceKm,
  estimateRoadDistanceKm,
  estimateRoadRouteMinutes,
  formatStraightLineDistance,
  formatRoadRouteEta,
  evaluateStoreDeliveryServiceability,
  MATI_CITY_HALL_COORDS,
  MATI_BARANGAY_CENTROIDS,
} from "../../lib/geo-serviceability";

test("parsePostGisPoint correctly extracts lat and lng from Hex EWKB, WKT, and GeoJSON", () => {
  // Hex EWKB representation for Mama Letty's (Point with SRID 4326: 126.2165, 6.955)
  const hexEwkb = "0101000020E610000060E5D022DB8D5F4052B81E85EBD11B40";
  const parsedHex = parsePostGisPoint(hexEwkb);
  assert.ok(parsedHex !== null);
  assert.equal(parsedHex.latitude, 6.955);
  assert.equal(parsedHex.longitude, 126.2165);

  // WKT format
  const parsedWkt = parsePostGisPoint("POINT(126.2250 6.9490)");
  assert.ok(parsedWkt !== null);
  assert.equal(parsedWkt.latitude, 6.949);
  assert.equal(parsedWkt.longitude, 126.225);

  // GeoJSON format
  const parsedGeoJson = parsePostGisPoint({ type: "Point", coordinates: [126.275, 6.918] });
  assert.ok(parsedGeoJson !== null);
  assert.equal(parsedGeoJson.latitude, 6.918);
  assert.equal(parsedGeoJson.longitude, 126.275);

  // Coordinate object
  const parsedObj = parsePostGisPoint({ lat: 6.96, lng: 126.22 });
  assert.ok(parsedObj !== null);
  assert.equal(parsedObj.latitude, 6.96);
  assert.equal(parsedObj.longitude, 126.22);

  // Null and invalid inputs
  assert.equal(parsePostGisPoint(null), null);
  assert.equal(parsePostGisPoint(undefined), null);
  assert.equal(parsePostGisPoint("not-a-coord"), null);
});

test("projectGeoToMapPercent scales coordinates within bounded canvas percentages", () => {
  // Mati City Hall (Central Poblacion)
  const cityHallPercent = projectGeoToMapPercent(6.955, 126.2165);
  assert.ok(cityHallPercent.xPercent >= 8 && cityHallPercent.xPercent <= 92);
  assert.ok(cityHallPercent.yPercent >= 12 && cityHallPercent.yPercent <= 88);

  // Dahican Beach (East/Coastline)
  const dahicanPercent = projectGeoToMapPercent(6.918, 126.275);
  assert.ok(dahicanPercent.xPercent > cityHallPercent.xPercent); // Dahican is East of City Hall
  assert.ok(dahicanPercent.yPercent > cityHallPercent.yPercent); // Dahican is South of City Hall

  // Clamping test with out-of-bounds coordinate
  const extremeNorthWest = projectGeoToMapPercent(10.0, 100.0);
  assert.equal(extremeNorthWest.xPercent, 8);
  assert.equal(extremeNorthWest.yPercent, 12);
});

test("Haversine and road route calculations distinguish straight-line from travel time", () => {
  const cityHall = MATI_CITY_HALL_COORDS; // 6.955, 126.2165
  const dahican = MATI_BARANGAY_CENTROIDS["Dahican"]; // 6.918, 126.275

  const straightLine = calculateHaversineDistanceKm(
    cityHall.latitude,
    cityHall.longitude,
    dahican.latitude,
    dahican.longitude
  );
  // City Hall to Dahican is ~7.6 to 7.8 km straight-line
  assert.ok(straightLine > 7.0 && straightLine < 8.5);

  const roadKm = estimateRoadDistanceKm(straightLine);
  assert.ok(roadKm > straightLine); // Road distance is longer than straight-line

  const travelMinutes = estimateRoadRouteMinutes(straightLine);
  assert.ok(travelMinutes >= 25); // At least 25 min travel + prep buffer

  const straightLineText = formatStraightLineDistance(straightLine);
  assert.ok(straightLineText.includes("straight-line"));

  const etaText = formatRoadRouteEta(travelMinutes);
  assert.ok(etaText.includes("road trip"));
});

test("evaluateStoreDeliveryServiceability correctly enforces delivery boundaries", () => {
  const userInCentral = MATI_CITY_HALL_COORDS; // 6.955, 126.2165

  // 1. Mama Letty's Karenderia in Central (0.0 km away, delivery enabled, 6 km radius)
  const mamaLettys = {
    latitude: 6.955,
    longitude: 126.2165,
    deliveryEnabled: true,
    deliveryRadiusKm: 6.0,
    barangay: "Central",
    name: "Mama Letty's Karenderia",
  };
  const resultCentral = evaluateStoreDeliveryServiceability(userInCentral, mamaLettys);
  assert.equal(resultCentral.isServiceable, true);
  assert.equal(resultCentral.statusBadge, "serviceable");
  assert.ok(resultCentral.badgeText.includes("Within Delivery Zone"));

  // 2. Far away store exceeding 6.0 km radius from user
  const farAwayStore = {
    latitude: 6.918,
    longitude: 126.275, // Dahican ~7.7 km away
    deliveryEnabled: true,
    deliveryRadiusKm: 5.0, // Strict 5 km radius limit
    barangay: "Central",
    name: "Downtown Cafe",
  };
  const resultOutside = evaluateStoreDeliveryServiceability(userInCentral, farAwayStore);
  assert.equal(resultOutside.isServiceable, false);
  assert.equal(resultOutside.statusBadge, "outside_radius");
  assert.ok(resultOutside.badgeText.includes("Outside Delivery Zone"));

  // 3. Store with delivery disabled by merchant
  const pickupOnlyStore = {
    latitude: 6.955,
    longitude: 126.2165,
    deliveryEnabled: false,
    deliveryRadiusKm: 6.0,
    barangay: "Central",
    name: "Mati Artisan Bakery",
  };
  const resultPickup = evaluateStoreDeliveryServiceability(userInCentral, pickupOnlyStore);
  assert.equal(resultPickup.isServiceable, false);
  assert.equal(resultPickup.statusBadge, "delivery_disabled");
  assert.equal(resultPickup.badgeText, "Dine-In & Pickup Only");
});
