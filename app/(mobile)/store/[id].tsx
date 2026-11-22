import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { RestaurantProfile, FoodItem } from "../../../types/restaurant";
import { MATI_RESTAURANTS_DATA } from "../../../mock/restaurants";
import { FOOD_ITEMS } from "../../../mock/dishes";
import { MATI_BARANGAYS } from "../../../mock/barangays";
import {
  fetchLiveStores,
  fetchLiveMenuItems,
  subscribeToStores,
  subscribeToAllMenuItems,
  LiveStoreProfile,
} from "../../../services/catalog";
import {
  fetchStoreReviews,
  fetchStoreDetailedRatingSummary,
  StoreReviewItem,
  StoreDetailedRatingSummary,
} from "../../../services/reviews";
import { createOrder } from "../../../services/orders";
import { createReservation as createBackendReservation } from "../../../services/reservations";
import { callPhoneNumber } from "../../../lib/phone";
import { FloatingCartBar } from "../../../components/cart/FloatingCartBar";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { CheckoutSheet, CheckoutConfirmedPayload } from "../../../components/checkout/CheckoutSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import { isStoreCurrentlyOpen } from "../../../lib/geo-serviceability";

export default function StoreProfileScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isLoggedIn } = useAuth();
  const { addItem, updateQuantity, getItemQuantity, items: cartItems } = useCart();

  const [store, setStore] = useState<RestaurantProfile | LiveStoreProfile | null>(null);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Reviews & Ratings State
  const [reviews, setReviews] = useState<StoreReviewItem[]>([]);
  const [detailedRatings, setDetailedRatings] = useState<StoreDetailedRatingSummary | null>(null);

  // Sheets & Modals
  const [showReservationSheet, setShowReservationSheet] = useState<boolean>(false);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState<boolean>(false);
  const [checkoutDish, setCheckoutDish] = useState<FoodItem | null>(null);
  const [showGuestGate, setShowGuestGate] = useState<boolean>(false);
  const [guestGateAction, setGuestGateAction] = useState<string>("order food or reserve tables");

  // Customization Modal State for Dishes
  const [customizingDish, setCustomizingDish] = useState<FoodItem | null>(null);
  const [selectedSpice, setSelectedSpice] = useState<string>("Regular");
  const [selectedAddon, setSelectedAddon] = useState<string>("None");

  // Load store details, menu items, and customer reviews
  useEffect(() => {
    let isMounted = true;
    async function loadStoreData() {
      setIsLoading(true);
      try {
        const [liveStores, allMenuItems] = await Promise.all([
          fetchLiveStores(),
          fetchLiveMenuItems(),
        ]);

        if (!isMounted) return;

        const targetId = params.id;
        const targetName = params.name ? decodeURIComponent(params.name).trim().toLowerCase() : "";

        // 1. Match from live backend stores
        let matched = liveStores.find(
          (s) =>
            (targetId && s.id === targetId) ||
            (targetId && s.slug === targetId) ||
            (targetName && s.name.toLowerCase().trim() === targetName)
        );

        // 2. Fallback to mock restaurants if not yet approved or seeded locally
        if (!matched) {
          const fallbackEntry = Object.values(MATI_RESTAURANTS_DATA).find(
            (r) =>
              (targetName && r.name.toLowerCase().trim() === targetName) ||
              (targetId && r.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(targetId.toLowerCase().replace(/[^a-z0-9]/g, "")))
          );
          if (fallbackEntry) {
            matched = fallbackEntry as any;
          }
        }

        if (matched) {
          setStore(matched);

          // Resolve store menu items
          const storeDishes = allMenuItems.filter(
            (dish) =>
              dish.store?.toLowerCase().trim() === matched?.name.toLowerCase().trim() ||
              (dish.storeId && (dish.storeId === matched?.id || dish.storeId === (matched as any).storeId))
          );
          setMenuItems(storeDishes);

          // Resolve reviews & ratings
          if (matched.id) {
            try {
              const [revList, detailed] = await Promise.all([
                fetchStoreReviews(matched.id),
                fetchStoreDetailedRatingSummary(matched.id),
              ]);
              if (isMounted) {
                setReviews(revList);
                setDetailedRatings(detailed);
              }
            } catch (revErr) {
              console.warn("Reviews load notice:", revErr);
            }
          }
        }
      } catch (err) {
        console.warn("Store load error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStoreData();
    const unsubStores = subscribeToStores(loadStoreData);
    const unsubMenu = subscribeToAllMenuItems(loadStoreData);

    return () => {
      isMounted = false;
      unsubStores();
      unsubMenu();
    };
  }, [params.id, params.name]);

  // Categories extracted from menu items
  const menuCategories = useMemo(() => {
    const set = new Set<string>(["All", "Meals", "Seafood", "BBQ & Grill", "Merienda", "Beverages"]);
    for (const item of menuItems) {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    }
    return Array.from(set);
  }, [menuItems]);

  const filteredDishes = useMemo(() => {
    if (selectedCategory === "All") return menuItems;
    const target = selectedCategory.toLowerCase().trim().replace(/s$/, "");
    return menuItems.filter((dish) => {
      const cat = (dish.category || "").toLowerCase().trim().replace(/s$/, "");
      return cat === target || cat.includes(target) || target.includes(cat);
    });
  }, [menuItems, selectedCategory]);

  const verifyRegisteredUser = (actionDescription: string): boolean => {
    if (!isLoggedIn) {
      setGuestGateAction(actionDescription);
      setShowGuestGate(true);
      return false;
    }
    return true;
  };

  const handleOpenReservation = () => {
    if (!verifyRegisteredUser("book dining tables")) return;
    setShowReservationSheet(true);
  };

  const handleConfirmReservation = async (data: {
    restaurantName: string;
    partySize: number;
    date: string;
    time: string;
    seatingPreference: string;
    specialNotes?: string;
  }) => {
    try {
      const isUuid = (val?: string | null) =>
        typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const storeId =
        (store?.id && isUuid(store.id) ? store.id : null) ||
        (isUuid(params.id) ? params.id : null) ||
        "11111111-1111-1111-1111-111111111111";

      await createBackendReservation({
        storeId,
        partySize: data.partySize,
        reservationDate: data.date,
        reservationTime: data.time,
        seatingPreference: data.seatingPreference,
        specialNotes: data.specialNotes,
      });

      setShowReservationSheet(false);
      Alert.alert(
        "Reservation Submitted! 📅",
        `Your dining table request for ${data.partySize} guests at ${store?.name} on ${data.date} (${data.time}) has been sent to the store. You will receive live status updates in the Orders tab.`,
        [
          { text: "View Bookings", onPress: () => router.push("/(mobile)/(tabs)/orders") },
          { text: "OK" },
        ]
      );
    } catch (err: any) {
      Alert.alert("Reservation Notice", err?.message || "Failed to submit booking");
    }
  };

  const handleOpenCheckout = (dish: FoodItem) => {
    if (!verifyRegisteredUser("order food with Cash on Delivery")) return;
    setCheckoutDish(dish);
    setShowCheckoutSheet(true);
  };

  const handlePlaceOrder = async (payload: CheckoutConfirmedPayload) => {
    try {
      const isUuid = (val?: string | null) =>
        typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const storeId =
        (store?.id && isUuid(store.id) ? store.id : null) ||
        (payload.storeId && isUuid(payload.storeId) ? payload.storeId : null) ||
        (isUuid(params.id) ? params.id : null) ||
        "11111111-1111-1111-1111-111111111111";

      const itemsToOrder =
        payload.items && payload.items.length > 0
          ? payload.items
          : [
              {
                menuItemId: payload.dish?.menuItemId,
                name: payload.dish?.name || "Mati Special",
                price: payload.dish?.price || payload.total,
                quantity: payload.qty || 1,
              },
            ];

      const created = await createOrder({
        storeId,
        items: itemsToOrder,
        fulfillmentType: payload.fulfillment,
        paymentMethod: "cod",
        deliveryAddress: payload.address,
        barangay: payload.barangay,
        notes: payload.notes,
        voucherCode: payload.voucherCode,
        voucherId: payload.voucherId,
        discount: payload.discount,
        storeHours: store?.hours,
        bypassHoursCheck: true,
      });

      setShowCheckoutSheet(false);
      Alert.alert(
        "Order Placed Successfully! 🛵",
        `Order #${created.orderNumber} has been received by ${store?.name}. Handshake PIN: ${created.handshakePin}. Cash on Delivery (COD).`,
        [
          { text: "Track Order", onPress: () => router.push("/(mobile)/(tabs)/orders") },
          { text: "OK" },
        ]
      );
    } catch (err: any) {
      Alert.alert("Order Error", err?.message || "Could not complete order.");
    }
  };

  const handleQuickAddDish = (dish: FoodItem) => {
    if (dish.modifiers && dish.modifiers.length > 0) {
      setCustomizingDish(dish);
      setSelectedSpice("Regular");
      setSelectedAddon("None");
      return;
    }
    addItem(dish, 1);
  };

  const handleConfirmCustomize = (directCheckout: boolean) => {
    if (!customizingDish) return;
    let customPrice = customizingDish.price;
    const notesParts: string[] = [];

    if (selectedSpice !== "Regular") {
      notesParts.push(selectedSpice);
      if (selectedSpice === "Extra Spicy") customPrice += 10;
    }
    if (selectedAddon !== "None") {
      notesParts.push(selectedAddon);
      if (selectedAddon.includes("+₱20")) customPrice += 20;
      if (selectedAddon.includes("+₱15")) customPrice += 15;
    }

    const customizedItem: FoodItem = {
      ...customizingDish,
      price: customPrice,
      description: notesParts.length > 0 ? `${customizingDish.description || ""} (${notesParts.join(", ")})` : customizingDish.description,
    };

    setCustomizingDish(null);

    if (directCheckout) {
      handleOpenCheckout(customizedItem);
    } else {
      addItem(customizedItem, 1);
    }
  };

  const isCurrentlyOpen = useMemo(() => {
    if (!store) return true;
    if (typeof (store as any).isOpen === "boolean") return (store as any).isOpen;
    return isStoreCurrentlyOpen(store.hours).isOpen;
  }, [store]);

  const handleOpenInMap = () => {
    if (!store) return;
    router.push({
      pathname: "/(mobile)/(tabs)/map",
      params: { storeId: store.id, storeName: store.name },
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(mobile)/(tabs)/discover");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#EA5410" />
        <Text className="text-xs font-bold text-gray-500 mt-2.5">
          Loading Store Profile...
        </Text>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC] items-center justify-center p-6">
        <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center mb-3">
          <Ionicons name="storefront-outline" size={32} color="#EA5410" />
        </View>
        <Text className="text-lg font-black text-gray-900 text-center mb-1">
          Store Not Found
        </Text>
        <Text className="text-xs text-gray-500 text-center mb-4">
          This store might be currently unlisted or undergoing verification.
        </Text>
        <Pressable
          onPress={handleGoBack}
          className="px-4 py-2 bg-[#EA5410] rounded-xl flex-row items-center gap-1.5 shadow-xs"
        >
          <Ionicons name="arrow-back" size={14} color="white" />
          <Text className="text-xs font-bold text-white">Back to Explore</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const coverUrl =
    (store as any).cover_image_url ||
    store.imageUrl ||
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80";

  const logoUrl = (store as any).logo_url || (store as any).logoUrl;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-4xl self-center">
          {/* 1. HERO COVER BANNER & FLOATING APP BAR ACTIONS */}
          <View className="relative w-full overflow-hidden md:rounded-3xl md:mt-3 md:px-4">
            <View
              style={{ width: "100%", height: isWide ? 260 : 200 }}
              className="relative overflow-hidden bg-gray-100 md:rounded-3xl"
            >
              <Image
                source={{ uri: coverUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />

              {/* Floating Top Nav Bar Buttons on Cover */}
              <View className="absolute top-3.5 left-3.5 right-3.5 flex-row items-center justify-between z-10">
                <Pressable
                  onPress={handleGoBack}
                  accessibilityRole="button"
                  accessibilityLabel="Back to previous screen"
                  className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md items-center justify-center shadow-md active:bg-white border border-white/60"
                >
                  <Ionicons name="arrow-back" size={18} color="#111827" />
                </Pressable>

                <View className="flex-row items-center gap-2">
                  {/* Status Pill on Cover */}
                  <View className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex-row items-center gap-1.5 shadow-md border border-white/60">
                    <View
                      className={`w-2 h-2 rounded-full ${
                        isCurrentlyOpen ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <Text
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        isCurrentlyOpen ? "text-emerald-800" : "text-rose-700"
                      }`}
                    >
                      {isCurrentlyOpen ? "Open Now" : "Closed"}
                    </Text>
                  </View>

                  {/* Live Map Link Pill */}
                  <Pressable
                    onPress={handleOpenInMap}
                    accessibilityRole="button"
                    accessibilityLabel="View store on live map"
                    className="px-3 py-1 bg-[#EA5410] rounded-full flex-row items-center gap-1 shadow-md active:opacity-90"
                  >
                    <Ionicons name="navigate" size={12} color="white" />
                    <Text className="text-[10px] font-black text-white">Live Map</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* 2. STORE IDENTITY CARD (Floating Overlap) */}
          <View className="mx-3.5 -mt-8 bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm p-4 relative z-10">
            {/* Avatar & Verification Row */}
            <View className="flex-row items-end justify-between -mt-12 mb-2">
              {/* Store Avatar Logo */}
              <View className="w-20 h-20 rounded-2xl border-4 border-white bg-white overflow-hidden shadow-md items-center justify-center">
                {logoUrl ? (
                  <Image
                    source={{ uri: logoUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{ backgroundColor: store.bgColor || "#EA5410" }}
                    className="w-full h-full items-center justify-center"
                  >
                    <Text className="text-3xl">{store.emoji || "🍲"}</Text>
                  </View>
                )}
              </View>

              {/* Badges on the right of avatar */}
              <View className="flex-row items-center gap-1.5 flex-wrap justify-end">
                <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                  <Ionicons name="checkmark-circle" size={11} color="#047857" />
                  <Text className="text-[9px] font-black text-emerald-800 uppercase tracking-wide">
                    Verified Kitchen
                  </Text>
                </View>

                <View className="flex-row items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <Ionicons name="star" size={11} color="#D97706" />
                  <Text className="text-[11px] font-black text-amber-900">
                    {store.rating}
                  </Text>
                  <Text className="text-[10px] text-amber-700">
                    ({store.reviews || 95})
                  </Text>
                </View>
              </View>
            </View>

            {/* Store Name & Category */}
            <View className="mt-1">
              <Text className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                {store.name}
              </Text>
              <Text className="text-xs text-gray-500 font-medium mt-0.5">
                {store.category} · {store.address || "Mati City, Davao Oriental"}
              </Text>
            </View>

            {/* Story / Description */}
            <Text className="text-xs text-gray-600 leading-relaxed mt-2.5">
              {store.description ||
                "Authentic culinary destination proudly serving Mati foodies with local specialties and warm hospitality."}
            </Text>

            {/* CONSOLIDATED SINGLE QUICK-ACTION BAR (Zero Duplication!) */}
            <View className="flex-row items-center gap-2 mt-3.5 pt-3 border-t border-gray-100">
              {/* Primary CTA: Make Reservation */}
              <Pressable
                onPress={handleOpenReservation}
                accessibilityRole="button"
                accessibilityLabel="Make a dining table reservation"
                className="flex-1 py-2.5 bg-[#EA5410] rounded-xl flex-row items-center justify-center gap-1.5 shadow-xs active:opacity-90"
              >
                <Ionicons name="calendar-outline" size={14} color="white" />
                <Text className="text-xs font-black text-white">Make Reservation</Text>
              </Pressable>

              {/* Secondary CTA: Directions to In-App Map */}
              <Pressable
                onPress={handleOpenInMap}
                accessibilityRole="button"
                accessibilityLabel="Get live directions on map"
                className="px-3.5 py-2.5 bg-orange-50 border border-orange-200 rounded-xl flex-row items-center justify-center gap-1.5 active:bg-orange-100"
              >
                <Ionicons name="navigate-outline" size={14} color="#EA5410" />
                <Text className="text-xs font-bold text-[#EA5410]">Directions</Text>
              </Pressable>

              {/* Tertiary CTA: Direct Call */}
              <Pressable
                onPress={() => callPhoneNumber(store.phone, store.name)}
                accessibilityRole="button"
                accessibilityLabel="Call store phone number"
                className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-xl items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="call" size={15} color="#374151" />
              </Pressable>
            </View>
          </View>

          {/* 3. STORE OPERATIONAL DETAILS & HOURS CARD */}
          <View className="m-3.5 mt-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
            <Text className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-2.5">
              Establishment Info & Hours
            </Text>

            <View className="gap-2.5">
              {/* Address Row */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1 pr-2">
                  <View className="w-6 h-6 rounded-md bg-orange-50 items-center justify-center shrink-0">
                    <Ionicons name="location" size={12} color="#EA5410" />
                  </View>
                  <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                    {store.address || "Mati City, Davao Oriental"}
                  </Text>
                </View>
                <Pressable
                  onPress={handleOpenInMap}
                  className="px-2 py-0.5 bg-orange-50 rounded-md active:bg-orange-100"
                >
                  <Text className="text-[10px] font-bold text-[#EA5410]">View on Map →</Text>
                </Pressable>
              </View>

              {/* Hours Row */}
              <View className="flex-row items-center justify-between pt-2 border-t border-gray-50">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-md bg-gray-100 items-center justify-center shrink-0">
                    <Ionicons name="time-outline" size={12} color="#4B5563" />
                  </View>
                  <Text className="text-xs font-semibold text-gray-800">
                    {store.hours}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCurrentlyOpen ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <Text
                    className={`text-[10px] font-bold ${
                      isCurrentlyOpen ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {isCurrentlyOpen ? "Open Today" : "Closed"}
                  </Text>
                </View>
              </View>

              {/* Phone Row */}
              <View className="flex-row items-center justify-between pt-2 border-t border-gray-50">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-md bg-emerald-50 items-center justify-center shrink-0">
                    <Ionicons name="call-outline" size={12} color="#047857" />
                  </View>
                  <Text className="text-xs font-semibold text-gray-800">
                    {store.phone || "+63 917 234 5678"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => callPhoneNumber(store.phone, store.name)}
                  className="px-2 py-0.5 bg-emerald-50 rounded-md active:bg-emerald-100"
                >
                  <Text className="text-[10px] font-bold text-emerald-800">Call Now →</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* 5. FULL CATEGORIZED STORE MENU */}
          <View className="mx-3.5 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View>
                <Text className="text-base font-black text-gray-900 tracking-tight">
                  Store Menu & Specialties
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium">
                  Fresh dishes and beverages from {store.name}
                </Text>
              </View>
              <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                <Text className="text-[10px] font-black text-[#EA5410]">
                  {filteredDishes.length} Items
                </Text>
              </View>
            </View>

            {/* Category Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3 -mx-1"
              contentContainerStyle={{ paddingHorizontal: 4, gap: 6 }}
            >
              {menuCategories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${cat}`}
                    className={`px-3.5 py-1.5 rounded-full border ${
                      active
                        ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Responsive Menu Items Grid (2 columns on wide screens, 1 column on mobile) */}
            {filteredDishes.length > 0 ? (
              <View className={isWide ? "flex-row flex-wrap gap-3" : "gap-3"}>
                {filteredDishes.map((dish) => {
                  const qty = getItemQuantity(dish.id);
                  const isSingle = filteredDishes.length === 1;
                  return (
                    <View
                      key={dish.id}
                      style={isWide && !isSingle ? { width: "48.8%" } : { width: "100%" }}
                      className={`bg-white rounded-2xl border p-3.5 md:p-4 shadow-xs transition-all ${
                        qty > 0 ? "border-[#EA5410]/50 bg-orange-50/15" : "border-gray-200/80"
                      }`}
                    >
                      <View className="flex-row items-start gap-3.5">
                        {/* Appetizing Dish Thumbnail */}
                        <View className="relative shrink-0">
                          <Image
                            source={{
                              uri:
                                dish.imageUrl ||
                                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                            }}
                            style={{ width: 88, height: 88, borderRadius: 14 }}
                            className="bg-gray-100 shadow-2xs"
                            resizeMode="cover"
                          />
                          {dish.category ? (
                            <View className="absolute top-1.5 left-1.5 bg-black/65 backdrop-blur-md px-1.5 py-0.5 rounded-md">
                              <Text className="text-[9px] font-black text-white uppercase tracking-wider">
                                {dish.category}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Dish Details & Dedicated Actions */}
                        <View className="flex-1 justify-between min-h-[88px]">
                          <View>
                            <Text
                              className="text-sm md:text-base font-black text-gray-900 tracking-tight leading-snug"
                              numberOfLines={1}
                            >
                              {dish.name}
                            </Text>
                            <Text
                              className="text-xs text-gray-500 font-medium mt-1 leading-relaxed"
                              numberOfLines={2}
                            >
                              {dish.description ||
                                `${dish.category || "Specialty"} freshly prepared with authentic ingredients.`}
                            </Text>
                          </View>

                          {/* Dedicated Bottom Row: Price on Left, Stepper/Add on Right */}
                          <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                            <View className="flex-row items-baseline gap-1">
                              <Text className="text-base font-black text-[#EA5410]">
                                ₱{dish.price.toFixed(2)}
                              </Text>
                              <Text className="text-[10px] font-medium text-gray-400">
                                / serving
                              </Text>
                            </View>

                            {/* Stepper / Add Controls */}
                            <View className="shrink-0">
                              {qty > 0 ? (
                                <View className="flex-row items-center bg-orange-50 border border-orange-200 rounded-xl p-0.5 shadow-2xs">
                                  <Pressable
                                    onPress={() => updateQuantity(dish.id, qty - 1)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove one ${dish.name}`}
                                    className="w-7 h-7 items-center justify-center rounded-lg bg-white shadow-2xs active:bg-orange-100"
                                  >
                                    <Ionicons name={qty === 1 ? "trash-outline" : "remove"} size={13} color="#EA5410" />
                                  </Pressable>
                                  <Text className="px-2.5 text-xs font-black text-[#EA5410]">{qty}</Text>
                                  <Pressable
                                    onPress={() => addItem(dish, 1)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Add another ${dish.name}`}
                                    className="w-7 h-7 items-center justify-center rounded-lg bg-[#EA5410] active:opacity-90"
                                  >
                                    <Ionicons name="add" size={13} color="white" />
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  onPress={() => handleQuickAddDish(dish)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Add ${dish.name} to basket`}
                                  className="px-3.5 py-1.5 bg-[#EA5410] rounded-xl flex-row items-center gap-1 shadow-xs active:opacity-90"
                                >
                                  <Ionicons name="add" size={14} color="white" />
                                  <Text className="text-xs font-black text-white">Add</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-white rounded-2xl border border-gray-200 p-6 items-center">
                <Ionicons name="restaurant-outline" size={28} color="#9CA3AF" />
                <Text className="text-xs font-bold text-gray-700 mt-2">
                  No items listed under {selectedCategory}
                </Text>
                <Pressable
                  onPress={() => setSelectedCategory("All")}
                  className="mt-2.5 px-3 py-1 bg-gray-100 rounded-lg"
                >
                  <Text className="text-[11px] font-bold text-gray-700">View All Items</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* 6. CUSTOMER REVIEWS & RATINGS */}
          <View className="mx-3.5 mb-4 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[11px] font-black text-gray-900 uppercase tracking-wider">
                Customer Ratings & Feedback
              </Text>
              <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                <Ionicons name="star" size={11} color="#D97706" />
                <Text className="text-[11px] font-black text-amber-900">
                  {detailedRatings?.averageRating || store.rating}
                </Text>
              </View>
            </View>

            {detailedRatings ? (
              <Text className="text-xs text-gray-600 font-medium mb-3">
                {detailedRatings.positivePercentage}% positive sentiment across {detailedRatings.totalReviews} verified foodie orders.
              </Text>
            ) : (
              <Text className="text-xs text-gray-600 font-medium mb-3">
                100% recommended dining spot by Mati locals & visitors.
              </Text>
            )}

            {reviews.length > 0 ? (
              <View className="gap-2 pt-2 border-t border-gray-100">
                {reviews.slice(0, 3).map((rev) => (
                  <View key={rev.id} className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs font-bold text-gray-900">{rev.customerName}</Text>
                      <View className="flex-row items-center gap-0.5">
                        <Ionicons name="star" size={10} color="#D97706" />
                        <Text className="text-[10px] font-bold text-amber-900">{rev.foodRating}</Text>
                      </View>
                    </View>
                    {rev.reviewText ? (
                      <Text className="text-[11px] text-gray-600 italic leading-snug">
                        "{rev.reviewText}"
                      </Text>
                    ) : (
                      <Text className="text-[10px] text-gray-400">Rated {rev.foodRating} stars for food quality.</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-[11px] text-gray-400 italic">
                No customer text reviews yet. Be the first to order and review {store.name}!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 7. DISH CUSTOMIZATION MODAL (When dish has modifiers) */}
      <Modal
        visible={Boolean(customizingDish)}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomizingDish(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-xl">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-black text-gray-900">
                Customize {customizingDish?.name}
              </Text>
              <Pressable
                onPress={() => setCustomizingDish(null)}
                className="w-6 h-6 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={14} color="#4B5563" />
              </Pressable>
            </View>

            <Text className="text-xs text-gray-500 mb-3">
              Tailor your spice level and delicious add-ons before ordering.
            </Text>

            {/* Spice Options */}
            <Text className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1.5">
              Spice Level
            </Text>
            <View className="flex-row gap-1.5 mb-3">
              {["Mild", "Regular", "Extra Spicy (+₱10)"].map((spice) => {
                const isSelected = selectedSpice === spice;
                return (
                  <Pressable
                    key={spice}
                    onPress={() => setSelectedSpice(spice)}
                    className={`flex-1 py-1.5 rounded-xl border items-center ${
                      isSelected ? "bg-orange-50 border-[#EA5410]" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isSelected ? "text-[#EA5410]" : "text-gray-700"
                      }`}
                    >
                      {spice}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Add-on Options */}
            <Text className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1.5">
              Add-ons & Sides
            </Text>
            <View className="gap-1.5 mb-4">
              {["None", "Extra Rice (+₱15)", "Sunny Side Egg (+₱20)"].map((addon) => {
                const isSelected = selectedAddon === addon;
                return (
                  <Pressable
                    key={addon}
                    onPress={() => setSelectedAddon(addon)}
                    className={`py-2 px-3 rounded-xl border flex-row items-center justify-between ${
                      isSelected ? "bg-orange-50 border-[#EA5410]" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? "text-[#EA5410]" : "text-gray-700"
                      }`}
                    >
                      {addon}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={14} color="#EA5410" />}
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => handleConfirmCustomize(false)}
                className="flex-1 py-2.5 bg-gray-100 border border-gray-200 rounded-xl items-center"
              >
                <Text className="text-xs font-bold text-gray-800">Add to Basket</Text>
              </Pressable>
              <Pressable
                onPress={() => handleConfirmCustomize(true)}
                className="flex-1 py-2.5 bg-[#EA5410] rounded-xl items-center shadow-xs"
              >
                <Text className="text-xs font-black text-white">Order Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 8. STICKY FLOATING CART BAR */}
      <FloatingCartBar
        onPress={() => setShowCheckoutSheet(true)}
        bottomOffset={Platform.OS === "ios" ? 30 : 20}
      />

      {/* 9. TABLE RESERVATION SHEET */}
      <ReservationSheet
        visible={showReservationSheet}
        onClose={() => setShowReservationSheet(false)}
        initialRestaurant={store.name}
        restaurants={store ? { [store.name]: store as RestaurantProfile } : MATI_RESTAURANTS_DATA}
        onConfirmReservation={handleConfirmReservation}
      />

      {/* 10. DISH CHECKOUT SHEET */}
      <CheckoutSheet
        visible={showCheckoutSheet}
        onClose={() => setShowCheckoutSheet(false)}
        dish={checkoutDish}
        barangays={MATI_BARANGAYS}
        onConfirmOrder={handlePlaceOrder}
      />

      {/* 11. GUEST GATE MODAL */}
      <GuestGateModal
        visible={showGuestGate}
        onClose={() => setShowGuestGate(false)}
        actionDescription={guestGateAction}
        onQuickSignIn={() => {
          setShowGuestGate(false);
          router.push("/(mobile)/auth/customer-login");
        }}
        onNavigateToAuth={() => {
          setShowGuestGate(false);
          router.push("/(mobile)/auth/customer-register");
        }}
      />
    </SafeAreaView>
  );
}
