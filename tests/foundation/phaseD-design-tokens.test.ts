import test from "node:test";
import assert from "node:assert/strict";
import {
  getOrderStatusTheme,
  getReservationStatusTheme,
  getStoreApprovalTheme,
  getUserAccountStatusTheme,
  getUserRoleTheme,
} from "../../lib/status-tokens";

test("getOrderStatusTheme maps all canonical order lifecycle statuses correctly", () => {
  const placedTheme = getOrderStatusTheme("placed");
  assert.equal(placedTheme.badgeBg, "bg-blue-100");
  assert.equal(placedTheme.badgeText, "text-blue-800");
  assert.equal(placedTheme.label, "Kitchen Received");

  const acceptedTheme = getOrderStatusTheme("accepted");
  assert.equal(acceptedTheme.badgeBg, "bg-amber-100");
  assert.equal(acceptedTheme.badgeText, "text-amber-800");

  const preparingTheme = getOrderStatusTheme("preparing");
  assert.equal(preparingTheme.badgeBg, "bg-orange-100");
  assert.equal(preparingTheme.badgeText, "text-orange-800");

  // Critical requirement: ready_for_pickup must NOT be green; it must be purple/violet
  const readyTheme = getOrderStatusTheme("ready_for_pickup");
  assert.equal(readyTheme.badgeBg, "bg-purple-100");
  assert.equal(readyTheme.badgeText, "text-purple-800");
  assert.equal(readyTheme.label, "Ready for Courier");

  const outTheme = getOrderStatusTheme("out_for_delivery");
  assert.equal(outTheme.badgeBg, "bg-sky-100");
  assert.equal(outTheme.badgeText, "text-sky-800");

  // Delivered must be emerald green
  const deliveredTheme = getOrderStatusTheme("delivered");
  assert.equal(deliveredTheme.badgeBg, "bg-emerald-100");
  assert.equal(deliveredTheme.badgeText, "text-emerald-800");

  // Cancelled must be rose red
  const cancelledTheme = getOrderStatusTheme("cancelled");
  assert.equal(cancelledTheme.badgeBg, "bg-rose-100");
  assert.equal(cancelledTheme.badgeText, "text-rose-800");

  // Unknown fallback
  const unknownTheme = getOrderStatusTheme("unknown_custom_status");
  assert.equal(unknownTheme.badgeBg, "bg-gray-100");
  assert.equal(unknownTheme.badgeText, "text-gray-800");
});

test("getReservationStatusTheme maps reservation lifecycle statuses accurately", () => {
  const pending = getReservationStatusTheme("pending");
  assert.equal(pending.badgeBg, "bg-amber-100");
  assert.equal(pending.badgeText, "text-amber-800");
  assert.equal(pending.label, "Awaiting Confirmation");

  const confirmed = getReservationStatusTheme("confirmed");
  assert.equal(confirmed.badgeBg, "bg-emerald-100");
  assert.equal(confirmed.badgeText, "text-emerald-800");
  assert.equal(confirmed.label, "Confirmed Table");

  const completed = getReservationStatusTheme("completed");
  assert.equal(completed.badgeBg, "bg-sky-100");
  assert.equal(completed.badgeText, "text-sky-800");

  const noShow = getReservationStatusTheme("no_show");
  assert.equal(noShow.badgeBg, "bg-rose-100");
  assert.equal(noShow.badgeText, "text-rose-800");
  assert.equal(noShow.label, "Table Released (No-Show)");

  const declined = getReservationStatusTheme("declined");
  assert.equal(declined.badgeBg, "bg-gray-100");
  assert.equal(declined.label, "Booking Declined");

  const cancelled = getReservationStatusTheme("cancelled");
  assert.equal(cancelled.badgeBg, "bg-gray-100");
  assert.equal(cancelled.label, "Booking Cancelled");
});

test("getStoreApprovalTheme maps admin store application statuses", () => {
  const pending = getStoreApprovalTheme("pending");
  assert.equal(pending.badgeBg, "bg-amber-100");
  assert.equal(pending.badgeText, "text-amber-800");
  assert.equal(pending.label, "Pending");

  const approved = getStoreApprovalTheme("approved");
  assert.equal(approved.badgeBg, "bg-emerald-100");
  assert.equal(approved.badgeText, "text-emerald-800");
  assert.equal(approved.label, "Approved");

  const rejected = getStoreApprovalTheme("rejected");
  assert.equal(rejected.badgeBg, "bg-rose-100");
  assert.equal(rejected.badgeText, "text-rose-800");
  assert.equal(rejected.label, "Rejected");

  const fallback = getStoreApprovalTheme("under_review");
  assert.equal(fallback.badgeBg, "bg-gray-100");
});

test("getUserAccountStatusTheme maps user active and suspended states", () => {
  const active = getUserAccountStatusTheme("active");
  assert.equal(active.badgeBg, "bg-emerald-100");
  assert.equal(active.badgeText, "text-emerald-800");
  assert.equal(active.label, "Active");

  const suspended = getUserAccountStatusTheme("suspended");
  assert.equal(suspended.badgeBg, "bg-rose-100");
  assert.equal(suspended.badgeText, "text-rose-800");
  assert.equal(suspended.label, "Suspended");

  const other = getUserAccountStatusTheme("pending_verification");
  assert.equal(other.badgeBg, "bg-gray-100");
});

test("getUserRoleTheme maps system roles with brand primary alignment", () => {
  const superadmin = getUserRoleTheme("Superadmin");
  assert.equal(superadmin.badgeBg, "bg-rose-100");
  assert.equal(superadmin.badgeText, "text-rose-800");

  const storeAdmin = getUserRoleTheme("Store Admin");
  assert.equal(storeAdmin.badgeBg, "bg-orange-100");
  assert.equal(storeAdmin.badgeText, "text-[#EA5410]");
  assert.equal(storeAdmin.dotColor, "bg-[#EA5410]");

  const rider = getUserRoleTheme("Rider");
  assert.equal(rider.badgeBg, "bg-blue-100");
  assert.equal(rider.badgeText, "text-blue-800");

  const customer = getUserRoleTheme("Customer");
  assert.equal(customer.badgeBg, "bg-gray-100");
  assert.equal(customer.badgeText, "text-gray-700");
});
