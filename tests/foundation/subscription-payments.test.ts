import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SUBSCRIPTION_TIERS } from "../../lib/subscription-tiers";

test("Subscription tiers define valid pricing and PayMongo centavo amounts", () => {
  assert.equal(SUBSCRIPTION_TIERS.length, 3);

  const basic = SUBSCRIPTION_TIERS.find((t) => t.id === "basic")!;
  assert.equal(basic.pricePhp, 99);
  assert.equal(basic.pricePhp * 100, 9900); // 9,900 centavos for PayMongo

  const standard = SUBSCRIPTION_TIERS.find((t) => t.id === "standard")!;
  assert.equal(standard.pricePhp, 299);
  assert.equal(standard.pricePhp * 100, 29900); // 29,900 centavos for PayMongo

  const commercial = SUBSCRIPTION_TIERS.find((t) => t.id === "commercial")!;
  assert.equal(commercial.pricePhp, 699);
  assert.equal(commercial.pricePhp * 100, 69900); // 69,900 centavos for PayMongo
});

test("Store subscription payments migration exists and enforces RLS and atomic confirmation", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261122000100_store_subscription_payments.sql"
  );
  assert.equal(fs.existsSync(migrationPath), true, "Migration file must exist");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // Schema checks
  assert.equal(sql.includes("create table if not exists public.store_subscription_payments"), true);
  assert.equal(sql.includes("paymongo_checkout_session_id text unique"), true);
  assert.equal(sql.includes("paymongo_payment_id text"), true);
  assert.equal(sql.includes("payment_method text check"), true);
  assert.equal(sql.includes("status text not null default 'pending'"), true);
  assert.equal(sql.includes("billing_cycle_start timestamptz"), true);
  assert.equal(sql.includes("billing_cycle_end timestamptz"), true);

  // RLS checks
  assert.equal(sql.includes("alter table public.store_subscription_payments enable row level security;"), true);
  assert.equal(sql.includes("create policy sub_payments_select"), true);
  assert.equal(sql.includes("create policy sub_payments_insert"), true);
  assert.equal(sql.includes("create policy sub_payments_update"), true);
  assert.equal(sql.includes("create policy sub_payments_delete"), true);

  // Atomic function checks
  assert.equal(sql.includes("function public.record_subscription_checkout_intent"), true);
  assert.equal(sql.includes("function public.confirm_subscription_payment"), true);
  assert.equal(sql.includes("function public.get_store_subscription_invoices"), true);
});
