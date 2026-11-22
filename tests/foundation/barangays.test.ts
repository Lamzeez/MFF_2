import test from "node:test";
import assert from "node:assert/strict";
import {
  MATI_BARANGAYS,
  filterMatiBarangays,
  matchOfficialBarangay,
} from "../../mock/barangays";
import { MATI_BARANGAY_CENTROIDS } from "../../lib/geo-serviceability";

test("MATI_BARANGAYS contains exactly the 26 official Mati City barangays", () => {
  const expected26 = [
    "Badas",
    "Bobon",
    "Buso",
    "Cabuaya",
    "Central (City Proper/Poblacion)",
    "Culian",
    "Dahican",
    "Danao",
    "Dawan",
    "Don Enrique Lopez",
    "Don Martin Marundan",
    "Don Salvador Lopez, Sr.",
    "Langka",
    "Lawigan",
    "Libudon",
    "Luban",
    "Macambol",
    "Mamali",
    "Matiao",
    "Mayo",
    "Sainz",
    "Sanghay",
    "Tagabakid",
    "Tagbinonga",
    "Taguibo",
    "Tamisan",
  ];

  assert.equal(MATI_BARANGAYS.length, 26, "Must have exactly 26 official barangays");
  for (const b of expected26) {
    assert.ok(MATI_BARANGAYS.includes(b as any), `Must include official barangay: ${b}`);
  }
});

test("filterMatiBarangays performs accurate case-insensitive autofill search", () => {
  // Empty query returns all 26
  assert.equal(filterMatiBarangays("").length, 26, "Empty query returns all 26");

  // Prefix matching
  const dahicanResults = filterMatiBarangays("dah");
  assert.ok(dahicanResults.includes("Dahican"), "Should match Dahican for 'dah'");
  assert.equal(dahicanResults[0], "Dahican", "Exact prefix should be prioritized");

  // Multi-result prefix
  const donResults = filterMatiBarangays("don");
  assert.ok(donResults.includes("Don Enrique Lopez"));
  assert.ok(donResults.includes("Don Martin Marundan"));
  assert.ok(donResults.includes("Don Salvador Lopez, Sr."));

  // Central aliases match
  const pobResults = filterMatiBarangays("pob");
  assert.ok(pobResults.includes("Central (City Proper/Poblacion)"), "Should match Central for 'pob'");

  const cityProperResults = filterMatiBarangays("city proper");
  assert.ok(cityProperResults.includes("Central (City Proper/Poblacion)"), "Should match Central for 'city proper'");

  // No match
  const noResults = filterMatiBarangays("manila");
  assert.equal(noResults.length, 0, "Non-Mati barangay returns no results");
});

test("matchOfficialBarangay correctly resolves canonical official names and aliases", () => {
  assert.equal(matchOfficialBarangay("Dahican"), "Dahican");
  assert.equal(matchOfficialBarangay("dahican"), "Dahican");
  assert.equal(matchOfficialBarangay("Central"), "Central (City Proper/Poblacion)");
  assert.equal(matchOfficialBarangay("Poblacion"), "Central (City Proper/Poblacion)");
  assert.equal(matchOfficialBarangay("Central (Poblacion)"), "Central (City Proper/Poblacion)");
  assert.equal(matchOfficialBarangay("Tamisan"), "Tamisan");
  assert.equal(matchOfficialBarangay("NonExistentBarangay"), null);
});

test("MATI_BARANGAY_CENTROIDS covers all 26 official barangays with valid coordinates", () => {
  for (const b of MATI_BARANGAYS) {
    const coords = MATI_BARANGAY_CENTROIDS[b];
    assert.ok(coords, `Centroid must exist for ${b}`);
    assert.ok(Number.isFinite(coords.latitude), `Latitude must be finite for ${b}`);
    assert.ok(Number.isFinite(coords.longitude), `Longitude must be finite for ${b}`);
    assert.ok(coords.latitude >= 6.7 && coords.latitude <= 7.15, `Latitude in Mati range for ${b}`);
    assert.ok(coords.longitude >= 126.1 && coords.longitude <= 126.4, `Longitude in Mati range for ${b}`);
  }
});
