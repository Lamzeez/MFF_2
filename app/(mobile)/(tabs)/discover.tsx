import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RestaurantProfile, FoodItem } from "../../../types/restaurant";
import { CATEGORIES, MATI_RESTAURANTS_DATA } from "../../../mock/restaurants";
import { MATI_BARANGAYS } from "../../../mock/barangays";
import { FOOD_ITEMS } from "../../../mock/dishes";
import { fetchLiveStores, fetchLiveMenuItems } from "../../../services/catalog";
import { createOrder, fetchCustomerOrders, subscribeToOrders, LiveOrder } from "../../../services/orders";
import { createReservation as createBackendReservation } from "../../../services/reservations";
import {
  fetchNotifications,
  markAllNotificationsRead as markAllBackendNotificationsRead,
  subscribeToNotifications,
  NotificationRow,
  AppNotification,
} from "../../../services/notifications";
import { recordStoreVisit } from "../../../services/visits";
import { NotificationsSheet } from "../../../components/notifications/NotificationsSheet";
import { CheckoutSheet, CheckoutConfirmedPayload } from "../../../components/checkout/CheckoutSheet";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { RestaurantProfileSheet } from "../../../components/restaurant/RestaurantProfileSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import { StoreQrScannerModal } from "../../../components/qr/StoreQrScannerModal";
import { FloatingCartBar } from "../../../components/cart/FloatingCartBar";

