import "expo-sqlite/localStorage/install";
import "../crypto-polyfill";
import { createLazySupabaseClient } from "./core";

// Expo SDK 57 supplies URL globally; no additional URL polyfill is needed.
// SQLite session storage persists tokens; it is NOT encrypted secret storage.
export const getSupabaseClient = createLazySupabaseClient(() => localStorage, true);
