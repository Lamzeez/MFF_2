import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "../env";
import type { Database } from "../../types/database";
import type { AuthPortalScope } from "../../types/auth";

export interface SessionStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export const PORTAL_STORAGE_KEYS: Record<Exclude<AuthPortalScope, "customer">, string> = {
  merchant: "mff-merchant-auth",
  rider: "mff-rider-auth",
  admin: "mff-system-admin-auth",
};

/** One client per runtime; configuration/storage are read only on first explicit use. */
export function createLazySupabaseClient(
  storage: () => SessionStorage,
  native: boolean,
  storageKey?: string,
): () => SupabaseClient<Database> {
  let client: SupabaseClient<Database> | undefined;
  return () => {
    if (!client) {
      const env = getSupabaseEnvironment();
      client = createClient<Database>(env.url, env.publishableKey, {
        auth: {
          ...(storageKey ? { storageKey } : {}),
          storage: storage(),
          persistSession: true,
          // Native refresh is explicitly managed by bindNativeAuthLifecycle.
          autoRefreshToken: !native,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      });
    }
    return client;
  };
}

/** Lazy per-role clients sharing storage implementation while isolating auth tokens by key. */
export function createScopedSupabaseClients(
  storage: () => SessionStorage,
  native: boolean,
): (scope?: AuthPortalScope) => SupabaseClient<Database> {
  const clients: Record<AuthPortalScope, () => SupabaseClient<Database>> = {
    customer: createLazySupabaseClient(storage, native),
    merchant: createLazySupabaseClient(storage, native, PORTAL_STORAGE_KEYS.merchant),
    rider: createLazySupabaseClient(storage, native, PORTAL_STORAGE_KEYS.rider),
    admin: createLazySupabaseClient(storage, native, PORTAL_STORAGE_KEYS.admin),
  };
  return (scope = "customer") => clients[scope]();
}
