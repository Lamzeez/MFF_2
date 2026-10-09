import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "../../../context/AuthContext";
import { RestaurantProfile, FoodItem } from "../../../types/restaurant";
import { MATI_RESTAURANTS_DATA } from "../../../mock/restaurants";
import { FOOD_ITEMS } from "../../../mock/dishes";
import { MATI_BARANGAYS } from "../../../mock/barangays";
import { fetchLiveStores, fetchLiveMenuItems, LiveStoreProfile } from "../../../services/catalog";
import { createOrder } from "../../../services/orders";
import { createReservation } from "../../../services/reservations";
import { RestaurantProfileSheet } from "../../../components/restaurant/RestaurantProfileSheet";
import { CheckoutSheet } from "../../../components/checkout/CheckoutSheet";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import {
  MATI_CITY_HALL_COORDS,
  projectGeoToMapPercent,
  evaluateStoreDeliveryServiceability,
  StoreDeliveryEvaluation,
} from "../../../lib/geo-serviceability";

interface ExploreSpotItem {
  id: string | number;
  storeId?: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  area: string;
  barangay: string;
  rating: string;
  reviews: number;
  open: boolean;
  hours: string;
  specialty: string;
  deliveryFee: number;
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  imageUrl: string;
}

// Canonical PostGIS Seed Coordinates & Metadata for Mati City Food Spots
const EXPLORE_FALLBACK_SPOTS: ExploreSpotItem[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    storeId: "11111111-1111-1111-1111-111111111111",
    name: "Mama Letty's Karenderia",
    category: "Karenderias",
    latitude: 6.955,
    longitude: 126.2165,
    area: "Magsaysay St, Brgy. Central",
    barangay: "Central",
    rating: "4.8",
    reviews: 142,
    open: true,
    hours: "7:00 AM - 8:30 PM",
    specialty: "Classic Pork Humba, Native Tinola & Unlimited Sabaw",
    deliveryFee: 35,
    deliveryEnabled: true,
    deliveryRadiusKm: 6.0,
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    storeId: "22222222-2222-2222-2222-222222222222",
    name: "Mati Baywalk Seafood Grill",
    category: "Seafood",
    latitude: 6.949,
    longitude: 126.225,
    area: "Baywalk Boulevard, Pujada Bay",
    barangay: "Central",
    rating: "4.9",
    reviews: 218,
    open: true,
    hours: "10:30 AM - 10:00 PM",
    specialty: "Grilled Tuna Panga, Blue Marlin & Fresh Kinilaw",
    deliveryFee: 45,
    deliveryEnabled: true,
    deliveryRadiusKm: 6.0,
    imageUrl:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    storeId: "33333333-3333-3333-3333-333333333333",
    name: "Subangan Street Grills",
    category: "BBQ & Grill",
    latitude: 6.96,
    longitude: 126.22,
    area: "Near Subangan Museum, Brgy. Sainz",
    barangay: "Sainz",
    rating: "4.9",
    reviews: 96,
    open: true,
    hours: "4:00 PM - 11:00 PM",
    specialty: "Pork BBQ Skewers, Isaw & Chicken Inasal",
    deliveryFee: 30,
    deliveryEnabled: true,
    deliveryRadiusKm: 6.0,
    imageUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    storeId: "44444444-4444-4444-4444-444444444444",
    name: "Dahican Beach Bites",
    category: "Merienda",
    latitude: 6.918,
    longitude: 126.275,
    area: "Dahican Coastline, Brgy. Dahican",
    barangay: "Dahican",
    rating: "4.7",
    reviews: 110,
    open: true,
    hours: "8:00 AM - 9:00 PM",
    specialty: "Fresh Kinilaw, Mango Shakes & Beach Snacks",
    deliveryFee: 40,
    deliveryEnabled: true,
    deliveryRadiusKm: 12.0,
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    storeId: "55555555-5555-5555-5555-555555555555",
    name: "Aling Nena's Kitchen",
    category: "Karenderias",
    latitude: 6.958,
    longitude: 126.219,
    area: "Rizal Extension, Brgy. Sainz",
    barangay: "Sainz",
    rating: "4.8",
    reviews: 95,
    open: true,
    hours: "7:30 AM - 9:00 PM",
    specialty: "Native Chicken Tinola & Beef Bulalo",
    deliveryFee: 35,
    deliveryEnabled: true,
    deliveryRadiusKm: 6.0,
    imageUrl:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80",
  },
];

