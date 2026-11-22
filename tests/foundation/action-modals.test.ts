import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("ActionSuccessModal component adheres to clean modal contract", () => {
  const filePath = path.resolve(process.cwd(), "components/ui/ActionSuccessModal.tsx");
  assert.equal(fs.existsSync(filePath), true, "ActionSuccessModal.tsx must exist");
  const source = fs.readFileSync(filePath, "utf-8");

  // Verifies transparent modal, dimmed background, and backdrop tap outside
  assert.equal(source.includes("transparent={true}"), true);
  assert.equal(source.includes("rgba(0, 0, 0, 0.55)"), true);
  assert.equal(source.includes("StyleSheet.absoluteFill"), true);
  assert.equal(source.includes("onPress={onClose}"), true);
  assert.equal(source.includes("autoCloseMs"), true);
});

test("LogoutConfirmModal component adheres to clean confirmation contract", () => {
  const filePath = path.resolve(process.cwd(), "components/ui/LogoutConfirmModal.tsx");
  assert.equal(fs.existsSync(filePath), true, "LogoutConfirmModal.tsx must exist");
  const source = fs.readFileSync(filePath, "utf-8");

  // Verifies transparent modal, dimmed background, and backdrop tap outside
  assert.equal(source.includes("transparent={true}"), true);
  assert.equal(source.includes("rgba(0, 0, 0, 0.55)"), true);
  assert.equal(source.includes("StyleSheet.absoluteFill"), true);
  assert.equal(source.includes("onPress={onCancel}"), true);
  assert.equal(source.includes("onConfirm"), true);
  assert.equal(source.includes("isSigningOut"), true);
});

test("Customer portal integrates login success and logout confirmation modals", () => {
  const loginPath = path.resolve(process.cwd(), "app/(mobile)/auth/customer-login.tsx");
  const loginSource = fs.readFileSync(loginPath, "utf-8");
  assert.equal(loginSource.includes("ActionSuccessModal"), true);
  assert.equal(loginSource.includes("Signed In Successfully"), true);

  const profilePath = path.resolve(process.cwd(), "app/(mobile)/(tabs)/profile.tsx");
  const profileSource = fs.readFileSync(profilePath, "utf-8");
  assert.equal(profileSource.includes("LogoutConfirmModal"), true);
  assert.equal(profileSource.includes("ActionSuccessModal"), true);
  assert.equal(profileSource.includes("setShowLogoutConfirm(true)"), true);
});

test("Store Merchant portal integrates login success and logout confirmation modals", () => {
  const loginPath = path.resolve(process.cwd(), "app/(web)/auth/store-login.tsx");
  const loginSource = fs.readFileSync(loginPath, "utf-8");
  assert.equal(loginSource.includes("ActionSuccessModal"), true);
  assert.equal(loginSource.includes("Signed In Successfully"), true);

  const layoutPath = path.resolve(process.cwd(), "app/(web)/dashboard/_layout.tsx");
  const layoutSource = fs.readFileSync(layoutPath, "utf-8");
  assert.equal(layoutSource.includes("LogoutConfirmModal"), true);
  assert.equal(layoutSource.includes("ActionSuccessModal"), true);
  assert.equal(layoutSource.includes("setShowLogoutConfirm(true)"), true);
});

test("Rider portal integrates login success and logout confirmation modals", () => {
  const loginPath = path.resolve(process.cwd(), "app/(mobile)/auth/rider-login.tsx");
  const loginSource = fs.readFileSync(loginPath, "utf-8");
  assert.equal(loginSource.includes("ActionSuccessModal"), true);
  assert.equal(loginSource.includes("Signed In Successfully"), true);

  const riderPath = path.resolve(process.cwd(), "app/(mobile)/rider/index.tsx");
  const riderSource = fs.readFileSync(riderPath, "utf-8");
  assert.equal(riderSource.includes("LogoutConfirmModal"), true);
  assert.equal(riderSource.includes("ActionSuccessModal"), true);
  assert.equal(riderSource.includes("setShowLogoutConfirm(true)"), true);
  // Replaced crude window.confirm with proper modal
  assert.equal(riderSource.includes("window.confirm"), false);
});

test("System Admin portal integrates login success and logout confirmation modals", () => {
  const gatePath = path.resolve(process.cwd(), "components/admin/SystemAdminGate.tsx");
  const gateSource = fs.readFileSync(gatePath, "utf-8");
  assert.equal(gateSource.includes("ActionSuccessModal"), true);
  assert.equal(gateSource.includes("Admin Access Verified"), true);
  assert.equal(gateSource.includes("onLoginSuccess"), true);

  const layoutPath = path.resolve(process.cwd(), "app/(web)/system-admin/_layout.tsx");
  const layoutSource = fs.readFileSync(layoutPath, "utf-8");
  assert.equal(layoutSource.includes("LogoutConfirmModal"), true);
  assert.equal(layoutSource.includes("ActionSuccessModal"), true);
  assert.equal(layoutSource.includes("setShowLogoutConfirm(true)"), true);
  assert.equal(layoutSource.includes("showLoginSuccess"), true);
  assert.equal(layoutSource.includes("handleLogoutSuccessClose"), true);
});
