import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createStoreSubscriptionCheckout,
  verifyStoreSubscriptionPayment,
  fetchStoreSubscriptionInvoices,
} from "../../services/paymongo";

test("services/paymongo.ts exports required integration methods", () => {
  assert.equal(typeof createStoreSubscriptionCheckout, "function");
  assert.equal(typeof verifyStoreSubscriptionPayment, "function");
  assert.equal(typeof fetchStoreSubscriptionInvoices, "function");
});

test("paymongo-checkout Edge Function exists and implements create and verify actions", () => {
  const functionPath = path.resolve(
    process.cwd(),
    "supabase/functions/paymongo-checkout/index.ts"
  );
  assert.equal(fs.existsSync(functionPath), true, "Edge function file must exist");
  const source = fs.readFileSync(functionPath, "utf-8");

  // Verifies CORS, PayMongo API endpoints, and Deno Secret Key access
  assert.equal(source.includes("PAYMONGO_SECRET_KEY"), true);
  assert.equal(source.includes("https://api.paymongo.com/v1/checkout_sessions"), true);
  assert.equal(source.includes("Access-Control-Allow-Origin"), true);
  assert.equal(source.includes("record_subscription_checkout_intent"), true);
  assert.equal(source.includes("confirm_subscription_payment"), true);
  assert.equal(source.includes('payload.action === "create"'), true);
  assert.equal(source.includes('payload.action === "verify"'), true);
  assert.equal(source.includes('"qrph"'), true, "Must include qrph for MariBank and banking QR payments");
  assert.equal(
    source.includes("checkout_session.payment.paid"),
    true,
    "Must support PayMongo webhook events"
  );
});

test("Store billing dashboard integrates PayMongo checkout, payment verification, and invoice ledger", () => {
  const billingPath = path.resolve(
    process.cwd(),
    "app/(web)/dashboard/billing.tsx"
  );
  assert.equal(fs.existsSync(billingPath), true, "billing.tsx must exist");
  const source = fs.readFileSync(billingPath, "utf-8");

  // Integration assertions
  assert.equal(source.includes("createStoreSubscriptionCheckout"), true);
  assert.equal(source.includes("verifyStoreSubscriptionPayment"), true);
  assert.equal(source.includes("fetchStoreSubscriptionInvoices"), true);
  assert.equal(source.includes("ActionSuccessModal"), true);
  assert.equal(source.includes("Pay with PayMongo"), true);
  assert.equal(source.includes("Subscription Invoices & Receipts"), true);
  assert.equal(source.includes("Verifying PayMongo Payment..."), true);
});
