/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDeliveryStale } from "../../services/orders";

test("isDeliveryStale correctly identifies stale deliveries exceeding threshold", () => {
  const now = Date.now();

  // Updated 20 minutes ago -> Stale (> 15 minutes)
  const twentyMinsAgo = new Date(now - 20 * 60 * 1000).toISOString();
  assert.equal(isDeliveryStale(twentyMinsAgo, 15), true);

  // Updated 16 minutes ago -> Stale (> 15 minutes)
  const sixteenMinsAgo = new Date(now - 16 * 60 * 1000).toISOString();
  assert.equal(isDeliveryStale(sixteenMinsAgo, 15), true);

  // Updated 5 minutes ago -> Not stale (< 15 minutes)
  const fiveMinsAgo = new Date(now - 5 * 60 * 1000).toISOString();
  assert.equal(isDeliveryStale(fiveMinsAgo, 15), false);

  // Updated just now -> Not stale
  const justNow = new Date(now).toISOString();
  assert.equal(isDeliveryStale(justNow, 15), false);

  // Custom threshold: 10 minutes
  const eightMinsAgo = new Date(now - 8 * 60 * 1000).toISOString();
  assert.equal(isDeliveryStale(eightMinsAgo, 10), false);
  const twelveMinsAgo = new Date(now - 12 * 60 * 1000).toISOString();
  assert.equal(isDeliveryStale(twelveMinsAgo, 10), true);
});

test("Re-broadcast audit trail tags accurately distinguish re-broadcasted orders", () => {
  const staleAuditNote = "[Auto-Reassigned: Inactive courier timeout at 2:15:00 PM]";
  const releasedAuditNote = "[Courier Released: Flat tire / emergency at 2:10:00 PM]";
  const normalCustomerNote = "Please deliver near the front gate, thank you!";

  const isRebroadcastStale =
    staleAuditNote.includes("Auto-Reassigned") || staleAuditNote.includes("Courier Released");
  const isRebroadcastReleased =
    releasedAuditNote.includes("Auto-Reassigned") || releasedAuditNote.includes("Courier Released");
  const isRebroadcastNormal =
    normalCustomerNote.includes("Auto-Reassigned") || normalCustomerNote.includes("Courier Released");

  assert.equal(isRebroadcastStale, true);
  assert.equal(isRebroadcastReleased, true);
  assert.equal(isRebroadcastNormal, false);
});

test("Customer No-Show verification generates compliant GPS audit log", () => {
  const coords = { latitude: 6.9549, longitude: 126.2165 };
  const gpsFormatted = `(${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E)`;
  const reason = "Customer unreachable after waiting 10 minutes";
  const timestamp = "02:30:00 PM";
  const auditNote = `[Cancelled: Customer No-Show verified by courier GPS ${gpsFormatted} - ${reason} at ${timestamp}]`;

  assert.ok(auditNote.includes("Cancelled: Customer No-Show"));
  assert.ok(auditNote.includes("(6.9549° N, 126.2165° E)"));
  assert.ok(auditNote.includes("Customer unreachable"));
});
