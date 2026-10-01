import React, { type ReactNode } from "react";
import { SessionProvider, useSession } from "./SessionContext";

/**
 * Global authentication and session provider.
 * Backed authoritatively by remote Supabase GoTrue Auth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Convenience hook that delegates directly to Supabase SessionContext.
 */
export function useAuth() {
  const session = useSession();
  const identity = session.identity;
  return {
    ...session,
    isLoggedIn: !!identity,
    user: identity
      ? {
          id: identity.id,
          name: identity.profile.display_name || "Foodie",
          email: identity.email,
          phone: identity.profile.contact_phone,
          role: "registered" as const,
        }
      : null,
  };
}

export { useSession };
