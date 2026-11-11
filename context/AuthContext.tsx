import React, { type ReactNode } from "react";
import { SessionProvider, useSession } from "./SessionContext";
import { CartProvider } from "./CartContext";
import { isExclusiveCustomerIdentity } from "../services/auth";

/**
 * Global authentication and session provider.
 * Backed authoritatively by remote Supabase GoTrue Auth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>{children}</CartProvider>
    </SessionProvider>
  );
}

/**
 * Customer-scoped hook delegating to the isolated 'customer' Supabase session.
 * Rejects partner/admin identities defensively so non-customer accounts cannot act as customers.
 */
export function useAuth() {
  const session = useSession("customer");
  const identity = isExclusiveCustomerIdentity(session.identity) ? session.identity : null;
  return {
    ...session,
    identity,
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
