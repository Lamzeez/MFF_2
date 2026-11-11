import type { AuthPortalScope } from "../../types/auth";
import { createScopedSupabaseClients, type SessionStorage } from "./core";

function getBrowserStorage(): SessionStorage {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client cannot be used during server rendering.");
  }
  try {
    const storage = window.localStorage;
    const probe = "mff.storage-probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    throw new Error("Persistent browser storage is unavailable. Enable storage before signing in.");
  }
}

/** Browser runtime only. No server-global auth session is ever constructed. */
export const getScopedSupabaseClient = createScopedSupabaseClients(getBrowserStorage, false);

export const getSupabaseClient = (scope: AuthPortalScope = "customer") =>
  getScopedSupabaseClient(scope);
