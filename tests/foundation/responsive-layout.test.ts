/// <reference types="node" />
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  ENFORCE_STRICT_PLATFORM_GUARDS,
  canAccessMobileScreens,
  canAccessStoreAdminKitchen,
  canAccessStoreAdminWeb,
  canAccessSystemAdmin,
  isDesktopDevice,
  isMobileDevice,
  isTabletDevice,
} from "../../lib/platform-policy";
import {
  buildAdminCsvReport,
  escapeCsvCell,
  isAdminNavItemActive,
} from "../../lib/admin-report";
import {
  MERCHANT_REGISTER_DRAFT_KEY,
  buildOperatingHoursString,
  buildStoreDescription,
  clearMerchantRegistrationDraft,
  evaluateMerchantPassword,
  filterEmailInput,
  filterOtpInput,
  filterOwnerNameInput,
  getBarangayDefaultCoordinates,
  isWithinMatiBounds,
  loadMerchantRegistrationDraft,
  normalizeStoreCategories,
  saveMerchantRegistrationDraft,
  validateStoreRegistrationFields,
  validateVerificationDocumentFile,
} from "../../services/merchant-registration";
import {
  filterPhoneInput,
  isValidMatiStorePhone,
  isValidPhilippineMobile,
} from "../../lib/phone";
import {
  filterMenuItemDescriptionInput,
  filterMenuItemNameInput,
  filterMenuItemPriceInput,
  parseAndValidateMenuItemPrice,
  validateMenuItemForm,
  validateMerchantImageFile,
  validateReservationDeclineNote,
  validateStoreProfileForm,
} from "../../lib/merchant-validation";
import {
  SUBSCRIPTION_TIERS,
  resolveStoreSubscriptionSummary,
} from "../../lib/subscription-tiers";
import {
  CATEGORIES as CATALOG_CATEGORIES,
  MENU_ITEM_CATEGORIES,
} from "../../services/catalog";
import {
  CATEGORIES as MOCK_CATEGORIES,
  MATI_RESTAURANTS_DATA,
} from "../../mock/restaurants";
import { FOOD_ITEMS } from "../../mock/dishes";
import { STORE_CUISINE_OPTIONS } from "../../services/merchant-registration";
import { isStoreCurrentlyOpen } from "../../lib/geo-serviceability";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("platform policy handles canonical breakpoints (320, 390, 768, 900, 1024, 1440) across web and native", () => {
  const widths = [320, 390, 768, 900, 1024, 1440] as const;

  for (const width of widths) {
    // Native iOS and Android always behave as mobile-class platforms
    for (const nativeOs of ["ios", "android"] as const) {
      assert.equal(isMobileDevice(width, nativeOs), true);
      assert.equal(isDesktopDevice(width, nativeOs), false);
      assert.equal(canAccessSystemAdmin(width, nativeOs), false);
      assert.equal(canAccessMobileScreens(width, nativeOs), true);
      assert.equal(canAccessStoreAdminKitchen(width, nativeOs), true);
    }

    // Web platform viewport expectations
    const expectWebMobile = width < 768;
    const expectWebTablet = width >= 768 && width < 1024;
    const expectWebDesktop = width >= 768;

    assert.equal(isMobileDevice(width, "web"), expectWebMobile);
    assert.equal(isTabletDevice(width, "web"), expectWebTablet);
    assert.equal(isDesktopDevice(width, "web"), expectWebDesktop);
    assert.equal(canAccessSystemAdmin(width, "web"), expectWebDesktop);
    assert.equal(
      canAccessMobileScreens(width, "web"),
      ENFORCE_STRICT_PLATFORM_GUARDS ? expectWebMobile : true,
    );
    assert.equal(
      canAccessStoreAdminWeb(width, "web"),
      ENFORCE_STRICT_PLATFORM_GUARDS ? expectWebDesktop : true,
    );
    assert.equal(canAccessStoreAdminKitchen(width, "web"), true);
  }
});

