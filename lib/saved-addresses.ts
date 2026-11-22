/**
 * lib/saved-addresses.ts
 *
 * Client storage & utilities for Customer Saved Delivery Addresses with Mati Landmarks.
 * Allows 1-tap selection during checkout and address management in Profile.
 */

export interface SavedAddress {
  id: string;
  label: string; // e.g. "Home", "Work / Office", "Beach House"
  icon: "home" | "briefcase" | "water" | "location";
  barangay: string; // Valid Mati City barangay
  landmarkDescription: string; // Street, landmark notes (e.g. "Near Baywalk Pavilion, blue gate, Purok 3")
  isDefault?: boolean;
}

const STORAGE_KEY = "mff_saved_delivery_addresses";

export const DEFAULT_MATI_ADDRESSES: SavedAddress[] = [];

let inMemoryAddresses: SavedAddress[] = [];

/**
 * Retrieve saved delivery addresses from persistent localStorage or memory fallback.
 */
export function getSavedAddresses(): SavedAddress[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryAddresses = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Could not read saved addresses from storage:", err);
  }
  return inMemoryAddresses;
}

/**
 * Persist addresses list to storage.
 */
export function persistAddresses(addresses: SavedAddress[]): void {
  inMemoryAddresses = addresses;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    }
  } catch (err) {
    console.warn("Could not persist saved addresses to storage:", err);
  }
}

/**
 * Add or update a saved address.
 */
export function saveAddress(address: SavedAddress): SavedAddress[] {
  const current = getSavedAddresses();
  const existingIdx = current.findIndex((a) => a.id === address.id);
  let updated: SavedAddress[];

  if (address.isDefault) {
    current.forEach((a) => (a.isDefault = false));
  }

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = address;
  } else {
    updated = [address, ...current];
  }

  persistAddresses(updated);
  return updated;
}

/**
 * Remove a saved address by ID.
 */
export function removeSavedAddress(id: string): SavedAddress[] {
  const current = getSavedAddresses();
  const updated = current.filter((a) => a.id !== id);
  // Ensure at least one default remains if list is not empty
  if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
    updated[0].isDefault = true;
  }
  persistAddresses(updated);
  return updated;
}

/**
 * Set a specific address as default.
 */
export function setDefaultAddress(id: string): SavedAddress[] {
  const current = getSavedAddresses();
  const updated = current.map((a) => ({
    ...a,
    isDefault: a.id === id,
  }));
  persistAddresses(updated);
  return updated;
}
