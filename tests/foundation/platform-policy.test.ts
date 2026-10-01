/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isMobileDevice,
  isDesktopDevice,
  isTabletDevice,
  canAccessMobileScreens,
  canAccessSystemAdmin,
  canAccessStoreAdminWeb,
  canAccessStoreAdminKitchen,
} from "../../lib/platform-policy";

test("platform policy correctly distinguishes mobile, tablet, and desktop viewports on web", () => {
  // Mobile widths (< 768px on web)
  assert.equal(isMobileDevice(375, "web"), true); // iPhone SE
  assert.equal(isMobileDevice(390, "web"), true); // iPhone 14
  assert.equal(isMobileDevice(412, "web"), true); // Pixel 7
  assert.equal(isMobileDevice(767, "web"), true); // Max mobile
  assert.equal(isDesktopDevice(375, "web"), false);
  assert.equal(isTabletDevice(375, "web"), false);

  // Tablet widths (768px - 1023px)
  assert.equal(isMobileDevice(768, "web"), false);
  assert.equal(isTabletDevice(768, "web"), true); // iPad Mini
  assert.equal(isTabletDevice(820, "web"), true); // iPad Air
  assert.equal(isDesktopDevice(768, "web"), true); // Web desktop breakpoint

  // Desktop widths (>= 1024px)
  assert.equal(isMobileDevice(1280, "web"), false);
  assert.equal(isTabletDevice(1280, "web"), false);
  assert.equal(isDesktopDevice(1280, "web"), true);
  assert.equal(isDesktopDevice(1920, "web"), true);
});

test("platform policy treats native iOS and Android as mobile devices regardless of screen width", () => {
  assert.equal(isMobileDevice(400, "android"), true);
  assert.equal(isMobileDevice(1080, "android"), true);
  assert.equal(isMobileDevice(390, "ios"), true);
  assert.equal(isDesktopDevice(1080, "android"), false);
  assert.equal(isDesktopDevice(820, "ios"), false);
});

test("platform policy restricts System Admin strictly to desktop workstations", () => {
  // Native phones cannot access System Admin
  assert.equal(canAccessSystemAdmin(400, "android"), false);
  assert.equal(canAccessSystemAdmin(390, "ios"), false);

  // Mobile viewports on web cannot access System Admin
  assert.equal(canAccessSystemAdmin(375, "web"), false);
  assert.equal(canAccessSystemAdmin(390, "web"), false);
  assert.equal(canAccessSystemAdmin(767, "web"), false);

  // Desktop workstations on web CAN access System Admin
  assert.equal(canAccessSystemAdmin(768, "web"), true);
  assert.equal(canAccessSystemAdmin(1024, "web"), true);
  assert.equal(canAccessSystemAdmin(1920, "web"), true);
});

test("platform policy allows Store Admin across web desktop and kitchen tablet/mobile", () => {
  assert.equal(canAccessStoreAdminKitchen(390, "android"), true); // Mobile phone app
  assert.equal(canAccessStoreAdminKitchen(820, "ios"), true); // Tablet kitchen app
  assert.equal(canAccessStoreAdminKitchen(390, "web"), true); // Dev mobile simulation
  assert.equal(canAccessStoreAdminWeb(1280, "web"), true); // Desktop web dashboard
});
