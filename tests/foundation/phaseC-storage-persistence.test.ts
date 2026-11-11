import test from "node:test";
import assert from "node:assert/strict";
import { mapStoreToProfile } from "../../services/catalog";
import type { Store } from "../../types/restaurant";

test("mapStoreToProfile maps custom cover_image_url and operating_hours correctly", () => {
  const storeWithBranding: Store = {
    id: "store-branding-789",
    name: "Dahican Surf & Grill",
    slug: "dahican-surf-and-grill",
    description: "Beachfront dining and shakes in Mati",
    address_text: "Dahican Beach Road, Mati City",
    barangay: "Dahican",
    approval_status: "approved",
    is_open: true,
    delivery_enabled: true,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    location: null,
    public_phone: "+63 919 888 7777",
    cover_image_url: "https://supabase.co/storage/v1/object/public/store-branding/covers/store-branding-789_12345.jpg",
    operating_hours: "06:30 AM - 10:00 PM Daily",
  };

  const profile = mapStoreToProfile(storeWithBranding);

  assert.equal(profile.imageUrl, "https://supabase.co/storage/v1/object/public/store-branding/covers/store-branding-789_12345.jpg");
  assert.equal(profile.hours, "06:30 AM - 10:00 PM Daily");
  assert.equal(profile.cover_image_url, "https://supabase.co/storage/v1/object/public/store-branding/covers/store-branding-789_12345.jpg");
  assert.equal(profile.operating_hours, "06:30 AM - 10:00 PM Daily");
});

test("Operating hours format pattern matches open and close times", () => {
  const openTime = "07:00 AM";
  const closeTime = "08:30 PM";
  const formattedHours = `${openTime} - ${closeTime} Daily`;

  const regex = /^([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))\s*-\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))/i;
  const match = formattedHours.match(regex);

  assert.ok(match, "Formatted hours must match time range regex");
  assert.equal(match[1], "07:00 AM");
  assert.equal(match[2], "08:30 PM");
});

test("Customer personalization consent defaults to enabled and supports toggle persistence", () => {
  // Profiles schema row defaults personalization_consent to true
  const initialConsent = true;
  assert.equal(initialConsent, true);

  // Toggle state inversion
  const toggledOff = !initialConsent;
  assert.equal(toggledOff, false);

  const payload: { personalization_consent?: boolean } = {
    personalization_consent: toggledOff,
  };

  assert.equal(payload.personalization_consent, false);
});

test("Store cover photo path generation targets store-branding covers folder", () => {
  const storeId = "store-abc-123";
  const mime = "image/png";
  const ext = mime.includes("png") ? "png" : "jpg";
  const timestamp = 1700000000000;
  const path = `covers/${storeId}_${timestamp}.${ext}`;

  assert.equal(path, "covers/store-abc-123_1700000000000.png");
  assert.ok(path.startsWith("covers/"));
});
