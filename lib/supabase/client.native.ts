import "expo-sqlite/localStorage/install";
import "../crypto-polyfill";
import type { AuthPortalScope } from "../../types/auth";
import { createScopedSupabaseClients } from "./core";

// Expo SDK 57 supplies URL globally; no additional URL polyfill is needed.
// SQLite session storage persists tokens; it is NOT encrypted secret storage.
export const getScopedSupabaseClient = createScopedSupabaseClients(() => localStorage, true);

export const getSupabaseClient = (scope: AuthPortalScope = "customer") =>
  getScopedSupabaseClient(scope);
