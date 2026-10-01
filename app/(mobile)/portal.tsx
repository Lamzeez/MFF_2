import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  useWindowDimensions,
  Modal,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ENFORCE_STRICT_PLATFORM_GUARDS,
  isDesktopDevice,
  isMobileDevice,
} from "../../lib/platform-policy";

const colors = {
  primary: "#EA5410",
  primaryHover: "#D04508",
  ink: "#111827",
  charcoal: "#1F2937",
  muted: "#6B7280",
  surface: "#F8FAFC",
  cream: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E2E8F0",
  emerald: "#047857",
  emeraldBg: "#ECFDF5",
};

const cuisines = [
  { name: "Karenderias", caption: "Authentic local comfort food", emoji: "🍲", color: "#FFF7ED" },
  { name: "Seafood & Grill", caption: "Fresh catch from Pujada Bay", emoji: "🐟", color: "#ECFDF5" },
  { name: "BBQ & Street Eats", caption: "Smoky favorites on the grill", emoji: "🍢", color: "#FEF2F2" },
] as const;

const benefits = [
  { emoji: "🍲", color: "#FFF7ED", title: "Fresh daily menus", detail: "Browse live dishes cooked today in Mati kitchens." },
  { emoji: "🛵", color: "#ECFDF5", title: "Cash on delivery (COD)", detail: "Pay in cash safely upon arrival with 4-digit PIN." },
  { emoji: "📅", color: "#EFF6FF", title: "Table reservations", detail: "Skip waiting lines and reserve dine-in tables." },
] as const;

const highlights = [
  {
    image: require("../../assets/food/welcome-feast.jpg"),
    badge: "Mati Local Favorite",
    eyebrow: "AUTHENTIC DAVAO ORIENTAL FLAVORS",
    title: "Good food. Happy mood.",
    detail: "Discover neighborhood kitchens, seafood grills & coastal favorites in Mati City.",
    color: "#111827",
    category: undefined,
  },
  {
    image: require("../../assets/food/grill.jpg"),
    badge: "Smoky & Fresh",
    eyebrow: "PUJADA BAY SEAFOOD & BBQ",
    title: "Big grill energy.",
    detail: "Tuna panga, chicken inasal, and sizzling seafood right off the grill.",
    color: "#7C2D12",
    category: "BBQ & Grill",
  },
  {
    image: require("../../assets/food/dining.jpg"),
    badge: "Dine-in Experience",
    eyebrow: "RESERVE YOUR TABLE",
    title: "Good company. Great bites.",
    detail: "Reserve your spot at Mati Baywalk and Dahican dining spots with ease.",
    color: "#1E1B4B",
    category: undefined,
  },
];

