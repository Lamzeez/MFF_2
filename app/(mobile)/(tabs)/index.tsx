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
import { CheckoutSheet } from "../../../components/checkout/CheckoutSheet";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { RestaurantProfileSheet } from "../../../components/restaurant/RestaurantProfileSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import { StoreQrScannerModal } from "../../../components/qr/StoreQrScannerModal";

export default function MobileHomeScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Open Restaurant Profile
  const handleOpenRestaurant = (restaurantName: string) => {
    const resto = matiRestaurantsData[restaurantName] || {
      name: restaurantName,
      category: "Local Mati Restaurant",
      rating: "4.8",
      address: "Mati City, Davao Oriental",
      phone: "+63 900 000 0000",
      hours: "8:00 AM - 9:00 PM Daily",
      availableTables: 4,
      emoji: "🏪",
      description: "Authentic food establishment in Mati City serving local specialties.",
      deliveryFee: 35,
      deliveryTime: "20-30 min",
      reviews: 95,
      bgColor: "#FED7AA",
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
    };
    setActiveRestaurant(resto);
    setShowRestaurantModal(true);
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
  const handlePlaceOrderFromSheet = async (orderPayload: {
    dish: FoodItem;
    qty: number;
    barangay: string;
    address: string;
    notes: string;
    fulfillment: "delivery" | "pickup";
    total: number;
  }) => {
    // Resolve store ID from dish or store name
    let storeId = orderPayload.dish.storeId;
    if (!storeId) {
      const match = Object.values(restaurants).find(
        (r: any) =>
          r.name === orderPayload.dish.store ||
          (r.id && r.name.toLowerCase().includes((orderPayload.dish.store || "").toLowerCase()))
      ) as any;
      storeId = match?.id || "11111111-1111-1111-1111-111111111111"; // Fallback to Mama Letty's Karenderia
    }

    try {
      const createdOrder = await createOrder({
        storeId: storeId || "11111111-1111-1111-1111-111111111111",
        items: [
          {
            menuItemId: orderPayload.dish.menuItemId,
            name: orderPayload.dish.name,
            price: orderPayload.dish.price,
            quantity: orderPayload.qty,
          },
        ],
        fulfillmentType: orderPayload.fulfillment,
        paymentMethod: "cod",
        deliveryAddress: orderPayload.address || "Mati City",
        barangay: orderPayload.barangay,
        notes: orderPayload.notes,
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
    const matchesCat =
      selectedCategory === "All" ||
      r.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesQuery =
      searchQuery === "" ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Trending dishes list
  const trendingDishes = foodItems.filter((d) => d.available);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* 1. TOP APP BAR: Brand, Delivery Location, Quick Auth / Profile */}
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between bg-white border-b border-gray-100">
        <View className="flex-1 mr-3">
          <Text className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
            DELIVER TO
          </Text>
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)/map")}
            className="flex-row items-center gap-1.5 mt-0.5"
          >
            <Ionicons name="location-sharp" size={16} color="#EA5410" />
            <Text className="text-sm font-black text-gray-900 tracking-tight" numberOfLines={1}>
              Mati City, Davao Oriental
            </Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </Pressable>
        </View>

        {/* Right Action Icons */}
        <View className="flex-row items-center gap-2">
          {/* QR Scan Button */}
          <Pressable
            accessibilityLabel="Scan Store QR Code"
            onPress={handleOpenScanner}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 items-center justify-center active:bg-gray-100"
          >
            <Ionicons name="qr-code-outline" size={17} color="#374151" />
          </Pressable>

          {/* If Logged In: Notifications Bell */}
          {isLoggedIn ? (
            <Pressable
              accessibilityLabel="View Notifications"
              onPress={() => setShowNotificationsModal(true)}
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 items-center justify-center relative active:bg-gray-100"
            >
              <Ionicons name="notifications-outline" size={17} color="#374151" />
              {displayUnreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-600 rounded-full min-w-[17px] h-[17px] items-center justify-center px-1 border-2 border-white">
                  <Text className="text-white text-[9px] font-black">{displayUnreadCount}</Text>
                </View>
              )}
            </Pressable>
          ) : (
            /* If Guest: Prominent One-Tap Sign In Pill */
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-login")}
              className="bg-[#EA5410] px-3.5 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm active:opacity-90"
            >
              <Ionicons name="log-in-outline" size={14} color="white" />
              <Text className="text-white text-xs font-black">Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 110 }}
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
        {/* 2. GUEST WELCOME BANNER OR REGISTERED USER GREETING */}
        {!isLoggedIn ? (
          <View className="mx-4 mt-3 p-4 bg-gradient-to-r bg-orange-50 border border-orange-200 rounded-2xl">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={15} color="#EA5410" />
                <Text className="text-sm font-black text-gray-900">
                  Welcome to Mati FoodFinder! 👋
                </Text>
              </View>
              <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-black text-[#EA5410]">GUEST MODE</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600 leading-relaxed mb-3">
              Explore authentic local menus and secret food spots freely. Sign in when you're ready to order COD or book dining tables.
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/(mobile)/auth/customer-login")}
                className="flex-1 py-2.5 bg-[#EA5410] rounded-xl items-center shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Create Account / Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/map")}
                className="py-2.5 px-3 bg-white border border-gray-200 rounded-xl items-center active:bg-gray-50"
              >
                <Text className="text-gray-700 font-bold text-xs">Explore Map 🗺️</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mx-4 mt-3 mb-1">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {new Date().getHours() < 12 ? "Maayong Buntag" : new Date().getHours() < 18 ? "Maayong Hapon" : "Maayong Gabii"}
            </Text>
            <Text className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
              Hello, {user?.name?.split(" ")[0] || "Foodie"}! 👋
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              What are you craving today in Mati City?
            </Text>
          </View>
        )}

        {/* 3. ACTIVE ORDER BANNER (Only when registered and order exists - clean in-line, no overlapping floating pill!) */}
        {isLoggedIn && liveOrders && liveOrders.length > 0 && (
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)/orders")}
            className="mx-4 mt-3 bg-gray-900 rounded-2xl p-3.5 flex-row items-center justify-between shadow-md active:opacity-95"
          >
            <View className="flex-row items-center gap-3 flex-1 mr-3">
              <View className="w-10 h-10 rounded-full bg-[#EA5410] items-center justify-center">
                <Ionicons name="bicycle" size={20} color="white" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
                    Order In Progress
                  </Text>
                  <Text className="text-[11px] text-gray-400">· {liveOrders[0].orderNumber}</Text>
                </View>
                <Text className="text-xs font-bold text-white mt-0.5" numberOfLines={1}>
                  {liveOrders[0].storeName}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl">
              <Text className="text-xs font-bold text-white">Track</Text>
              <Ionicons name="arrow-forward" size={12} color="white" />
            </View>
          </Pressable>
        )}

        {/* 4. SEARCH BAR */}
        <View className="px-4 mt-3 mb-3">
          <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 shadow-sm">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              placeholder='Search "humba", "seafood", "karenderia"...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-sm text-gray-900 ml-2.5 font-medium"
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 5. CATEGORY FILTER CHIPS */}
        <View className="mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {categories.map((c) => {
              const active = selectedCategory === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setSelectedCategory(c)}
                  className={`mr-2 px-4 py-2 rounded-full border ${
                    active
                      ? "bg-gray-900 border-gray-900 shadow-sm"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
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

        {/* 6. POPULAR NEAR YOU (High-Quality Foodie Restaurant Cards) */}
        <View className="mb-5">
          <View className="px-4 pb-2.5 flex-row items-baseline justify-between">
            <View>
              <Text className="text-lg font-black text-gray-900 tracking-tight">
                Popular near you
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Top rated dining spots across Mati City
              </Text>
            </View>
            <Pressable onPress={() => setSelectedCategory("All")}>
              <Text className="text-xs font-bold text-[#EA5410]">
                See all
              </Text>
            </Pressable>
          </View>

          <View className="px-4 gap-4">
            {restaurantList.map((resto) => (
              <Pressable
                key={resto.name}
                onPress={() => handleOpenRestaurant(resto.name)}
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm active:scale-[0.99] transition-transform"
              >
                {/* Hero Food Photography Banner */}
                <View className="h-44 w-full relative bg-gray-100">
                  <Image
                    source={{ uri: resto.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80" }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Gradient / Dark overlay on top for badge readability */}
                  <View className="absolute inset-0 bg-black/15" />

                  {/* Top Badges */}
                  <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
                    <View className="bg-white/95 px-2.5 py-1 rounded-full shadow-sm flex-row items-center gap-1">
                      <Ionicons name="bicycle" size={12} color="#EA5410" />
                      <Text className="text-[10px] font-black text-gray-900">
                        {resto.promo || "Fast Mati delivery"}
                      </Text>
                    </View>

                    <View className="bg-emerald-600/95 px-2.5 py-1 rounded-full shadow-sm flex-row items-center gap-1">
                      <Ionicons name="restaurant-outline" size={11} color="white" />
                      <Text className="text-[10px] font-black text-white">
                        {resto.availableTables} tables open
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card Content & Details */}
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-base font-black text-gray-900 flex-1 mr-2 tracking-tight" numberOfLines={1}>
                      {resto.name}
                    </Text>
                    <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Ionicons name="star" size={12} color="#D97706" />
                      <Text className="text-xs font-black text-amber-900">
                        {resto.rating}
                      </Text>
                      <Text className="text-[10px] text-amber-700 font-semibold">
                        ({resto.reviews || 84})
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-gray-500 font-medium mb-3" numberOfLines={1}>
                    {resto.category} · {resto.address.split(",")[0]}
                  </Text>

                  {/* Clean Metadata Pills */}
                  <View className="flex-row items-center gap-3 pt-2.5 border-t border-gray-100">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text className="text-xs font-bold text-gray-700">
                        {resto.deliveryTime || "20-30 min"}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="bicycle-outline" size={14} color="#6B7280" />
                      <Text className="text-xs font-bold text-gray-700">
                        ₱{resto.deliveryFee || 35} fee
                      </Text>
                    </View>
                    <View className="ml-auto flex-row items-center gap-1">
                      <Ionicons name="checkmark-circle" size={13} color="#047857" />
                      <Text className="text-[11px] font-bold text-emerald-800">
                        Verified
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 7. TRENDING DISHES (Horizontal Food Carousel) */}
        <View className="mb-4">
          <View className="px-4 pb-2.5">
            <Text className="text-lg font-black text-gray-900 tracking-tight">
              Trending dishes
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Popular orders enjoyed by Mati foodies today
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {trendingDishes.map((dish) => (
              <Pressable
                key={dish.id}
                onPress={() => handleOpenCheckout(dish)}
                className="w-44 mr-3.5 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
              >
                <View className="h-28 w-full bg-gray-100 relative">
                  <Image
                    source={{ uri: dish.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80" }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full shadow-xs">
                    <Text className="text-[10px] font-bold text-gray-800">★ {dish.rating}</Text>
                  </View>
                </View>

                <View className="p-3">
                  <Text
                    className="text-xs font-extrabold text-gray-900 leading-tight"
                    numberOfLines={1}
                  >
                    {dish.name}
                  </Text>
                  <Text
                    className="text-[11px] text-gray-500 mt-0.5"
                    numberOfLines={1}
                  >
                    {dish.store}
                  </Text>
                  <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <Text className="text-sm font-black text-[#EA5410]">
                      ₱{dish.price.toFixed(2)}
                    </Text>
                    <View className="w-6 h-6 rounded-full bg-orange-50 items-center justify-center border border-orange-200">
                      <Ionicons name="add" size={14} color="#EA5410" />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
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
    </SafeAreaView>
  );
}
