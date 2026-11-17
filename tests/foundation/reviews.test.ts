import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStarRating,
  computeRatingSummary,
  computeStoreDetailedRatingSummary,
  COURIER_COMPLIMENT_OPTIONS,
  SubmitReviewPayload,
} from "../../services/reviews";
import { canStoreViewCustomerReviews } from "../../lib/subscription-tiers";

test("validateStarRating strictly validates integer star ratings between 1 and 5", () => {
  // Valid ratings
  assert.equal(validateStarRating(1), true);
  assert.equal(validateStarRating(2), true);
  assert.equal(validateStarRating(3), true);
  assert.equal(validateStarRating(4), true);
  assert.equal(validateStarRating(5), true);

  // Out of bounds ratings
  assert.equal(validateStarRating(0), false);
  assert.equal(validateStarRating(6), false);
  assert.equal(validateStarRating(-1), false);
  assert.equal(validateStarRating(10), false);

  // Decimal ratings are rejected (stars must be discrete 1-5)
  assert.equal(validateStarRating(4.5), false);
  assert.equal(validateStarRating(3.2), false);

  // Non-number values
  assert.equal(validateStarRating(null), false);
  assert.equal(validateStarRating(undefined), false);
  assert.equal(validateStarRating("5"), false);
  assert.equal(validateStarRating(NaN), false);
});

test("computeRatingSummary computes accurate averages rounded to 1 decimal place", () => {
  // Standard reviews pool: [5, 4, 5, 4, 5] -> sum = 23, count = 5 -> avg = 4.6
  const summary1 = computeRatingSummary([5, 4, 5, 4, 5]);
  assert.equal(summary1.averageRating, 4.6);
  assert.equal(summary1.totalReviews, 5);

  // All 5 stars
  const summary2 = computeRatingSummary([5, 5, 5]);
  assert.equal(summary2.averageRating, 5.0);
  assert.equal(summary2.totalReviews, 3);

  // Mixed ratings: [5, 5, 4, 5, 5, 4, 3] -> sum = 31, count = 7 -> 31/7 = 4.428... -> 4.4
  const summary3 = computeRatingSummary([5, 5, 4, 5, 5, 4, 3]);
  assert.equal(summary3.averageRating, 4.4);
  assert.equal(summary3.totalReviews, 7);

  // Empty list returns default 5.0 baseline with 0 total reviews
  const summaryEmpty = computeRatingSummary([]);
  assert.equal(summaryEmpty.averageRating, 5.0);
  assert.equal(summaryEmpty.totalReviews, 0);
});

test("COURIER_COMPLIMENT_OPTIONS contains canonical feedback tags", () => {
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("⚡ Fast Delivery"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("🍲 Handled with Care"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("😊 Polite & Friendly"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("📞 Great Communication"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("🛵 Safe Driving"));
  assert.equal(COURIER_COMPLIMENT_OPTIONS.length, 5);
});

test("SubmitReviewPayload structures food and courier ratings independently", () => {
  // Dual rating delivery payload
  const deliveryPayload: SubmitReviewPayload = {
    orderId: "ord-test-1",
    storeId: "store-test-1",
    storeName: "Mama Letty's Karenderia",
    riderId: "rider-test-1",
    foodRating: 5,
    riderRating: 4,
    reviewText: "Lami kaayo ang Kinilaw! Fast delivery.",
    riderCompliments: ["⚡ Fast Delivery", "🍲 Handled with Care"],
    postToCommunity: true,
  };

  assert.equal(validateStarRating(deliveryPayload.foodRating), true);
  assert.equal(validateStarRating(deliveryPayload.riderRating), true);
  assert.notEqual(deliveryPayload.foodRating, deliveryPayload.riderRating);
  assert.equal(deliveryPayload.postToCommunity, true);

  // Pickup payload (courier rating is omitted/null)
  const pickupPayload: SubmitReviewPayload = {
    orderId: "ord-test-2",
    storeId: "store-test-2",
    storeName: "Baywalk Seafood Grill",
    riderId: null,
    foodRating: 5,
    riderRating: null,
    reviewText: "Picked up on time, hot and fresh.",
    postToCommunity: false,
  };

  assert.equal(validateStarRating(pickupPayload.foodRating), true);
  assert.equal(pickupPayload.riderRating, null);
  assert.equal(pickupPayload.postToCommunity, false);
});

test("computeStoreDetailedRatingSummary accurately computes star counts, percentages, and sentiment", () => {
  // Pool of ratings: 5, 5, 5, 4, 4, 3, 2, 1 -> total 8
  const detailed = computeStoreDetailedRatingSummary([5, 5, 5, 4, 4, 3, 2, 1]);
  assert.equal(detailed.totalReviews, 8);
  assert.equal(detailed.starCounts[5], 3);
  assert.equal(detailed.starCounts[4], 2);
  assert.equal(detailed.starCounts[3], 1);
  assert.equal(detailed.starCounts[2], 1);
  assert.equal(detailed.starCounts[1], 1);

  // Percentages: 3/8 = 37.5% -> 38%, 2/8 = 25%, 1/8 = 12.5% -> 13%
  assert.equal(detailed.starPercentages[5], 38);
  assert.equal(detailed.starPercentages[4], 25);
  assert.equal(detailed.starPercentages[3], 13);
  assert.equal(detailed.starPercentages[2], 13);
  assert.equal(detailed.starPercentages[1], 13);

  // Positive percentage: (3 + 2)/8 = 5/8 = 62.5% -> 63%
  assert.equal(detailed.positivePercentage, 63);

  // Empty ratings pool defaults safely without division by zero
  const emptyDetailed = computeStoreDetailedRatingSummary([]);
  assert.equal(emptyDetailed.totalReviews, 0);
  assert.equal(emptyDetailed.averageRating, 5.0);
  assert.equal(emptyDetailed.starCounts[5], 0);
  assert.equal(emptyDetailed.starPercentages[5], 0);
  assert.equal(emptyDetailed.positivePercentage, 100);
});

test("canStoreViewCustomerReviews enforces plan entitlement gating", () => {
  assert.equal(canStoreViewCustomerReviews("basic"), false);
  assert.equal(canStoreViewCustomerReviews("Basic"), false);
  assert.equal(canStoreViewCustomerReviews(null), false);
  assert.equal(canStoreViewCustomerReviews(undefined), false);

  assert.equal(canStoreViewCustomerReviews("standard"), true);
  assert.equal(canStoreViewCustomerReviews("Standard"), true);
  assert.equal(canStoreViewCustomerReviews("commercial"), true);
  assert.equal(canStoreViewCustomerReviews("Commercial"), true);
});
