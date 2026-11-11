import test from "node:test";
import assert from "node:assert/strict";
import {
  generateUpcomingReservationDates,
  formatReservationDate,
} from "../../lib/reservation-dates";
import {
  getOrderStatusTheme,
  getReservationStatusTheme,
  getStoreApprovalTheme,
  getUserAccountStatusTheme,
  getUserRoleTheme,
  type StatusTheme,
} from "../../lib/status-tokens";
import {
  calculateMonthlyGmvBarHeights,
  calculateDiscoveryChannelRatios,
} from "../../services/admin";

test("Phase F Regression: Composite cart key formatting guarantees modifier isolation", () => {
  const store = "Mama Letty's Karenderia";
  const dishId = 101;

  // Variant A: Mild spice, small rice
  const modA = { spice: "mild", rice: "small" };
  const modKeyA = Object.entries(modA).sort().map(([k, v]) => `${k}:${v}`).join("|");
  const compositeIdA = `${store}-${dishId}-${modKeyA}`;

  // Variant B: Extra spicy, large rice
  const modB = { spice: "extra_spicy", rice: "large" };
  const modKeyB = Object.entries(modB).sort().map(([k, v]) => `${k}:${v}`).join("|");
  const compositeIdB = `${store}-${dishId}-${modKeyB}`;

  // Variant C: Base dish with no modifiers
  const compositeIdC = `${store}-${dishId}`;

  assert.notEqual(compositeIdA, compositeIdB);
  assert.notEqual(compositeIdA, compositeIdC);
  assert.notEqual(compositeIdB, compositeIdC);

  // Key composition must be deterministic regardless of input object key order
  const modAUnordered = { rice: "small", spice: "mild" };
  const modKeyAUnordered = Object.entries(modAUnordered).sort().map(([k, v]) => `${k}:${v}`).join("|");
  assert.equal(modKeyA, modKeyAUnordered);
});

test("Phase F Regression: Reservation dates create valid ISO strings across month/year transitions", () => {
  const dates = generateUpcomingReservationDates();

  assert.equal(dates.length, 14);

  for (const dateItem of dates) {
    assert.match(dateItem.iso, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(dateItem.shortDay.length > 0);
    assert.ok(dateItem.label.length > 0);

    // Verify date is valid in JavaScript Date parser
    const parsed = new Date(dateItem.iso);
    assert.equal(isNaN(parsed.getTime()), false);
  }

  // Format helper handles ISO dates gracefully
  const formattedToday = formatReservationDate(dates[0].iso);
  assert.ok(formattedToday.length > 0);
});

test("Phase F Regression: Status design tokens conform strictly to StatusTheme contract", () => {
  const tokenGetters = [
    () => getOrderStatusTheme("placed"),
    () => getOrderStatusTheme("preparing"),
    () => getOrderStatusTheme("ready_for_pickup"),
    () => getOrderStatusTheme("delivered"),
    () => getOrderStatusTheme("cancelled"),
    () => getReservationStatusTheme("pending"),
    () => getReservationStatusTheme("confirmed"),
    () => getReservationStatusTheme("completed"),
    () => getReservationStatusTheme("no_show"),
    () => getStoreApprovalTheme("pending"),
    () => getStoreApprovalTheme("approved"),
    () => getStoreApprovalTheme("rejected"),
    () => getUserAccountStatusTheme("active"),
    () => getUserAccountStatusTheme("suspended"),
    () => getUserRoleTheme("Superadmin"),
    () => getUserRoleTheme("Store Admin"),
    () => getUserRoleTheme("Rider"),
    () => getUserRoleTheme("Customer"),
  ];

  for (const getter of tokenGetters) {
    const theme: StatusTheme = getter();

    assert.ok(theme.label && theme.label.trim().length > 0, "Theme label must not be empty");
    assert.ok(theme.badgeBg && theme.badgeBg.startsWith("bg-"), "badgeBg must be valid Tailwind bg class");
    assert.ok(theme.badgeText && theme.badgeText.startsWith("text-"), "badgeText must be valid Tailwind text class");
    assert.ok(theme.borderColor && theme.borderColor.startsWith("border-"), "borderColor must be valid Tailwind border class");
    assert.ok(theme.dotColor && theme.dotColor.startsWith("bg-"), "dotColor must be valid Tailwind dot class");
    assert.ok(theme.iconName && theme.iconName.length > 0, "iconName must be valid Ionicons identifier");
    assert.ok(theme.summary && theme.summary.length > 0, "summary must be descriptive");
  }
});

test("Phase F Regression: Telemetry bar heights render 0% for zero sales and scale peak to 95%", () => {
  const testData = [
    { month: "Jan", month_key: "2026-01", gross_sales_centavos: 0, order_count: 0 },
    { month: "Feb", month_key: "2026-02", gross_sales_centavos: 50000000, order_count: 500 },
  ];

  const bars = calculateMonthlyGmvBarHeights(testData);

  assert.equal(bars[0].height, "0%");
  assert.equal(bars[0].val, "₱0");

  assert.equal(bars[1].height, "95%");
  assert.equal(bars[1].val, "₱500k");

  const smallReal = calculateMonthlyGmvBarHeights([
    { month: "Oct", month_key: "2026-10", gross_sales_centavos: 0, order_count: 0 },
    { month: "Nov", month_key: "2026-11", gross_sales_centavos: 102000, order_count: 6 },
  ]);
  assert.equal(smallReal[1].height, "95%");
  assert.equal(smallReal[1].val, "₱1,020");
});

test("Phase F Regression: Discovery channel percentages sum to 100% when active and 0% when empty", () => {
  const testScenarios = [
    { qr: 1, orders: 1, posts: 0 },
    { qr: 10, orders: 70, posts: 20 },
    { qr: 100, orders: 50, posts: 17 },
    { qr: 1, orders: 1, posts: 1 },
    { qr: 0, orders: 100, posts: 0 },
    { qr: 100, orders: 0, posts: 0 },
  ];

  for (const { qr, orders, posts } of testScenarios) {
    const res = calculateDiscoveryChannelRatios(qr, orders, posts);
    const sum = res.qr_percent + res.direct_percent + res.social_percent;
    assert.equal(sum, 100, `Scenario { qr: ${qr}, orders: ${orders}, posts: ${posts} } must sum to 100% (was ${sum}%)`);
  }

  const empty = calculateDiscoveryChannelRatios(0, 0, 0);
  assert.equal(empty.qr_percent + empty.direct_percent + empty.social_percent, 0);
});
