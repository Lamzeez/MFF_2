import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { authMessage, type AccountIdentity } from "../../services/auth";

export type SessionSnapshot = {
  status: "loading" | "guest" | "authenticated" | "error";
  identity: AccountIdentity | null;
  error: string | null;
  recovering: boolean;
};

/** No React or native dependencies. Revision checks reject stale in-flight identities. */
export function createSessionStore(loadIdentity: (token: string) => Promise<AccountIdentity>) {
  let snapshot: SessionSnapshot = { status: "loading", identity: null, error: null, recovering: false };
  let revision = 0;
  let session: Session | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();
  const publish = (next: SessionSnapshot) => { snapshot = next; listeners.forEach(fn => fn()); };
  const refresh = async () => {
    const current = ++revision;
    if (!session) {
      publish({ status: "guest", identity: null, error: null, recovering: false });
      return;
    }
    const token = session.access_token;
    try {
      const identity = await loadIdentity(token);
      if (!disposed && current === revision) publish({ ...snapshot, status: "authenticated", identity, error: null });
    } catch (error) {
      if (!disposed && current === revision) publish({ ...snapshot, status: "error", identity: null, error: authMessage(error) });
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onAuthChange(event: AuthChangeEvent, next: Session | null) {
      if (disposed) return;
      revision++;
      const sameUser = session?.user.id === next?.user.id;
      session = next;
      publish({
        status: next ? (sameUser && snapshot.identity ? "authenticated" : "loading") : "guest",
        identity: next && sameUser ? snapshot.identity : null, error: null,
        recovering: !!next && (event === "PASSWORD_RECOVERY" || (sameUser && snapshot.recovering)),
      });
      // Never call Supabase APIs inside the Auth event's internal lock.
      if (next) setTimeout(() => { if (!disposed) void refresh(); }, 0);
    },
    refresh,
    finishRecovery() { publish({ ...snapshot, recovering: false }); },
    fail(message: string) { revision++; publish({ ...snapshot, status: "error", identity: null, error: message }); },
    dispose() { disposed = true; revision++; listeners.clear(); },
  };
}
