import React, { type ReactNode } from "react";
import { SessionProvider, useSession } from "./SessionContext";
import { PrototypeDataProvider, usePrototypeData } from "./PrototypeDataContext";
export type { AppNotification, TableReservation, ActiveOrder, ActiveOrderItem } from "./PrototypeDataContext";

// Compatibility facade while individual feature domains migrate out of prototype state.
export function useAuth() {
  const session = useSession();
  const data = usePrototypeData();
  const identity = session.identity;
  return { ...data, ...session, isLoggedIn: !!identity,
    user: identity ? { id: identity.id, name: identity.profile.display_name || "Foodie", email: identity.email, phone: identity.profile.contact_phone, role: "registered" as const } : null,
  };
}
function ScopedPrototypeData({ children }: { children: ReactNode }) {
  const { identity } = useSession();
  return <PrototypeDataProvider key={identity?.id ?? "guest"}>{children}</PrototypeDataProvider>;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider><ScopedPrototypeData>{children}</ScopedPrototypeData></SessionProvider>;
}
