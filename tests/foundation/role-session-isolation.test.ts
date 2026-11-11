/// <reference types="node" />
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  PORTAL_STORAGE_KEYS,
  createScopedSupabaseClients,
} from "../../lib/supabase/core";
import {
  getScopeMismatchMessage,
  isExclusiveCustomerIdentity,
  isRoleAllowedForScope,
} from "../../services/auth";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Scoped Supabase clients use separate persistent storage keys per portal role", async () => {
  const oldUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";

  try {
    const keys = Object.values(PORTAL_STORAGE_KEYS);
    assert.equal(new Set(keys).size, 3);
    assert.equal(keys.includes("mff-merchant-auth"), true);
    assert.equal(keys.includes("mff-rider-auth"), true);
    assert.equal(keys.includes("mff-system-admin-auth"), true);

    const resolveClient = createScopedSupabaseClients(
      () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }),
      true,
    );

    const customerClient = resolveClient("customer");
    const merchantClient = resolveClient("merchant");
    const riderClient = resolveClient("rider");
    const adminClient = resolveClient("admin");

    assert.notEqual(customerClient, merchantClient);
    assert.notEqual(customerClient, riderClient);
    assert.notEqual(customerClient, adminClient);
    assert.notEqual(merchantClient, adminClient);
    assert.equal(resolveClient("customer"), customerClient);
    assert.equal(resolveClient("admin"), adminClient);

    await Promise.all([
      customerClient.auth.stopAutoRefresh(),
      merchantClient.auth.stopAutoRefresh(),
      riderClient.auth.stopAutoRefresh(),
      adminClient.auth.stopAutoRefresh(),
    ]);
  } finally {
    if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("Role policy rejects partner and admin accounts from customer portal access", () => {
  // Exclusive customer allowed in customer scope only
  assert.equal(isRoleAllowedForScope("customer", ["customer"]), true);
  assert.equal(isRoleAllowedForScope("merchant", ["customer"]), false);
  assert.equal(isRoleAllowedForScope("rider", ["customer"]), false);
  assert.equal(isRoleAllowedForScope("admin", ["customer"]), false);

  // Partner / admin accounts cannot pose as customers on discovery/checkout
  assert.equal(isRoleAllowedForScope("customer", ["customer", "merchant"]), false);
  assert.equal(isRoleAllowedForScope("customer", ["customer", "rider"]), false);
  assert.equal(isRoleAllowedForScope("customer", ["customer", "admin"]), false);
  assert.equal(isRoleAllowedForScope("customer", ["admin"]), false);
  assert.equal(isRoleAllowedForScope("customer", ["superadmin"]), false);

  // Scoped role access works only in matching partner/admin portal
  assert.equal(isRoleAllowedForScope("merchant", ["customer", "merchant"]), true);
  assert.equal(isRoleAllowedForScope("merchant", ["customer", "admin"]), false);
  assert.equal(isRoleAllowedForScope("rider", ["customer", "rider"]), true);
  assert.equal(isRoleAllowedForScope("rider", ["customer", "merchant"]), false);
  assert.equal(isRoleAllowedForScope("admin", ["customer", "admin"]), true);
  assert.equal(isRoleAllowedForScope("admin", ["superadmin"]), true);
  assert.equal(isRoleAllowedForScope("admin", ["staff"]), true);

  assert.equal(isExclusiveCustomerIdentity({ roles: ["customer"] }), true);
  assert.equal(isExclusiveCustomerIdentity({ roles: ["customer", "merchant"] }), false);
  assert.equal(isExclusiveCustomerIdentity({ roles: ["customer", "rider"] }), false);
  assert.equal(isExclusiveCustomerIdentity({ roles: ["customer", "admin"] }), false);
  assert.equal(isExclusiveCustomerIdentity(null), false);

  assert.match(getScopeMismatchMessage("customer", ["customer", "admin"]), /System Admin/);
  assert.match(getScopeMismatchMessage("customer", ["customer", "merchant"]), /Merchant/);
  assert.match(getScopeMismatchMessage("customer", ["customer", "rider"]), /Rider/);
});

test("Every portal layout and login screen is pinned to its isolated session scope", () => {
  const authContextSrc = readSource("context/AuthContext.tsx");
  const adminLayoutSrc = readSource("app/(web)/system-admin/_layout.tsx");
  const dashboardLayoutSrc = readSource("app/(web)/dashboard/_layout.tsx");
  const storeLoginSrc = readSource("app/(web)/auth/store-login.tsx");
  const merchantLoginSrc = readSource("app/(mobile)/auth/merchant-login.tsx");
  const merchantDashSrc = readSource("app/(mobile)/merchant/index.tsx");
  const riderLoginSrc = readSource("app/(mobile)/auth/rider-login.tsx");
  const riderDashSrc = readSource("app/(mobile)/rider/index.tsx");

  assert.equal(authContextSrc.includes("isExclusiveCustomerIdentity"), true);

  // System Admin session-backed unlock survives navigation/back until explicit Lock & Sign Out
  assert.equal(adminLayoutSrc.includes('useSession("admin")'), true);
  assert.equal(adminLayoutSrc.includes("useState(false)"), false);

  // Store Dashboard enforces verified merchant session and redirects to store-login otherwise
  assert.equal(dashboardLayoutSrc.includes('useSession("merchant")'), true);
  assert.equal(dashboardLayoutSrc.includes('href="/(web)/auth/store-login"'), true);

  // Partner auth & workspaces isolate sessions cleanly
  assert.equal(storeLoginSrc.includes('useSession("merchant")'), true);
  assert.equal(merchantLoginSrc.includes('useSession("merchant")'), true);
  assert.equal(merchantDashSrc.includes('useSession("merchant")'), true);
  assert.equal(riderLoginSrc.includes('useSession("rider")'), true);
  assert.equal(riderDashSrc.includes('useSession("rider")'), true);
});
