/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { bindNativeAuthLifecycle } from "../../lib/supabase/lifecycle";

test("foreground/background refresh is ordered and listener is removed", async () => {
  const calls: string[] = [];
  let listener: ((state: string) => void) | undefined;
  const source = { currentState: "active", addEventListener: (_: "change", fn: (state: string) => void) => {
    listener = fn; return { remove: () => { listener = undefined; calls.push("remove"); } };
  } };
  const auth = { startAutoRefresh: async () => { calls.push("start"); }, stopAutoRefresh: async () => { calls.push("stop"); } };
  const cleanup = bindNativeAuthLifecycle(auth, source, () => assert.fail("Unexpected refresh error"));
  await setImmediate();
  listener?.("background");
  listener?.("active");
  await setImmediate();
  assert.deepEqual(calls, ["start", "stop", "start"]);
  assert.throws(() => bindNativeAuthLifecycle(auth, source, () => {}), /already bound/);
  cleanup(); cleanup();
  await setImmediate();
  assert.equal(listener, undefined);
  assert.deepEqual(calls.slice(-2), ["remove", "stop"]);
});

test("immediate remount cannot race an old refresh shutdown", async () => {
  const calls: string[] = [];
  const source = { currentState: "active", addEventListener: () => ({ remove: () => {} }) };
  const auth = { startAutoRefresh: async () => { calls.push("start"); }, stopAutoRefresh: async () => { calls.push("stop"); } };
  bindNativeAuthLifecycle(auth, source, () => {})();
  const cleanup = bindNativeAuthLifecycle(auth, source, () => {});
  await setImmediate();
  assert.equal(calls.at(-1), "start");
  cleanup();
  await setImmediate();
  assert.equal(calls.at(-1), "stop");
});

test("reports refresh errors without leaking their contents", async () => {
  let errors = 0;
  const cleanup = bindNativeAuthLifecycle({ startAutoRefresh: async () => { throw new Error("sensitive payload"); }, stopAutoRefresh: async () => {} },
    { currentState: "active", addEventListener: () => ({ remove: () => {} }) }, () => { errors++; });
  await setImmediate();
  assert.equal(errors, 1);
  cleanup();
  await setImmediate();
});