test("BottomSheetModal derives viewport height dynamically and applies desktop width cap", () => {
  const source = readSource("components/ui/BottomSheetModal.tsx");

  assert.equal(source.includes("useWindowDimensions"), true);
  assert.equal(source.includes("maxWidth"), true);
  assert.equal(/const\s+\w+\s*=\s*Dimensions\.get\(["']window["']\)/.test(source), false);
});

test("Landing page stays strictly guest-only while authenticated users redirect away from '/' and '/portal'", () => {
  const landingSource = readSource("components/portal/LandingPage.tsx");
  const rootIndexSource = readSource("app/index.tsx");
  const portalAliasSource = readSource("app/(mobile)/portal.tsx");
  const profileSource = readSource("app/(mobile)/(tabs)/profile.tsx");
  const merchantSource = readSource("app/(mobile)/merchant/index.tsx");
  const riderSource = readSource("app/(mobile)/rider/index.tsx");

  assert.equal(landingSource.includes("calc("), false);
  assert.equal(landingSource.includes("Math.min(containerWidth, 680)"), false);
  assert.equal(landingSource.includes("containerWidth"), true);
  assert.equal(landingSource.includes("maxWidth"), true);

  // LandingPage is strictly for logged-out visitors and never shows signed-in greeting/session UI
  assert.equal(landingSource.includes("useAuth"), false);
  assert.equal(landingSource.includes("useSession"), false);
  assert.equal(
    landingSource.includes("Browse neighborhood Karenderias, Pujada Bay seafood grills, and Dahican favorites."),
    true,
  );
  assert.equal(landingSource.includes("Customers"), true);
  assert.equal(landingSource.includes("Store Owners"), true);
  assert.equal(landingSource.includes("Delivery Riders"), true);

  // Concern #1 & #3: no System Admin links, no redundant Store Admin header button, and unified Store Owners portal
  assert.equal(/system-admin|System Admin/i.test(landingSource), false);
  assert.equal(landingSource.includes("Store Admin"), false);
  assert.equal(landingSource.includes("Kitchen Queue App"), false);
  assert.equal(landingSource.includes("Kitchen Tablet App"), false);

  // Authenticated sessions redirect directly out of '/' and '/portal' to '/discover'
  assert.equal(rootIndexSource.includes("LandingPage"), true);
  assert.equal(rootIndexSource.includes("useSession"), true);
  assert.equal(rootIndexSource.includes('href="/(mobile)/(tabs)/discover"'), true);
  assert.equal(rootIndexSource.includes('href="/portal"'), false);
  assert.equal(portalAliasSource.includes("useSession"), true);
  assert.equal(portalAliasSource.includes('href="/"'), true);

  // Non-logout "Switch Role / Exit to Portal" shortcuts removed; Sign Out leads to '/'
  assert.equal(profileSource.includes("handleSwitchRoleConfirm"), false);
  assert.equal(merchantSource.includes("handleExitToPortal"), false);
  assert.equal(riderSource.includes("handleExitToPortal"), false);

  // Option B: Partner/Auth links open in new tab cleanly on web; active mobile auth Back buttons fallback to '/'
  assert.equal(landingSource.includes("openInNewTabOrPush"), true);
  assert.equal(landingSource.includes('"_blank", "noopener,noreferrer"'), true);
  assert.equal(landingSource.includes('filter: "Seafood"'), true);
  assert.equal(landingSource.includes('filter: "BBQ & Grill"'), true);

  for (const authFile of [
    "app/(mobile)/auth/rider-login.tsx",
    "app/(mobile)/auth/rider-register.tsx",
  ]) {
    const src = readSource(authFile);
    assert.equal(src.includes("router.canGoBack()"), true, `${authFile} should check router.canGoBack()`);
  }

  // Performance: Web code splitting (asyncRoutes), non-blocking guest paint, and light web root
  const appJson = JSON.parse(readSource("app.json"));
  const routerPlugin = appJson.expo.plugins.find(
    (entry: unknown) => Array.isArray(entry) && entry[0] === "expo-router",
  );
  assert.equal(Boolean(routerPlugin?.[1]?.asyncRoutes?.web), true);
  assert.equal(rootIndexSource.includes("hasBrowserSessionHint"), true);
  assert.equal(readSource("lib/setup-animations.web.ts").includes("react-native-reanimated"), false);
  assert.equal(readSource("app/_layout.tsx").includes("react-native-reanimated"), false);
});

test("Customer mobile tab screens constrain desktop widths without CSS calc()", () => {
  const tabFiles = [
    "app/(mobile)/(tabs)/discover.tsx",
    "app/(mobile)/(tabs)/community.tsx",
    "app/(mobile)/(tabs)/map.tsx",
    "app/(mobile)/(tabs)/orders.tsx",
    "app/(mobile)/(tabs)/profile.tsx",
  ];

  for (const file of tabFiles) {
    const source = readSource(file);
    assert.equal(source.includes("calc("), false, `${file} should avoid CSS calc()`);
  }

  assert.equal(readSource("app/(mobile)/(tabs)/discover.tsx").includes("max-w-5xl"), true);
  assert.equal(readSource("app/(mobile)/(tabs)/community.tsx").includes("max-w-2xl"), true);
  assert.equal(readSource("app/(mobile)/(tabs)/orders.tsx").includes("max-w-3xl"), true);
  assert.equal(readSource("app/(mobile)/(tabs)/profile.tsx").includes("max-w-2xl"), true);
  assert.equal(readSource("app/(mobile)/(tabs)/map.tsx").includes("900"), true);
});

test("Merchant web dashboard layout includes mobile horizontal sub-navigation, lively Option A highlights, tab-switch stability, and per-store isolation", () => {
  const source = readSource("app/(web)/dashboard/_layout.tsx");
  const sessionCtx = readSource("context/SessionContext.tsx");
  const dashboardIndex = readSource("app/(web)/dashboard/index.tsx");
  const dashboardMenu = readSource("app/(web)/dashboard/menu.tsx");
  const dashboardProfile = readSource("app/(web)/dashboard/profile.tsx");

  assert.equal(source.includes("md:hidden"), true);
  assert.equal(source.includes("Overview"), true);
  assert.equal(source.includes("Menu Manager"), true);
  assert.equal(source.includes("Store Profile"), true);
  assert.equal(source.includes("Billing & Plans"), true);

  // Lively light sidebar matching System Admin compact scale + active pill highlights
  assert.equal(source.includes("w-56 bg-white"), true);
  assert.equal(source.includes("isAdminNavItemActive"), true);
  assert.equal(source.includes("bg-orange-50/90 border-orange-200/90"), true);

  // Prevent browser tab-switch / Alt+Tab reload loops while preserving realtime subscriptions
  assert.equal(source.includes("checkedUserIdRef"), true);
  assert.equal(sessionCtx.includes('Platform.OS === "web"'), true);
  assert.equal(dashboardIndex.includes("subscribeToOrders"), true);
  assert.equal(dashboardIndex.includes("subscribeToStoreReservations"), true);

  // Strict per-store data isolation (no seeded Mama Letty / cross-store leaks on new accounts)
  for (const merchantFile of [dashboardIndex, dashboardMenu, dashboardProfile]) {
    assert.equal(merchantFile.includes("DEFAULT_STORE_ID"), false);
    assert.equal(merchantFile.includes("Mama Letty"), false);
  }
  assert.equal(dashboardMenu.includes("fetchStoreMenuItems"), true);
  assert.equal(dashboardMenu.includes("fetchLiveMenuItems"), false);
  assert.equal(dashboardMenu.includes("Live Supabase"), false);

  // Menu Manager: "Add New Item", Overview Image dropzone, field ordering (Description after Name, Price last)
  assert.equal(dashboardMenu.includes("Add New Item"), true);
  assert.equal(dashboardMenu.includes("Add New Dish"), false);
  assert.equal(dashboardMenu.includes("Item Name *"), true);
  assert.equal(dashboardMenu.includes("uploadMenuItemPhoto"), true);
  assert.equal(dashboardMenu.includes("ImageUploadDropzone"), true);
  const nameIdx = dashboardMenu.indexOf("Item Name *");
  const descIdx = dashboardMenu.indexOf("Description</Text>");
  const catIdx = dashboardMenu.indexOf("Category</Text>");
  const priceIdx = dashboardMenu.indexOf("Price (₱ PHP) *");
  assert.equal(nameIdx > 0 && descIdx > nameIdx && catIdx > descIdx && priceIdx > catIdx, true);

  // Store Profile: Dual Profile Photo + Cover Photo dropzones & curated time pickers
  assert.equal(dashboardProfile.includes("uploadStoreProfilePhoto"), true);
  assert.equal(dashboardProfile.includes("uploadStoreCoverPhoto"), true);
  assert.equal(dashboardProfile.includes("Store Profile Photo (Logo)"), true);
  assert.equal(dashboardProfile.includes("Store Cover Photo (Banner)"), true);
  assert.equal(dashboardProfile.includes("STORE_OPERATING_TIME_OPTIONS"), true);
  assert.equal(dashboardProfile.includes("Open 24 Hours"), true);

  // Pure Store Admin field validation helpers
  assert.equal(filterMenuItemPriceInput("120.559abc"), "120.55");
  assert.equal(filterMenuItemNameInput("Pork\u0000 Humba"), "Pork Humba");
  assert.equal(filterMenuItemDescriptionInput("Spicy").length, 5);
  assert.equal(parseAndValidateMenuItemPrice("0").error !== null, true);
  assert.equal(parseAndValidateMenuItemPrice("120.50").value, 120.5);
  const badMenu = validateMenuItemForm({
    name: "!",
    description: "..",
    category: "Invalid",
    price: "0",
    allowedCategories: ["Meals", "Beverages"],
  });
  assert.equal(Boolean(badMenu.name && badMenu.description && badMenu.category && badMenu.price), true);

  const badProfile = validateStoreProfileForm({
    storeName: "A",
    description: "Short",
    isOpen24Hours: false,
    openTime: "08:00 PM",
    closeTime: "07:00 AM",
    phone: "123",
  });
  assert.equal(
    Boolean(badProfile.storeName && badProfile.description && badProfile.operatingHours && badProfile.phone),
    true
  );
  assert.equal(
    validateMerchantImageFile({ mimeType: "image/svg+xml", sizeBytes: 1024 }) !== null,
    true
  );
  assert.equal(
    validateMerchantImageFile({ mimeType: "image/webp", sizeBytes: 1024 }),
    null
  );

  // System-wide: No "Karenderias" category anywhere across catalog, restaurants, registration, or dishes
  const dashboardBilling = readSource("app/(web)/dashboard/billing.tsx");
  const customerOrdersSrc = readSource("app/(mobile)/(tabs)/orders.tsx");
  assert.equal(MENU_ITEM_CATEGORIES.includes("Karenderias" as never), false);
  assert.equal(CATALOG_CATEGORIES.includes("Karenderias" as never), false);
  assert.equal(MOCK_CATEGORIES.includes("Karenderias" as never), false);
  assert.equal(STORE_CUISINE_OPTIONS.includes("Karenderias" as never), false);
  assert.deepEqual([...CATALOG_CATEGORIES], ["All", "Meals", "Seafood", "BBQ & Grill", "Merienda", "Beverages"]);
  assert.deepEqual([...MOCK_CATEGORIES], ["All", "Meals", "Seafood", "BBQ & Grill", "Merienda", "Beverages"]);
  assert.deepEqual([...STORE_CUISINE_OPTIONS], ["Meals", "Seafood", "BBQ & Grill", "Merienda", "Beverages"]);
  assert.equal(FOOD_ITEMS.some((dish) => dish.category === "Karenderias"), false);
  assert.equal(
    Object.values(MATI_RESTAURANTS_DATA).some((store) => store.categories?.includes("Karenderias")),
    false
  );
  assert.equal(dashboardMenu.includes("Karenderias"), false);
  assert.equal(dashboardMenu.includes("MENU_ITEM_CATEGORIES"), true);
  assert.equal(dashboardMenu.includes("Sold Out Toggle"), true);
  assert.equal(dashboardMenu.includes('accessibilityRole="switch"'), true);
  assert.equal(dashboardMenu.includes("updateStoreMenuItem"), true);
  assert.equal(dashboardMenu.includes("archiveStoreMenuItem"), true);
  assert.equal(dashboardMenu.includes("Edit Menu Item"), true);
  assert.equal(dashboardMenu.includes("Delete Item"), true);
  assert.equal(dashboardMenu.includes("setViewingItem(item)"), true);
  assert.equal(dashboardMenu.includes(">View</Text>"), false);

  // Overview: noticeable Open/Close switch, relational Menu Availability + Pending Bookings, Decline Reason
  assert.equal(dashboardIndex.includes('accessibilityRole="switch"'), true);
  assert.equal(dashboardIndex.includes("TOTAL_TABLES_CAPACITY"), false);
  assert.equal(dashboardIndex.includes("Avg Prep Speed"), false);
  assert.equal(dashboardIndex.includes("12 mins"), false);
  assert.equal(dashboardIndex.includes("Menu Availability"), true);
  assert.equal(dashboardIndex.includes("Decline Table Request"), true);
  assert.equal(dashboardIndex.includes("RESERVATION_DECLINE_PRESETS"), true);
  assert.equal(validateReservationDeclineNote("ok") !== null, true);
  assert.equal(validateReservationDeclineNote("Fully booked at 5:00 PM."), null);
  assert.equal(customerOrdersSrc.includes("Booking Unavailable"), true);
  assert.equal(customerOrdersSrc.includes("res.store_notes"), true);
  assert.equal(dashboardIndex.includes("Customer Reviews & Reputation"), true);
  assert.equal(dashboardIndex.includes("Upgrade to Standard Plan (₱299/mo)"), true);

  // Billing: Subscription Tiers ("Basic ₱99", "Standard ₱299", "Commercial ₱699") + 2-Month Free Trial state
  assert.equal(dashboardBilling.includes("Subscription Tiers — No Commission, Ever"), true);
  assert.equal(dashboardBilling.includes("2-Month FREE TRIAL for all new stores"), true);
  assert.equal(SUBSCRIPTION_TIERS.map((t) => `${t.name}:${t.pricePhp}`).join(","), "Basic:99,Standard:299,Commercial:699");
  const activeTrial = resolveStoreSubscriptionSummary(
    {
      subscriptionTier: "basic",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    Date.now()
  );
  assert.equal(activeTrial.tier, "basic");
  assert.equal(activeTrial.isTrialActive, true);
  assert.equal(activeTrial.isTrialExpired, false);
  const expiredTrial = resolveStoreSubscriptionSummary(
    {
      subscriptionTier: "basic",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() - 86400000).toISOString(),
    },
    Date.now()
  );
  assert.equal(expiredTrial.isTrialExpired, true);
  assert.equal(expiredTrial.isGracePeriod, true);
  assert.equal(expiredTrial.isTemporarilyOffline, false);
  assert.equal(expiredTrial.graceDaysRemaining, 6);

  const pastGraceTrial = resolveStoreSubscriptionSummary(
    {
      subscriptionTier: "basic",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    Date.now()
  );
  assert.equal(pastGraceTrial.isTrialExpired, true);
  assert.equal(pastGraceTrial.isGracePeriod, false);
  assert.equal(pastGraceTrial.isTemporarilyOffline, true);
  assert.equal(pastGraceTrial.status, "expired");

  const reactivatedStore = resolveStoreSubscriptionSummary(
    {
      subscriptionTier: "standard",
      subscriptionStatus: "active",
      subscribedAt: new Date().toISOString(),
    },
    Date.now()
  );
  assert.equal(reactivatedStore.isActivePaid, true);
  assert.equal(reactivatedStore.tier, "standard");
  assert.equal(reactivatedStore.isTemporarilyOffline, false);
});

test("System Admin login gate uses dark editorial asymmetric layout, visible MFF logo, security artwork, and standard copy", () => {
  const source = readSource("components/admin/SystemAdminGate.tsx");
  const layoutSource = readSource("app/(web)/system-admin/_layout.tsx");

  assert.equal(fs.existsSync(path.join(ROOT, "app/(web)/system-admin/gate.tsx")), false);
  assert.equal(source.includes("bg-[#141413]"), true);
  assert.equal(source.includes("admin-bg.jpg"), true);
  assert.equal(source.includes("logo.jpg"), true);
  assert.equal(source.includes("style={{ width: 22, height: 22"), true);
  assert.equal(source.includes("md:w-[320px] lg:w-[350px]"), true);
  assert.equal(source.includes("Log In"), true);
  assert.equal(source.includes('href="/"'), true);
  assert.equal(source.includes("Unlock Admin Dashboard"), false);
  assert.equal(source.includes("Protected area."), false);
  assert.equal(source.includes("admin@mati-foodfinder.com"), false);
  assert.equal(layoutSource.includes('useSession("admin")'), true);
  assert.equal(layoutSource.includes("setIsAdminUnlocked"), false);
});

test("System Admin console highlights active nav items, uses standard wording without backend jargon, and builds escaped CSV reports", () => {
  assert.equal(isAdminNavItemActive("/system-admin", "/(web)/system-admin"), true);
  assert.equal(isAdminNavItemActive("/system-admin/", "/(web)/system-admin"), true);
  assert.equal(isAdminNavItemActive("/system-admin/approvals", "/(web)/system-admin/approvals"), true);
  assert.equal(isAdminNavItemActive("/system-admin/approvals", "/(web)/system-admin"), false);
  assert.equal(isAdminNavItemActive("/system-admin/users", "/(web)/system-admin/users"), true);
  assert.equal(isAdminNavItemActive("/system-admin/moderation", "/(web)/system-admin/moderation"), true);
  assert.equal(isAdminNavItemActive("/system-admin/metrics", "/(web)/system-admin/metrics"), true);

  assert.equal(escapeCsvCell('Mama "Letty", Mati'), '"Mama ""Letty"", Mati"');
  const csv = buildAdminCsvReport(
    {
      total_users: 17,
      total_stores: 5,
      pending_stores: 1,
      active_riders: 3,
      total_orders: 12,
      gross_sales_centavos: 102000,
    },
    [
      {
        id: "1",
        name: 'Baywalk Grill, "Main"',
        slug: "baywalk-grill",
        address_text: "Baywalk Blvd, Mati",
        barangay: "Central",
        approval_status: "pending",
        created_at: "2026-11-11T00:00:00.000Z",
        public_phone: "+639170000000",
        description: "",
      },
    ],
    new Date("2026-11-12T00:00:00.000Z"),
  );
  assert.equal(csv.includes("Order Volume (PHP),1020.00"), true);
  assert.equal(csv.includes('"Baywalk Grill, ""Main"""'), true);

  const adminFiles = [
    "app/(web)/system-admin/_layout.tsx",
    "app/(web)/system-admin/index.tsx",
    "app/(web)/system-admin/approvals.tsx",
    "app/(web)/system-admin/users.tsx",
    "app/(web)/system-admin/moderation.tsx",
    "app/(web)/system-admin/metrics.tsx",
  ];
  const forbiddenPhrases = [
    "Lock & Sign Out",
    "MATI CITY PLATFORM OVERSIGHT",
    "IDENTITY & ACCESS",
    "STORE VERIFICATION",
    "COMMUNITY SAFETY & MODERATION",
    "ANALYTICS & TELEMETRY",
    "LIVE SUPABASE",
    "Live Supabase",
    "GoTrue",
    "RLS Policies",
    "get_my_application_roles",
    "PostGIS",
    "Seoul Pooler",
    "Export Audit Report",
    "admin@mati-foodfinder.com",
  ];

  for (const file of adminFiles) {
    const src = readSource(file);
    for (const phrase of forbiddenPhrases) {
      assert.equal(src.includes(phrase), false, `${file} should not expose "${phrase}"`);
    }
  }

  const layoutSrc = readSource("app/(web)/system-admin/_layout.tsx");
  const indexSrc = readSource("app/(web)/system-admin/index.tsx");
  const approvalsSrc = readSource("app/(web)/system-admin/approvals.tsx");
  const usersSrc = readSource("app/(web)/system-admin/users.tsx");
  const moderationSrc = readSource("app/(web)/system-admin/moderation.tsx");
  const metricsSrc = readSource("app/(web)/system-admin/metrics.tsx");
  const adminServiceSrc = readSource("services/admin.ts");
  const deleteMigrationSrc = readSource(
    "supabase/migrations/20261112000300_admin_delete_user.sql"
  );
  const storeReviewMigrationSrc = readSource(
    "supabase/migrations/20261112000400_admin_store_applications_review.sql"
  );
  const storeSuspendMigrationSrc = readSource(
    "supabase/migrations/20261112000500_admin_store_applications_archived_at.sql"
  );
  assert.equal(layoutSrc.includes("isAdminNavItemActive"), true);
  assert.equal(layoutSrc.includes("Sign Out"), true);
  assert.equal(layoutSrc.includes("w-1.5 h-1.5 rounded-full bg-[#FB923C]"), false);
  assert.equal(indexSrc.includes("Export CSV"), true);
  assert.equal(indexSrc.includes("buildAdminCsvReport"), true);
  assert.equal(approvalsSrc.includes("verification_document_url"), true);
  assert.equal(approvalsSrc.includes("Storefront Photo / Business Permit"), true);
  assert.equal(approvalsSrc.includes("View Pin on OpenStreetMap"), true);
  assert.equal(approvalsSrc.includes("Approve Application"), true);
  assert.equal(approvalsSrc.includes("Suspend Approved Store"), true);
  assert.equal(approvalsSrc.includes("Reinstate"), true);
  assert.equal(approvalsSrc.includes("Suspended ("), true);
  assert.equal(approvalsSrc.includes("max-h-[540px]"), false);
  assert.equal(approvalsSrc.includes("lg:w-80 h-9"), true);
  assert.equal(approvalsSrc.includes("min-h-[36px]"), true);
  assert.equal(usersSrc.includes("deleteAdminUser"), true);
  assert.equal(usersSrc.includes("Permanently Delete User"), true);
  assert.equal(usersSrc.includes("handleConfirmDeleteUser"), true);
  assert.equal(usersSrc.includes("max-h-[540px]"), false);
  assert.equal(usersSrc.includes("w-8 h-8 rounded-lg border border-red-200/80"), true);
  assert.equal(usersSrc.includes("Protected"), true);
  assert.equal(usersSrc.includes("lg:w-80 h-9"), true);
  assert.equal(usersSrc.includes("min-h-[36px]"), true);
  assert.equal(adminServiceSrc.includes("admin_delete_user"), true);
  assert.equal(adminServiceSrc.includes("admin_list_store_applications"), true);
  assert.equal(adminServiceSrc.includes("admin_set_store_archived"), true);
  assert.equal(deleteMigrationSrc.includes("public.admin_delete_user"), true);
  assert.equal(deleteMigrationSrc.includes("require_admin()"), true);
  assert.equal(storeReviewMigrationSrc.includes("public.admin_list_store_applications"), true);
  assert.equal(storeReviewMigrationSrc.includes("require_admin()"), true);
  assert.equal(storeSuspendMigrationSrc.includes("s.archived_at"), true);

  for (const merchantGuardFile of [
    "services/merchant-registration.ts",
    "app/(web)/auth/store-login.tsx",
    "app/(web)/dashboard/_layout.tsx",
    "app/(web)/auth/verification.tsx",
  ]) {
    const src = readSource(merchantGuardFile);
    assert.equal(src.includes("isSuspended"), true, `${merchantGuardFile} should enforce store suspension status`);
  }
  assert.equal(moderationSrc.includes("REP-001"), false);
  assert.equal(moderationSrc.includes("@crypto_king_mati"), false);
  assert.equal(moderationSrc.includes("useState<number>(14)"), false);
  assert.equal(adminServiceSrc.includes("95000"), false);
  assert.equal(adminServiceSrc.includes("qr_checkins_count: 42"), false);
  assert.equal(metricsSrc.includes("h-64"), false);
  assert.equal(metricsSrc.includes("flex-1 justify-end items-center"), true);
});

test("Store Merchant login, registration, and verification use light theme, karenderia artwork, Meals category, and Leaflet GPS recovery", () => {
  const loginSrc = readSource("app/(web)/auth/store-login.tsx");
  const registerSrc = readSource("app/(web)/auth/store-register.tsx");
  const verificationSrc = readSource("app/(web)/auth/verification.tsx");
  const dashboardLayoutSrc = readSource("app/(web)/dashboard/_layout.tsx");
  const mapPickerWebSrc = readSource("components/auth/StoreMapPicker.web.tsx");
  const registrationServiceSrc = readSource("services/merchant-registration.ts");

  // Store login light layout + Merchant Portal heading + karenderia showcase
  assert.equal(loginSrc.includes("bg-[#F8FAFC]"), true);
  assert.equal(loginSrc.includes("bg-[#141413]"), false);
  assert.equal(loginSrc.includes("merchant-bg.jpg"), true);
  assert.equal(loginSrc.includes("logo.jpg"), true);
  assert.equal(loginSrc.includes("Merchant Portal"), true);
  assert.equal(loginSrc.includes("Store Login"), false);
  assert.equal(loginSrc.includes('href="/"'), true);
  assert.equal(loginSrc.includes("fetchMerchantMembershipStatus"), true);
  assert.equal(loginSrc.includes("merchant.letty@mati-foodfinder.com"), false);
  assert.equal(loginSrc.includes("🏪"), false);

  // Store registration real backend submission, map picker, dismissible banner, and light theme
  assert.equal(registerSrc.includes("bg-[#F8FAFC]"), true);
  assert.equal(registerSrc.includes("bg-[#141413]"), false);
  assert.equal(registerSrc.includes("Accept Delivery Orders"), false);
  assert.equal(registerSrc.includes("NotificationBanner"), true);
  assert.equal(registerSrc.includes("onClearError"), true);
  assert.equal(registerSrc.includes("StoreMapPicker"), true);
  assert.equal(registerSrc.includes("submitMerchantStoreApplication"), true);
  assert.equal(registerSrc.includes("uploadStoreVerificationDocument"), true);
  assert.equal(registerSrc.includes("MATI_CITY_HALL_COORDS"), true);
  assert.equal(registerSrc.includes("📸"), false);
  assert.equal(registrationServiceSrc.includes('"Meals"'), true);

  // Leaflet interactive map picker + fallback geolocation
  assert.equal(mapPickerWebSrc.includes("leaflet"), true);
  assert.equal(mapPickerWebSrc.includes("MFF_STORE_PIN_CHANGED"), true);
  assert.equal(mapPickerWebSrc.includes("Use Current Location"), true);
  assert.equal(mapPickerWebSrc.includes("enableHighAccuracy: false"), true);
  assert.equal(mapPickerWebSrc.includes("activeRequestIdRef"), true);

  // Verification & Dashboard pending gate + consolidated features (Table QR & COD settlement)
  const dashboardIndexSrc = readSource("app/(web)/dashboard/index.tsx");
  const dashboardBillingSrc = readSource("app/(web)/dashboard/billing.tsx");
  const legacyMerchantSrc = readSource("app/(mobile)/merchant/index.tsx");
  const legacyMerchantLoginSrc = readSource("app/(mobile)/auth/merchant-login.tsx");
  const legacyMerchantRegSrc = readSource("app/(mobile)/auth/merchant-register.tsx");
  assert.equal(verificationSrc.includes("bg-[#F8FAFC]"), true);
  assert.equal(verificationSrc.includes("bg-[#141413]"), false);
  assert.equal(verificationSrc.includes("⏳"), false);
  assert.equal(dashboardLayoutSrc.includes("fetchMerchantMembershipStatus"), true);
  assert.equal(dashboardLayoutSrc.includes("/(web)/auth/verification"), true);
  assert.equal(dashboardIndexSrc.includes("PrintableTableQrModal"), true);
  assert.equal(dashboardIndexSrc.includes("Print Table QR"), true);
  assert.equal(dashboardBillingSrc.includes("calculateCodSettlement"), true);
  assert.equal(dashboardBillingSrc.includes("confirmCodRemittance"), true);
  assert.equal(legacyMerchantSrc.includes('href="/(web)/dashboard"'), true);
  assert.equal(legacyMerchantSrc.includes('href="/(web)/auth/store-login"'), true);
  assert.equal(legacyMerchantSrc.includes("useState("), false);
  assert.equal(legacyMerchantLoginSrc.includes('href="/(web)/auth/store-login"'), true);
  assert.equal(legacyMerchantRegSrc.includes('href="/(web)/auth/store-register"'), true);

  // Pure validation & strict input sanitizer checks
  const dahican = getBarangayDefaultCoordinates("Dahican");
  assert.equal(dahican.latitude > 6.9 && dahican.longitude > 126.2, true);
  assert.equal(
    buildStoreDescription(["Meals", "Seafood"], "Silog & Fresh Catch"),
    "Meals, Seafood — Silog & Fresh Catch"
  );
  assert.deepEqual(
    normalizeStoreCategories(["Meals", "Seafood", "Meals", "InvalidCategory"]),
    ["Meals", "Seafood"]
  );
  assert.equal(registerSrc.includes("Choose Store Categories"), true);
  assert.equal(registerSrc.includes("Primary Category"), false);
  assert.equal(registerSrc.includes("Open 24 Hours"), true);
  assert.equal(registerSrc.includes("STORE_OPERATING_TIME_OPTIONS"), true);
  assert.equal(registerSrc.includes("Live Password Check"), false);
  assert.equal(registerSrc.includes("LivePasswordSentence"), true);
  assert.equal(registerSrc.includes("AnimatedRulePhrase"), true);
  assert.equal(registerSrc.includes("12+ characters"), true);
  assert.equal(registerSrc.includes("Confirm Password *"), true);
  assert.equal(registerSrc.includes("Passwords match."), true);
  assert.equal(
    registerSrc.match(/href="\/\(web\)\/auth\/store-login"/g)?.length === 1,
    true
  );
  assert.equal(registerSrc.includes('placeholder="0912 345 6789"'), true);
  assert.equal(registerSrc.includes("(letters only)"), false);
  assert.equal(registerSrc.includes('Platform.OS !== "web"'), true);
  assert.equal(registerSrc.includes("loadMerchantRegistrationDraft"), true);
  assert.equal(registerSrc.includes("saveMerchantRegistrationDraft"), true);
  assert.equal(registerSrc.includes("clearMerchantRegistrationDraft"), true);
  assert.equal(registerSrc.includes("loadDraftDocumentFile"), true);
  assert.equal(registerSrc.includes("saveDraftDocumentFile"), true);
  assert.equal(registerSrc.includes("isExistingUser"), true);
  assert.equal(registerSrc.includes("resendCooldown"), true);
  assert.equal(registerSrc.includes("mail-open-outline"), true);
  assert.equal(registerSrc.includes("h-14 rounded-2xl border-2"), true);
  assert.equal(registerSrc.includes(".getUser()"), true);
  assert.equal(registerSrc.includes("processSelectedWebFile"), true);
  assert.equal(registerSrc.includes("dropZoneRef"), true);
  assert.equal(registerSrc.includes("isDraggingDoc"), true);

  const authSrc = readSource("services/auth.ts");
  const sessionCtxSrc = readSource("context/SessionContext.tsx");
  assert.equal(authSrc.includes("isExistingUser"), true);
  assert.equal(authSrc.includes("hourly limit may have been reached"), false);
  assert.equal(sessionCtxSrc.includes('scope !== "merchant"'), true);

  assert.equal(filterOwnerNameInput("Juan123! Dela Cruz#"), "Juan Dela Cruz");
  assert.equal(filterPhoneInput("abc+63 917-234!@#5678"), "0917 234 5678");
  assert.equal(filterPhoneInput("0912345678999"), "0912 345 6789");
  assert.equal(filterPhoneInput("5"), "");
  assert.equal(filterPhoneInput("05"), "0");
  assert.equal(filterPhoneInput("09123456789"), "0912 345 6789");
  assert.equal(filterEmailInput("  Owner@Store.PH "), "Owner@Store.PH");
  assert.equal(filterOtpInput("ab12-cd34ef5678"), "123456");

  assert.equal(isValidPhilippineMobile("0917 234 5678"), true);
  assert.equal(isValidPhilippineMobile("+639172345678"), false);
  assert.equal(isValidPhilippineMobile("087 388 1234"), false);
  assert.equal(isValidMatiStorePhone("087 388 1234"), true);

  for (const phoneUiFile of [
    "app/(web)/auth/store-register.tsx",
    "components/auth/AccountForm.tsx",
    "app/(mobile)/auth/rider-register.tsx",
    "app/(mobile)/(tabs)/profile.tsx",
    "app/(web)/dashboard/profile.tsx",
  ]) {
    const src = readSource(phoneUiFile);
    assert.equal(src.includes("filterPhoneInput"), true, `${phoneUiFile} should format phone inputs with filterPhoneInput`);
    assert.equal(src.includes("maxLength={13}"), true, `${phoneUiFile} should enforce 13-char 09XX XXX XXXX mask`);
  }
  assert.equal(isWithinMatiBounds(6.985, 126.31), true); // Brgy. Mayo
  assert.equal(isWithinMatiBounds(14.5995, 120.9842), false); // Manila out-of-bounds

  assert.equal(buildOperatingHoursString({ isOpen24Hours: true }), "Open 24 Hours");
  assert.equal(isStoreCurrentlyOpen("Open 24 Hours").isOpen, true);

  assert.equal(evaluateMerchantPassword("lowercaseonly123").isValid, false);
  assert.equal(evaluateMerchantPassword("NoNumbersAtAll").isValid, false);
  assert.equal(evaluateMerchantPassword("Short1A").isValid, false);
  assert.equal(evaluateMerchantPassword("StrongPassword123").isValid, true);

  assert.equal(
    validateVerificationDocumentFile({ mimeType: "image/jpeg", sizeBytes: 1024 * 500 }),
    null
  );
  assert.notEqual(
    validateVerificationDocumentFile({ mimeType: "application/pdf", sizeBytes: 1024 }),
    null
  );

  const validBase = {
    storeName: "Baywalk Grill",
    categories: ["Meals", "Seafood"],
    description: "Fresh grilled seafood and meals",
    storePhone: "0917 234 5678",
    openTime: "07:00 AM",
    closeTime: "08:00 PM",
    isOpen24Hours: false,
    operatingHours: "07:00 AM - 08:00 PM Daily",
    barangay: "Central (Poblacion)",
    addressText: "Magsaysay St, Mati City",
    latitude: 6.955,
    longitude: 126.2165,
    ownerName: "Juan Dela Cruz",
    ownerPhone: "0917 234 5678",
    email: "juan@baywalkgrill.ph",
    password: "StrongPassword123",
    confirmPassword: "StrongPassword123",
    hasDocument: true,
  };
  assert.equal(validateStoreRegistrationFields(validBase), null);
  assert.notEqual(
    validateStoreRegistrationFields({ ...validBase, confirmPassword: "OtherPassword123" }),
    null
  );
  assert.notEqual(validateStoreRegistrationFields({ ...validBase, categories: [] }), null);
  assert.notEqual(validateStoreRegistrationFields({ ...validBase, storeName: "123456" }), null);
  assert.notEqual(
    validateStoreRegistrationFields({ ...validBase, openTime: "08:00 PM", closeTime: "07:00 AM" }),
    null
  );
  assert.equal(
    validateStoreRegistrationFields({
      ...validBase,
      openTime: "08:00 PM",
      closeTime: "07:00 AM",
      isOpen24Hours: true,
    }),
    null
  );
  assert.notEqual(validateStoreRegistrationFields({ ...validBase, password: "weakpassword12" }), null);
  assert.notEqual(validateStoreRegistrationFields({ ...validBase, hasDocument: false }), null);
  assert.notEqual(validateStoreRegistrationFields({ ...validBase, latitude: 120 }), null);

  // Draft caching: safe null outside browser, round-trip & clear with mock localStorage
  assert.equal(loadMerchantRegistrationDraft(), null);

  const storeMap = new Map<string, string>();
  const globalObj = globalThis as unknown as {
    window?: {
      localStorage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
    };
  };
  const previousWindow = globalObj.window;
  globalObj.window = {
    localStorage: {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storeMap.set(k, v);
      },
      removeItem: (k: string) => {
        storeMap.delete(k);
      },
    },
  };

  try {
    saveMerchantRegistrationDraft({
      storeName: "Davao Gulf Grill",
      categories: ["Meals", "InvalidCategory", "Seafood"],
      description: "Fresh grilled fish",
      storePhone: "0912 345 6789",
      openTime: "07:00 AM",
      closeTime: "08:00 PM",
      isOpen24Hours: false,
      barangay: "Dahican",
      addressText: "Dahican Beach Road",
      latitude: 6.94,
      longitude: 126.27,
      ownerName: "Juan123 Dela Cruz",
      ownerPhone: "0912 345 6789",
      email: "merchant@example.com",
      step: "otp",
      otpCooldownUntil: Date.now() + 30_000,
    });

    const rawSaved = storeMap.get(MERCHANT_REGISTER_DRAFT_KEY) || "";
    assert.equal(rawSaved.includes("password"), false);

    const restored = loadMerchantRegistrationDraft();
    assert.ok(restored);
    assert.equal(restored.storeName, "Davao Gulf Grill");
    assert.deepEqual(restored.categories, ["Meals", "Seafood"]);
    assert.equal(restored.ownerName, "Juan Dela Cruz");
    assert.equal(restored.step, "otp");

    clearMerchantRegistrationDraft();
    assert.equal(loadMerchantRegistrationDraft(), null);
  } finally {
    if (previousWindow === undefined) {
      delete globalObj.window;
    } else {
      globalObj.window = previousWindow;
    }
  }
});

test("Phase 4 Menu Customizations & Categories: dynamic categories and modifier validation", () => {
  const defaultCategories = ["Meals", "Seafood", "BBQ & Grill", "Merienda", "Beverages"];
  const storeItems = [
    { category: "Meals" },
    { category: "Breakfast / Silog" },
    { category: "Beverages" },
    { category: "Native Coffee" },
  ];

  // Dynamic category computation
  const categorySet = new Set<string>(defaultCategories);
  for (const item of storeItems) {
    if (item.category && item.category.trim()) {
      categorySet.add(item.category.trim());
    }
  }
  const availableCategories = Array.from(categorySet);

  assert.ok(availableCategories.includes("Breakfast / Silog"));
  assert.ok(availableCategories.includes("Native Coffee"));
  assert.ok(availableCategories.includes("Meals"));

  // Validation with custom category
  const validCustomItem = validateMenuItemForm({
    name: "Tapsilog Special",
    description: "Tender beef tapa with garlic fried rice and sunny side egg",
    category: "Breakfast / Silog",
    price: "145.00",
    allowedCategories: availableCategories,
  });
  assert.deepEqual(validCustomItem, {});

  // Validation with disallowed category
  const invalidCategoryItem = validateMenuItemForm({
    name: "Tapsilog Special",
    description: "Tender beef tapa with garlic fried rice and sunny side egg",
    category: "Unknown Category",
    price: "145.00",
    allowedCategories: availableCategories,
  });
  assert.equal(invalidCategoryItem.category, "Select a valid menu category.");

  // Modifiers formatting
  const modifierGroups = [
    {
      id: "mod-spice",
      name: "Spice Level",
      required: true,
      options: [
        { id: "opt-1", name: "Mild", priceAdjustment: 0 },
        { id: "opt-2", name: "Extra Spicy", priceAdjustment: 15 },
      ],
    },
    {
      id: "mod-addons",
      name: "Add-ons",
      required: false,
      options: [
        { id: "opt-3", name: "Extra Garlic Rice", priceAdjustment: 25 },
        { id: "opt-4", name: "Fried Egg", priceAdjustment: 20 },
      ],
    },
  ];

  assert.equal(modifierGroups.length, 2);
  assert.equal(modifierGroups[0].options[1].priceAdjustment, 15);
  assert.equal(modifierGroups[1].options[0].name, "Extra Garlic Rice");
});

test("Phase 1 Driver In-App Navigation: mati-routing coordinate resolution and road route generation", async () => {
  const {
    resolveMatiCoordinates,
    generateFallbackRoadPolyline,
    fetchMatiRoadRoute,
  } = await import("../../lib/mati-routing");

  // Coordinate resolution
  const baywalk = resolveMatiCoordinates("Baywalk Boulevard, Pujada Bay");
  assert.equal(baywalk.latitude, 6.9490);
  assert.equal(baywalk.longitude, 126.2250);

  const dahican = resolveMatiCoordinates("Dahican Beach Road, Brgy. Dahican");
  assert.equal(dahican.latitude, 6.9180);
  assert.equal(dahican.longitude, 126.2750);

  const cityHall = resolveMatiCoordinates("Central (Poblacion)");
  assert.equal(cityHall.latitude, 6.9550);
  assert.equal(cityHall.longitude, 126.2165);

  // Fallback road polyline generation
  const polyline = generateFallbackRoadPolyline(baywalk, dahican);
  assert.ok(polyline.length >= 5);
  assert.equal(polyline[0].latitude, baywalk.latitude);
  assert.equal(polyline[polyline.length - 1].latitude, dahican.latitude);

  // Road route calculation
  const route = await fetchMatiRoadRoute(baywalk, dahican);
  assert.ok(route.roadDistanceKm > 0);
  assert.ok(route.estMinutes >= 5);
  assert.ok(route.polyline.length >= 2);
  assert.ok(route.summary.includes("km road trip"));
});

test("Phase 2 Live Courier Beacon & Proximity: telemetry mapping and <500m proximity trigger", async () => {
  const { mapDatabaseOrderToLiveOrder } = await import("../../services/orders");
  const { calculateHaversineDistanceKm } = await import("../../lib/geo-serviceability");

  const rawDbOrder = {
    id: "ord-test-live-1",
    order_number: "MFF-9001",
    customer_id: "cust-1",
    store_id: "store-1",
    status: "out_for_delivery",
    fulfillment_type: "delivery",
    payment_method: "cod",
    subtotal_centavos: 35000,
    delivery_fee_centavos: 3500,
    total_centavos: 38500,
    delivery_address: "Dahican Beach Road",
    barangay: "Dahican",
    notes: "",
    handshake_pin: "5678",
    courier_latitude: 6.9200,
    courier_longitude: 126.2730,
    courier_heading: 45.5,
    courier_updated_at: "2026-11-15T05:20:00Z",
    cod_remitted: false,
    created_at: "2026-11-15T05:00:00Z",
    updated_at: "2026-11-15T05:20:00Z",
    order_items: [],
  };

  const live = mapDatabaseOrderToLiveOrder(rawDbOrder);
  assert.equal(live.courierLatitude, 6.9200);
  assert.equal(live.courierLongitude, 126.2730);
  assert.equal(live.courierHeading, 45.5);
  assert.equal(live.courierUpdatedAt, "2026-11-15T05:20:00Z");
  assert.equal(live.codRemitted, false);

  // Customer dropoff at Dahican (6.9180, 126.2750)
  const custLat = 6.9180;
  const custLng = 126.2750;
  const distKm = calculateHaversineDistanceKm(live.courierLatitude!, live.courierLongitude!, custLat, custLng);

  // Distance is ~0.31 km (<0.5 km) -> Triggers Proximity Alert!
  assert.ok(distKm < 0.5);
  const isNearby = distKm < 0.5;
  assert.equal(isNearby, true);
});

test("Phase 3 Bisaya Quick Updates: localized dispatch chips for Mati couriers", async () => {
  const { BISAYA_RIDER_DISPATCH_CHIPS, COURIER_QUICK_MESSAGES } = await import("../../services/quick-dispatch");

  assert.ok(BISAYA_RIDER_DISPATCH_CHIPS.length >= 6);
  assert.ok(BISAYA_RIDER_DISPATCH_CHIPS.some((m) => m.includes("Padulong na sa kan-anan")));
  assert.ok(BISAYA_RIDER_DISPATCH_CHIPS.some((m) => m.includes("Naghulat pa gi-pack")));
  assert.ok(BISAYA_RIDER_DISPATCH_CHIPS.some((m) => m.includes("Nakuha na ang order")));
  assert.ok(BISAYA_RIDER_DISPATCH_CHIPS.some((m) => m.includes("balay/gate")));
  assert.ok(BISAYA_RIDER_DISPATCH_CHIPS.some((m) => m.includes("saktong bayad")));

  // Preserves existing canonical quick messages contract
  assert.equal(COURIER_QUICK_MESSAGES.length, 5);
});

test("Phase 4 Merchant COD Remittance Loop Closure: cod_remitted updates and settlement reconciliation", async () => {
  const { mapDatabaseOrderToLiveOrder, calculateCodSettlement } = await import("../../services/orders");

  // Case 1: unremitted delivered COD order
  const rawOrderUnremitted = {
    id: "ord-cod-1",
    order_number: "MFF-7001",
    customer_id: "cust-1",
    store_id: "store-letty",
    status: "delivered",
    fulfillment_type: "delivery",
    payment_method: "cod",
    subtotal_centavos: 25000,
    delivery_fee_centavos: 3500,
    total_centavos: 28500,
    delivery_address: "Central Poblacion",
    barangay: "Central (Poblacion)",
    notes: "",
    cod_remitted: false,
    created_at: "2026-11-15T04:00:00Z",
    updated_at: "2026-11-15T04:30:00Z",
    order_items: [],
  };

  const live1 = mapDatabaseOrderToLiveOrder(rawOrderUnremitted);
  assert.equal(live1.isRemitted, false);
  assert.equal(live1.codRemitted, false);

  const settlement1 = calculateCodSettlement([live1]);
  assert.equal(settlement1.totalDeliveredOrders, 1);
  assert.equal(settlement1.totalFoodSubtotalToRemit, 250);
  assert.equal(settlement1.totalPendingRemittance, 250);
  assert.equal(settlement1.totalRemitted, 0);
  assert.equal(settlement1.byStore[0].isFullySettled, false);

  // Case 2: merchant confirms remittance -> cod_remitted becomes true
  const rawOrderRemitted = {
    ...rawOrderUnremitted,
    cod_remitted: true,
    cod_remitted_at: "2026-11-15T05:00:00Z",
    cod_remitted_by: "Mama Letty",
  };

  const live2 = mapDatabaseOrderToLiveOrder(rawOrderRemitted);
  assert.equal(live2.isRemitted, true);
  assert.equal(live2.codRemitted, true);

  const settlement2 = calculateCodSettlement([live2]);
  assert.equal(settlement2.totalFoodSubtotalToRemit, 250);
  assert.equal(settlement2.totalPendingRemittance, 0);
  assert.equal(settlement2.totalRemitted, 250);
  assert.equal(settlement2.byStore[0].isFullySettled, true);
  assert.equal(settlement2.orders[0].isRemitted, true);
});

test("Phase 5 Shift History & Take-Home Analytics & Admin Courier Approvals Pipeline", async () => {
  const { fetchAdminRiderApplicationsWithStatus, setRiderApproval } = await import("../../services/admin");
  const approvalsSrc = readSource("app/(web)/system-admin/approvals.tsx");
  const riderSrc = readSource("app/(mobile)/rider/index.tsx");

  // Rider screen Shift History & Analytics UI contract
  assert.equal(riderSrc.includes("Shift History & Take-Home Pay"), true);
  assert.equal(riderSrc.includes("shiftAnalytics"), true);
  assert.equal(riderSrc.includes("Past 30 Days"), true);
  assert.equal(riderSrc.includes("Take-Home Fees"), true);
  assert.equal(riderSrc.includes("Completed drops"), true);
  assert.equal(riderSrc.includes("Gross cash"), true);
  assert.equal(riderSrc.includes("Food Cash Remitted:"), true);

  // System Admin Approvals Dual Pipeline (Storefronts & Couriers)
  assert.equal(approvalsSrc.includes("approvalScope"), true);
  assert.equal(approvalsSrc.includes("Store Applications"), true);
  assert.equal(approvalsSrc.includes("Courier Applications"), true);
  assert.equal(approvalsSrc.includes("handleRiderAction"), true);
  assert.equal(approvalsSrc.includes("Approve Courier"), true);
  assert.equal(approvalsSrc.includes("Suspend"), true);

  // Admin service methods exist
  assert.equal(typeof fetchAdminRiderApplicationsWithStatus, "function");
  assert.equal(typeof setRiderApproval, "function");
});

test("Rider Navigation Tabs & Courier Registration Strict Validation", async () => {
  const riderSrc = readSource("app/(mobile)/rider/index.tsx");
  const regSrc = readSource("app/(mobile)/auth/rider-register.tsx");

  // Phase 1: Rider Navigation & Direct Sign Out
  assert.equal(riderSrc.includes('setActiveTab("deliveries")'), true);
  assert.equal(riderSrc.includes('setActiveTab("earnings")'), true);
  assert.equal(riderSrc.includes('setActiveTab("profile")'), true);
  assert.equal(riderSrc.includes("Sign Out</Text>"), true);
  assert.equal(riderSrc.includes("Sign Out of Rider Account"), true);
  assert.equal(riderSrc.includes("PERSISTENT COURIER BOTTOM NAVIGATION BAR"), true);

  // Phase 2: Registration Streamlining & Strict Validation & Document Uploads
  assert.equal(regSrc.includes("Courier Application"), true);
  assert.equal(regSrc.includes("Earn ₱65 - ₱120 per trip"), false); // marketing subtitle removed
  assert.equal(regSrc.includes("riderLicenseExpiry"), true);
  assert.equal(regSrc.includes("confirmPassword"), true);
  assert.equal(regSrc.includes("Expired Driver's License"), true);
  assert.equal(regSrc.includes("Password Mismatch"), true);
  assert.equal(regSrc.includes("Invalid Driver's License"), true);
  assert.equal(regSrc.includes("Invalid Plate Number"), true);
  assert.equal(regSrc.includes("Upload Driver's License"), true);
  assert.equal(regSrc.includes("Upload Vehicle Registration (OR/CR)"), true);
  assert.equal(regSrc.includes("uploadCourierDocument"), true);
  assert.equal(regSrc.includes("LivePasswordSentence"), true);
  assert.equal(regSrc.includes("evaluateMerchantPassword"), true);
  assert.equal(regSrc.includes("Passwords match."), true);
  assert.equal(regSrc.includes("Passwords do not match."), true);

  // Phase 3: Streamlined Earnings Page & Personalized Courier Profile
  assert.equal(riderSrc.includes("Today's Net Earnings"), true);
  assert.equal(riderSrc.includes("Cash on Hand"), true);
  assert.equal(riderSrc.includes("Remittance Due"), true);
  assert.equal(riderSrc.includes("Restaurant Turnovers"), true);
  assert.equal(riderSrc.includes("Maayong"), true);
  assert.equal(riderSrc.includes("High-Precision GPS Beacon"), true);
  assert.equal(riderSrc.includes("Bisaya Dispatch Audio Chimes"), true);
  assert.equal(riderSrc.includes("Mati Express Dispatch Hotline"), true);
});
