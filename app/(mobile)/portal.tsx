import React, { useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const colors = { ink: "#183C32", green: "#075E46", orange: "#C94216", muted: "#53655B", cream: "#FAF9F5" };
const cuisines = [
  { name: "Karenderias", caption: "Comfort in every bite", emoji: "🍲", color: "#FFE0A3" },
  { name: "Seafood", caption: "A taste of the coast", emoji: "🐟", color: "#BCEADD" },
  { name: "BBQ & Grill", caption: "Fresh off the grill", emoji: "🍢", color: "#FFCBBB" },
] as const;
const benefits = [
  { emoji: "🍲", color: "#FFE0A3", title: "Fresh daily menus", detail: "See what’s cooking before you order." },
  { emoji: "🛵", color: "#BCEADD", title: "Cash on delivery", detail: "Good food now. Pay when it arrives." },
  { emoji: "📅", color: "#DFD1FF", title: "A table for you", detail: "Find your next dine-in spot in Mati." },
] as const;


const highlights = [
  { image: require("../../assets/food/welcome-feast.jpg"), badge: "For the love of local", eyebrow: "A LITTLE LOCAL. A LOT TO LOVE.", title: "Good food. Happy mood.", detail: "Discover neighborhood kitchens & coastal favorites.", color: "#075E46", category: undefined },
  { image: require("../../assets/food/grill.jpg"), badge: "Bring your appetite", eyebrow: "FIRE UP YOUR NEXT FOOD TRIP", title: "Big grill energy.", detail: "Find smoky favorites and your next BBQ craving.", color: "#863413", category: "BBQ & Grill" },
  { image: require("../../assets/food/dining.jpg"), badge: "Make a little time for good food", eyebrow: "MORE THAN A MEAL", title: "Good company. Great bites.", detail: "Explore local dining spots for your next get-together.", color: "#403369", category: undefined },
];

function HighlightCarousel({ onExplore }: { onExplore: (category?: string) => void }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const scroll = useRef<ScrollView>(null);
  return (
    <View style={s.carousel} onLayout={({ nativeEvent }) => {
      const nextWidth = nativeEvent.layout.width;
      if (nextWidth !== width) { setWidth(nextWidth); setActive(0); }
    }}>
      {width > 0 && <ScrollView key={width} ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={({ nativeEvent }) => setActive(Math.max(0, Math.min(highlights.length - 1, Math.round(nativeEvent.contentOffset.x / width))))}>
        {highlights.map((highlight, index) => (
          <TouchableOpacity key={highlight.title} accessibilityRole="button" accessibilityLabel={`${index + 1} of ${highlights.length}. ${highlight.title} Explore food.`}
            onPress={() => onExplore(highlight.category)} activeOpacity={0.9} style={[s.hero, { width, backgroundColor: highlight.color }]}>
            <View style={s.heroPhoto}>
              <Image source={highlight.image} style={s.foodImage} resizeMode="cover" />
              <View style={s.photoBadge}><Ionicons name="heart" size={13} color={colors.orange} /><Text style={s.photoBadgeText}>{highlight.badge}</Text></View>
            </View>
            <View style={[s.heroCopy, { backgroundColor: highlight.color }]}>
              <View style={s.heroText}><Text style={s.heroEyebrow}>{highlight.eyebrow}</Text><Text style={s.heroTitle}>{highlight.title}</Text><Text style={s.heroDetail}>{highlight.detail}</Text></View>
              <View style={s.heroArrow}><Ionicons name="arrow-forward" size={23} color={colors.green} /></View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>}
      <View style={s.pagination}>
        {highlights.map((highlight, index) => <TouchableOpacity key={highlight.title} accessibilityRole="button" accessibilityLabel={`Show highlight ${index + 1}: ${highlight.title}`} accessibilityState={{ selected: active === index }} style={s.dotButton}
          onPress={() => { scroll.current?.scrollTo({ x: width * index, animated: true }); setActive(index); }}><View style={[s.dot, active === index && s.activeDot]} /></TouchableOpacity>)}
        <Text style={s.swipeHint}>Swipe to discover</Text>
      </View>
    </View>
  );
}

export default function MobileWelcomePortal() {
  const router = useRouter();
  const [partnerMode, setPartnerMode] = useState<"merchant" | "rider">("merchant");
  const explore = (category?: string) => router.push({ pathname: "/(mobile)/(tabs)", params: category ? { category } : {} });
  const signIn = () => router.push("/(mobile)/auth/customer-register");

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <View style={s.brand}>
            <Image source={require("../../assets/logo.jpg")} style={s.logo} accessibilityLabel="Mati FoodFinder logo" />
            <View style={s.brandCopy}>
              <Text style={s.brandName}>Mati FoodFinder</Text>
              <View style={s.location}><Ionicons name="location" size={12} color={colors.green} /><Text style={s.locationText}>Mati City, Davao Oriental</Text></View>
            </View>
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={signIn} style={s.login}><Text style={s.loginText}>Sign in</Text></TouchableOpacity>
        </View>

        <View style={s.intro}>
          <Text style={s.eyebrow}>LOCAL FLAVORS. BIG CRAVINGS.</Text>
          <Text style={s.headline}>Your next delicious{"\n"}discovery starts here.</Text>
          <Text style={s.subtitle}>Made in Mati. Ready for your appetite.</Text>
        </View>

        <HighlightCarousel onExplore={explore} />

        <View style={s.sectionHeading}><Text style={s.sectionTitle}>What’s your craving?</Text><Text style={s.smallNote}>Find your flavor</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cuisines}>
          {cuisines.map((cuisine) => (
            <TouchableOpacity key={cuisine.name} accessibilityRole="button" accessibilityLabel={`Browse ${cuisine.name}`} onPress={() => explore(cuisine.name)} style={[s.cuisine, { backgroundColor: cuisine.color }]}>
              <View style={s.cuisineTop}><View style={s.cuisineIcon}><Text style={s.foodEmoji}>{cuisine.emoji}</Text></View><Ionicons name="arrow-forward" size={16} color={colors.ink} /></View>
              <Text style={s.cuisineName}>{cuisine.name}</Text><Text style={s.cuisineCaption}>{cuisine.caption}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.benefits}>
          <Text style={s.sectionTitle}>Good food, made easy.</Text>
          {benefits.map((benefit) => (
            <View key={benefit.title} style={s.benefitRow}>
              <View style={[s.benefitIcon, { backgroundColor: benefit.color }]}><Text style={s.benefitEmoji}>{benefit.emoji}</Text></View>
              <View style={s.flex}><Text style={s.benefitTitle}>{benefit.title}</Text><Text style={s.benefitDetail}>{benefit.detail}</Text></View>
              <Ionicons name="checkmark-circle" size={20} color="#08744F" />
            </View>
          ))}
        </View>

        <View style={s.partner}>
          <View style={s.partnerHeading}><Text style={s.foodEmoji}>{partnerMode === "merchant" ? "🏪" : "🛵"}</Text><Text style={s.partnerTitle}>Grow with Mati FoodFinder</Text></View>
          <Text style={s.partnerDetail}>Bring your kitchen or your wheels. Let’s feed Mati.</Text>
          <View style={s.segments}>
            {(["merchant", "rider"] as const).map((mode) => (
              <TouchableOpacity key={mode} accessibilityRole="tab" accessibilityState={{ selected: partnerMode === mode }} onPress={() => setPartnerMode(mode)} style={[s.segment, partnerMode === mode && s.segmentActive]}>
                <Text style={[s.segmentText, partnerMode === mode && s.segmentTextActive]}>{mode === "merchant" ? "Store owners" : "Delivery riders"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.partnerDescription}>{partnerMode === "merchant" ? "Share your menu, manage orders, and welcome more local diners." : "Deliver local favorites and manage your deliveries around Mati City."}</Text>
          <View style={s.partnerActions}>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push(partnerMode === "merchant" ? "/(mobile)/auth/merchant-register" : "/(mobile)/auth/rider-register")} style={s.partnerPrimary}><Text style={s.partnerPrimaryText}>{partnerMode === "merchant" ? "Register your store" : "Apply as a rider"}</Text><Ionicons name="arrow-forward" size={16} color={colors.ink} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={partnerMode === "merchant" ? "Merchant login" : "Rider login"} onPress={() => router.push(partnerMode === "merchant" ? "/(mobile)/auth/merchant-login" : "/(mobile)/auth/rider-login")} style={s.partnerLogin}><Text style={s.partnerLoginText}>Log in</Text></TouchableOpacity>
          </View>
        </View>
        <View style={s.footer}><Ionicons name="heart-outline" size={15} color={colors.green} /><Text style={s.footerText}>Local kitchens. Coastal soul. All Mati.</Text></View>
      </ScrollView>

      <View style={s.dock}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Explore food as a guest" onPress={() => explore()} style={s.primary}>
          <Ionicons name="restaurant-outline" size={20} color="white" /><Text style={s.primaryText}>Explore food</Text><Ionicons name="arrow-forward" size={21} color="white" />
        </TouchableOpacity>
        <Text style={s.dockHint}>Come hungry. Browse freely. No account needed.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  brandCopy: { flex: 1 },
  logo: { width: 42, height: 42, borderRadius: 13 },
  brandName: { fontSize: 16, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  location: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  locationText: { fontSize: 10, color: colors.muted, flexShrink: 1 },
  login: { minHeight: 44, justifyContent: "center", paddingHorizontal: 13, borderRadius: 22, backgroundColor: "#EAF1E9" },
  loginText: { fontSize: 13, fontWeight: "700", color: colors.green },
  intro: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 22 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.8, color: colors.orange, marginBottom: 10 },
  headline: { fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -1.3, color: colors.ink },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 10 },
  hero: { borderRadius: 24, overflow: "hidden", backgroundColor: colors.green },
  heroPhoto: { height: 210, backgroundColor: "#E7E9DB" },
  foodImage: { width: "100%", height: "100%" },
  photoBadge: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFCF3", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20 },
  photoBadgeText: { fontSize: 10, fontWeight: "700", color: colors.ink },
  heroCopy: { flexDirection: "row", alignItems: "center", padding: 19, gap: 12, minHeight: 140 },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, color: "#D7EAA8", marginBottom: 7 },
  heroTitle: { fontSize: 21, fontWeight: "800", color: "white", letterSpacing: -0.5 },
  heroDetail: { fontSize: 13, lineHeight: 20, color: "#FFFFFF", marginTop: 6 },
  heroArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E9F0CE", justifyContent: "center", alignItems: "center" },
  sectionHeading: { paddingHorizontal: 22, marginTop: 28, marginBottom: 15, gap: 5 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  smallNote: { fontSize: 12, color: colors.muted },
  cuisines: { paddingHorizontal: 20, gap: 12 },
  cuisine: { width: 155, padding: 15, borderRadius: 20 },
  cuisineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  cuisineIcon: { width: 58, height: 58, backgroundColor: "#FFFFFFA6", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cuisineName: { fontSize: 15, fontWeight: "800", color: colors.ink },
  cuisineCaption: { fontSize: 12, lineHeight: 17, color: "#344F43", marginTop: 4 },
  benefits: { margin: 20, marginTop: 28, padding: 20, borderRadius: 24, backgroundColor: "#FFF2D8", borderWidth: 1, borderColor: "#F1D8A6" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22 },
  benefitIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F5ED" },
  flex: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  benefitDetail: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 3 },
  partner: { marginHorizontal: 20, padding: 20, borderRadius: 24, backgroundColor: "#075E46" },
  partnerHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerTitle: { fontSize: 18, fontWeight: "800", color: "white", flex: 1 },
  partnerDetail: { fontSize: 13, lineHeight: 20, color: "#E3F3EA", marginTop: 8 },
  segments: { flexDirection: "row", backgroundColor: "#034632", padding: 4, borderRadius: 14, marginTop: 17 },
  segment: { flex: 1, minHeight: 44, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  segmentActive: { backgroundColor: "white" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  segmentTextActive: { color: colors.green, fontWeight: "800" },
  partnerDescription: { fontSize: 13, lineHeight: 20, color: "#E3F3EA", marginVertical: 16 },
  partnerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  partnerPrimary: { flex: 1, minHeight: 46, padding: 12, borderRadius: 13, backgroundColor: "#FFCE70", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  partnerPrimaryText: { fontSize: 12, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  partnerLogin: { minHeight: 46, paddingHorizontal: 12, justifyContent: "center" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 25 },
  footerText: { fontSize: 11, color: colors.muted },
  dock: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: "#E9EBE2" },
  primary: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 17, backgroundColor: colors.orange, flexDirection: "row", alignItems: "center", gap: 10 },
  primaryText: { flex: 1, fontSize: 16, fontWeight: "800", color: "white" },
  dockHint: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 8 },
  foodEmoji: { fontSize: 36 },
  benefitEmoji: { fontSize: 28 },
  partnerLoginText: { fontSize: 13, fontWeight: "700", color: "white" },
  carousel: { marginHorizontal: 20 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 4 },
  dotButton: { minWidth: 32, minHeight: 44, justifyContent: "center", alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#B4C5BB" },
  activeDot: { width: 23, backgroundColor: colors.green },
  swipeHint: { fontSize: 11, color: colors.muted, marginLeft: 9 },
});
