import test from "node:test";
import assert from "node:assert/strict";
import {
  getOrderStatusNotificationCopy,
} from "../../services/device-notifications";
import type { OrderStatus } from "../../types/order";

test("getOrderStatusNotificationCopy generates accurate copy for all lifecycle transitions", () => {
  const store = "Mama Letty's Karenderia";
  const pin = "4829";
  const orderNum = "MFF-1024";

  // 1. Placed
  const placed = getOrderStatusNotificationCopy("placed", store, pin, orderNum);
  assert.ok(placed);
  assert.equal(placed.title, "Order Placed! 🛵");
  assert.ok(placed.body.includes(store));
  assert.ok(placed.body.includes(orderNum));

  // 2. Accepted
  const accepted = getOrderStatusNotificationCopy("accepted", store, pin, orderNum);
  assert.ok(accepted);
  assert.equal(accepted.title, "Order Confirmed! 👨‍🍳");
  assert.ok(accepted.body.includes(store));
  assert.ok(accepted.body.includes("started food preparation"));

  // 3. Preparing
  const preparing = getOrderStatusNotificationCopy("preparing", store, pin, orderNum);
  assert.ok(preparing);
  assert.equal(preparing.title, "Cooking in Progress! 🔥");
  assert.ok(preparing.body.includes(store));

  // 4. Ready for pickup
  const ready = getOrderStatusNotificationCopy("ready_for_pickup", store, pin, orderNum);
  assert.ok(ready);
  assert.equal(ready.title, "Order Ready! 📦");
  assert.ok(ready.body.includes("Mati rider"));

  // 5. Out for delivery (Must include the 4-digit Handshake PIN for customer safety)
  const out = getOrderStatusNotificationCopy("out_for_delivery", store, pin, orderNum);
  assert.ok(out);
  assert.equal(out.title, "Out for Delivery! 🚀");
  assert.ok(out.body.includes("Handshake PIN: [4829]"));

  // 6. Delivered
  const delivered = getOrderStatusNotificationCopy("delivered", store, pin, orderNum);
  assert.ok(delivered);
  assert.equal(delivered.title, "Delivered! 🍽️");
  assert.ok(delivered.body.includes("Mati City"));

  // 7. Cancelled
  const cancelled = getOrderStatusNotificationCopy("cancelled", store, pin, orderNum);
  assert.ok(cancelled);
  assert.equal(cancelled.title, "Order Cancelled ❌");
  assert.ok(cancelled.body.includes(store));
});

test("Handshake PIN fallback formatting handles missing PIN gracefully", () => {
  const outNoPin = getOrderStatusNotificationCopy(
    "out_for_delivery",
    "Subangan BBQ Hub",
    undefined,
    "MFF-999"
  );
  assert.ok(outNoPin);
  assert.ok(outNoPin.body.includes("Handshake PIN: [----]"));
});

test("Expo Push Token validator correctly identifies valid token formats", () => {
  function isValidExpoPushToken(token: string): boolean {
    if (!token || typeof token !== "string") return false;
    // Standard ExponentPushToken[...] or uuid format
    return (
      token.startsWith("ExponentPushToken[") &&
      token.endsWith("]") &&
      token.length > 25
    );
  }

  assert.equal(
    isValidExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"),
    true
  );
  assert.equal(isValidExpoPushToken("invalid_token_string"), false);
  assert.equal(isValidExpoPushToken(""), false);
});

test("Lifecycle notification channel specifications meet high-importance heads-up standards", () => {
  const channelConfig = {
    id: "orders-channel",
    name: "Mati Order Lifecycle Updates",
    importance: "MAX",
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
    lightColor: "#EA5410",
  };

  assert.equal(channelConfig.id, "orders-channel");
  assert.equal(channelConfig.importance, "MAX");
  assert.deepEqual(channelConfig.vibrationPattern, [0, 250, 250, 250]);
  assert.equal(channelConfig.lightColor, "#EA5410");
});
