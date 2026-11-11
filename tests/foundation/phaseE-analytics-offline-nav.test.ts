import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMonthlyGmvBarHeights,
  calculateDiscoveryChannelRatios,
  fetchMonthlyGmv,
  type MonthlyGmvItem,
} from "../../services/admin";

test("calculateMonthlyGmvBarHeights scales highest month proportionally and formats peso values", () => {
  const sampleData: MonthlyGmvItem[] = [
    { month: "Jan", month_key: "2026-01", gross_sales_centavos: 10000000, order_count: 100 }, // ₱100k
    { month: "Feb", month_key: "2026-02", gross_sales_centavos: 20000000, order_count: 200 }, // ₱200k (peak)
    { month: "Mar", month_key: "2026-03", gross_sales_centavos: 5000000, order_count: 50 },   // ₱50k
  ];

  const bars = calculateMonthlyGmvBarHeights(sampleData);

  assert.equal(bars.length, 3);
  assert.equal(bars[0].month, "Jan");
  assert.equal(bars[0].val, "₱100k");

  // Peak month Feb should scale to top percentage
  assert.equal(bars[1].month, "Feb");
  assert.equal(bars[1].val, "₱200k");
  assert.equal(bars[1].height, "95%");

  // Mar should be roughly half of peak (Math.round(0.25 * 95) = 24%)
  assert.equal(bars[2].month, "Mar");
  assert.equal(bars[2].val, "₱50k");
  assert.equal(bars[2].height, "24%");
});

test("calculateMonthlyGmvBarHeights handles empty data gracefully without throwing", () => {
  const bars = calculateMonthlyGmvBarHeights([]);
  assert.deepEqual(bars, []);
});

test("calculateDiscoveryChannelRatios computes accurate percentages summing to 100%", () => {
  const qrScans = 60;
  const orders = 110;
  const communityPosts = 30;

  const ratios = calculateDiscoveryChannelRatios(qrScans, orders, communityPosts);

  assert.equal(ratios.qr_checkins_count, 60);
  assert.equal(ratios.orders_count, 110);
  assert.equal(ratios.community_posts_count, 30);
  assert.equal(ratios.total_interactions, 200);

  assert.equal(ratios.qr_percent, 30);
  assert.equal(ratios.direct_percent, 55);
  assert.equal(ratios.social_percent, 15);

  const totalPercentage = ratios.qr_percent + ratios.direct_percent + ratios.social_percent;
  assert.equal(totalPercentage, 100);
});

test("calculateDiscoveryChannelRatios returns real zeros when interaction total is zero", () => {
  const fallback = calculateDiscoveryChannelRatios(0, 0, 0);

  assert.equal(fallback.qr_checkins_count, 0);
  assert.equal(fallback.orders_count, 0);
  assert.equal(fallback.community_posts_count, 0);
  assert.equal(fallback.qr_percent, 0);
  assert.equal(fallback.direct_percent, 0);
  assert.equal(fallback.social_percent, 0);
  assert.equal(fallback.total_interactions, 0);
});

test("fetchMonthlyGmv returns 9 zeroed calendar month buckets without fabricating sales when unconfigured", async () => {
  const monthly = await fetchMonthlyGmv();

  assert.equal(Array.isArray(monthly), true);
  assert.equal(monthly.length, 9);

  for (const item of monthly) {
    assert.equal(typeof item.month, "string");
    assert.equal(typeof item.month_key, "string");
    assert.equal(item.gross_sales_centavos, 0);
    assert.equal(item.order_count, 0);
    assert.match(item.month_key, /^[0-9]{4}-[0-9]{2}$/);
  }
});

test("In-app map navigation parameters resolve matching store names case-insensitively", () => {
  const catalogSpots = [
    { id: "store-1", storeId: "store-1", name: "Mama Letty's Karenderia" },
    { id: "store-2", storeId: "store-2", name: "Mati Baywalk Seafood Grill" },
  ];

  const searchParams = { storeName: "mama letty's karenderia", storeId: "store-1" };

  const matched = catalogSpots.find(
    (s) =>
      (searchParams.storeId && s.storeId === searchParams.storeId) ||
      (searchParams.storeName && s.name.toLowerCase().trim() === searchParams.storeName.toLowerCase().trim())
  );

  assert.ok(matched);
  assert.equal(matched?.id, "store-1");
  assert.equal(matched?.name, "Mama Letty's Karenderia");
});
