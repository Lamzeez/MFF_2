import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RestaurantProfile, FoodItem } from "../../../types/restaurant";
import { CATEGORIES, MATI_RESTAURANTS_DATA } from "../../../mock/restaurants";
import { MATI_BARANGAYS } from "../../../mock/barangays";
import { FOOD_ITEMS } from "../../../mock/dishes";
import { NotificationsSheet } from "../../../components/notifications/NotificationsSheet";
import { CheckoutSheet } from "../../../components/checkout/CheckoutSheet";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { RestaurantProfileSheet } from "../../../components/restaurant/RestaurantProfileSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import { StoreQrScannerModal } from "../../../components/qr/StoreQrScannerModal";

export default function MobileHomeScreen() {
  const {
    isLoggedIn,
    user,
    loginAsRegistered,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    createReservation,
    placeActiveOrder,
    personalizationEnabled,
    checkInToStore,
    mostVisitedStore,
    orders,
  } = useAuth();
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
  const matiRestaurantsData = MATI_RESTAURANTS_DATA;
  const foodItems = FOOD_ITEMS;

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
  const handleConfirmReservationFromSheet = (data: {
    restaurantName: string;
    partySize: number;
    date: string;
    time: string;
    seatingPreference: string;
    specialNotes: string;
  }) => {
    if (!verifyRegisteredUser("book dining tables")) return;

    createReservation({
      restaurantName: data.restaurantName,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
      specialNotes: data.specialNotes
        ? `${data.seatingPreference} • ${data.specialNotes}`
        : data.seatingPreference,
    });

    setShowReservationModal(false);

    Alert.alert(
      "Table Booking Requested! 📅",
      `Your reservation for ${data.partySize} at ${data.restaurantName} (${data.date} at ${data.time}) is confirmed!`,
      [
        { text: "Continue Browsing" },
        { text: "View in Bookings", onPress: () => router.push("/(mobile)/(tabs)/orders") },
      ]
    );
  };

  // Open COD Checkout Drawer
  const handleOpenCheckout = (dish: any) => {
    if (!verifyRegisteredUser("place Cash-on-Delivery orders")) return;
    setCheckoutDish(dish);
    setShowCheckoutModal(true);
  };

  // Confirm COD Order from Sheet
  const handlePlaceOrderFromSheet = (orderPayload: {
    dish: FoodItem;
    qty: number;
    barangay: string;
    address: string;
    notes: string;
    fulfillment: "delivery" | "pickup";
    total: number;
  }) => {
    if (!verifyRegisteredUser("place Cash-on-Delivery orders")) return;

    const subtotal = orderPayload.dish.price * orderPayload.qty;
    const deliveryFee = orderPayload.fulfillment === "delivery" ? 35 : 0;
    const total = subtotal + deliveryFee;

    const orderNumber = placeActiveOrder({
      restaurantName: orderPayload.dish.store,
      items: [
        {
          name: orderPayload.dish.name,
          quantity: orderPayload.qty,
          price: orderPayload.dish.price,
        },
      ],
      subtotal,
      deliveryFee,
      total,
      deliveryAddress: orderPayload.address.trim() || "Main Street, Central",
      barangay: orderPayload.barangay,
      notes: orderPayload.notes.trim() || undefined,
    });

    setShowCheckoutModal(false);

    Alert.alert(
      "Order Placed! 🛵",
      `Order ${orderNumber} from ${orderPayload.dish.store} has been placed via Cash-on-Delivery! Total COD to prepare: ₱${total.toFixed(2)}.`,
      [
        { text: "Done" },
        { text: "Track Order", onPress: () => router.push("/(mobile)/(tabs)/orders") },
      ]
    );
  };

  // Open QR Scanner
  const handleOpenScanner = () => {
    if (!isLoggedIn) {
      verifyRegisteredUser("scan in-store restaurant QR codes");
      return;
    }
    if (!personalizationEnabled) {
      Alert.alert(
        "Personalization Mode Paused ⚠️",
        "Please enable Personalization in your Profile to scan restaurant QR codes and track visits.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Profile", onPress: () => router.push("/(mobile)/(tabs)/profile") },
        ]
      );
      return;
    }
    setShowScanQrModal(true);
  };

  // Perform Store Stand Check-in
  const handlePerformCheckIn = (storeName: string) => {
    const visitCount = checkInToStore(storeName);
    setShowScanQrModal(false);

    Alert.alert(
      "In-Store Check-in Confirmed! 📍",
      `You checked in at ${storeName}! Total in-store visits: ${visitCount}. Ranked in your Most Visited Places!`,
      [{ text: "Awesome!" }]
    );
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

  // Filtered dishes for search or category
  const filteredDishes = foodItems.filter((dish) => {
    const matchesCat = selectedCategory === "All" || dish.category === selectedCategory;
    const matchesQuery =
      searchQuery === "" ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.store.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Trending dishes list
  const trendingDishes = foodItems.filter((d) => d.available);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F7]">
      {/* 1. APPBAR: Deliver to Mati City & Notifications */}
      <View className="px-4.5 pt-2.5 pb-2 flex-row items-center justify-between bg-[#F4F5F7]">
        <View className="flex-1">
          <Text className="text-[11px] font-semibold text-[#98A2B3] tracking-wider uppercase">
            DELIVER TO
          </Text>
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)/map")}
            className="flex-row items-center gap-1 mt-0.5"
          >
            <Ionicons name="location-sharp" size={15} color="#EA5410" />
            <Text className="text-[15px] font-black text-[#17191D]">
              Mati City
            </Text>
            <Ionicons name="chevron-down" size={13} color="#98A2B3" />
          </Pressable>
        </View>

        {/* Action icons */}
        <View className="flex-row items-center gap-2">
          {/* QR Scan Button */}
          <Pressable
            onPress={handleOpenScanner}
            className="w-10 h-10 rounded-full bg-white border border-[#E7EAEF] items-center justify-center shadow-sm"
          >
            <Ionicons name="qr-code-outline" size={18} color="#4B5563" />
          </Pressable>

          {/* Notifications Bell */}
          <Pressable
            onPress={() => {
              if (verifyRegisteredUser("view personal notifications")) {
                setShowNotificationsModal(true);
              }
            }}
            className="w-10 h-10 rounded-full bg-white border border-[#E7EAEF] items-center justify-center shadow-sm relative"
          >
            <Ionicons name="notifications-outline" size={18} color="#4B5563" />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#E02424] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white">
                <Text className="text-white text-[9.5px] font-extrabold">{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. SEARCH BAR */}
        <View className="px-4.5 mb-3">
          <View className="flex-row items-center bg-white border border-[#E7EAEF] rounded-xl px-3.5 py-2.5 shadow-sm">
            <Ionicons name="search" size={17} color="#98A2B3" />
            <TextInput
              placeholder='Search "humba", "seafood", "karenderia"...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-[13.5px] text-[#17191D] ml-2.5"
              placeholderTextColor="#98A2B3"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#98A2B3" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 3. CATEGORY CHIP ROW */}
        <View className="mb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18 }}
          >
            {categories.map((c) => {
              const active = selectedCategory === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setSelectedCategory(c)}
                  className={`mr-2 px-3.5 py-2 rounded-full border ${
                    active
                      ? "bg-[#17191D] border-[#17191D]"
                      : "bg-white border-[#E7EAEF]"
                  }`}
                >
                  <Text
                    className={`text-[12.5px] font-bold ${
                      active ? "text-white" : "text-[#4B5563]"
                    }`}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. GUEST BANNER (Polite, uncrowded) */}
        {!isLoggedIn && (
          <View className="mx-4.5 mb-4 p-3.5 bg-[#FEF1E8] border border-[#FCE0CE] rounded-2xl flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Ionicons name="sparkles" size={14} color="#EA5410" />
                <Text className="font-extrabold text-[#17191D] text-xs">
                  Browsing as Guest
                </Text>
              </View>
              <Text className="text-[11.5px] text-[#4B5563] leading-snug">
                Explore menus freely. Sign in when ready to order COD or reserve tables.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/profile")}
              className="bg-[#EA5410] px-3 py-1.5 rounded-xl shadow-xs"
            >
              <Text className="text-white font-extrabold text-xs">Sign In</Text>
            </Pressable>
          </View>
        )}

        {/* 5. ML PERSONALIZATION: FOR YOU TODAY (Prototype Section) */}
        {isLoggedIn && personalizationEnabled && (
          <View className="mb-4">
            <View className="px-4.5 pb-2 flex-row items-baseline justify-between">
              <Text className="text-[16px] font-extrabold text-[#17191D]">
                For you, {user?.name?.split(" ")[0] || "Foodie"} 🍲
              </Text>
              <Text className="text-[11px] font-semibold text-[#98A2B3]">
                Based on your visits
              </Text>
            </View>

            <View className="px-4.5">
              <Pressable
                onPress={() =>
                  handleOpenRestaurant(
                    mostVisitedStore?.name || "Mama Letty's Karenderia"
                  )
                }
                className="bg-white rounded-2xl border border-[#E7EAEF] p-3 flex-row items-center gap-3 shadow-sm"
              >
                <View className="w-13 h-13 rounded-xl bg-[#FED7AA] items-center justify-center">
                  <Text className="text-2xl">🍲</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[13.5px] font-extrabold text-[#17191D] mb-0.5">
                    Classic Pork Humba
                  </Text>
                  <Text className="text-[11.5px] text-[#4B5563] truncate">
                    {mostVisitedStore?.name || "Mama Letty's"} · your most-visited spot
                  </Text>
                </View>
                <View className="bg-[#F1EBFE] px-2 py-0.5 rounded-full">
                  <Text className="text-[10.5px] font-extrabold text-[#7C3AED]">
                    ML pick
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* 6. POPULAR NEAR YOU (Restaurant Cards) */}
        <View className="mb-4">
          <View className="px-4.5 pb-2.5 flex-row items-baseline justify-between">
            <Text className="text-[16px] font-extrabold text-[#17191D]">
              Popular near you
            </Text>
            <Pressable onPress={() => setSelectedCategory("All")}>
              <Text className="text-[11.5px] font-bold text-[#EA5410]">
                See all
              </Text>
            </Pressable>
          </View>

          <View className="px-4.5 gap-3.5">
            {restaurantList.map((resto) => (
              <Pressable
                key={resto.name}
                onPress={() => handleOpenRestaurant(resto.name)}
                className="bg-white rounded-2xl border border-[#E7EAEF] overflow-hidden shadow-sm active:scale-[0.985] transition-transform"
              >
                {/* Hero Banner with Emoji & Promo */}
                <View
                  style={{ backgroundColor: resto.bgColor || "#FED7AA" }}
                  className="h-23 items-center justify-center relative"
                >
                  <Text className="text-4xl">{resto.emoji}</Text>
                  {resto.promo ? (
                    <View className="absolute top-2.5 left-2.5 bg-white/90 px-2 py-0.5 rounded-full shadow-xs">
                      <Text className="text-[10px] font-extrabold text-[#17191D]">
                        {resto.promo}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Card Content */}
                <View className="p-3.5">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[15px] font-extrabold text-[#17191D] flex-1 mr-2" numberOfLines={1}>
                      {resto.name}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="star" size={13} color="#D97706" />
                      <Text className="text-[12px] font-extrabold text-[#17191D]">
                        {resto.rating}
                      </Text>
                      <Text className="text-[11px] text-[#98A2B3]">
                        ({resto.reviews || 84})
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[12px] text-[#4B5563] mb-2.5" numberOfLines={1}>
                    {resto.category} · {resto.address.split(",")[0]}
                  </Text>

                  {/* Clean meta pills in 1 row */}
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={13} color="#4B5563" />
                      <Text className="text-[11.5px] font-semibold text-[#4B5563]">
                        {resto.deliveryTime || "20-30 min"}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="bicycle-outline" size={13} color="#4B5563" />
                      <Text className="text-[11.5px] font-semibold text-[#4B5563]">
                        ₱{resto.deliveryFee || 35} fee
                      </Text>
                    </View>
                    <View className="ml-auto bg-[#E7F7F0] px-2 py-0.5 rounded-full">
                      <Text className="text-[10.5px] font-extrabold text-[#0E9F6E]">
                        {resto.availableTables} tables open
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 7. TRENDING DISHES (Horizontal Carousel) */}
        <View className="mb-6">
          <View className="px-4.5 pb-2.5">
            <Text className="text-[16px] font-extrabold text-[#17191D]">
              Trending dishes
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18 }}
          >
            {trendingDishes.map((dish) => (
              <Pressable
                key={dish.id}
                onPress={() => handleOpenCheckout(dish)}
                className="w-38 mr-3 bg-white rounded-2xl border border-[#E7EAEF] overflow-hidden shadow-sm"
              >
                <View className="h-21 bg-[#FEF1E8] items-center justify-center">
                  <Text className="text-3xl">{dish.emoji || "🍲"}</Text>
                </View>
                <View className="p-2.5">
                  <Text
                    className="text-[12.5px] font-extrabold text-[#17191D]"
                    numberOfLines={1}
                  >
                    {dish.name}
                  </Text>
                  <Text
                    className="text-[11px] text-[#98A2B3] mt-0.5"
                    numberOfLines={1}
                  >
                    {dish.store}
                  </Text>
                  <Text className="text-[13px] font-black text-[#EA5410] mt-1.5">
                    ₱{dish.price.toFixed(2)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* 8. ACTIVE ORDERS / CART FAB (Prototype Floating Action Pill) */}
      {orders && orders.length > 0 && (
        <Pressable
          onPress={() => router.push("/(mobile)/(tabs)/orders")}
          className="absolute bottom-5 right-4.5 bg-[#17191D] px-4.5 py-3 rounded-full flex-row items-center gap-2.5 shadow-lg active:scale-95 transition-transform"
        >
          <View className="bg-[#EA5410] rounded-full min-w-[20px] h-[20px] items-center justify-center px-1">
            <Text className="text-white text-[10.5px] font-black">
              {orders.length}
            </Text>
          </View>
          <Text className="text-white text-[12.5px] font-bold">
            Track Active Order
          </Text>
          <Ionicons name="arrow-forward" size={14} color="white" />
        </Pressable>
      )}

      {/* 9. MODALS & SHEETS */}
      <StoreQrScannerModal
        visible={showScanQrModal}
        onClose={() => setShowScanQrModal(false)}
        userName={user?.name || "Juan dela Cruz"}
        onPerformCheckIn={handlePerformCheckIn}
      />

      <NotificationsSheet
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onMarkAllRead={markAllNotificationsRead}
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
          loginAsRegistered("Juan dela Cruz", "juan.mati@example.com");
          setShowGuestGateModal(false);
          Alert.alert("Welcome, Juan!", "You are now signed in.");
        }}
        onNavigateToAuth={() => {
          setShowGuestGateModal(false);
          router.push("/(mobile)/(tabs)/profile");
        }}
      />
    </SafeAreaView>
  );
}
