import test from "node:test";
import assert from "node:assert/strict";
import { COMMUNITY_REPORT_REASONS } from "../../services/community";
import {
  aggregateCompliments,
  COURIER_COMPLIMENT_OPTIONS,
  validateStarRating,
  RatingSummary,
} from "../../services/reviews";
import { mapStoreToProfile } from "../../services/catalog";
import type { Store } from "../../types/restaurant";

test("COMMUNITY_REPORT_REASONS contains all 4 canonical reporting categories", () => {
  assert.equal(COMMUNITY_REPORT_REASONS.length, 4, "Must offer exactly 4 reporting reasons");
  assert.ok(COMMUNITY_REPORT_REASONS.includes("Spam / Commercial Bot"));
  assert.ok(COMMUNITY_REPORT_REASONS.includes("Inappropriate / Offensive Content"));
  assert.ok(COMMUNITY_REPORT_REASONS.includes("Misleading / Fake Food Review"));
  assert.ok(COMMUNITY_REPORT_REASONS.includes("Harassment / Abusive Language"));
});

test("aggregateCompliments accurately counts and groups courier feedback tags", () => {
  const mockReviews = [
    { rider_compliments: ["⚡ Fast Delivery", "🍲 Handled with Care"] },
    { rider_compliments: ["⚡ Fast Delivery", "😊 Polite & Friendly"] },
    { rider_compliments: null },
    { rider_compliments: ["⚡ Fast Delivery"] },
    { rider_compliments: [] },
  ];

  const compliments = aggregateCompliments(mockReviews);

  assert.equal(compliments["⚡ Fast Delivery"], 3, "Fast Delivery should have 3 votes");
  assert.equal(compliments["🍲 Handled with Care"], 1, "Handled with Care should have 1 vote");
  assert.equal(compliments["😊 Polite & Friendly"], 1, "Polite & Friendly should have 1 vote");
  assert.equal(compliments["🛵 Safe Driving"], undefined, "Unselected tag should not be present");
});

test("aggregateCompliments gracefully handles empty or malformed review lists", () => {
  assert.deepEqual(aggregateCompliments([]), {});
  assert.deepEqual(aggregateCompliments([{ rider_compliments: null }, { rider_compliments: undefined }]), {});
});

test("mapStoreToProfile integrates live store RatingSummary accurately", () => {
  const dummyStore: Store = {
    id: "store-test-123",
    name: "Mati Seafood Harbor",
    slug: "mati-seafood-harbor",
    description: "Fresh coastal catches",
    address_text: "Baywalk, Mati City",
    barangay: "Central",
    public_phone: "+63 912 345 6789",
    operating_hours: "8:00 AM - 9:00 PM",
    delivery_enabled: true,
    is_open: true,
    approval_status: "approved",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    archived_at: null,
    cover_image_url: null,
    location: null,
  };

  // Case 1: Active store with real reviews
  const activeSummary: RatingSummary = {
    averageRating: 4.86,
    totalReviews: 42,
  };
  const activeProfile = mapStoreToProfile(dummyStore, activeSummary);
  assert.equal(activeProfile.rating, "4.9", "Rating should be rounded to 1 decimal place");
  assert.equal(activeProfile.reviews, 42, "Review count should reflect live orders");

  // Case 2: New store with 0 reviews
  const newSummary: RatingSummary = {
    averageRating: 5.0,
    totalReviews: 0,
  };
  const newProfile = mapStoreToProfile(dummyStore, newSummary);
  assert.equal(newProfile.rating, "5.0", "New store rating defaults to 5.0");
  assert.equal(newProfile.reviews, 0, "New store has 0 reviews");

  // Case 3: Omitted summary defaults to Mati benchmark
  const defaultProfile = mapStoreToProfile(dummyStore);
  assert.equal(defaultProfile.rating, "4.8", "Default rating benchmark is 4.8");
  assert.equal(defaultProfile.reviews, 120, "Default benchmark reviews is 120");
});

test("COURIER_COMPLIMENT_OPTIONS maintains canonical compliments list", () => {
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("⚡ Fast Delivery"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("🍲 Handled with Care"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("😊 Polite & Friendly"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("📞 Great Communication"));
  assert.ok(COURIER_COMPLIMENT_OPTIONS.includes("🛵 Safe Driving"));
});
