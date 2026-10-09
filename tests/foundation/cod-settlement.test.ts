/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCodSettlement, LiveOrder } from "../../services/orders";

function createMockLiveOrder(overrides: Partial<LiveOrder> = {}): LiveOrder {
  return {
    id: "ord-101",
    orderNumber: "MFF-1001",
    customerId: "cust-1",
    storeId: "store-letty",
    storeName: "Mama Letty's Pinakbet & Seafoods",
    customerName: "Maria Santos",
    status: "delivered",
    fulfillmentType: "delivery",
    paymentMethod: "cod",
    subtotal: 250,
    deliveryFee: 35,
    total: 285,
    deliveryAddress: "Madang, Mati City",
    barangay: "Central",
    notes: "Please call upon arrival",
    handshakePin: "1234",
    items: [
      {
        id: "item-1",
        menuItemId: "menu-1",
        name: "Special Pinakbet",
        price: 250,
        quantity: 1,
        subtotal: 250,
      },
    ],
    isRebroadcast: false,
    isRemitted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("calculateCodSettlement correctly balances gross cash, rider fees, and merchant food subtotal", () => {
  const order1 = createMockLiveOrder({
    id: "ord-1",
    orderNumber: "MFF-1001",
    subtotal: 300,
    deliveryFee: 40,
    total: 340,
    isRemitted: false,
  });

  const order2 = createMockLiveOrder({
    id: "ord-2",
    orderNumber: "MFF-1002",
    subtotal: 200,
    deliveryFee: 35,
    total: 235,
    isRemitted: true,
  });

  const settlement = calculateCodSettlement([order1, order2]);

  assert.equal(settlement.totalDeliveredOrders, 2);
  assert.equal(settlement.totalCashCollected, 575); // 340 + 235
  assert.equal(settlement.totalRiderFeesEarned, 75); // 40 + 35
  assert.equal(settlement.totalFoodSubtotalToRemit, 500); // 300 + 200

  // Fundamental accounting invariant: Gross cash collected = Rider fees + Store food remittance
  assert.equal(
    settlement.totalCashCollected,
    settlement.totalRiderFeesEarned + settlement.totalFoodSubtotalToRemit
  );

  assert.equal(settlement.totalRemitted, 200);
  assert.equal(settlement.totalPendingRemittance, 300);
});

test("calculateCodSettlement groups orders by store with individual pending/remitted balances", () => {
  const orderStoreA1 = createMockLiveOrder({
    id: "ord-a1",
    storeId: "store-a",
    storeName: "Mama Letty's",
    subtotal: 150,
    deliveryFee: 35,
    total: 185,
    isRemitted: true,
  });

  const orderStoreA2 = createMockLiveOrder({
    id: "ord-a2",
    storeId: "store-a",
    storeName: "Mama Letty's",
    subtotal: 250,
    deliveryFee: 35,
    total: 285,
    isRemitted: true,
  });

  const orderStoreB1 = createMockLiveOrder({
    id: "ord-b1",
    storeId: "store-b",
    storeName: "Baywalk Seaside Grill",
    subtotal: 400,
    deliveryFee: 45,
    total: 445,
    isRemitted: false,
  });

  const settlement = calculateCodSettlement([orderStoreA1, orderStoreA2, orderStoreB1]);

  assert.equal(settlement.byStore.length, 2);

  const storeA = settlement.byStore.find((s) => s.storeId === "store-a");
  assert.ok(storeA);
  assert.equal(storeA.orderCount, 2);
  assert.equal(storeA.totalFoodSubtotal, 400);
  assert.equal(storeA.remittedAmount, 400);
  assert.equal(storeA.pendingAmount, 0);
  assert.equal(storeA.isFullySettled, true);

  const storeB = settlement.byStore.find((s) => s.storeId === "store-b");
  assert.ok(storeB);
  assert.equal(storeB.orderCount, 1);
  assert.equal(storeB.totalFoodSubtotal, 400);
  assert.equal(storeB.remittedAmount, 0);
  assert.equal(storeB.pendingAmount, 400);
  assert.equal(storeB.isFullySettled, false);
});

test("calculateCodSettlement filters out non-delivered and non-COD orders", () => {
  const deliveredCod = createMockLiveOrder({
    id: "ord-del-cod",
    status: "delivered",
    paymentMethod: "cod",
    subtotal: 180,
    deliveryFee: 35,
    total: 215,
  });

  const preparingCod = createMockLiveOrder({
    id: "ord-prep-cod",
    status: "preparing",
    paymentMethod: "cod",
    subtotal: 500,
    deliveryFee: 35,
    total: 535,
  });

  const cancelledCod = createMockLiveOrder({
    id: "ord-canc-cod",
    status: "cancelled",
    paymentMethod: "cod",
    subtotal: 350,
    deliveryFee: 35,
    total: 385,
  });

  const deliveredGcash = createMockLiveOrder({
    id: "ord-del-gcash",
    status: "delivered",
    paymentMethod: "gcash",
    subtotal: 600,
    deliveryFee: 35,
    total: 635,
  });

  const settlement = calculateCodSettlement([
    deliveredCod,
    preparingCod,
    cancelledCod,
    deliveredGcash,
  ]);

  assert.equal(settlement.totalDeliveredOrders, 1);
  assert.equal(settlement.totalCashCollected, 215);
  assert.equal(settlement.totalRiderFeesEarned, 35);
  assert.equal(settlement.totalFoodSubtotalToRemit, 180);
});
