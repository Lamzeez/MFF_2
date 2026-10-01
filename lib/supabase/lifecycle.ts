interface RefreshAuth {
  startAutoRefresh(): Promise<void>;
  stopAutoRefresh(): Promise<void>;
}
interface AppStateSource {
  currentState: string | null;
  addEventListener(event: "change", listener: (state: string) => void): { remove(): void };
}

const bindings = new WeakMap<RefreshAuth, { bound: boolean; pending: Promise<void> }>();

/** Future auth provider calls once on mount with React Native AppState; cleans up on unmount.
 * Independent from React Native imports so lifecycle behavior can be tested in Node.
 */
export function bindNativeAuthLifecycle(auth: RefreshAuth, appState: AppStateSource, onError: () => void): () => void {
  let binding = bindings.get(auth);
  if (binding?.bound) throw new Error("Auth lifecycle is already bound for this client.");
  if (!binding) {
    binding = { bound: false, pending: Promise.resolve() };
    bindings.set(auth, binding);
  }
  const queue = binding;
  queue.bound = true;
  let disposed = false;
  const enqueue = (active: boolean) => {
    queue.pending = queue.pending.then(async () => {
      if (active && !disposed) await auth.startAutoRefresh();
      else await auth.stopAutoRefresh();
    }).catch(() => { onError(); });
  };
  const subscription = appState.addEventListener("change", state => enqueue(state === "active"));
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    subscription.remove();
    enqueue(false);
    queue.bound = false;
  };
  enqueue(appState.currentState === "active");
  return cleanup;
}
