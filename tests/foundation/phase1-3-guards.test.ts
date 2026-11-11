import { test } from "node:test";
import assert from "node:assert/strict";
import { getOrderStatusTheme, getReservationStatusTheme } from "../../lib/status-tokens";
import { isStoreCurrentlyOpen } from "../../lib/geo-serviceability";
import { isValidExpoPushToken } from "../../services/device-notifications";

test("Order status tokens distinguish ready_for_pickup (purple) from delivered (emerald)", () => {
  const readyTheme = getOrderStatusTheme("ready_for_pickup");
  const deliveredTheme = getOrderStatusTheme("delivered");

  assert.equal(readyTheme.badgeBg, "bg-purple-100");
  assert.equal(readyTheme.badgeText, "text-purple-800");
  assert.equal(readyTheme.dotColor, "bg-purple-500");

  assert.equal(deliveredTheme.badgeBg, "bg-emerald-100");
  assert.equal(deliveredTheme.badgeText, "text-emerald-800");
  assert.equal(deliveredTheme.dotColor, "bg-emerald-500");

  assert.notEqual(readyTheme.badgeBg, deliveredTheme.badgeBg, "ready_for_pickup must not collide with delivered");
});

test("Order status tokens provide accurate mappings for placed, preparing, and cancelled", () => {
  const placedTheme = getOrderStatusTheme("placed");
  assert.equal(placedTheme.badgeBg, "bg-blue-100");
  assert.equal(placedTheme.label, "Kitchen Received");

  const prepTheme = getOrderStatusTheme("preparing");
  assert.equal(prepTheme.badgeBg, "bg-orange-100");
  assert.equal(prepTheme.label, "Kitchen Preparing");

  const cancelTheme = getOrderStatusTheme("cancelled");
  assert.equal(cancelTheme.badgeBg, "bg-rose-100");
  assert.equal(cancelTheme.label, "Cancelled");
});

test("Reservation status tokens correctly map confirmed, pending, completed, and no_show", () => {
  const pending = getReservationStatusTheme("pending");
  assert.equal(pending.badgeBg, "bg-amber-100");

  const confirmed = getReservationStatusTheme("confirmed");
  assert.equal(confirmed.badgeBg, "bg-emerald-100");

  const completed = getReservationStatusTheme("completed");
  assert.equal(completed.badgeBg, "bg-sky-100");

  const noShow = getReservationStatusTheme("no_show");
  assert.equal(noShow.badgeBg, "bg-rose-100");
  assert.equal(noShow.label, "Table Released (No-Show)");
});

test("isStoreCurrentlyOpen correctly evaluates open status during operating hours", () => {
  // Test reference date at 12:30 PM (noon)
  const noonDate = new Date("2026-10-13T12:30:00");
  const result = isStoreCurrentlyOpen("7:30 AM - 9:00 PM Daily", noonDate);

  assert.equal(result.isOpen, true);
  assert.match(result.message, /Store is open/i);
});

test("isStoreCurrentlyOpen correctly evaluates closed status outside operating hours (e.g. late night)", () => {
  // Test reference date at 11:30 PM (23:30)
  const nightDate = new Date("2026-10-13T23:30:00");
  const result = isStoreCurrentlyOpen("7:00 AM - 8:30 PM Daily", nightDate);

  assert.equal(result.isOpen, false);
  assert.match(result.message, /Store is currently closed/i);
});

test("isStoreCurrentlyOpen uses sensible Mati defaults when hours string is missing or empty", () => {
  const noonDate = new Date("2026-10-13T14:00:00");
  const result = isStoreCurrentlyOpen(null, noonDate);

  assert.equal(result.isOpen, true);
  assert.equal(result.opensAt, "7:00 AM");
  assert.equal(result.closesAt, "9:00 PM");
});

test("Expo push token validation rejects invalid or malformed tokens", () => {
  assert.equal(isValidExpoPushToken(""), false);
  assert.equal(isValidExpoPushToken(null), false);
  assert.equal(isValidExpoPushToken("ExponentPushToken[123]"), false); // too short
  assert.equal(isValidExpoPushToken("ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]"), true);
});
