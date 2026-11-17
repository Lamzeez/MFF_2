import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { getScopedSupabaseClient } from "../lib/supabase/client";
import { bindNativeAuthLifecycle } from "../lib/supabase/lifecycle";
import { createSessionStore, type SessionSnapshot } from "../lib/supabase/session-store";
import { AccountError, ScopeMismatchError, createAuthService } from "../services/auth";
import type { AuthPortalScope } from "../types/auth";

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

interface ScopeController {
  service: Service | null;
  store: ReturnType<typeof createSessionStore> | null;
  snapshot: SessionSnapshot;
  dispose: () => void;
}

interface SessionManager {
  ensureScope: (scope: AuthPortalScope) => void;
  getSnapshot: (scope: AuthPortalScope) => SessionSnapshot;
  subscribe: (scope: AuthPortalScope, listener: () => void) => () => void;
  getActions: (scope: AuthPortalScope) => Omit<SessionContextValue, keyof SessionSnapshot>;
}

const INITIAL_LOADING_SNAPSHOT: SessionSnapshot = {
  status: "loading",
  identity: null,
  error: null,
  recovering: false,
};

const UNAVAILABLE_ERROR =
  "Sign-in is unavailable. Check the app’s Supabase configuration. You can still browse as a guest.";
const UNCONFIGURED_ERROR =
  "Sign-in is not configured on this device yet. You can still browse as a guest.";

const Context = createContext<SessionManager | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const controllersRef = useRef<Partial<Record<AuthPortalScope, ScopeController>>>({});
  const listenersRef = useRef<Partial<Record<AuthPortalScope, Set<() => void>>>>({});
  const disposedRef = useRef(false);

  const notifyScope = useCallback((scope: AuthPortalScope) => {
    listenersRef.current[scope]?.forEach((listener) => listener());
  }, []);

  const ensureScope = useCallback(
    (scope: AuthPortalScope): ScopeController => {
      const existing = controllersRef.current[scope];
      if (existing) return existing;

      const controller: ScopeController = {
        service: null,
        store: null,
        snapshot: INITIAL_LOADING_SNAPSHOT,
        dispose: () => {},
      };
      controllersRef.current[scope] = controller;

      try {
        const client = getScopedSupabaseClient(scope);
        const api = createAuthService(client, scope);
        controller.service = api;

        const store = createSessionStore(async (token) => {
          try {
            return await api.loadIdentity(token);
          } catch (err) {
            if (err instanceof ScopeMismatchError && scope !== "merchant") {
              // Auto-clear leftover cross-role tokens from another portal so the UI stays cleanly guest.
              // Keep merchant scope tokens during background refresh so newly verified store applicants
              // are not signed out before merchant_submit_store_application creates their membership.
              await client.auth.signOut({ scope: "local" }).catch(() => {});
            }
            throw err;
          }
        });
        controller.store = store;

        const unsubscribeStore = store.subscribe(() => {
          controller.snapshot = store.getSnapshot();
          notifyScope(scope);
        });
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((event, session) => store.onAuthChange(event, session));
        const unbindNative =
          Platform.OS === "web"
            ? () => {}
            : bindNativeAuthLifecycle(client.auth, AppState, () =>
                store.fail("Your session could not refresh. Check your connection and try again.")
              );
        const foreground =
          Platform.OS === "web"
            ? { remove: () => {} }
            : AppState.addEventListener("change", (state) => {
                if (state === "active") void store.refresh();
              });

        controller.dispose = () => {
          unsubscribeStore();
          subscription.unsubscribe();
          unbindNative();
          foreground.remove();
          store.dispose();
          controller.service = null;
          controller.store = null;
        };
      } catch {
        controller.snapshot = {
          status: "error",
          identity: null,
          recovering: false,
          error: UNAVAILABLE_ERROR,
        };
        notifyScope(scope);
      }

      return controller;
    },
    [notifyScope]
  );

  useEffect(() => {
    disposedRef.current = false;
    ensureScope("customer");

    return () => {
      disposedRef.current = true;
      (Object.keys(controllersRef.current) as AuthPortalScope[]).forEach((scope) => {
        controllersRef.current[scope]?.dispose();
        delete controllersRef.current[scope];
      });
    };
  }, [ensureScope]);

  const manager = useMemo<SessionManager>(
    () => ({
      ensureScope: (scope) => {
        if (!disposedRef.current) ensureScope(scope);
      },
      getSnapshot: (scope) => controllersRef.current[scope]?.snapshot ?? INITIAL_LOADING_SNAPSHOT,
      subscribe: (scope, listener) => {
        let bucket = listenersRef.current[scope];
        if (!bucket) {
          bucket = new Set();
          listenersRef.current[scope] = bucket;
        }
        bucket.add(listener);
        return () => {
          bucket?.delete(listener);
        };
      },
      getActions: (scope) => {
        const api = () => {
          const ctrl = ensureScope(scope);
          if (!ctrl.service) throw new AccountError(UNCONFIGURED_ERROR);
          return ctrl.service;
        };
        const store = () => ensureScope(scope).store;

        return {
          signIn: (email, password) => api().signIn(email, password),
          signUp: (name, email, password, phone, extraMetadata) =>
            api().signUp(name, email, password, phone, extraMetadata),
          resendConfirmation: (email) => api().resendConfirmation(email),
          requestRecovery: (email) => api().requestRecovery(email),
          verifyCode: (email, code, type) => api().verifyCode(email, code, type),
          updatePassword: async (password) => {
            await api().updatePassword(password);
            store()?.finishRecovery();
          },
          updateProfile: async (updates) => {
            await api().updateProfile(updates);
            await store()?.refresh();
          },
          logoutToGuest: () => api().signOut(),
          retrySession: async () => {
            await store()?.refresh();
          },
        };
      },
    }),
    [ensureScope]
  );

  return <Context.Provider value={manager}>{children}</Context.Provider>;
}

export function useSession(scope: AuthPortalScope = "customer"): SessionContextValue {
  const manager = useContext(Context);
  if (!manager) throw new Error("useSession must be used within SessionProvider");

  useEffect(() => {
    manager.ensureScope(scope);
  }, [manager, scope]);

  const subscribe = useCallback(
    (listener: () => void) => manager.subscribe(scope, listener),
    [manager, scope]
  );
  const getSnapshot = useCallback(() => manager.getSnapshot(scope), [manager, scope]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const actions = useMemo(() => manager.getActions(scope), [manager, scope]);

  return { ...snapshot, ...actions };
}
