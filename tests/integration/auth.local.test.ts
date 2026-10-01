/// <reference types="node" />
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";
import { createAuthService } from "../../services/auth";

test("local Auth: confirmation, profile/RLS, persisted session, recovery and sign-out", { timeout: 90000 }, async () => {
  // Ignore .env.local completely: this test must never target a hosted project.
  const status = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8" });
  assert.equal(status.status, 0, "Start the local Supabase stack before integration tests");
  const config = JSON.parse(status.stdout) as Record<string, string>;
  const url = new URL(config.API_URL);
  const mailUrl = new URL(config.MAILPIT_URL || config.INBUCKET_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Auth tests require loopback API");
  assert.ok(["localhost", "127.0.0.1"].includes(mailUrl.hostname), "Auth tests require loopback mailbox");
  assert.ok(config.PUBLISHABLE_KEY.startsWith("sb_publishable_"));
  const email = `mff-auth-test-${randomUUID()}@example.invalid`;
  const password = `Mff-${randomUUID()}!`;
  const newPassword = `Mff-${randomUUID()}!`;
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const options = { auth: { storage, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, flowType: "pkce" as const } };
  const client = createClient<Database>(url.origin, config.PUBLISHABLE_KEY, options);
  const auth = createAuthService(client);
  const mailboxIds = new Set<string>();
  async function codeFor(subject: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await fetch(`${mailUrl.origin}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
      assert.equal(response.status, 200, "Local mail capture must be available");
      const list = await response.json() as { messages: { ID: string; Subject: string }[] };
      const message = list.messages.find(message => message.Subject.includes(subject));
      if (message) {
        mailboxIds.add(message.ID);
        const detail = await (await fetch(`${mailUrl.origin}/api/v1/message/${message.ID}`)).json() as { Text: string; HTML: string };
        const match = (detail.Text || detail.HTML).match(/\b(\d{6})\b/);
        assert.ok(match, "Email template must contain a six-digit confirmation code");
        return match[1];
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error("Local verification email did not arrive");
  }
  try {
    await auth.signUp("Test Foodie", email, password, "09171234567");
    assert.equal((await client.auth.getSession()).data.session, null, "Unconfirmed signup cannot establish a session");
    await assert.rejects(auth.signIn(email, password), { code: "email_not_confirmed" });
    await auth.verifyCode(email, await codeFor("Confirm"), "email");
    const session = (await client.auth.getSession()).data.session;
    assert.ok(session, "Confirmation creates a session");
    const identity = await auth.loadIdentity(session.access_token);
    assert.equal(identity.profile.display_name, "Test Foodie");
    assert.equal(identity.profile.contact_phone, "09171234567");
    assert.deepEqual(identity.roles, ["customer"]);
    const forbidden = await client.from("profiles").update({ account_status: "suspended" }).eq("id", identity.id);
    assert.equal(forbidden.error?.code, "42501", "Client cannot modify authority fields");
    const profile = await client.from("profiles").update({ display_name: "Updated Foodie" }).eq("id", identity.id).select().single();
    assert.equal(profile.error, null);
    assert.equal(profile.data?.display_name, "Updated Foodie");
    const restored = createClient<Database>(url.origin, config.PUBLISHABLE_KEY, options);
    assert.equal((await restored.auth.getSession()).data.session?.user.id, identity.id, "New runtime restores the persisted identity");
    const refreshed = await restored.auth.refreshSession();
    assert.equal(refreshed.error, null, "Persisted refresh token works");
    await restored.auth.stopAutoRefresh();
    await auth.signOut();
    assert.equal((await client.auth.getSession()).data.session, null);
    await assert.rejects(auth.signIn(email, "incorrect-password"), { code: "invalid_credentials" });
    await auth.requestRecovery(email);
    await auth.verifyCode(email, await codeFor("Reset"), "recovery");
    await auth.updatePassword(newPassword);
    await auth.signOut();
    await assert.rejects(auth.signIn(email, password), { code: "invalid_credentials" });
    await auth.signIn(email, newPassword);
    assert.equal((await client.auth.getSession()).data.session?.user.id, identity.id);
    await auth.signOut();
    const afterLogout = createClient<Database>(url.origin, config.PUBLISHABLE_KEY, options);
    assert.equal((await afterLogout.auth.getSession()).data.session, null, "Sign-out persists across app restart");
    await afterLogout.auth.stopAutoRefresh();
  } finally {
    await client.auth.stopAutoRefresh();
    // Exact random test identity only; never reset a database or remove other users.
    const sql = `begin; delete from public.profiles where id in (select id from auth.users where email = '${email}'); delete from auth.users where email = '${email}'; commit;`;
    const cleanup = spawnSync("docker", ["exec", "supabase_db_mff-foundation", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
    assert.equal(cleanup.status, 0, "Local test identity cleanup must succeed");
    for (const id of mailboxIds) await fetch(`${mailUrl.origin}/api/v1/messages`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IDs: [id] }) });
  }
});
