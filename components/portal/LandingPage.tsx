import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import {
  ENFORCE_STRICT_PLATFORM_GUARDS,
  isDesktopDevice,
  isMobileDevice,
} from "../../lib/platform-policy";

const colors = {
  primary: "#EA5410",
  primarySoft: "#FFF7ED",
  primaryBorder: "#FED7AA",
  ink: "#111827",
  charcoal: "#1F2937",
  muted: "#64748B",
  surface: "#F8FAFC",
  white: "#FFFFFF",
  border: "#E2E8F0",
  emerald: "#047857",
  emeraldBg: "#ECFDF5",
  emeraldBorder: "#A7F3D0",
};

const quickCategories = [
  { name: "Meals", filter: "Meals", icon: "restaurant-outline" as const },
  { name: "Seafood & Grill", filter: "Seafood", icon: "fish-outline" as const },
  { name: "BBQ & Street Eats", filter: "BBQ & Grill", icon: "flame-outline" as const },
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
] as const;

function HighlightCarousel({
  onExplore,
  isDesktop,
}: {
  onExplore: (category?: string) => void;
  isDesktop: boolean;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [active, setActive] = useState(0);
  const scroll = useRef<ScrollView>(null);

  const slideWidth = containerWidth;
  const photoHeight =
    windowWidth >= 900
      ? Math.max(460, Math.min(560, Math.round(windowHeight * 0.56)))
      : windowWidth >= 768
      ? 400
      : Math.max(300, Math.min(380, Math.round(windowHeight * 0.44)));
  const arrowTopOffset = Math.max(40, Math.round(photoHeight / 2) - 22);

  const goToSlide = (targetIndex: number) => {
    const clamped = Math.max(0, Math.min(highlights.length - 1, targetIndex));
    setActive(clamped);
    if (slideWidth > 0) {
      scroll.current?.scrollTo({ x: slideWidth * clamped, animated: true });
    }
  };

  return (
    <View
      style={s.carousel}
      onLayout={({ nativeEvent }) => {
        const nextWidth = Math.round(nativeEvent.layout.width);
        if (nextWidth > 0 && nextWidth !== containerWidth) {
          setContainerWidth(nextWidth);
          scroll.current?.scrollTo({ x: active * nextWidth, animated: false });
        }
      }}
    >
      {containerWidth > 0 && (
        <View style={s.carouselFrame}>
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={({ nativeEvent }) => {
              if (slideWidth <= 0) return;
              const nextIdx = Math.max(
                0,
                Math.min(
                  highlights.length - 1,
                  Math.round(nativeEvent.contentOffset.x / slideWidth)
                )
              );
              if (nextIdx !== active) {
                setActive(nextIdx);
              }
            }}
            onMomentumScrollEnd={({ nativeEvent }) => {
              if (slideWidth <= 0) return;
              setActive(
                Math.max(
                  0,
                  Math.min(
                    highlights.length - 1,
                    Math.round(nativeEvent.contentOffset.x / slideWidth)
                  )
                )
              );
            }}
          >
            {highlights.map((highlight, index) => (
              <TouchableOpacity
                key={highlight.title}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1} of ${highlights.length}. ${highlight.title}`}
                onPress={() => onExplore(highlight.category)}
                activeOpacity={0.9}
                style={[s.heroCard, { width: slideWidth, backgroundColor: highlight.color }]}
              >
                <View style={[s.heroPhoto, { height: photoHeight }]}>
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
                    <Text style={s.heroDetail} numberOfLines={2}>
                      {highlight.detail}
                    </Text>
                  </View>
                  <View style={s.heroArrow}>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isDesktop && active > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous featured dish"
              onPress={() => goToSlide(active - 1)}
              style={[s.carouselNavBtn, s.carouselNavPrev, { top: arrowTopOffset }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </TouchableOpacity>
          )}

          {isDesktop && active < highlights.length - 1 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next featured dish"
              onPress={() => goToSlide(active + 1)}
              style={[s.carouselNavBtn, s.carouselNavNext, { top: arrowTopOffset }]}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.ink} />
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={s.pagination}>
        {highlights.map((highlight, index) => (
          <TouchableOpacity
            key={highlight.title}
            accessibilityRole="button"
            accessibilityState={{ selected: active === index }}
            style={s.dotButton}
            onPress={() => goToSlide(index)}
          >
            <View style={[s.dot, active === index && s.activeDot]} />
          </TouchableOpacity>
        ))}
        <Text style={s.swipeHint}>
          {isDesktop ? "Use arrows or dots to explore" : "Swipe to explore"}
        </Text>
      </View>
    </View>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = isDesktopDevice(windowWidth);
  const isWideHero = windowWidth >= 900;
  const isMobile = isMobileDevice(windowWidth);
  const isCompactHeader = windowWidth < 640;
  const isTinyPhone = windowWidth < 380;

  const [appModalVisible, setAppModalVisible] = useState(false);
  const [appModalTopic, setAppModalTopic] = useState("Mati FoodFinder App");

  const openMobileAppModal = (topic: string) => {
    setAppModalTopic(topic);
    setAppModalVisible(true);
  };

  const openInNewTabOrPush = (webPath: string, routeHref: Href) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(webPath, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(routeHref);
  };

  const explore = (category?: string) => {
    if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop) {
      openMobileAppModal(category ? `${category} Discovery` : "Mati Food Discovery");
    } else {
      router.push({ pathname: "/(mobile)/(tabs)/discover", params: category ? { category } : {} });
    }
  };

  const scrollContentBottomPadding = isMobile ? 124 : 36;

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: scrollContentBottomPadding }]}
      >
        {/* Simple Top Bar */}
        <View style={s.headerWrap}>
          <View style={[s.header, isCompactHeader && s.headerCompact]}>
            <View style={[s.brand, isCompactHeader && s.brandCompact]}>
              <Image
                source={require("../../assets/logo.jpg")}
                style={s.logo}
                accessibilityLabel="Mati FoodFinder logo"
              />
              <View style={s.brandCopy}>
                <Text style={s.brandName} numberOfLines={1}>
                  Mati FoodFinder
                </Text>
                <View style={s.location}>
                  <Ionicons name="location" size={12} color={colors.primary} />
                  <Text style={s.locationText} numberOfLines={1}>
                    Mati City, Davao Oriental
                  </Text>
                </View>
              </View>
            </View>

            <View style={[s.navActions, isCompactHeader && s.navActionsCompact]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Get the Mati FoodFinder mobile app"
                onPress={() => openMobileAppModal("Mati FoodFinder Mobile App")}
                style={[s.ghostBtn, isTinyPhone && s.btnCompact]}
              >
                <Ionicons name="phone-portrait-outline" size={14} color={colors.charcoal} />
                <Text style={s.ghostBtnText}>Get App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Log in to Mati FoodFinder"
                onPress={() => openInNewTabOrPush("/auth/customer-login", "/(mobile)/auth/customer-login")}
                style={[s.ghostBtn, isTinyPhone && s.btnCompact]}
              >
                <Text style={s.ghostBtnText}>Log in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sign up for Mati FoodFinder"
                onPress={() => openInNewTabOrPush("/auth/customer-register", "/(mobile)/auth/customer-register")}
                style={[s.signUpBtn, isTinyPhone && s.btnCompact]}
              >
                <Text style={s.signUpBtnText}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Container */}
        <View style={s.container}>
          {/* Full-Width Showcase Hero (Option 1) */}
          <View style={[s.heroSection, isDesktop && s.heroSectionDesktop, isMobile && s.heroSectionMobile]}>
            <View style={[s.heroIntro, isDesktop && s.heroIntroDesktop]}>
              <Text
                style={[
                  s.headline,
                  isDesktop && s.headlineDesktop,
                  isTinyPhone
                    ? { fontSize: 30, lineHeight: 36 }
                    : isWideHero
                    ? { fontSize: 46, lineHeight: 52 }
                    : { fontSize: 36, lineHeight: 42 },
                ]}
              >
                Local food in Mati, made simple.
              </Text>

              <Text style={[s.subtitle, isDesktop && s.subtitleDesktop]}>
                Browse neighborhood Karenderias, Pujada Bay seafood grills, and Dahican favorites. Order safely with Cash-on-Delivery PINs or reserve your dining table in seconds.
              </Text>

              <View style={[s.heroActions, isDesktop && s.heroActionsDesktop]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                      ? "Get the Mati FoodFinder Mobile App"
                      : "Explore Mati Restaurants"
                  }
                  onPress={() => explore()}
                  style={s.heroPrimaryBtn}
                >
                  <Ionicons name="restaurant-outline" size={18} color="white" />
                  <Text style={s.heroPrimaryText}>Explore Restaurants</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Get the free mobile app"
                  onPress={() => openMobileAppModal("Get the Mati FoodFinder App")}
                  style={s.heroSecondaryBtn}
                >
                  <Ionicons name="download-outline" size={17} color={colors.ink} />
                  <Text style={s.heroSecondaryText}>Get Mobile App</Text>
                </TouchableOpacity>
              </View>

              {/* Compact Quick Craving Links */}
              <View style={[s.categoryStrip, isDesktop && s.categoryStripDesktop]}>
                {quickCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${cat.name}`}
                    onPress={() => explore(cat.filter)}
                    style={s.categoryChip}
                  >
                    <Ionicons name={cat.icon} size={14} color={colors.primary} />
                    <Text style={s.categoryChipText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.heroShowcase}>
              <HighlightCarousel onExplore={explore} isDesktop={isDesktop} />
            </View>
          </View>

          {/* 3 Clear User Pathways — Customer, Store Owner, Rider */}
          <View style={[s.rolesSection, isMobile && s.rolesSectionMobile]}>
            <Text style={s.sectionTitle}>One platform for everyone in Mati</Text>
            <Text style={s.sectionSubtitle}>
              Pick where you want to start — browse freely, open your kitchen, or deliver locally.
            </Text>

            <View style={[s.rolesGrid, isDesktop && s.rolesGridDesktop]}>
              {/* 1. Customers & Guest Users */}
              <View style={[s.roleCard, isDesktop && s.roleCardDesktop]}>
                <View style={[s.roleIconWrap, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="bag-handle-outline" size={24} color={colors.primary} />
                </View>
                <Text style={s.roleTitle}>Customers</Text>
                <Text style={s.roleCopy}>
                  Discover daily menus, track COD orders with PIN safety, and reserve dine-in tables.
                </Text>
                <View style={s.roleActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Browse restaurants as guest"
                    onPress={() => explore()}
                    style={s.rolePrimaryBtn}
                  >
                    <Text style={s.rolePrimaryText}>Browse Now</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Customer Sign In"
                    onPress={() => openInNewTabOrPush("/auth/customer-login", "/(mobile)/auth/customer-login")}
                    style={s.roleSecondaryBtn}
                  >
                    <Text style={s.roleSecondaryText}>Customer Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Store Owners / Merchants */}
              <View style={[s.roleCard, isDesktop && s.roleCardDesktop]}>
                <View style={[s.roleIconWrap, { backgroundColor: "#F1F5F9" }]}>
                  <Ionicons name="storefront-outline" size={24} color={colors.ink} />
                </View>
                <Text style={s.roleTitle}>Store Owners</Text>
                <Text style={s.roleCopy}>
                  List your menu, manage table reservations, and accept Mati orders from web or tablet.
                </Text>
                <View style={s.roleActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Add your restaurant"
                    onPress={() => openInNewTabOrPush("/auth/store-register", "/(web)/auth/store-register")}
                    style={s.roleDarkBtn}
                  >
                    <Text style={s.roleDarkBtnText}>Add Your Store</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Merchant Sign In"
                    onPress={() => openInNewTabOrPush("/auth/store-login", "/(web)/auth/store-login")}
                    style={s.roleSecondaryBtn}
                  >
                    <Text style={s.roleSecondaryText}>Merchant Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Delivery Riders */}
              <View style={[s.roleCard, isDesktop && s.roleCardDesktop]}>
                <View style={[s.roleIconWrap, { backgroundColor: colors.emeraldBg }]}>
                  <Ionicons name="bicycle-outline" size={24} color={colors.emerald} />
                </View>
                <Text style={s.roleTitle}>Delivery Riders</Text>
                <Text style={s.roleCopy}>
                  Go online on your schedule, claim Mati delivery jobs, and complete COD handoffs.
                </Text>
                <View style={s.roleActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Sign up to deliver"
                    onPress={() =>
                      ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop
                        ? openMobileAppModal("Rider Registration")
                        : openInNewTabOrPush("/auth/rider-register", "/(mobile)/auth/rider-register")
                    }
                    style={[s.roleDarkBtn, { backgroundColor: colors.emerald }]}
                  >
                    <Text style={s.roleDarkBtnText}>Sign Up to Deliver</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Rider Sign In"
                    onPress={() => openInNewTabOrPush("/auth/rider-login", "/(mobile)/auth/rider-login")}
                    style={s.roleSecondaryBtn}
                  >
                    <Text style={s.roleSecondaryText}>Rider Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Minimal Footer */}
          <View style={s.footer}>
            <Ionicons name="heart" size={14} color={colors.primary} />
            <Text style={s.footerText}>
              Made for Mati City • Local kitchens, coastal soul
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Mobile Sticky Bottom CTA Dock */}
      {isMobile && (
        <View style={s.dockContainer}>
          <View style={s.dockInner}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Explore Mati Restaurants"
              onPress={() => explore()}
              style={s.primary}
            >
              <Ionicons name="restaurant-outline" size={19} color="white" />
              <Text style={s.primaryText}>Explore Mati Restaurants</Text>
              <Ionicons name="arrow-forward" size={17} color="white" />
            </TouchableOpacity>
            <Text style={s.dockHint}>Browse freely as Guest • No account required</Text>
          </View>
        </View>
      )}

      {/* Free Mobile App & Testing Guide Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={appModalVisible}
        onRequestClose={() => setAppModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setAppModalVisible(false)}
        >
          <Pressable
            style={[s.modalCard, { maxHeight: Math.round(windowHeight * 0.9) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center", width: "100%" }}
              style={{ width: "100%" }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={() => setAppModalVisible(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>

              <View style={s.modalIconWrap}>
                <Ionicons name="phone-portrait-outline" size={28} color={colors.primary} />
              </View>

              <Text style={s.modalTitle}>Get Mati FoodFinder on Android</Text>

              <View style={s.modalBadgeWrap}>
                <Text style={s.modalBadgeText}>{appModalTopic.toUpperCase()}</Text>
              </View>

              <Text style={s.modalDescription}>
                Run the full Mati FoodFinder mobile app completely free with Expo Go or a local Android APK build — including GPS map routing, live status alerts, and QR table check-ins.
              </Text>

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
                <Text style={s.qrLabel}>Pair free with Expo Go</Text>
                <Text style={s.qrSublabel}>
                  Start with `npm start` and scan the terminal QR using the free Expo Go Android/iOS app.
                </Text>
              </View>

              <View style={s.modalActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    Alert.alert(
                      "Free Local Android Build",
                      "Build and install on Android for free using Android Studio / USB debugging (`npm run android`) or test instantly via Expo Go (`npm start`)."
                    );
                  }}
                  style={s.modalPrimaryBtn}
                >
                  <Ionicons name="download-outline" size={18} color="white" />
                  <Text style={s.modalPrimaryBtnText}>Free Android Install Steps</Text>
                </TouchableOpacity>

                {!ENFORCE_STRICT_PLATFORM_GUARDS && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setAppModalVisible(false);
                      router.push("/(mobile)/(tabs)/discover");
                    }}
                    style={s.modalSecondaryBtn}
                  >
                    <Ionicons name="compass-outline" size={16} color={colors.ink} />
                    <Text style={s.modalSecondaryBtnText}>Browse Directly in Browser</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { paddingBottom: 36 },
  container: { width: "100%", maxWidth: 1120, alignSelf: "center" },

  // Header
  headerWrap: {
    width: "100%",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  header: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  headerCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  brandCompact: { flex: 0 },
  brandCopy: { flex: 1, minWidth: 0 },
  logo: { width: 42, height: 42, borderRadius: 14 },
  brandName: { fontSize: 17, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  location: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  locationText: { fontSize: 11, color: colors.muted, fontWeight: "500" },
  navActions: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  navActionsCompact: { width: "100%", justifyContent: "flex-start" },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostBtnText: { fontSize: 12, fontWeight: "700", color: colors.charcoal },
  signUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  signUpBtnText: { fontSize: 12, fontWeight: "800", color: "white" },
  btnCompact: { paddingHorizontal: 11 },

  // Hero
  heroSection: { paddingHorizontal: 20, paddingTop: 22, gap: 22 },
  heroSectionDesktop: { paddingTop: 32, gap: 26 },
  heroSectionMobile: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },
  heroIntro: { width: "100%" },
  heroIntroDesktop: { alignItems: "center" },
  heroShowcase: { width: "100%" },
  headline: { fontWeight: "900", letterSpacing: -1.2, color: colors.ink },
  headlineDesktop: { textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted, marginTop: 12, maxWidth: 680 },
  subtitleDesktop: { textAlign: "center" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  heroActionsDesktop: { justifyContent: "center" },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  heroPrimaryText: { fontSize: 14, fontWeight: "900", color: "white" },
  heroSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
  },
  heroSecondaryText: { fontSize: 13, fontWeight: "800", color: colors.ink },
  categoryStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  categoryStripDesktop: { justifyContent: "center" },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryChipText: { fontSize: 12, fontWeight: "700", color: colors.charcoal },

  // Carousel
  carousel: { width: "100%" },
  carouselFrame: {
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#111827",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  carouselNavBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  carouselNavPrev: { left: 14 },
  carouselNavNext: { right: 14 },
  heroCard: { overflow: "hidden" },
  heroPhoto: { position: "relative" },
  foodImage: { width: "100%", height: "100%" },
  photoBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  photoBadgeText: { fontSize: 11, fontWeight: "800", color: colors.ink },
  heroCopy: { flexDirection: "row", alignItems: "center", padding: 20, gap: 14, minHeight: 112 },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, color: "#FDBA74", marginBottom: 5 },
  heroTitle: { fontSize: 21, fontWeight: "900", color: "white", letterSpacing: -0.5 },
  heroDetail: { fontSize: 13, lineHeight: 19, color: "#E2E8F0", marginTop: 4 },
  heroArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 8 },
  dotButton: { minWidth: 32, minHeight: 36, justifyContent: "center", alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#CBD5E1" },
  activeDot: { width: 22, backgroundColor: colors.primary },
  swipeHint: { fontSize: 11, color: colors.muted, marginLeft: 8 },

  // Role Cards Section
  rolesSection: { paddingHorizontal: 20, marginTop: 34 },
  rolesSectionMobile: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 18 },
  rolesGrid: { gap: 16 },
  rolesGridDesktop: { flexDirection: "row", alignItems: "stretch" },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  roleCardDesktop: { flex: 1 },
  roleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: { fontSize: 18, fontWeight: "900", color: colors.ink, letterSpacing: -0.3 },
  roleCopy: { fontSize: 13, lineHeight: 19, color: colors.muted },
  roleActions: { gap: 8, marginTop: "auto", paddingTop: 6 },
  rolePrimaryBtn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
  },
  rolePrimaryText: { fontSize: 13, fontWeight: "800", color: "white" },
  roleDarkBtn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
  },
  roleDarkBtnText: { fontSize: 13, fontWeight: "800", color: "white" },
  roleSecondaryBtn: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  roleSecondaryText: { fontSize: 12, fontWeight: "800", color: colors.charcoal },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: { fontSize: 12, color: colors.muted, fontWeight: "600", textAlign: "center" },

  // Mobile Dock
  dockContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  dockInner: { width: "100%", maxWidth: 680, alignSelf: "center" },
  primary: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryText: { flex: 1, fontSize: 14, fontWeight: "900", color: "white", textAlign: "center" },
  dockHint: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 6, fontWeight: "500" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    position: "relative",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  modalBadgeWrap: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  modalBadgeText: { fontSize: 10, fontWeight: "800", color: colors.primary, letterSpacing: 0.6 },
  modalDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  qrBox: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  qrFrame: {
    width: 130,
    height: 130,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  qrInner: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 10,
    padding: 8,
    justifyContent: "space-between",
  },
  qrRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qrFinder: { width: 20, height: 20, borderWidth: 4, borderColor: colors.ink, borderRadius: 5 },
  qrDotsRow: { flexDirection: "row", gap: 4 },
  qrDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink },
  qrCenter: { alignItems: "center", justifyContent: "center" },
  qrCenterText: { fontSize: 10, fontWeight: "900", color: colors.primary, letterSpacing: 1 },
  qrLabel: { fontSize: 13, fontWeight: "800", color: colors.ink, textAlign: "center" },
  qrSublabel: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 4 },
  modalActions: { width: "100%", gap: 10 },
  modalPrimaryBtn: {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalPrimaryBtnText: { fontSize: 13, fontWeight: "800", color: "white" },
  modalSecondaryBtn: {
    width: "100%",
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalSecondaryBtnText: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
