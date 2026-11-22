/**
 * Official 26 Barangays of the City of Mati, Davao Oriental
 */

export const MATI_BARANGAYS = [
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
] as const;

export type MatiBarangay = (typeof MATI_BARANGAYS)[number];

/**
 * Checks if a given string matches any of the 26 official Mati City barangays.
 * Matches case-insensitively and handles canonical aliases (e.g. "Central (Poblacion)").
 */
export function matchOfficialBarangay(query?: string | null): MatiBarangay | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase();

  // Handle aliases for Central
  if (
    clean === "central" ||
    clean === "poblacion" ||
    clean === "central (poblacion)" ||
    clean === "city proper" ||
    clean.includes("central (poblacion)") ||
    clean.includes("city proper")
  ) {
    return "Central (City Proper/Poblacion)";
  }

  // Exact or case-insensitive match
  const exact = MATI_BARANGAYS.find((b) => b.toLowerCase() === clean);
  if (exact) return exact;

  // Substring match
  const partial = MATI_BARANGAYS.find(
    (b) => b.toLowerCase().includes(clean) || clean.includes(b.toLowerCase())
  );
  return partial || null;
}

/**
 * Filters the 26 official barangays based on user typing.
 */
export function filterMatiBarangays(query?: string | null): string[] {
  if (!query || !query.trim()) return [...MATI_BARANGAYS];

  const clean = query.trim().toLowerCase();

  // Prioritize startsWith, then includes
  const startsWithMatches: string[] = [];
  const substringMatches: string[] = [];

  for (const b of MATI_BARANGAYS) {
    const lower = b.toLowerCase();
    if (lower.startsWith(clean)) {
      startsWithMatches.push(b);
    } else if (
      lower.includes(clean) ||
      (b === "Central (City Proper/Poblacion)" &&
        ("central".includes(clean) || "poblacion".includes(clean) || "city proper".includes(clean)))
    ) {
      substringMatches.push(b);
    }
  }

  return [...startsWithMatches, ...substringMatches];
}
