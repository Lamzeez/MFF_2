import test from "node:test";
import assert from "node:assert/strict";
import {
  generateUpcomingReservationDates,
  formatReservationDate,
} from "../../lib/reservation-dates";

// Simulated Cart state model matching context/CartContext.tsx implementation
interface CartItem {
  id: string; // Composite key: ${dishStore}-${dish.id}${modKey}
  dishId: number;
  name: string;
  price: number;
  quantity: number;
  storeName: string;
  selectedModifiers?: Record<string, string>;
  modifierSummary?: string;
}

function createSimulatedCart() {
  let items: CartItem[] = [];
  let storeName: string | null = null;

  const addItem = (
    dish: { id: number; name: string; price: number; store: string },
    quantity = 1,
    selectedModifiers?: Record<string, string>,
    modifierPriceAdjustment = 0,
    modifierSummary?: string
  ) => {
    const dishStore = dish.store || "Mati Restaurant";
    const effectivePrice = Math.max(0, dish.price + modifierPriceAdjustment);
    const modKey =
      selectedModifiers && Object.keys(selectedModifiers).length > 0
        ? `-${Object.entries(selectedModifiers)
            .sort()
            .map(([k, v]) => `${k}:${v}`)
            .join("|")}`
        : "";
    const itemId = `${dishStore}-${dish.id}${modKey}`;

    storeName = dishStore;

    const existingIndex = items.findIndex((i) => i.id === itemId);
    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        id: itemId,
        dishId: dish.id,
        name: dish.name,
        price: effectivePrice,
        quantity: Math.max(1, quantity),
        storeName: dishStore,
        selectedModifiers,
        modifierSummary,
      });
    }
  };

  const updateQuantity = (target: string | number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(target);
      return;
    }
    items = items.map((item) => {
      const isMatch = typeof target === "string" ? item.id === target : item.dishId === target;
      if (isMatch) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
  };

  const removeItem = (target: string | number) => {
    items = items.filter((item) => {
      const isMatch = typeof target === "string" ? item.id === target : item.dishId === target;
      return !isMatch;
    });
    if (items.length === 0) {
      storeName = null;
    }
  };

  const getItemQuantity = (target: string | number): number => {
    if (typeof target === "string") {
      const item = items.find((i) => i.id === target);
      return item ? item.quantity : 0;
    }
    return items.filter((i) => i.dishId === target).reduce((sum, i) => sum + i.quantity, 0);
  };

  return {
    getItems: () => [...items],
    getStoreName: () => storeName,
    addItem,
    updateQuantity,
    removeItem,
    getItemQuantity,
  };
}

test("Multi-item cart modifier isolation: customized variants of the same dish have distinct item IDs", () => {
  const cart = createSimulatedCart();
  const dish = {
    id: 10,
    name: "Grilled Tuna Belly",
    price: 250,
    store: "Mati Baywalk Grill",
  };

  // Add Variant 1: Regular spice (no extra cost)
  cart.addItem(dish, 1, { "Spice Level": "Regular" }, 0, "Regular");

  // Add Variant 2: Extra spicy (+₱10) and Extra Rice (+₱20)
  cart.addItem(
    dish,
    1,
    { "Spice Level": "Extra Spicy", "Add-on": "Extra Rice (+₱20)" },
    30,
    "Extra Spicy · Extra Rice (+₱20)"
  );

  const items = cart.getItems();
  assert.equal(items.length, 2, "Cart must maintain 2 distinct rows for different modifier sets");
  assert.notEqual(items[0].id, items[1].id, "Composite item IDs must be distinct");
  assert.equal(items[0].price, 250);
  assert.equal(items[1].price, 280);
});

test("CartContext updateQuantity by unique composite itemId updates ONLY targeted modifier variation", () => {
  const cart = createSimulatedCart();
  const dish = {
    id: 10,
    name: "Grilled Tuna Belly",
    price: 250,
    store: "Mati Baywalk Grill",
  };

  cart.addItem(dish, 1, { "Spice Level": "Regular" }, 0, "Regular");
  cart.addItem(dish, 1, { "Spice Level": "Extra Spicy" }, 10, "Extra Spicy");

  const [varRegular, varSpicy] = cart.getItems();

  // Increment quantity of the spicy variant ONLY
  cart.updateQuantity(varSpicy.id, 3);

  const updatedItems = cart.getItems();
  const updatedRegular = updatedItems.find((i) => i.id === varRegular.id);
  const updatedSpicy = updatedItems.find((i) => i.id === varSpicy.id);

  assert.equal(updatedRegular?.quantity, 1, "Regular variation quantity must remain untouched");
  assert.equal(updatedSpicy?.quantity, 3, "Spicy variation quantity must be updated to 3");

  // Verify polymorphic getItemQuantity
  assert.equal(cart.getItemQuantity(varSpicy.id), 3, "Specific variant quantity is 3");
  assert.equal(cart.getItemQuantity(varRegular.id), 1, "Specific variant quantity is 1");
  assert.equal(cart.getItemQuantity(10), 4, "Total dish 10 quantity across all variants is 4 (1 + 3)");
});

test("CartContext removeItem by unique composite itemId deletes ONLY targeted modifier variation", () => {
  const cart = createSimulatedCart();
  const dish = {
    id: 10,
    name: "Grilled Tuna Belly",
    price: 250,
    store: "Mati Baywalk Grill",
  };

  cart.addItem(dish, 1, { "Spice Level": "Regular" }, 0, "Regular");
  cart.addItem(dish, 1, { "Spice Level": "Extra Spicy" }, 10, "Extra Spicy");

  const [varRegular] = cart.getItems();

  // Remove the regular variant only
  cart.removeItem(varRegular.id);

  const remainingItems = cart.getItems();
  assert.equal(remainingItems.length, 1, "Only one variation should remain in cart");
  assert.equal(remainingItems[0].selectedModifiers?.["Spice Level"], "Extra Spicy");
  assert.equal(cart.getStoreName(), "Mati Baywalk Grill", "Store name must be preserved");
});

test("generateUpcomingReservationDates creates 14 consecutive ISO YYYY-MM-DD dates starting today", () => {
  const dates = generateUpcomingReservationDates(14);
  assert.equal(dates.length, 14, "Must generate exactly 14 booking dates");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const expectedTodayIso = `${year}-${month}-${day}`;

  assert.equal(dates[0].iso, expectedTodayIso, "First date must be today in ISO format");
  assert.equal(dates[0].shortDay, "Today");
  assert.equal(dates[1].shortDay, "Tomorrow");

  // Every generated date must strictly conform to ISO YYYY-MM-DD format
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  for (const opt of dates) {
    assert.match(opt.iso, isoPattern, `Date ${opt.iso} must match ISO YYYY-MM-DD pattern`);
    assert.ok(opt.label.length > 0, "Label must not be empty");
    assert.ok(opt.dayNum.length > 0, "Day number must not be empty");
  }
});

test("formatReservationDate gracefully formats legacy strings and ISO dates", () => {
  const refDate = new Date(2026, 9, 14); // Oct 14, 2026

  // Legacy strings
  assert.equal(formatReservationDate("Tonight", refDate), "Today");
  assert.equal(formatReservationDate("today", refDate), "Today");
  assert.equal(formatReservationDate("tomorrow", refDate), "Tomorrow");

  // ISO Dates
  assert.equal(formatReservationDate("2026-10-14", refDate), "Today (Oct 14)");
  assert.equal(formatReservationDate("2026-10-15", refDate), "Tomorrow (Oct 15)");
  assert.equal(formatReservationDate("2026-10-16", refDate), "Fri, Oct 16");
});

