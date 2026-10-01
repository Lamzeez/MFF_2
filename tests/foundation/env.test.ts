/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSupabaseEnvironment } from "../../lib/env";

const key = "sb_publishable_test_only_not_a_real_key";
test("accepts public HTTPS origins and documented local hosts", () => {
  for (const url of ["https://example.supabase.co", "http://127.0.0.1:54321", "http://10.0.2.2:54321"]) {
    assert.equal(parseSupabaseEnvironment(url, key).url, url);
  }
});
test("rejects missing configuration, unsafe origins, credentials and privileged keys", () => {
  assert.throws(() => parseSupabaseEnvironment(undefined, undefined));
  for (const url of ["not-a-url", "http://example.com", "https://user:password@example.com", "https://example.com/path", "https://example.com?token=x"]) {
    assert.throws(() => parseSupabaseEnvironment(url, key));
  }
  for (const invalid of ["sb_secret_do_not_expose", "eyJhbGciOiJIUzI1NiJ9.service_role.signature", "", "sb_publishable_"]) {
    assert.throws(() => parseSupabaseEnvironment("https://example.supabase.co", invalid), (error: Error) => {
      assert.ok(!invalid || !error.message.includes(invalid));
      return true;
    });
  }
});
