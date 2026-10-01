export interface SupabaseEnvironment {
  url: string;
  publishableKey: string;
}

import { parseSupabaseEnvironment } from "./env-validation.cjs";
export { parseSupabaseEnvironment };

export function getSupabaseEnvironment(): SupabaseEnvironment {
  // Expo requires static dot-notation access when inlining EXPO_PUBLIC values.
  return parseSupabaseEnvironment(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