function HighlightCarousel({ onExplore }: { onExplore: (category?: string) => void }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [active, setActive] = useState(0);
  const scroll = useRef<ScrollView>(null);

  // Responsive slide width: max 640px on web desktop, full width on mobile
  const slideWidth = containerWidth > 768 ? Math.min(containerWidth, 680) : containerWidth;

  return (
    <View
      style={s.carousel}
      onLayout={({ nativeEvent }) => {
        const nextWidth = nativeEvent.layout.width;
        if (nextWidth !== containerWidth) {
          setContainerWidth(nextWidth);
          setActive(0);
        }
      }}
    >
      {containerWidth > 0 && (
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
          onMomentumScrollEnd={({ nativeEvent }) =>
            setActive(
              Math.max(
                0,
                Math.min(
                  highlights.length - 1,
                  Math.round(nativeEvent.contentOffset.x / slideWidth)
                )
              )
            )
          }
        >
          {highlights.map((highlight, index) => (
            <TouchableOpacity
              key={highlight.title}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1} of ${highlights.length}. ${highlight.title}`}
              onPress={() => onExplore(highlight.category)}
              activeOpacity={0.9}
              style={[
                s.hero,
                { width: slideWidth, backgroundColor: highlight.color, marginRight: containerWidth > 768 ? 16 : 0 },
              ]}
            >
              <View style={s.heroPhoto}>
                <Image source={highlight.image} style={s.foodImage} resizeMode="cover" />
                <View style={s.photoBadge}>
                  <Ionicons name="heart" size={13} color={colors.primary} />
                  <Text style={s.photoBadgeText}>{highlight.badge}</Text>
                </View>
              </View>
              <View style={[s.heroCopy, { backgroundColor: highlight.color }]}>
                <View style={s.heroText}>
                  <Text style={s.heroEyebrow}>{highlight.eyebrow}</Text>
                  <Text style={s.heroTitle}>{highlight.title}</Text>
                  <Text style={s.heroDetail}>{highlight.detail}</Text>
                </View>
                <View style={s.heroArrow}>
                  <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View style={s.pagination}>
        {highlights.map((highlight, index) => (
          <TouchableOpacity
            key={highlight.title}
            accessibilityRole="button"
            accessibilityState={{ selected: active === index }}
            style={s.dotButton}
            onPress={() => {
              scroll.current?.scrollTo({ x: slideWidth * index, animated: true });
              setActive(index);
            }}
          >
            <View style={[s.dot, active === index && s.activeDot]} />
          </TouchableOpacity>
        ))}
        <Text style={s.swipeHint}>Swipe to explore</Text>
      </View>
    </View>
  );
}

export default function MobileWelcomePortal() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = isDesktopDevice(windowWidth);
  const isMobile = isMobileDevice(windowWidth);
  const [partnerMode, setPartnerMode] = useState<"merchant" | "rider" | "admin">("merchant");
  const [mobileModalVisible, setMobileModalVisible] = useState(false);
  const [mobileModalTopic, setMobileModalTopic] = useState("Customer App");

  const openMobileAppModal = (topic: string) => {
    setMobileModalTopic(topic);
    setMobileModalVisible(true);
  };

  const explore = (category?: string) => {
    if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop) {
      openMobileAppModal(category ? `${category} Discovery` : "Mati Food Discovery");
    } else {
      router.push({ pathname: "/(mobile)/(tabs)", params: category ? { category } : {} });
    }
  };

  const signInCustomer = () => {
    if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop) {
      openMobileAppModal("Customer Sign In");
    } else {
      router.push("/(mobile)/auth/customer-login");
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Main Centered Web/Mobile Container */}
        <View style={s.container}>
          {/* Top Header */}
          <View style={s.header}>
            <View style={s.brand}>
              <Image
                source={require("../../assets/logo.jpg")}
                style={s.logo}
                accessibilityLabel="Mati FoodFinder logo"
              />
              <View style={s.brandCopy}>
                <Text style={s.brandName}>Mati FoodFinder</Text>
                <View style={s.location}>
                  <Ionicons name="location" size={12} color={colors.primary} />
                  <Text style={s.locationText}>Mati City, Davao Oriental</Text>
                </View>
              </View>
            </View>

            {/* Navigation Actions */}
            <View style={s.navActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Store Admin Dashboard"
                onPress={() => router.push("/(web)/auth/store-login")}
                style={s.merchantPortalBtn}
              >
                <Ionicons name="storefront-outline" size={14} color={colors.charcoal} />
                <Text style={s.merchantPortalText}>Store Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="System Admin Portal"
                onPress={() => router.push("/(web)/system-admin")}
                style={s.merchantPortalBtn}
              >
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.charcoal} />
                <Text style={s.merchantPortalText}>System Admin</Text>
              </TouchableOpacity>

              {ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Get the Mobile App"
                  onPress={() => openMobileAppModal("Customer Mobile App")}
                  style={s.login}
                >
                  <Ionicons name="phone-portrait-outline" size={14} color="white" />
                  <Text style={s.loginText}>Get Mobile App</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Sign in to your account"
                  onPress={signInCustomer}
                  style={s.login}
                >
                  <Ionicons name="person-outline" size={14} color="white" />
                  <Text style={s.loginText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Hero Intro */}
          <View style={s.intro}>
            <View style={s.tagPill}>
              <Text style={s.eyebrow}>LOCAL FLAVORS • MATI CITY EXCLUSIVE</Text>
            </View>
            <Text style={s.headline}>
              Your next delicious{"\n"}discovery starts here.
            </Text>
            <Text style={s.subtitle}>
              Mati's dedicated food platform. Discover Karenderias, seafood grills, order Cash on Delivery, or book dining tables.
            </Text>
          </View>

          {/* Food Carousel */}
          <HighlightCarousel onExplore={explore} />

          {/* Cuisines Section */}
          <View style={s.sectionHeading}>
            <Text style={s.sectionTitle}>What’s your craving?</Text>
            <Text style={s.smallNote}>Discover popular dishes cooked daily in Mati City</Text>
          </View>
          {isDesktop ? (
            <View style={s.cuisinesGrid}>
              {cuisines.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine.name}
                  accessibilityRole="button"
                  onPress={() => explore(cuisine.name)}
                  style={[s.cuisineDesktop, { backgroundColor: cuisine.color }]}
                >
                  <View style={s.cuisineTop}>
                    <View style={s.cuisineIcon}>
                      <Text style={s.foodEmoji}>{cuisine.emoji}</Text>
                    </View>
                    <View style={s.cuisineArrow}>
                      <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                    </View>
                  </View>
                  <Text style={s.cuisineName}>{cuisine.name}</Text>
                  <Text style={s.cuisineCaption}>{cuisine.caption}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.cuisinesScroll}
            >
              {cuisines.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine.name}
                  accessibilityRole="button"
                  onPress={() => explore(cuisine.name)}
                  style={[s.cuisineMobile, { backgroundColor: cuisine.color }]}
                >
                  <View style={s.cuisineTop}>
                    <View style={s.cuisineIcon}>
                      <Text style={s.foodEmoji}>{cuisine.emoji}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                  </View>
                  <Text style={s.cuisineName}>{cuisine.name}</Text>
                  <Text style={s.cuisineCaption}>{cuisine.caption}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Benefits Section */}
          <View style={s.benefits}>
            <Text style={s.sectionTitle}>Mati FoodFinder Standard</Text>
            <Text style={s.benefitsSubtitle}>
              Built specifically for the dining community of Mati City.
            </Text>
            <View style={s.benefitsGrid}>
              {benefits.map((benefit) => (
                <View key={benefit.title} style={s.benefitRow}>
                  <View style={[s.benefitIcon, { backgroundColor: benefit.color }]}>
                    <Text style={s.benefitEmoji}>{benefit.emoji}</Text>
                  </View>
                  <View style={s.flex}>
                    <Text style={s.benefitTitle}>{benefit.title}</Text>
                    <Text style={s.benefitDetail}>{benefit.detail}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />
                </View>
              ))}
            </View>
          </View>

          {/* Partner & Administration Section */}
          <View style={s.partner}>
            <View style={s.partnerHeading}>
              <Text style={s.partnerEmoji}>
                {partnerMode === "merchant" ? "🏪" : partnerMode === "rider" ? "🛵" : "🛡️"}
              </Text>
              <View style={s.flex}>
                <Text style={s.partnerTitle}>
                  {partnerMode === "merchant"
                    ? "Store Merchant Portal"
                    : partnerMode === "rider"
                    ? "Delivery Rider Network"
                    : "Platform System Administration"}
                </Text>
                <Text style={s.partnerDetail}>
                  {partnerMode === "merchant"
                    ? "Manage your kitchen operations, live menus, and orders on web or mobile."
                    : partnerMode === "rider"
                    ? "Deliver local orders with guaranteed COD settlements."
                    : "Manage store approvals, user accounts, and platform operations."}
                </Text>
              </View>
            </View>

            {/* Segmented Switcher */}
            <View style={s.segments}>
              {(["merchant", "rider", "admin"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  accessibilityRole="button"
                  onPress={() => setPartnerMode(mode)}
                  style={[s.segment, partnerMode === mode && s.segmentActive]}
                >
                  <Text style={[s.segmentText, partnerMode === mode && s.segmentTextActive]}>
                    {mode === "merchant" ? "Store Owners" : mode === "rider" ? "Riders" : "Admin"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.partnerDescription}>
              {partnerMode === "merchant"
                ? "Access the dedicated Web Merchant Dashboard to update prices, toggle dish availability, and monitor live orders."
                : partnerMode === "rider"
                ? "Log in via mobile app to go online, accept delivery dispatch jobs, and verify customer PIN handoffs."
                : "Secure portal for platform administrators to review new store applications and inspect live audit metrics."}
            </Text>

            {/* Partner Actions */}
            <View style={s.partnerActions}>
              {partnerMode === "merchant" && (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Store Web Dashboard"
                    onPress={() => router.push("/(web)/auth/store-login")}
                    style={s.partnerPrimary}
                  >
                    <Ionicons name="desktop-outline" size={16} color="white" />
                    <Text style={s.partnerPrimaryText}>Store Web Dashboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Mobile Kitchen App"
                    onPress={() =>
                      ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                        ? openMobileAppModal("Kitchen Merchant Mode")
                        : router.push("/(mobile)/merchant")
                    }
                    style={s.partnerSecondary}
                  >
                    <Ionicons name="phone-portrait-outline" size={16} color="#9CA3AF" />
                    <Text style={s.partnerSecondaryText}>Mobile Kitchen App</Text>
                  </TouchableOpacity>
                </>
              )}

              {partnerMode === "rider" && (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Rider Delivery App"
                    onPress={() =>
                      ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                        ? openMobileAppModal("Delivery Rider Network")
                        : router.push("/(mobile)/rider")
                    }
                    style={s.partnerPrimary}
                  >
                    <Ionicons name="bicycle" size={16} color="white" />
                    <Text style={s.partnerPrimaryText}>
                      {ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop ? "Get Rider App" : "Rider Mode"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Rider Sign In"
                    onPress={() => router.push("/(mobile)/auth/rider-login")}
                    style={s.partnerSecondary}
                  >
                    <Ionicons name="log-in-outline" size={16} color="#9CA3AF" />
                    <Text style={s.partnerSecondaryText}>Rider Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Apply as Courier"
                    onPress={() =>
                      ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                        ? openMobileAppModal("Courier Application")
                        : router.push("/(mobile)/auth/rider-register")
                    }
                    style={s.partnerSecondary}
                  >
                    <Text style={s.partnerSecondaryText}>Apply as Courier</Text>
                  </TouchableOpacity>
                </>
              )}

              {partnerMode === "admin" && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Access System Admin Portal"
                  onPress={() => router.push("/(web)/system-admin")}
                  style={s.partnerPrimary}
                >
                  <Ionicons name="shield-checkmark" size={16} color="white" />
                  <Text style={s.partnerPrimaryText}>Access System Admin Portal</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Footer Note */}
          <View style={s.footer}>
            <Ionicons name="heart" size={14} color={colors.primary} />
            <Text style={s.footerText}>Made for Mati City • Local kitchens, coastal soul</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Sticky Action Dock */}
      <View style={s.dockContainer}>
        <View style={s.dockInner}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                ? "Get the Mati FoodFinder mobile app"
                : "Explore food in Mati City"
            }
            onPress={() => explore()}
            style={s.primary}
          >
            <Ionicons
              name={ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop ? "phone-portrait-outline" : "restaurant-outline"}
              size={20}
              color="white"
            />
            <Text style={s.primaryText}>
              {ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                ? "Get the Mati FoodFinder Mobile App"
                : "Explore Mati Restaurants & Menus"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
          <Text style={s.dockHint}>
            {ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
              ? "Available on iOS & Android • Food ordering & live tracking exclusive to mobile"
              : "Browse freely as Guest • No registration required"}
          </Text>
        </View>
      </View>

      {/* Mobile App Exclusive Modal for Web Visitors */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={mobileModalVisible}
        onRequestClose={() => setMobileModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setMobileModalVisible(false)}
        >
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={() => setMobileModalVisible(false)}
              style={s.modalCloseBtn}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Icon Header */}
            <View style={s.modalIconWrap}>
              <Ionicons name="phone-portrait-outline" size={32} color={colors.primary} />
            </View>

            <Text style={s.modalTitle}>Available on Mobile App Only</Text>

            <View style={s.modalBadgeWrap}>
              <Text style={s.modalBadgeText}>{mobileModalTopic.toUpperCase()}</Text>
            </View>

            <Text style={s.modalDescription}>
              Real-time menu ordering, table reservations, GPS map discovery, Cash-on-Delivery, and kitchen dispatch are crafted exclusively for smartphones running the Mati FoodFinder app.
            </Text>

            {/* Stylized QR Code Box */}
            <View style={s.qrBox}>
              <View style={s.qrFrame}>
                <View style={s.qrInner}>
                  <View style={s.qrRow}>
                    <View style={s.qrFinder} />
                    <View style={s.qrDotsRow}>
                      <View style={s.qrDot} />
                      <View style={s.qrDot} />
                    </View>
                    <View style={s.qrFinder} />
                  </View>
                  <View style={s.qrCenter}>
                    <Text style={s.qrCenterText}>MFF APP</Text>
                  </View>
                  <View style={s.qrRow}>
                    <View style={s.qrFinder} />
                    <View style={s.qrDotsRow}>
                      <View style={s.qrDot} />
                      <View style={s.qrDot} />
                    </View>
                    <View style={[s.qrFinder, { borderColor: colors.primary }]} />
                  </View>
                </View>
              </View>
              <Text style={s.qrLabel}>Scan with your smartphone camera</Text>
              <Text style={s.qrSublabel}>Point your phone camera to download or test via Expo Go</Text>
            </View>

            {/* Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  Alert.alert(
                    "Download Direct APK",
                    "Direct APK package build is ready. On Android, enable install from unknown sources."
                  );
                }}
                style={s.modalPrimaryBtn}
              >
                <Ionicons name="download-outline" size={18} color="white" />
                <Text style={s.modalPrimaryBtnText}>Download Android APK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setMobileModalVisible(false);
                  router.push("/(web)/auth/store-login");
                }}
                style={s.modalSecondaryBtn}
              >
                <Ionicons name="storefront-outline" size={16} color={colors.ink} />
                <Text style={s.modalSecondaryBtnText}>Store Owner? Open Web Dashboard</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 120 },
  container: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandCopy: { flex: 1 },
  logo: { width: 44, height: 44, borderRadius: 14 },
  brandName: { fontSize: 17, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  location: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  locationText: { fontSize: 11, color: colors.muted, fontWeight: "500" },
  navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  merchantPortalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  merchantPortalText: { fontSize: 12, fontWeight: "700", color: colors.charcoal },
  login: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  loginText: { fontSize: 12, fontWeight: "800", color: "white" },
  intro: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20 },
  tagPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: colors.primary },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -1.2, color: colors.ink },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 10, maxWidth: 620 },
  hero: { borderRadius: 28, overflow: "hidden", backgroundColor: colors.charcoal, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  heroPhoto: { height: 220, backgroundColor: "#E2E8F0" },
  foodImage: { width: "100%", height: "100%" },
  photoBadge: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  photoBadgeText: { fontSize: 11, fontWeight: "800", color: colors.ink },
  heroCopy: { flexDirection: "row", alignItems: "center", padding: 22, gap: 14, minHeight: 130 },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, color: "#FDBA74", marginBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: "900", color: "white", letterSpacing: -0.5 },
  heroDetail: { fontSize: 13, lineHeight: 20, color: "#E2E8F0", marginTop: 4 },
  heroArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  sectionHeading: { paddingHorizontal: 22, marginTop: 32, marginBottom: 16, gap: 4 },
  sectionTitle: { fontSize: 21, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  smallNote: { fontSize: 13, color: colors.muted },
  cuisinesGrid: {
    flexDirection: "row",
    gap: 16,
    marginHorizontal: 20,
    justifyContent: "space-between",
  },
  cuisineDesktop: {
    flex: 1,
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cuisinesScroll: { paddingHorizontal: 20, gap: 14 },
  cuisineMobile: { width: 170, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0" },
  cuisineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  cuisineIcon: { width: 56, height: 56, backgroundColor: "#FFFFFF", borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  cuisineArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cuisineName: { fontSize: 16, fontWeight: "900", color: colors.ink },
  cuisineCaption: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 4 },
  benefits: { marginHorizontal: 20, marginTop: 32, padding: 24, borderRadius: 28, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  benefitsSubtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 18 },
  benefitsGrid: { gap: 14 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 6 },
  benefitIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  benefitDetail: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 2 },
  partner: { marginHorizontal: 20, marginTop: 28, padding: 24, borderRadius: 28, backgroundColor: "#111827", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  partnerHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  partnerEmoji: { fontSize: 32 },
  partnerTitle: { fontSize: 19, fontWeight: "900", color: "white" },
  partnerDetail: { fontSize: 13, lineHeight: 19, color: "#9CA3AF", marginTop: 4 },
  segments: { flexDirection: "row", backgroundColor: "#1F2937", padding: 4, borderRadius: 16, marginTop: 20 },
  segment: { flex: 1, minHeight: 42, paddingVertical: 8, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  segmentTextActive: { color: "white", fontWeight: "900" },
  partnerDescription: { fontSize: 13, lineHeight: 20, color: "#D1D5DB", marginVertical: 18 },
  partnerActions: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  partnerPrimary: { flex: 1, minWidth: 160, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  partnerPrimaryText: { fontSize: 13, fontWeight: "800", color: "white" },
  partnerSecondary: { flex: 1, minWidth: 160, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#374151", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  partnerSecondaryText: { fontSize: 13, fontWeight: "700", color: "#F3F4F6" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 32 },
  footerText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  dockContainer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  dockInner: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  primary: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  primaryText: { flex: 1, fontSize: 15, fontWeight: "900", color: "white", textAlign: "center" },
  dockHint: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 6, fontWeight: "500" },
  foodEmoji: { fontSize: 32 },
  benefitEmoji: { fontSize: 24 },
  carousel: { marginHorizontal: 20 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 8 },
  dotButton: { minWidth: 32, minHeight: 36, justifyContent: "center", alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#CBD5E1" },
  activeDot: { width: 22, backgroundColor: colors.primary },
  swipeHint: { fontSize: 11, color: colors.muted, marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "white",
    borderRadius: 32,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    position: "relative",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalBadgeWrap: {
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  qrBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  qrFrame: {
    width: 140,
    height: 140,
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 12,
  },
  qrInner: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: "#111827",
    borderRadius: 10,
    padding: 8,
    justifyContent: "space-between",
  },
  qrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qrFinder: {
    width: 24,
    height: 24,
    borderWidth: 4,
    borderColor: "#111827",
    borderRadius: 5,
  },
  qrDotsRow: {
    flexDirection: "row",
    gap: 4,
  },
  qrDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#111827",
  },
  qrCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrCenterText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 1,
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  qrSublabel: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: 2,
  },
  modalActions: {
    width: "100%",
    gap: 10,
  },
  modalPrimaryBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
  },
  modalSecondaryBtn: {
    width: "100%",
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
});
