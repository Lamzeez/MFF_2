/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";

test("Expo config blocks unsafe keys before bundling and preserves mock-only builds", () => {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_SUPABASE_URL;
  delete env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const script = "const c=require('./app.config.js'); if(c({config:{name:'MFF'}}).name!=='MFF') process.exit(2);";
  const run = (extra = {}) => spawnSync(process.execPath, ["-e", script], { env: { ...env, ...extra }, encoding: "utf8" });
  assert.equal(run().status, 0);
  assert.equal(run({ EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co", EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture" }).status, 0);
  const result = run({ EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co", EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_do_not_bundle" });
  assert.notEqual(result.status, 0);
  assert.ok(!result.stderr.includes("sb_secret_do_not_bundle"));
});
