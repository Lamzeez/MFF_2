import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { getSupabaseClient } from "../lib/supabase/client";
import { bindNativeAuthLifecycle } from "../lib/supabase/lifecycle";
import { createSessionStore, type SessionSnapshot } from "../lib/supabase/session-store";
import { AccountError, createAuthService } from "../services/auth";

type Service = ReturnType<typeof createAuthService>;
type SessionContextValue = SessionSnapshot & {
  signIn: Service["signIn"];
  signUp: Service["signUp"];
  resendConfirmation: Service["resendConfirmation"];
  requestRecovery: Service["requestRecovery"];
  verifyCode: Service["verifyCode"];
  updatePassword: Service["updatePassword"];
  updateProfile: Service["updateProfile"];
  logoutToGuest: Service["signOut"];
  retrySession: () => Promise<void>;
};
const Context = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const service = useRef<Service | null>(null);
  const storeRef = useRef<ReturnType<typeof createSessionStore> | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>({ status: "loading", identity: null, error: null, recovering: false });
  useEffect(() => {
    let cleanup = () => {};
    try {
      const client = getSupabaseClient();
      const api = createAuthService(client);
      service.current = api;
      const store = createSessionStore(api.loadIdentity);
      storeRef.current = store;
      const unsubscribe = store.subscribe(() => setSnapshot(store.getSnapshot()));
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => store.onAuthChange(event, session));
      const unbind = Platform.OS === "web" ? () => {} : bindNativeAuthLifecycle(client.auth, AppState,
        () => store.fail("Your session could not refresh. Check your connection and try again."));
      const foreground = AppState.addEventListener("change", state => { if (state === "active") void store.refresh(); });
      cleanup = () => { unsubscribe(); subscription.unsubscribe(); unbind(); foreground.remove(); store.dispose(); service.current = null; storeRef.current = null; };
    } catch {
      setSnapshot({ status: "error", identity: null, recovering: false, error: "Sign-in is unavailable. Check the app’s Supabase configuration. You can still browse as a guest." });
    }
    return cleanup;
  }, []);
  const api = () => {
    if (!service.current) throw new AccountError("Sign-in is not configured on this device yet. You can still browse as a guest.");
    return service.current;
  };
  return <Context.Provider value={{ ...snapshot,
    signIn: (email, password) => api().signIn(email, password),
    signUp: (name, email, password, phone) => api().signUp(name, email, password, phone),
    resendConfirmation: email => api().resendConfirmation(email),
    requestRecovery: email => api().requestRecovery(email),
    verifyCode: (email, code, type) => api().verifyCode(email, code, type),
    updatePassword: async password => { await api().updatePassword(password); storeRef.current?.finishRecovery(); },
    updateProfile: async updates => { await api().updateProfile(updates); await storeRef.current?.refresh(); },
    logoutToGuest: () => api().signOut(),
    retrySession: async () => { await storeRef.current?.refresh(); },
  }}>{children}</Context.Provider>;
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
