/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COURIER_QUICK_MESSAGES,
  CUSTOMER_QUICK_MESSAGES,
} from "../../services/quick-dispatch";

test("COURIER_QUICK_MESSAGES contains all canonical driver status updates without typing", () => {
  assert.equal(COURIER_QUICK_MESSAGES.length, 5);
  assert.ok(COURIER_QUICK_MESSAGES.some((m) => m.includes("Padulong na ko")));
  assert.ok(COURIER_QUICK_MESSAGES.some((m) => m.includes("gawas / gate")));
  assert.ok(COURIER_QUICK_MESSAGES.some((m) => m.includes("4-digit PIN")));
  assert.ok(COURIER_QUICK_MESSAGES.some((m) => m.includes("sukli sa ₱500")));
  assert.ok(COURIER_QUICK_MESSAGES.some((m) => m.includes("gamayng aberya")));
});

test("CUSTOMER_QUICK_MESSAGES contains all canonical customer dispatch instructions", () => {
  assert.equal(CUSTOMER_QUICK_MESSAGES.length, 5);
  assert.ok(CUSTOMER_QUICK_MESSAGES.some((m) => m.includes("naghulat")));
  assert.ok(CUSTOMER_QUICK_MESSAGES.some((m) => m.includes("sukli sa ₱1,000")));
  assert.ok(CUSTOMER_QUICK_MESSAGES.some((m) => m.includes("busina pag-abot")));
  assert.ok(CUSTOMER_QUICK_MESSAGES.some((m) => m.includes("guard house")));
  assert.ok(CUSTOMER_QUICK_MESSAGES.some((m) => m.includes("landmark")));
});