export default function MobileMapScreen() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  // Mati City Center default coordinates
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>(
    MATI_CITY_HALL_COORDS
  );
  const [locationName, setLocationName] = useState("Mati City Center (GPS loading...)");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | number>(
    EXPLORE_FALLBACK_SPOTS[0].id
  );
  const [activeFilter, setActiveFilter] = useState<"closest" | "serviceable" | "open" | "all">(
    "closest"
  );
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Live Catalog State
  const [rawSpots, setRawSpots] = useState<ExploreSpotItem[]>(EXPLORE_FALLBACK_SPOTS);
  const [restaurants, setRestaurants] = useState<Record<string, RestaurantProfile>>(
    MATI_RESTAURANTS_DATA
  );
  const [foodItems, setFoodItems] = useState<FoodItem[]>(FOOD_ITEMS);

  // Modals Visibility
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [activeRestaurant, setActiveRestaurant] = useState<RestaurantProfile | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDish, setCheckoutDish] = useState<FoodItem | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationResto, setReservationResto] = useState("Mama Letty's Karenderia");
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateAction, setGuestGateAction] = useState<string>("order food or reserve tables");

  // Fetch real device location on mount
  useEffect(() => {
    requestUserLocation();
    loadLiveCatalog();
  }, []);

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

        const mappedSpots: ExploreSpotItem[] = liveStores.map((s) => ({
          id: s.id,
          storeId: s.id,
          name: s.name,
          category: s.category,
          latitude: s.latitude,
          longitude: s.longitude,
          area: s.address || `${s.barangay}, Mati City`,
          barangay: s.barangay,
          rating: s.rating || "4.8",
          reviews: s.reviews || 120,
          open: true,
          hours: s.hours || "7:30 AM - 9:00 PM Daily",
          specialty: s.description || "Local Mati Specialties & Fresh Seafood",
          deliveryFee: s.deliveryFee || (s.deliveryEnabled ? 35 : 0),
          deliveryEnabled: s.deliveryEnabled,
          deliveryRadiusKm: s.deliveryRadiusKm || 6.0,
          imageUrl:
            s.imageUrl ||
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
        }));
        setRawSpots(mappedSpots);
      }

      if (liveMenu.length > 0) {
        setFoodItems(liveMenu);
      }
    } catch {
      // Fallback to initial seed spots
    }
  };

  const requestUserLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Mati City Hall, Poblacion (Default GPS)");
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationName("Your Current Location (Live GPS)");
    } catch {
      setLocationName("Mati City Hall, Poblacion");
    } finally {
      setIsLocating(false);
    }
  };

  // Compute live PostGIS distance, road ETA, and delivery serviceability for each store
  const spotsWithEvaluation = rawSpots.map((spot) => {
    const { xPercent, yPercent } = projectGeoToMapPercent(spot.latitude, spot.longitude);
    const evaluation: StoreDeliveryEvaluation = evaluateStoreDeliveryServiceability(
      userLocation,
      {
        latitude: spot.latitude,
        longitude: spot.longitude,
        deliveryEnabled: spot.deliveryEnabled,
        deliveryRadiusKm: spot.deliveryRadiusKm,
        barangay: spot.barangay,
        name: spot.name,
      }
    );

    return {
      ...spot,
      xPercent,
      yPercent,
      evaluation,
    };
  });

  // Filter & Sort spots
  const filteredSpots = spotsWithEvaluation.filter((s) => {
    if (activeFilter === "serviceable") return s.evaluation.isServiceable;
    if (activeFilter === "open") return s.open;
    return true;
  });

  const sortedSpots = [...filteredSpots].sort((a, b) => {
    if (activeFilter === "closest") {
      return a.evaluation.straightLineKm - b.evaluation.straightLineKm;
    }
    if (activeFilter === "serviceable") {
      return a.evaluation.roadDistanceKm - b.evaluation.roadDistanceKm;
    }
    if (activeFilter === "open") {
      return (b.open ? 1 : 0) - (a.open ? 1 : 0);
    }
    return a.evaluation.straightLineKm - b.evaluation.straightLineKm;
  });

  const selectedSpot =
    sortedSpots.find((s) => s.id === selectedSpotId) ||
    spotsWithEvaluation.find((s) => s.id === selectedSpotId) ||
    sortedSpots[0] ||
    spotsWithEvaluation[0];

  const userPositionMap = projectGeoToMapPercent(
    userLocation.latitude,
    userLocation.longitude
  );

  // Open Full Restaurant Profile Sheet
  const handleOpenRestaurant = (spotName: string) => {
    const match = Object.values(restaurants).find(
      (r) => r.name.toLowerCase() === spotName.toLowerCase()
    );
    const resto = match || {
      name: spotName,
      category: selectedSpot?.category || "Local Mati Restaurant",
      rating: selectedSpot?.rating || "4.8",
      address: selectedSpot?.area || "Mati City, Davao Oriental",
      phone: "+63 900 000 0000",
      hours: selectedSpot?.hours || "7:30 AM - 9:00 PM Daily",
      availableTables: 4,
      emoji: "🏪",
      description: selectedSpot?.specialty || "Authentic food establishment in Mati City.",
      deliveryFee: selectedSpot?.deliveryFee ?? 35,
      deliveryTime: selectedSpot?.evaluation?.roadRouteFormatted || "20-30 min",
      reviews: selectedSpot?.reviews || 95,
      bgColor: "#FED7AA",
      imageUrl: selectedSpot?.imageUrl,
    };
    setActiveRestaurant(resto);
    setShowRestaurantModal(true);
  };

  // Guest Gate Check
  const verifyRegisteredUser = (actionDescription: string): boolean => {
    if (!isLoggedIn) {
      setGuestGateAction(actionDescription);
      setShowGuestGateModal(true);
      return false;
    }
    return true;
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

  // Open Dish Checkout
  const handleOpenCheckout = (dish: FoodItem) => {
    if (!verifyRegisteredUser("order food via Cash on Delivery")) return;
    setCheckoutDish(dish);
    setShowCheckoutModal(true);
  };

  // Handle Order Placement
  const handlePlaceOrderFromSheet = async (orderPayload: {
    dish: FoodItem;
    qty: number;
    barangay: string;
    address: string;
    notes: string;
    fulfillment: "delivery" | "pickup";
    total: number;
  }) => {
    let storeId = orderPayload.dish.storeId;
    if (!storeId) {
      const match = Object.values(restaurants).find(
        (r: any) =>
          r.name === orderPayload.dish.store ||
          (r.id && r.name.toLowerCase().includes((orderPayload.dish.store || "").toLowerCase()))
      ) as any;
      storeId = match?.id || "11111111-1111-1111-1111-111111111111";
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
        deliveryAddress: orderPayload.address,
        barangay: orderPayload.barangay,
        notes: orderPayload.notes,
      });

      setShowCheckoutModal(false);

      Alert.alert(
        "Order Placed Successfully! 🛵",
        `Order #${createdOrder.orderNumber} has been received! Handshake PIN: ${createdOrder.handshakePin}. The kitchen is preparing your meal. Track live updates in the Orders tab.`,
        [
          { text: "View Orders", onPress: () => router.push("/(mobile)/(tabs)/orders") },
          { text: "Continue Browsing" },
        ]
      );
    } catch (err: any) {
      Alert.alert("Order Failed", err?.message || "Could not place order. Please try again.");
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* 1. TOP APP BAR */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 shadow-xs">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
              MATI CITY EXPLORE
            </Text>
            <Text className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
              Live Food Map & Nearby
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {/* View Mode Switcher */}
            <Pressable
              onPress={() => setViewMode(viewMode === "map" ? "list" : "map")}
              className="flex-row items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 active:bg-gray-200"
            >
              <Ionicons
                name={viewMode === "map" ? "list" : "map"}
                size={14}
                color="#374151"
              />
              <Text className="text-xs font-black text-gray-800">
                {viewMode === "map" ? "List" : "Map"}
              </Text>
            </Pressable>

            {/* GPS Refresh */}
            <Pressable
              onPress={requestUserLocation}
              disabled={isLocating}
              accessibilityLabel="Refresh GPS location"
              className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center border border-orange-200 active:bg-orange-100"
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#EA5410" />
              ) : (
                <Ionicons name="locate" size={17} color="#EA5410" />
              )}
            </Pressable>

            {/* If Guest: 1-Tap Sign In Pill */}
            {!isLoggedIn && (
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

        {/* Current Location Strip */}
        <View className="flex-row items-center gap-2 bg-orange-50 px-3 py-2 rounded-2xl border border-orange-200">
          <View className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <Text className="text-xs font-bold text-gray-900 flex-1 truncate" numberOfLines={1}>
            {locationName}
          </Text>
          <View className="bg-orange-100 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-black text-[#EA5410] uppercase">
              {spotsWithEvaluation.filter((s) => s.evaluation.isServiceable).length} deliverable
            </Text>
          </View>
        </View>

        {/* Proximity & Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5 flex-row">
          <View className="flex-row gap-2 pr-4">
            <Pressable
              onPress={() => setActiveFilter("closest")}
              className={`px-3.5 py-1.5 rounded-full border ${
                activeFilter === "closest"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeFilter === "closest" ? "text-white" : "text-gray-700"
                }`}
              >
                Closest to Me
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter("serviceable")}
              className={`px-3.5 py-1.5 rounded-full border flex-row items-center gap-1 ${
                activeFilter === "serviceable"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Ionicons
                name="bicycle"
                size={12}
                color={activeFilter === "serviceable" ? "white" : "#EA5410"}
              />
              <Text
                className={`text-xs font-bold ${
                  activeFilter === "serviceable" ? "text-white" : "text-gray-700"
                }`}
              >
                Within Delivery Zone
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter("open")}
              className={`px-3.5 py-1.5 rounded-full border ${
                activeFilter === "open"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeFilter === "open" ? "text-white" : "text-gray-700"
                }`}
              >
                Open Now
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-full border ${
                activeFilter === "all"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeFilter === "all" ? "text-white" : "text-gray-700"
                }`}
              >
                All Spots ({spotsWithEvaluation.length})
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* 2. MAIN VIEW: MAP OR LIST */}
      {viewMode === "map" ? (
        <View className="flex-1">
          {/* Visual Map Surface with Mati Landmarks */}
          <View className="flex-1 bg-slate-100 items-center justify-center relative overflow-hidden">
            {/* Street Grid pattern */}
            <View className="absolute inset-0 opacity-20 flex-row flex-wrap pointer-events-none">
              {[...Array(32)].map((_, i) => (
                <View key={i} className="w-1/4 h-24 border border-slate-300" />
              ))}
            </View>

            {/* Geographical Mati Landmarks */}
            <View className="absolute bottom-60 left-4 bg-white/95 px-3 py-1 rounded-xl shadow-xs border border-gray-200 flex-row items-center gap-1 z-10">
              <Text className="text-xs">🌊</Text>
              <Text className="text-[11px] font-black text-gray-800">Pujada Bay</Text>
            </View>
            <View className="absolute bottom-28 right-4 bg-white/95 px-3 py-1 rounded-xl shadow-xs border border-gray-200 flex-row items-center gap-1 z-10">
              <Text className="text-xs">🏖️</Text>
              <Text className="text-[11px] font-black text-gray-800">Dahican Beach</Text>
            </View>
            <View className="absolute top-4 left-4 bg-white/95 px-3 py-1 rounded-xl shadow-xs border border-gray-200 flex-row items-center gap-1 z-10">
              <Text className="text-xs">🏛️</Text>
              <Text className="text-[11px] font-black text-gray-800">Mati City Hall</Text>
            </View>

            {/* GPS Pulse Marker: YOU ARE HERE */}
            <View
              style={{
                position: "absolute",
                left: `${userPositionMap.xPercent}%`,
                top: `${userPositionMap.yPercent}%`,
                transform: [{ translateX: -40 }, { translateY: -20 }],
              }}
              className="items-center z-30 pointer-events-none"
            >
              <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center absolute" />
              <View className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md items-center justify-center">
                <View className="w-2 h-2 rounded-full bg-white" />
              </View>
              <View className="bg-blue-600 px-2 py-0.5 rounded-full mt-1 shadow-sm">
                <Text className="text-[9px] font-black text-white">YOU ARE HERE</Text>
              </View>
            </View>

            {/* Dynamic PostGIS Food Spot Pins on Map */}
            <View className="w-full h-full relative">
              {spotsWithEvaluation.map((spot) => {
                const isSelected = selectedSpot?.id === spot.id;
                return (
                  <Pressable
                    key={String(spot.id)}
                    onPress={() => setSelectedSpotId(spot.id)}
                    style={{
                      position: "absolute",
                      left: `${spot.xPercent}%`,
                      top: `${spot.yPercent}%`,
                      transform: [{ translateX: -48 }, { translateY: -38 }],
                    }}
                    className="items-center z-20"
                  >
                    <View
                      className={`px-2 py-0.5 rounded-xl shadow-md mb-0.5 flex-row items-center gap-1 ${
                        isSelected
                          ? "bg-[#EA5410] scale-105"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <View
                        className={`w-2 h-2 rounded-full ${
                          spot.evaluation.isServiceable ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <Text
                        className={`text-[10px] font-black ${
                          isSelected ? "text-white" : "text-gray-900"
                        }`}
                        numberOfLines={1}
                      >
                        {spot.name.split(" ")[0]} · {spot.evaluation.straightLineFormatted}
                      </Text>
                    </View>
                    <Ionicons
                      name="restaurant"
                      size={isSelected ? 30 : 22}
                      color={
                        isSelected
                          ? "#EA5410"
                          : spot.evaluation.isServiceable
                          ? "#075E46"
                          : "#6B7280"
                      }
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Selected Restaurant Floating Card at Bottom of Map */}
          {selectedSpot && (
            <View className="m-4 p-4 bg-white rounded-3xl border border-gray-200 shadow-xl">
              <View className="flex-row items-center gap-3.5 mb-2.5">
                <Image
                  source={{ uri: selectedSpot.imageUrl }}
                  className="w-16 h-16 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
                <View className="flex-1 pr-1">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Text
                      className="text-base font-black text-gray-900 flex-1 leading-tight"
                      numberOfLines={1}
                    >
                      {selectedSpot.name}
                    </Text>
                    <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-emerald-800">
                        {selectedSpot.open ? "Open Now" : "Closed"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-gray-500 font-medium" numberOfLines={1}>
                    {selectedSpot.category} · {selectedSpot.area}
                  </Text>

                  {/* Delivery Serviceability Badge */}
                  <View
                    className={`self-start px-2 py-0.5 rounded-md border flex-row items-center gap-1 mt-1.5 ${selectedSpot.evaluation.badgeColor}`}
                  >
                    <Text className="text-[10px]">
                      {selectedSpot.evaluation.statusBadge === "serviceable"
                        ? "🛵"
                        : selectedSpot.evaluation.statusBadge === "outside_radius"
                        ? "📍"
                        : "🏪"}
                    </Text>
                    <Text className="text-[10px] font-black">
                      {selectedSpot.evaluation.badgeText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Haversine Straight-Line vs. Road Route Metrics Strip */}
              <View className="flex-row items-center gap-2 mb-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase">Haversine GPS</Text>
                  <Text className="text-xs font-black text-gray-800" numberOfLines={1}>
                    {selectedSpot.evaluation.straightLineFormatted}
                  </Text>
                </View>
                <View className="w-px h-6 bg-gray-200" />
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase">Road Travel Time</Text>
                  <Text className="text-xs font-black text-[#EA5410]" numberOfLines={1}>
                    {selectedSpot.evaluation.roadRouteFormatted}
                  </Text>
                </View>
                <View className="w-px h-6 bg-gray-200" />
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase">Delivery Fee</Text>
                  <Text className="text-xs font-black text-gray-800" numberOfLines={1}>
                    {selectedSpot.deliveryEnabled ? `₱${selectedSpot.deliveryFee}` : "Dine-in"}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-gray-600 font-medium mb-3" numberOfLines={1}>
                🔥 <Text className="font-bold text-[#EA5410]">Specialty:</Text> {selectedSpot.specialty}
              </Text>

              {/* Quick Actions: View Full Profile or Route */}
              <View className="flex-row gap-2 pt-2 border-t border-gray-100">
                <Pressable
                  onPress={() => handleOpenRestaurant(selectedSpot.name)}
                  className="flex-1 py-3 bg-[#EA5410] rounded-2xl items-center shadow-sm active:opacity-95"
                >
                  <Text className="text-white font-black text-xs">View Details & Menu</Text>
                </Pressable>

                {selectedSpot.evaluation.isServiceable ? (
                  <Pressable
                    onPress={() => {
                      const restoDish = foodItems.find(
                        (f) =>
                          (f.store && f.store.toLowerCase().includes(selectedSpot.name.toLowerCase())) ||
                          (selectedSpot.storeId && f.storeId === selectedSpot.storeId)
                      );
                      if (restoDish) {
                        handleOpenCheckout(restoDish);
                      } else {
                        handleOpenRestaurant(selectedSpot.name);
                      }
                    }}
                    className="py-3 px-3.5 bg-emerald-700 rounded-2xl items-center flex-row gap-1 shadow-sm active:opacity-95"
                  >
                    <Ionicons name="bicycle" size={14} color="white" />
                    <Text className="text-white font-bold text-xs">Order COD</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleOpenReservation(selectedSpot.name)}
                    className="py-3 px-3.5 bg-amber-600 rounded-2xl items-center flex-row gap-1 shadow-sm active:opacity-95"
                  >
                    <Ionicons name="calendar-outline" size={14} color="white" />
                    <Text className="text-white font-bold text-xs">Book Table</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() =>
                    Alert.alert(
                      "Mati Route Navigation 🚗",
                      `Routing to ${selectedSpot.name} (${selectedSpot.area}):\n\n• Straight-line Distance: ${selectedSpot.evaluation.straightLineFormatted}\n• Estimated Road Distance: ${selectedSpot.evaluation.roadDistanceKm} km\n• Estimated Travel Time: ${selectedSpot.evaluation.roadRouteFormatted}\n\nNotice: ${selectedSpot.evaluation.notice}`
                    )
                  }
                  className="py-3 px-3.5 bg-gray-100 rounded-2xl items-center border border-gray-200 flex-row gap-1 active:bg-gray-200"
                >
                  <Ionicons name="navigate-outline" size={14} color="#374151" />
                  <Text className="text-gray-800 font-bold text-xs">Route</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* LIST VIEW: SORTED BY PROXIMITY & SERVICEABILITY */
        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Guest Mode Discovery Banner */}
          {!isLoggedIn && (
            <View className="p-4 mb-4 bg-orange-50 border border-orange-200 rounded-2xl">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-black text-gray-900">
                  Explore Mati Food Spots 🗺️
                </Text>
                <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-[#EA5410]">GUEST MODE</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-600 leading-relaxed mb-3">
                Discover nearby karenderias, seaside grills, and beach cafes across Mati City. Sign in to place orders and book tables!
              </Text>
              <Pressable
                onPress={() => router.push("/(mobile)/auth/customer-login")}
                className="py-2.5 bg-[#EA5410] rounded-xl items-center shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Sign In / Create Account</Text>
              </Pressable>
            </View>
          )}

          <Text className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">
            Restaurants Sorted by Distance from You
          </Text>

          <View className="gap-3.5">
            {sortedSpots.map((spot) => (
              <Pressable
                key={String(spot.id)}
                onPress={() => handleOpenRestaurant(spot.name)}
                className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm flex-row items-center gap-3.5 active:bg-orange-50/40"
              >
                <Image
                  source={{ uri: spot.imageUrl }}
                  className="w-20 h-20 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />

                <View className="flex-1 pr-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-black text-gray-900 text-sm flex-1 mr-1" numberOfLines={1}>
                      {spot.name}
                    </Text>
                    <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <Text className="text-[9px] font-bold text-emerald-800">
                        {spot.open ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-gray-500 font-medium mb-1" numberOfLines={1}>
                    {spot.area} · {spot.category}
                  </Text>

                  {/* Delivery Serviceability Badge */}
                  <View
                    className={`self-start px-2 py-0.5 rounded-md border mb-1.5 flex-row items-center gap-1 ${spot.evaluation.badgeColor}`}
                  >
                    <Text className="text-[9px]">
                      {spot.evaluation.isServiceable ? "🛵" : "📍"}
                    </Text>
                    <Text className="text-[9px] font-black">
                      {spot.evaluation.badgeText}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black text-[#EA5410]">
                        {spot.evaluation.straightLineFormatted}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="star" size={11} color="#D97706" />
                      <Text className="text-xs font-bold text-gray-700">{spot.rating}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* 3. 5-STAR BottomSheetModal POPOVERS */}
      <RestaurantProfileSheet
        visible={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
        restaurant={activeRestaurant}
        onBookTable={(restoName) => handleOpenReservation(restoName)}
        onViewMap={() => {
          setShowRestaurantModal(false);
          setViewMode("map");
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

      <CheckoutSheet
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        dish={checkoutDish}
        barangays={MATI_BARANGAYS}
        onConfirmOrder={handlePlaceOrderFromSheet}
      />

      <ReservationSheet
        visible={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        initialRestaurant={reservationResto}
        restaurants={restaurants}
        onConfirmReservation={async (data) => {
          const storeEntry = Object.values(restaurants).find(
            (s) => s.name.toLowerCase() === data.restaurantName.toLowerCase()
          );
          const storeId = storeEntry?.id || "11111111-1111-1111-1111-111111111111";
          try {
            await createReservation({
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
              `Your reservation for ${data.partySize} guests at ${data.restaurantName} on ${data.date} (${data.time}) is waiting for store confirmation.`
            );
          } catch (err: any) {
            Alert.alert("Reservation Error", err.message || "Failed to submit reservation");
          }
        }}
      />

      <GuestGateModal
        visible={showGuestGateModal}
        onClose={() => setShowGuestGateModal(false)}
        actionDescription={guestGateAction}
        onQuickSignIn={() => {
          setShowGuestGateModal(false);
          router.push("/(mobile)/auth/customer-login");
        }}
        onNavigateToAuth={() => {
          setShowGuestGateModal(false);
          router.push("/(mobile)/auth/customer-login");
        }}
      />
    </SafeAreaView>
  );
}
