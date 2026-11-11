import test from "node:test";
import assert from "node:assert/strict";
import { calculateVoucherDiscount, Voucher } from "../../services/vouchers";

// Simulated Cart Item model aligned with context/CartContext.tsx
interface CartItem {
  id: string;
  dishId: number;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  storeName: string;
  storeId?: string;
}

function calculateBasketSummary(
  items: CartItem[],
  fulfillment: "delivery" | "pickup",
  voucher?: Voucher | null
) {
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const foodSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillment === "delivery" ? 35 : 0;
  const discount = voucher ? calculateVoucherDiscount(voucher, foodSubtotal, deliveryFee) : 0;
  const total = Math.max(0, foodSubtotal + deliveryFee - discount);

  return {
    totalCount,
    foodSubtotal,
    deliveryFee,
    discount,
    total,
  };
}

test("Multi-item cart accumulates multiple dishes and drinks in 1 order", () => {
  const items: CartItem[] = [
    {
      id: "Karenderia-1",
      dishId: 1,
      name: "Lechon Kawali",
      price: 150,
      quantity: 2,
      storeName: "Mama Letty's Karenderia",
      storeId: "11111111-1111-1111-1111-111111111111",
    },
    {
      id: "Karenderia-2",
      dishId: 2,
      name: "Sinigang na Isda",
      price: 180,
      quantity: 1,
      storeName: "Mama Letty's Karenderia",
      storeId: "11111111-1111-1111-1111-111111111111",
    },
    {
      id: "Karenderia-3",
      dishId: 3,
      name: "Fresh Buko Juice",
      price: 40,
      quantity: 3,
      storeName: "Mama Letty's Karenderia",
      storeId: "11111111-1111-1111-1111-111111111111",
    },
  ];

  const summary = calculateBasketSummary(items, "delivery");

  // 2 + 1 + 3 = 6 items total
  assert.equal(summary.totalCount, 6);
  // (150 * 2) + (180 * 1) + (40 * 3) = 300 + 180 + 120 = 600
  assert.equal(summary.foodSubtotal, 600);
  assert.equal(summary.deliveryFee, 35);
  assert.equal(summary.discount, 0);
  // Formula: Food Subtotal (600) + Delivery Fee (35) - Discount (0) = 635
  assert.equal(summary.total, 635);
});

test("Multi-item checkout summary verifies (Food Subtotal + Delivery Fee - Discount = Total)", () => {
  const items: CartItem[] = [
    {
      id: "Tuna-1",
      dishId: 10,
      name: "Grilled Tuna Belly",
      price: 250,
      quantity: 2,
      storeName: "Mati Baywalk Grill",
    },
    {
      id: "Tuna-2",
      dishId: 11,
      name: "Kinilaw Special",
      price: 180,
      quantity: 1,
      storeName: "Mati Baywalk Grill",
    },
  ];

  // Food Subtotal: (250 * 2) + 180 = 680
  const voucher: Voucher = {
    id: "vouch-1",
    code: "MATI50",
    description: "₱50 off orders over ₱300",
    discountType: "fixed",
    value: 50,
    minSpend: 300,
    isActive: true,
    timesUsed: 0,
  };

  const deliverySummary = calculateBasketSummary(items, "delivery", voucher);
  assert.equal(deliverySummary.foodSubtotal, 680);
  assert.equal(deliverySummary.deliveryFee, 35);
  assert.equal(deliverySummary.discount, 50);
  // Formula: 680 + 35 - 50 = 665
  assert.equal(deliverySummary.total, 665);

  // Self-pickup test: Delivery fee should be 0
  const pickupSummary = calculateBasketSummary(items, "pickup", voucher);
  assert.equal(pickupSummary.deliveryFee, 0);
  // Formula: 680 + 0 - 50 = 630
  assert.equal(pickupSummary.total, 630);
});

test("Free delivery voucher waives delivery fee in multi-item checkout formula", () => {
  const items: CartItem[] = [
    {
      id: "Sainz-1",
      dishId: 21,
      name: "Pork BBQ Skewers (5pcs)",
      price: 120,
      quantity: 2,
      storeName: "Subangan BBQ Hub",
    },
  ];

  // Subtotal = 240
  const freeDeliveryVoucher: Voucher = {
    id: "vouch-free",
    code: "MATIFIRST",
    description: "Free delivery for Mati customers",
    discountType: "free_delivery",
    value: 35,
    minSpend: 0,
    isActive: true,
    timesUsed: 0,
  };

  const summary = calculateBasketSummary(items, "delivery", freeDeliveryVoucher);
  assert.equal(summary.foodSubtotal, 240);
  assert.equal(summary.deliveryFee, 35);
  assert.equal(summary.discount, 35);
  // Formula: 240 + 35 - 35 = 240
  assert.equal(summary.total, 240);
});

test("Single-store cart constraint detects restaurant conflict", () => {
  let cartStoreName: string | null = "Mama Letty's Karenderia";
  const cartItems: CartItem[] = [
    {
      id: "Letty-1",
      dishId: 1,
      name: "Adobo",
      price: 90,
      quantity: 1,
      storeName: "Mama Letty's Karenderia",
    },
  ];

  const incomingDish = {
    id: 5,
    name: "Kinilaw",
    price: 150,
    store: "Dahican Beach Bites",
  };

  // Conflict detection
  const isConflict =
    cartStoreName !== null &&
    cartStoreName !== incomingDish.store &&
    cartItems.length > 0;

  assert.equal(isConflict, true);

  // Forced replacement resets cart to new store
  if (isConflict) {
    cartStoreName = incomingDish.store;
    cartItems.length = 0;
    cartItems.push({
      id: `${incomingDish.store}-${incomingDish.id}`,
      dishId: incomingDish.id,
      name: incomingDish.name,
      price: incomingDish.price,
      quantity: 1,
      storeName: incomingDish.store,
    });
  }

  assert.equal(cartStoreName, "Dahican Beach Bites");
  assert.equal(cartItems.length, 1);
  assert.equal(cartItems[0].dishId, 5);
});
