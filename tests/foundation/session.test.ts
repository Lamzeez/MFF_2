/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Session } from "@supabase/supabase-js";
import { createSessionStore } from "../../lib/supabase/session-store";
import { AccountError, authMessage, type AccountIdentity } from "../../services/auth";

const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const identity = (id: string) => ({ id, email: `${id}@example.invalid`, roles: ["customer"], profile: { id } }) as AccountIdentity;
const session = (id: string) => ({ access_token: id, user: { id } }) as Session;

test("sign-out invalidates pending identity lookup and never restores a stale user", async () => {
  let resolve!: (value: AccountIdentity) => void;
  const store = createSessionStore(() => new Promise(done => { resolve = done; }));
  store.onAuthChange("SIGNED_IN", session("a"));
  await tick();
  store.onAuthChange("SIGNED_OUT", null);
  resolve(identity("a"));
  await tick();
  assert.equal(store.getSnapshot().status, "guest");
  assert.equal(store.getSnapshot().identity, null);
  store.dispose();
});

test("account switch rejects out-of-order profile responses", async () => {
  const resolves = new Map<string, (value: AccountIdentity) => void>();
  const store = createSessionStore(token => new Promise(done => { resolves.set(token, done); }));
  store.onAuthChange("SIGNED_IN", session("a")); await tick();
  store.onAuthChange("SIGNED_IN", session("b")); await tick();
  resolves.get("b")!(identity("b")); await tick();
  resolves.get("a")!(identity("a")); await tick();
  assert.equal(store.getSnapshot().identity?.id, "b");
  store.dispose();
});

test("refresh failure fails closed, retry recovers, and recovery survives token refresh", async () => {
  let failing = false;
  const store = createSessionStore(async () => { if (failing) throw new Error("secret-token"); return identity("a"); });
  store.onAuthChange("PASSWORD_RECOVERY", session("a")); await tick();
  assert.equal(store.getSnapshot().recovering, true);
  store.onAuthChange("TOKEN_REFRESHED", session("a")); await tick();
  assert.equal(store.getSnapshot().recovering, true);
  failing = true; await store.refresh();
  assert.equal(store.getSnapshot().identity, null);
  assert.equal(store.getSnapshot().error?.includes("secret-token"), false);
  failing = false; await store.refresh();
  assert.equal(store.getSnapshot().status, "authenticated");
  store.finishRecovery();
  assert.equal(store.getSnapshot().recovering, false);
  store.dispose();
});

test("Auth errors are actionable without exposing raw backend messages", () => {
  assert.match(authMessage({ code: "invalid_credentials", message: "private" }), /incorrect/);
  assert.match(authMessage(new AccountError("Enter a valid email address.")), /valid email/);
  assert.equal(authMessage({ message: "private" }).includes("private"), false);
});
