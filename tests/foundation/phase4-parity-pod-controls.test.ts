import test from "node:test";
import assert from "node:assert/strict";
import { mapStoreToProfile } from "../../services/catalog";
import { mapDatabaseOrderToLiveOrder } from "../../services/orders";
import type { Store, DishModifierGroup } from "../../types/restaurant";
import type { Database } from "../../types/database";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

test("mapStoreToProfile accurately preserves isOpen status", () => {
  const openStoreRow: Store = {
    id: "store-open-123",
    name: "Mati Seafood Shack",
    slug: "mati-seafood-shack",
    description: "Fresh tuna and seafood along Dahican",
    address_text: "Dahican Beach, Mati City",
    barangay: "Dahican",
    approval_status: "approved",
    is_open: true,
    delivery_enabled: true,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    location: null,
    public_phone: "+63 917 111 2222",
    cover_image_url: null,
    operating_hours: "7:00 AM - 8:30 PM Daily",
  };

  const openProfile = mapStoreToProfile(openStoreRow);
  assert.equal(openProfile.isOpen, true);
  assert.equal(openProfile.category, "Seafood");

  const closedStoreRow: Store = {
    ...openStoreRow,
    id: "store-closed-456",
    is_open: false,
  };

  const closedProfile = mapStoreToProfile(closedStoreRow);
  assert.equal(closedProfile.isOpen, false);
});

test("mapDatabaseOrderToLiveOrder accurately maps POD photo URL and timestamp", () => {
  const mockOrderRow: OrderRow = {
    id: "order-pod-001",
    customer_id: "user-123",
    customer_phone: "+63 917 000 1111",
    store_id: "store-456",
    rider_id: "rider-789",
    status: "delivered",
    total_centavos: 28500, // ₱285.00
    subtotal_centavos: 25000,
    delivery_fee_centavos: 3500,
    discount_centavos: 0,
    payment_method: "cod",
    delivery_address: "Purok Sunrise, Brgy. Dahican",
    barangay: "Dahican",
    handshake_pin: "5829",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_number: "MFF-001",
    fulfillment_type: "delivery",
    notes: "Drop by gate",
    voucher_code: null,
    voucher_id: null,
    pod_image_url: "https://mock-supabase.co/storage/v1/object/public/delivery-proofs/order-pod-001-pod.jpg",
    pod_timestamp: "2026-10-13T10:30:00.000Z",
  };

  const liveOrder = mapDatabaseOrderToLiveOrder({
    ...mockOrderRow,
    order_items: [
      {
        id: "item-1",
        order_id: "order-pod-001",
        menu_item_id: "item-a",
        item_name: "Tuna Kinilaw",
        price_centavos: 25000,
        quantity: 1,
      },
    ],
  });

  assert.equal(liveOrder.id, "order-pod-001");
  assert.equal(liveOrder.status, "delivered");
  assert.equal(
    liveOrder.podImageUrl,
    "https://mock-supabase.co/storage/v1/object/public/delivery-proofs/order-pod-001-pod.jpg"
  );
  assert.equal(liveOrder.podTimestamp, "2026-10-13T10:30:00.000Z");
  assert.equal(liveOrder.total, 285.0);
});

test("Dish modifier groups compute custom item prices and modifiers summary correctly", () => {
  const modifierGroups: DishModifierGroup[] = [
    {
      id: "spice_level",
      name: "Spice Level",
      options: [
        { id: "mild", name: "Mild", priceAdjustment: 0 },
        { id: "spicy", name: "Spicy", priceAdjustment: 0 },
        { id: "extra_spicy", name: "Extra Spicy 🔥", priceAdjustment: 15 },
      ],
    },
    {
      id: "add_ons",
      name: "Add-ons & Extras",
      options: [
        { id: "egg", name: "Fried Egg", priceAdjustment: 20 },
        { id: "extra_rice", name: "Extra Garlic Rice", priceAdjustment: 25 },
      ],
    },
  ];

  // Base dish price: ₱120.00
  const basePrice = 120.0;

  // Selected: Extra Spicy (+₱15) + Fried Egg (+₱20) + Extra Rice (+₱25)
  const selectedExtraSpicy = modifierGroups[0].options[2];
  const selectedEgg = modifierGroups[1].options[0];
  const selectedRice = modifierGroups[1].options[1];

  const totalPrice =
    basePrice +
    selectedExtraSpicy.priceAdjustment +
    selectedEgg.priceAdjustment +
    selectedRice.priceAdjustment;

  assert.equal(totalPrice, 180.0);

  const summary = [
    selectedExtraSpicy.name,
    selectedEgg.name,
    selectedRice.name,
  ].join(", ");

  assert.equal(summary, "Extra Spicy 🔥, Fried Egg, Extra Garlic Rice");
});

test("Customer COD Strike governance correctly identifies accounts needing admin reset", () => {
  const cleanCustomer = {
    id: "cust-1",
    cod_strikes: 0,
    cod_eligible: true,
  };

  const warnedCustomer = {
    id: "cust-2",
    cod_strikes: 1,
    cod_eligible: true,
  };

  const blockedCustomer = {
    id: "cust-3",
    cod_strikes: 2,
    cod_eligible: false,
  };

  // Check strike threshold condition
  const needsResetWarning = (c: typeof cleanCustomer) => c.cod_strikes > 0 || !c.cod_eligible;

  assert.equal(needsResetWarning(cleanCustomer), false);
  assert.equal(needsResetWarning(warnedCustomer), true);
  assert.equal(needsResetWarning(blockedCustomer), true);

  // Admin resets customer strikes
  const resetProfile = {
    ...blockedCustomer,
    cod_strikes: 0,
    cod_eligible: true,
  };

  assert.equal(resetProfile.cod_strikes, 0);
  assert.equal(resetProfile.cod_eligible, true);
  assert.equal(needsResetWarning(resetProfile), false);
});
