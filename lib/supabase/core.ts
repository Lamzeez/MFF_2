import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "../env";
import type { Database } from "../../types/database";

export interface SessionStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/** One client per runtime; configuration/storage are read only on first explicit use. */
export function createLazySupabaseClient(
  storage: () => SessionStorage,
  native: boolean,
): () => SupabaseClient<Database> {
  let client: SupabaseClient<Database> | undefined;
  return () => {
    if (!client) {
      const env = getSupabaseEnvironment();
      client = createClient<Database>(env.url, env.publishableKey, {
        auth: {
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
