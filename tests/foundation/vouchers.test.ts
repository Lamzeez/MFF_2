/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateVoucherDiscount,
  validateVoucherCode,
  Voucher,
  CANONICAL_MATI_VOUCHERS,
} from "../../services/vouchers";

test("calculateVoucherDiscount correctly waives delivery fee for free_delivery vouchers", () => {
  const voucher: Voucher = {
    id: "v-test-1",
    code: "MATIFIRST",
    discountType: "free_delivery",
    value: 35,
    minSpend: 0,
    timesUsed: 0,
    isActive: true,
  };

  // When delivery fee is ₱35, discount should be ₱35
  const discountDelivery = calculateVoucherDiscount(voucher, 150, 35);
  assert.equal(discountDelivery, 35);

  // When delivery fee is ₱0 (pickup), discount should be ₱0
  const discountPickup = calculateVoucherDiscount(voucher, 150, 0);
  assert.equal(discountPickup, 0);
});

test("calculateVoucherDiscount correctly calculates fixed discounts with min spend enforcement", () => {
  const voucher: Voucher = {
    id: "v-test-2",
    code: "MATI50",
    discountType: "fixed",
    value: 50,
    minSpend: 200,
    timesUsed: 0,
    isActive: true,
  };

  // Qualifying subtotal (₱250 >= ₱200 min spend) -> ₱50 off
  assert.equal(calculateVoucherDiscount(voucher, 250, 35), 50);

  // Subtotal below min spend (₱180 < ₱200) -> ₱0 discount
  assert.equal(calculateVoucherDiscount(voucher, 180, 35), 0);

  // Subtotal smaller than discount (₱40 subtotal, ₱0 min spend) -> caps at subtotal
  const smallSubtotalVoucher: Voucher = { ...voucher, minSpend: 0 };
  assert.equal(calculateVoucherDiscount(smallSubtotalVoucher, 40, 35), 40);
});

test("calculateVoucherDiscount correctly calculates percentage discounts off subtotal", () => {
  const voucher: Voucher = {
    id: "v-test-3",
    code: "HALAHALA10",
    discountType: "percentage",
    value: 10, // 10%
    minSpend: 150,
    timesUsed: 0,
    isActive: true,
  };

  // Subtotal ₱300 -> 10% is ₱30
  assert.equal(calculateVoucherDiscount(voucher, 300, 35), 30);

  // Subtotal ₱120 (below ₱150 min spend) -> ₱0 discount
  assert.equal(calculateVoucherDiscount(voucher, 120, 35), 0);
});

test("validateVoucherCode validates MATIFIRST case-insensitively and returns ₱35 discount", async () => {
  const resUpper = await validateVoucherCode("MATIFIRST", 120, 35);
  assert.equal(resUpper.isValid, true);
  assert.equal(resUpper.voucher?.code, "MATIFIRST");
  assert.equal(resUpper.discountAmount, 35);

  // Whitespace and lowercase handling
  const resLower = await validateVoucherCode("  matifirst  ", 120, 35);
  assert.equal(resLower.isValid, true);
  assert.equal(resLower.discountAmount, 35);
});

test("validateVoucherCode rejects invalid or empty promo codes with actionable error", async () => {
  const emptyRes = await validateVoucherCode("", 100, 35);
  assert.equal(emptyRes.isValid, false);
  assert.ok(emptyRes.errorMessage?.includes("Palihug pagsulod"));

  const invalidRes = await validateVoucherCode("NONEXISTENT999", 100, 35);
  assert.equal(invalidRes.isValid, false);
  assert.ok(invalidRes.errorMessage?.includes("Invalid promo code"));
});

test("validateVoucherCode rejects vouchers if order subtotal is below minimum spend", async () => {
  // MATI50 requires min spend ₱200
  const lowSpendRes = await validateVoucherCode("MATI50", 150, 35);
  assert.equal(lowSpendRes.isValid, false);
  assert.ok(lowSpendRes.errorMessage?.includes("minimum order"));

  // Above min spend qualifies
  const qualifyingRes = await validateVoucherCode("MATI50", 250, 35);
  assert.equal(qualifyingRes.isValid, true);
  assert.equal(qualifyingRes.discountAmount, 50);
});

test("validateVoucherCode validates HALAHALA10 percentage discount correctly", async () => {
  // HALAHALA10 is 10% off for min spend ₱150
  const subBelowMin = await validateVoucherCode("HALAHALA10", 100, 35);
  assert.equal(subBelowMin.isValid, false);

  const subQualifying = await validateVoucherCode("HALAHALA10", 200, 35);
  assert.equal(subQualifying.isValid, true);
  assert.equal(subQualifying.voucher?.discountType, "percentage");
  assert.equal(subQualifying.discountAmount, 20); // 10% of 200 = 20
});

test("calculateVoucherDiscount returns 0 for inactive vouchers", () => {
  const inactiveVoucher: Voucher = {
    id: "v-inactive",
    code: "OLDPROMO",
    discountType: "fixed",
    value: 50,
    minSpend: 0,
    timesUsed: 0,
    isActive: false,
  };
  assert.equal(calculateVoucherDiscount(inactiveVoucher, 300, 35), 0);
});