export default function MobileHomeScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const isTwoCol = windowWidth >= 768;

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  type QuickFilterOption = "all" | "open_now" | "fastest" | "top_rated" | "budget";
  const [quickFilter, setQuickFilter] = useState<QuickFilterOption>("all");

  useEffect(() => {
    setSelectedCategory(CATEGORIES.find((item) => item === category) ?? "All");
  }, [category]);

  // Modals visibility
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDish, setCheckoutDish] = useState<any>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationResto, setReservationResto] = useState("Mama Letty's Karenderia");
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [activeRestaurant, setActiveRestaurant] = useState<RestaurantProfile | null>(null);
  const [showScanQrModal, setShowScanQrModal] = useState(false);
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateAction, setGuestGateAction] = useState<string>("order food or reserve tables");

  const categories = CATEGORIES;
  const matiBarangays = MATI_BARANGAYS;
  const [restaurants, setRestaurants] = useState<Record<string, RestaurantProfile>>(MATI_RESTAURANTS_DATA);
  const [foodItems, setFoodItems] = useState<FoodItem[]>(FOOD_ITEMS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLiveCatalog = async () => {
    try {
      const [liveStores, liveMenu] = await Promise.all([
        fetchLiveStores(),
        fetchLiveMenuItems(),
      ]);
      if (liveStores.length > 0) {
        const storeMap: Record<string, RestaurantProfile> = {};
        Object.assign(storeMap, MATI_RESTAURANTS_DATA);
        for (const s of liveStores) {
          storeMap[s.name] = s;
        }
        setRestaurants(storeMap);
      }
      if (liveMenu.length > 0) {
        setFoodItems(liveMenu);
      }
    } catch (err) {
      console.warn("Live catalog fetch error:", err);
    }
  };

  const [liveNotifications, setLiveNotifications] = useState<NotificationRow[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);

  const activeOrderInProgress = liveOrders.find(
    (o) => !["delivered", "cancelled"].includes(o.status)
  );

  const loadNotificationsData = async () => {
    try {
      const data = await fetchNotifications();
      setLiveNotifications(data);
    } catch (err) {
      console.warn("Could not load notifications:", err);
    }
  };

  const loadOrdersData = async () => {
    try {
      const data = await fetchCustomerOrders();
      setLiveOrders(data);
    } catch (err) {
      console.warn("Could not load customer orders:", err);
    }
  };

  useEffect(() => {
    loadLiveCatalog();
  }, []);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadNotificationsData();
      const unsub = subscribeToNotifications(user.id, loadNotificationsData);
      return () => unsub();
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (isLoggedIn) {
      loadOrdersData();
      const unsub = subscribeToOrders(null, loadOrdersData);
      return () => unsub();
    } else {
      setLiveOrders([]);
    }
  }, [isLoggedIn]);

  const displayNotifications: AppNotification[] = liveNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isRead: n.is_read,
    type: (n.type as any) || "system",
  }));

  const displayUnreadCount = liveNotifications.filter((n) => !n.is_read).length;

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllBackendNotificationsRead();
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn("Failed to mark all notifications read:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadLiveCatalog(), loadNotificationsData(), loadOrdersData()]);
    setIsRefreshing(false);
  };

  const matiRestaurantsData = restaurants;

  // Handle Guest Gate Check
  const verifyRegisteredUser = (actionDescription: string): boolean => {
    if (!isLoggedIn) {
      setGuestGateAction(actionDescription);
      setShowGuestGateModal(true);
      return false;
    }
    return true;
  };

  // Open Dedicated Store Profile Page
  const handleOpenRestaurant = (restaurantName: string) => {
    const resto = matiRestaurantsData[restaurantName];
    const targetId = resto?.id || (resto as any)?.slug || encodeURIComponent(restaurantName);
    router.push({
      pathname: "/(mobile)/store/[id]",
      params: { id: targetId, name: restaurantName },
    });
  };

  // Open Table Reservation Sheet
  const handleOpenReservation = (restaurantName?: string) => {
    if (!verifyRegisteredUser("book dining tables")) return;
    if (restaurantName) {
      setReservationResto(restaurantName);
    }
    setShowRestaurantModal(false);
    setShowReservationModal(true);
  };

  // Submit Table Reservation from Sheet
  const handleConfirmReservationFromSheet = async (data: {
    restaurantName: string;
    partySize: number;
    date: string;
    time: string;
    seatingPreference: string;
    specialNotes?: string;
  }) => {
    // Resolve store ID from restaurants
    const match = Object.values(restaurants).find(
      (r: any) =>
        r.name === data.restaurantName ||
        (r.id && r.name.toLowerCase().includes((data.restaurantName || "").toLowerCase()))
    ) as any;
    const storeId = match?.id || "11111111-1111-1111-1111-111111111111";

    try {
      await createBackendReservation({
        storeId,
        partySize: data.partySize,
        reservationDate: data.date,
        reservationTime: data.time,
        seatingPreference: data.seatingPreference,
        specialNotes: data.specialNotes,
      });

      setShowReservationModal(false);

      Alert.alert(
        "Table Reservation Submitted! 📅",
        `Your reservation for ${data.partySize} at ${data.restaurantName} on ${data.date} (${data.time}) is waiting for store confirmation. You will be notified in the Orders tab.`,
        [{ text: "Great!" }]
      );
    } catch (err: any) {
      Alert.alert("Reservation Error", err.message || "Failed to submit reservation");
    }
  };

  // Open Checkout Modal for a Dish
  const handleOpenCheckout = (dish: FoodItem) => {
    if (!verifyRegisteredUser("order food with Cash on Delivery")) return;
    setCheckoutDish(dish);
    setShowCheckoutModal(true);
  };

  // Submit Order from Checkout Sheet
  const handlePlaceOrderFromSheet = async (orderPayload: CheckoutConfirmedPayload) => {
    // Resolve store ID from storeId, dish, or storeName
    let targetStoreId = orderPayload.storeId || orderPayload.dish?.storeId;
    const targetStoreName = orderPayload.storeName || orderPayload.dish?.store || "";
    if (!targetStoreId) {
      const match = Object.values(restaurants).find(
        (r: any) =>
          r.name === targetStoreName ||
          (r.id && r.name.toLowerCase().includes(targetStoreName.toLowerCase()))
      ) as any;
      targetStoreId = match?.id || "11111111-1111-1111-1111-111111111111"; // Fallback to Mama Letty's Karenderia
    }

    const itemsToOrder =
      orderPayload.items && orderPayload.items.length > 0
        ? orderPayload.items
        : [
            {
              menuItemId: orderPayload.dish?.menuItemId,
              name: orderPayload.dish?.name || "Mati Special",
              price: orderPayload.dish?.price || orderPayload.total,
              quantity: orderPayload.qty || 1,
            },
          ];

    try {
      const createdOrder = await createOrder({
        storeId: targetStoreId || "11111111-1111-1111-1111-111111111111",
        items: itemsToOrder,
        fulfillmentType: orderPayload.fulfillment,
        paymentMethod: "cod",
        deliveryAddress: orderPayload.address || "Mati City",
        barangay: orderPayload.barangay,
        notes: orderPayload.notes,
        voucherCode: orderPayload.voucherCode,
        voucherId: orderPayload.voucherId,
        discount: orderPayload.discount,
      });

      setShowCheckoutModal(false);

      Alert.alert(
        "Order Placed Successfully! 🛵",
        `Order #${createdOrder.orderNumber} has been received! The kitchen is preparing your meal. Handshake PIN: ${createdOrder.handshakePin}.`,
        [
          { text: "View Orders", onPress: () => router.push("/(mobile)/(tabs)/orders") },
          { text: "Continue Browsing" },
        ]
      );
    } catch (err: any) {
      Alert.alert("Order Failed", err?.message || "Could not place order. Please try again.");
    }
  };

  // Open QR Scanner
  const handleOpenScanner = () => {
    if (!verifyRegisteredUser("check in at store counters")) return;
    setShowScanQrModal(true);
  };

  // QR Check-in completed
  const handlePerformCheckIn = async (storeName: string) => {
    const match = Object.values(restaurants).find(
      (r: any) =>
        r.name === storeName ||
        (r.id && r.name.toLowerCase().includes((storeName || "").toLowerCase()))
    ) as any;
    const storeId = match?.id || "11111111-1111-1111-1111-111111111111";

    try {
      await recordStoreVisit(storeId, "qr_scan");
      loadNotificationsData();
      setShowScanQrModal(false);

      Alert.alert(
        "In-Store Check-in Confirmed! 📍",
        `You checked in at ${storeName}! In-store visit recorded to your profile. Ranked in your Most Visited Places!`,
        [{ text: "Awesome!" }]
      );
    } catch (err: any) {
      Alert.alert("Check-in Error", err?.message || "Could not record check-in.");
    }
  };

  // Filtered restaurants for display
  const restaurantList = Object.values(matiRestaurantsData).filter((r) => {
    const targetCat = selectedCategory.toLowerCase().trim().replace(/s$/, "");
    const storeHasMenuInCat = foodItems.some(
      (dish) =>
        (dish.store?.toLowerCase() === r.name.toLowerCase() ||
          (dish.storeId &&
            (dish.storeId === (r as any).id || dish.storeId === (r as any).storeId))) &&
        (dish.category?.toLowerCase().trim().replace(/s$/, "") === targetCat ||
          dish.category?.toLowerCase().includes(targetCat) ||
          targetCat.includes(dish.category?.toLowerCase() || ""))
    );

    const matchesCat =
      selectedCategory === "All" ||
      storeHasMenuInCat ||
      Boolean(
        r.categories?.some((cat) => {
          const clean = cat.toLowerCase().trim().replace(/s$/, "");
          return clean === targetCat || clean.includes(targetCat) || targetCat.includes(clean);
        })
      ) ||
      r.category.toLowerCase().replace(/s$/, "").includes(targetCat) ||
      targetCat.includes(r.category.toLowerCase().replace(/s$/, "")) ||
      r.name.toLowerCase().includes(targetCat);

    const matchesQuery =
      searchQuery === "" ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Boolean(
        r.categories?.some((cat) =>
          cat.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );

    let matchesQuick = true;
    if (quickFilter === "open_now") {
      matchesQuick = r.isOpen !== false;
    } else if (quickFilter === "fastest") {
      const minutes = parseInt(r.deliveryTime || "30", 10);
      matchesQuick = !isNaN(minutes) && minutes <= 25;
    } else if (quickFilter === "top_rated") {
      matchesQuick = parseFloat(r.rating || "0") >= 4.8;
    } else if (quickFilter === "budget") {
      matchesQuick = (r.deliveryFee || 35) <= 35;
    }

    return matchesCat && matchesQuery && matchesQuick;
  });

  // Trending dishes list
  const trendingDishes = foodItems
    .filter((d) => d.available)
    .filter((d) => {
      if (selectedCategory !== "All") {
        const target = selectedCategory.toLowerCase().trim().replace(/s$/, "");
        const dCat = (d.category || "").toLowerCase().trim().replace(/s$/, "");
        const dName = (d.name || "").toLowerCase().trim();
        const dStore = (d.store || "").toLowerCase().trim();
        const matches =
          dCat === target ||
          dCat.includes(target) ||
          target.includes(dCat) ||
          dName.includes(target) ||
          dStore.includes(target);
        if (!matches) return false;
      }
      if (quickFilter === "budget") return d.price <= 100;
      if (quickFilter === "top_rated") return parseFloat(String(d.rating || "0")) >= 4.8;
      return true;
    });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* 1. TOP APP BAR: Brand, Delivery Location, Quick Auth / Profile */}
      <View className="px-3.5 pt-1.5 pb-2.5 bg-white border-b border-gray-100">
        <View className="w-full max-w-5xl self-center flex-row items-center justify-between">
          <View className="flex-1 mr-2.5 min-w-0">
            <Text className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
              DELIVER TO
            </Text>
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/map")}
              className="flex-row items-center gap-1 mt-0.5"
            >
              <Ionicons name="location-sharp" size={14} color="#EA5410" />
              <Text className="text-xs font-black text-gray-900 tracking-tight flex-shrink" numberOfLines={1}>
                Mati City, Davao Oriental
              </Text>
              <Ionicons name="chevron-down" size={12} color="#6B7280" />
            </Pressable>
          </View>

          {/* Right Action Icons */}
          <View className="flex-row items-center gap-1.5 shrink-0">
            {/* QR Scan Button */}
            <Pressable
              accessibilityLabel="Scan Store QR Code"
              onPress={handleOpenScanner}
              className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 items-center justify-center active:bg-gray-100"
            >
              <Ionicons name="qr-code-outline" size={15} color="#374151" />
            </Pressable>

            {/* If Logged In: Notifications Bell */}
            {isLoggedIn ? (
              <Pressable
                accessibilityLabel="View Notifications"
                onPress={() => setShowNotificationsModal(true)}
                className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 items-center justify-center relative active:bg-gray-100"
              >
                <Ionicons name="notifications-outline" size={15} color="#374151" />
                {displayUnreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-red-600 rounded-full min-w-[15px] h-[15px] items-center justify-center px-1 border border-white">
                    <Text className="text-white text-[8px] font-black">{displayUnreadCount}</Text>
                  </View>
                )}
              </Pressable>
            ) : (
              /* If Guest: Prominent One-Tap Sign In Pill */
              <Pressable
                onPress={() => router.push("/(mobile)/auth/customer-login")}
                className="bg-[#EA5410] px-3 py-1 rounded-full flex-row items-center gap-1 shadow-xs active:opacity-90"
              >
                <Ionicons name="log-in-outline" size={13} color="white" />
                <Text className="text-white text-[11px] font-black">Sign In</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#EA5410"
            colors={["#EA5410"]}
          />
        }
      >
        <View className="w-full max-w-5xl self-center">
        {/* 2. GUEST WELCOME BANNER OR REGISTERED USER GREETING */}
        {!isLoggedIn ? (
          <View className="mx-3.5 mt-2.5 p-3.5 bg-orange-50 border border-orange-200 rounded-xl">
            <View className="flex-row items-center justify-between flex-wrap gap-1.5 mb-1">
              <View className="flex-row items-center gap-1.5 flex-1 min-w-[160px]">
                <Ionicons name="sparkles" size={13} color="#EA5410" />
                <Text className="text-xs font-black text-gray-900">
                  Welcome to Mati FoodFinder! 👋
                </Text>
              </View>
              <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-[#EA5410]">GUEST MODE</Text>
              </View>
            </View>
            <Text className="text-[11px] text-gray-600 leading-snug mb-2.5">
              Explore authentic local menus and secret food spots freely. Sign in when you're ready to order COD or book dining tables.
            </Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={() => router.push("/(mobile)/auth/customer-login")}
                className="flex-1 min-w-[140px] py-2 px-3 bg-[#EA5410] rounded-lg items-center shadow-xs active:opacity-90"
              >
                <Text className="text-white font-extrabold text-[11px]">Create Account / Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/map")}
                className="py-2 px-3 bg-white border border-gray-200 rounded-lg items-center active:bg-gray-50"
              >
                <Text className="text-gray-700 font-bold text-[11px]">Explore Map 🗺️</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mx-3.5 mt-2.5 mb-0.5">
            <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {new Date().getHours() < 12 ? "Maayong Buntag" : new Date().getHours() < 18 ? "Maayong Hapon" : "Maayong Gabii"}
            </Text>
            <Text className="text-base font-black text-gray-900 tracking-tight mt-0.5">
              Hello, {user?.name?.split(" ")[0] || "Foodie"}! 👋
            </Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">
              What are you craving today in Mati City?
            </Text>
          </View>
        )}

        {/* 3. ACTIVE ORDER BANNER (Only when registered, order is genuinely in progress, and not dismissed) */}
        {isLoggedIn && activeOrderInProgress && !dismissedOrderIds.includes(activeOrderInProgress.id) && (
          <View className="mx-3.5 mt-2.5 relative">
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/orders")}
              className="bg-gray-900 rounded-xl p-3 flex-row items-center justify-between shadow-xs active:opacity-95"
            >
              <View className="flex-row items-center gap-2.5 flex-1 mr-2.5">
                <View className="w-8 h-8 rounded-full bg-[#EA5410] items-center justify-center">
                  <Ionicons name="bicycle" size={17} color="white" />
                </View>
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                      {activeOrderInProgress.status === "out_for_delivery"
                        ? "Out for Delivery"
                        : activeOrderInProgress.status === "ready_for_pickup"
                        ? "Ready for Pickup"
                        : activeOrderInProgress.status === "preparing"
                        ? "Preparing in Kitchen"
                        : "Order In Progress"}
                    </Text>
                    <Text className="text-[10px] text-gray-400">· {activeOrderInProgress.orderNumber}</Text>
                  </View>
                  <Text className="text-[11px] font-bold text-white mt-0.5" numberOfLines={1}>
                    {activeOrderInProgress.storeName}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="flex-row items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Text className="text-[11px] font-bold text-white">Track</Text>
                  <Ionicons name="arrow-forward" size={11} color="white" />
                </View>
                <Pressable
                  accessibilityLabel="Dismiss active order banner"
                  onPress={(e) => {
                    e.stopPropagation();
                    setDismissedOrderIds((prev) => [...prev, activeOrderInProgress.id]);
                  }}
                  className="w-6 h-6 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
                >
                  <Ionicons name="close" size={13} color="#D1D5DB" />
                </Pressable>
              </View>
            </Pressable>
          </View>
        )}

        {/* 4. SEARCH BAR */}
        <View className="px-3.5 mt-2.5 mb-2.5">
          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xs">
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              placeholder='Search "humba", "seafood", "karenderia"...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-xs text-gray-900 ml-2 font-medium"
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 5. CATEGORY FILTER CHIPS */}
        <View className="mb-2.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14 }}
          >
            {categories.map((c) => {
              const active = selectedCategory === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setSelectedCategory(c)}
                  className={`mr-1.5 px-3 py-1.5 rounded-full border ${
                    active
                      ? "bg-gray-900 border-gray-900 shadow-xs"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      active ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 5b. QUICK FILTERS BAR (Pillar 3: Open Now, Fastest, Top Rated, Budget) */}
        <View className="mb-3.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14 }}
          >
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={() => setQuickFilter("all")}
                className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${
                  quickFilter === "all"
                    ? "bg-[#EA5410] border-[#EA5410]"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    quickFilter === "all" ? "text-white" : "text-gray-700"
                  }`}
                >
                  All Spots
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setQuickFilter("open_now")}
                className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${
                  quickFilter === "open_now"
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Text
                  className={`text-[10px] font-bold ${
                    quickFilter === "open_now" ? "text-white" : "text-gray-700"
                  }`}
                >
                  Open Now
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setQuickFilter("fastest")}
                className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${
                  quickFilter === "fastest"
                    ? "bg-amber-600 border-amber-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Ionicons
                  name="flash"
                  size={10}
                  color={quickFilter === "fastest" ? "white" : "#D97706"}
                />
                <Text
                  className={`text-[10px] font-bold ${
                    quickFilter === "fastest" ? "text-white" : "text-gray-700"
                  }`}
                >
                  Fastest Delivery
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setQuickFilter("top_rated")}
                className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${
                  quickFilter === "top_rated"
                    ? "bg-amber-500 border-amber-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <Ionicons
                  name="star"
                  size={10}
                  color={quickFilter === "top_rated" ? "white" : "#D97706"}
                />
                <Text
                  className={`text-[10px] font-bold ${
                    quickFilter === "top_rated" ? "text-white" : "text-gray-700"
                  }`}
                >
                  Top Rated (4.8+)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setQuickFilter("budget")}
                className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${
                  quickFilter === "budget"
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    quickFilter === "budget" ? "text-white" : "text-gray-700"
                  }`}
                >
                  ₱ Budget Friendly
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* 6. POPULAR NEAR YOU (Proportionally Scaled Foodie Restaurant Cards) */}
        <View className="mb-4">
          <View className="px-3.5 pb-2 flex-row items-baseline justify-between">
            <View>
              <Text className="text-base font-black text-gray-900 tracking-tight">
                Popular near you
              </Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                Top rated dining spots across Mati City
              </Text>
            </View>
            <Pressable onPress={() => { setSelectedCategory("All"); setQuickFilter("all"); }}>
              <Text className="text-[11px] font-bold text-[#EA5410]">
                See all
              </Text>
            </Pressable>
          </View>

          <View className="px-3.5 flex-row flex-wrap gap-3">
            {restaurantList.map((resto) => (
              <Pressable
                key={resto.name}
                onPress={() => handleOpenRestaurant(resto.name)}
                style={isTwoCol ? { width: "48.8%" } : { width: "100%" }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs active:scale-[0.99] transition-transform"
              >
                {/* Hero Food Photography Banner (Explicit height & relative bounds prevent text overlap) */}
                <View
                  style={{ width: "100%", height: 144, position: "relative" }}
                  className="bg-gray-100 overflow-hidden"
                >
                  <Image
                    source={{
                      uri:
                        resto.imageUrl ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
                    }}
                    style={{ width: "100%", height: "100%" }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Gradient / Dark overlay on top for badge readability */}
                  <View className="absolute inset-0 bg-black/15" />

                  {/* Top Badges */}
                  <View className="absolute top-2.5 left-2.5 right-2.5 flex-row items-center justify-between gap-1.5">
                    <View className="bg-white/95 px-2 py-0.5 rounded-full shadow-xs flex-row items-center gap-1 max-w-[60%]">
                      <Ionicons name="bicycle" size={11} color="#EA5410" />
                      <Text className="text-[9px] font-black text-gray-900" numberOfLines={1}>
                        {resto.promo || "Fast Mati delivery"}
                      </Text>
                    </View>

                    <View className="bg-emerald-600/95 px-2 py-0.5 rounded-full shadow-xs flex-row items-center gap-1 shrink-0">
                      <Ionicons name="restaurant-outline" size={10} color="white" />
                      <Text className="text-[9px] font-black text-white">
                        {resto.availableTables} tables open
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card Content & Details (Scaled from p-4 to p-3) */}
                <View className="p-3">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-sm font-black text-gray-900 flex-1 mr-1.5 tracking-tight" numberOfLines={1}>
                      {resto.name}
                    </Text>
                    <View className="flex-row items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                      <Ionicons name="star" size={10} color="#D97706" />
                      <Text className="text-[11px] font-black text-amber-900">
                        {resto.rating}
                      </Text>
                      <Text className="text-[9px] text-amber-700 font-semibold">
                        ({resto.reviews || 84})
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[11px] text-gray-500 font-medium mb-2" numberOfLines={1}>
                    {resto.category} · {resto.address.split(",")[0]}
                  </Text>

                  {/* Clean Metadata Pills */}
                  <View className="flex-row items-center gap-2.5 pt-2 border-t border-gray-100">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={12} color="#6B7280" />
                      <Text className="text-[11px] font-bold text-gray-700">
                        {resto.deliveryTime || "20-30 min"}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="bicycle-outline" size={12} color="#6B7280" />
                      <Text className="text-[11px] font-bold text-gray-700">
                        ₱{resto.deliveryFee || 35} fee
                      </Text>
                    </View>
                    <View className="ml-auto flex-row items-center gap-1">
                      <Ionicons name="checkmark-circle" size={12} color="#047857" />
                      <Text className="text-[10px] font-bold text-emerald-800">
                        Verified
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 7. TRENDING DISHES (Proportionally Scaled Food Carousel) */}
        <View className="mb-3.5">
          <View className="px-3.5 pb-2">
            <Text className="text-base font-black text-gray-900 tracking-tight">
              Trending dishes
            </Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">
              Popular orders enjoyed by Mati foodies today
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14 }}
          >
            {trendingDishes.map((dish) => (
              <Pressable
                key={dish.id}
                onPress={() => handleOpenCheckout(dish)}
                className="w-36 mr-3 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs active:scale-[0.98] transition-transform"
              >
                <View
                  style={{ width: "100%", height: 96, position: "relative" }}
                  className="bg-gray-100 overflow-hidden"
                >
                  <Image
                    source={{
                      uri:
                        dish.imageUrl ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                    }}
                    style={{ width: "100%", height: "100%" }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute top-1.5 right-1.5 bg-white/90 px-1.5 py-0.5 rounded-md shadow-xs">
                    <Text className="text-[9px] font-bold text-gray-800">★ {dish.rating}</Text>
                  </View>
                </View>

                <View className="p-2.5">
                  <Text
                    className="text-xs font-black text-gray-900 leading-tight"
                    numberOfLines={1}
                  >
                    {dish.name}
                  </Text>
                  <Text
                    className="text-[10px] text-gray-500 mt-0.5"
                    numberOfLines={1}
                  >
                    {dish.store}
                  </Text>
                  <View className="flex-row items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                    <Text className="text-xs font-black text-[#EA5410]">
                      ₱{dish.price.toFixed(2)}
                    </Text>
                    <View className="w-5 h-5 rounded-full bg-orange-50 items-center justify-center border border-orange-200">
                      <Ionicons name="add" size={12} color="#EA5410" />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        </View>
      </ScrollView>

      {/* 8. MODALS & SHEETS */}
      <StoreQrScannerModal
        visible={showScanQrModal}
        onClose={() => setShowScanQrModal(false)}
        userName={user?.name || "Juan dela Cruz"}
        onPerformCheckIn={handlePerformCheckIn}
      />

      <NotificationsSheet
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={displayNotifications}
        onMarkAllRead={async () => {
          try {
            await markAllBackendNotificationsRead();
            await loadNotificationsData();
          } catch (e) {
            console.warn("Could not mark all notifications read:", e);
          }
        }}
        onSelectNotification={(notif) => {
          setShowNotificationsModal(false);
          if (notif.type === "order" || notif.type === "reservation") {
            router.push("/(mobile)/(tabs)/orders");
          } else if (notif.type === "community") {
            router.push("/(mobile)/(tabs)/community");
          }
        }}
      />

      <CheckoutSheet
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        dish={checkoutDish}
        barangays={matiBarangays}
        onConfirmOrder={handlePlaceOrderFromSheet}
      />

      <RestaurantProfileSheet
        visible={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
        restaurant={activeRestaurant}
        onBookTable={(restoName) => handleOpenReservation(restoName)}
        onViewMap={() => {
          setShowRestaurantModal(false);
          router.push("/(mobile)/(tabs)/map");
        }}
        menuItems={foodItems.filter(
          (f) =>
            activeRestaurant?.name &&
            (f.store.toLowerCase().includes(activeRestaurant.name.toLowerCase()) ||
              activeRestaurant.name.toLowerCase().includes(f.store.toLowerCase()))
        )}
        onSelectDish={(dish) => {
          setShowRestaurantModal(false);
          handleOpenCheckout(dish);
        }}
        onOpenBasket={() => {
          setShowRestaurantModal(false);
          setShowCheckoutModal(true);
        }}
      />

      <ReservationSheet
        visible={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        initialRestaurant={reservationResto}
        restaurants={matiRestaurantsData}
        onConfirmReservation={handleConfirmReservationFromSheet}
      />

      <GuestGateModal
        visible={showGuestGateModal}
        onClose={() => setShowGuestGateModal(false)}
        actionDescription={guestGateAction}
        onQuickSignIn={() => {
          router.push("/(mobile)/auth/customer-login");
          setShowGuestGateModal(false);
        }}
        onNavigateToAuth={() => {
          setShowGuestGateModal(false);
          router.push("/(mobile)/(tabs)/profile");
        }}
      />

      {/* Floating Bottom Basket Pill */}
      <FloatingCartBar onPress={() => setShowCheckoutModal(true)} />
    </SafeAreaView>
  );
}
