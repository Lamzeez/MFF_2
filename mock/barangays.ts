/**
 * Mati City Barangays
 */

export const MATI_BARANGAYS = [
  "Central (Poblacion)",
  "Dahican",
  "Sainz",
  "Matiao",
  "Badas",
  "Mayo",
] as const;

export type MatiBarangay = typeof MATI_BARANGAYS[number];
