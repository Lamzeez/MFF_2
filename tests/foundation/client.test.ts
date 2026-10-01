/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { createLazySupabaseClient } from "../../lib/supabase/core";
import { getSupabaseClient } from "../../lib/supabase/client";

test("client remains lazy without configuration and fails only on use", () => {
  const oldUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let storageRead = false;
  const getClient = createLazySupabaseClient(() => { storageRead = true; throw new Error("Unexpected storage access"); }, true);
  assert.equal(storageRead, false);
  assert.throws(getClient, /not configured/);
  assert.equal(storageRead, false);
  if (oldUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = oldUrl;
  if (oldKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
});

test("returns a singleton and refuses browser construction during server rendering", async () => {
  const oldUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";
  try {
    const getClient = createLazySupabaseClient(() => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }), true);
    assert.equal(getClient(), getClient());
    assert.equal((await getClient().auth.getSession()).data.session, null);
    assert.throws(getSupabaseClient, /server rendering/);
    await getClient().auth.stopAutoRefresh();
  } finally {
    if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
