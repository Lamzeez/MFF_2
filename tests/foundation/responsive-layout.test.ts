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
  buildOperatingHoursString,
  buildStoreDescription,
  evaluateMerchantPassword,
  filterEmailInput,
  filterOtpInput,
  filterOwnerNameInput,
  getBarangayDefaultCoordinates,
  isWithinMatiBounds,
  normalizeStoreCategories,
  validateStoreRegistrationFields,
  validateVerificationDocumentFile,
} from "../../services/merchant-registration";
import {
  filterPhoneInput,
  isValidMatiStorePhone,
  isValidPhilippineMobile,
} from "../../lib/phone";
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

test("Merchant web dashboard layout includes mobile horizontal sub-navigation", () => {
  const source = readSource("app/(web)/dashboard/_layout.tsx");

  assert.equal(source.includes("md:hidden"), true);
  assert.equal(source.includes("Overview"), true);
  assert.equal(source.includes("Menu Manager"), true);
  assert.equal(source.includes("Store Profile"), true);
  assert.equal(source.includes("Billing & Plans"), true);
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
  const moderationSrc = readSource("app/(web)/system-admin/moderation.tsx");
  const metricsSrc = readSource("app/(web)/system-admin/metrics.tsx");
  const adminServiceSrc = readSource("services/admin.ts");
  assert.equal(layoutSrc.includes("isAdminNavItemActive"), true);
  assert.equal(layoutSrc.includes("Sign Out"), true);
  assert.equal(layoutSrc.includes("w-1.5 h-1.5 rounded-full bg-[#FB923C]"), false);
  assert.equal(indexSrc.includes("Export CSV"), true);
  assert.equal(indexSrc.includes("buildAdminCsvReport"), true);
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

  assert.equal(filterOwnerNameInput("Juan123! Dela Cruz#"), "Juan Dela Cruz");
  assert.equal(filterPhoneInput("abc+63 917-234!@#5678"), "+63 917-2345678");
  assert.equal(filterEmailInput("  Owner@Store.PH "), "Owner@Store.PH");
  assert.equal(filterOtpInput("ab12-cd34ef5678"), "123456");

  assert.equal(isValidPhilippineMobile("0917 234 5678"), true);
  assert.equal(isValidPhilippineMobile("087 388 1234"), false);
  assert.equal(isValidMatiStorePhone("087 388 1234"), true);
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
});
