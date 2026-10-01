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
import { fetchLiveStores, fetchLiveMenuItems } from "../../../services/catalog";
import { RestaurantProfileSheet } from "../../../components/restaurant/RestaurantProfileSheet";
import { CheckoutSheet } from "../../../components/checkout/CheckoutSheet";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";

// Canonical Coordinates and Metadata for Mati City Food Spots
const EXPLORE_SPOTS = [
  {
    id: 1,
    name: "Mama Letty's Karenderia",
    category: "Karenderias",
    latitude: 6.9552,
    longitude: 126.2168,
    area: "Magsaysay St, Brgy. Central",
    rating: "4.8",
    reviews: 142,
    open: true,
    hours: "7:00 AM - 8:30 PM",
    specialty: "Classic Pork Humba, Native Tinola & Unlimited Sabaw",
    estDeliveryTime: "15-20 min",
    deliveryFee: 35,
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "Mati Baywalk Seafood Grill",
    category: "Seafood",
    latitude: 6.949,
    longitude: 126.224,
    area: "Baywalk Boulevard, Pujada Bay",
    rating: "4.9",
    reviews: 218,
    open: true,
    hours: "10:30 AM - 10:00 PM",
    specialty: "Grilled Tuna Panga, Blue Marlin & Fresh Kinilaw",
    estDeliveryTime: "25-35 min",
    deliveryFee: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Dahican Beach Bites",
    category: "Merienda",
    latitude: 6.92,
    longitude: 126.275,
    area: "Dahican Coastline",
    rating: "4.7",
    reviews: 110,
    open: true,
    hours: "8:00 AM - 9:00 PM",
    specialty: "Fresh Kinilaw, Mango Shakes & Beach Snacks",
    estDeliveryTime: "30-40 min",
    deliveryFee: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Aling Nena's Kitchen",
    category: "Karenderias",
    latitude: 6.962,
    longitude: 126.21,
    area: "Rizal Extension, Brgy. Sainz",
    rating: "4.8",
    reviews: 95,
    open: true,
    hours: "7:30 AM - 9:00 PM",
    specialty: "Native Chicken Tinola & Beef Bulalo",
    estDeliveryTime: "20-30 min",
    deliveryFee: 35,
    imageUrl:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    name: "Subangan Street Grills",
    category: "BBQ & Grill",
    latitude: 6.942,
    longitude: 126.23,
    area: "Near Subangan Museum Grounds",
    rating: "4.9",
    reviews: 96,
    open: true,
    hours: "4:00 PM - 11:00 PM",
    specialty: "Pork BBQ Skewers, Isaw & Chicken Inasal",
    estDeliveryTime: "15-25 min",
    deliveryFee: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
  },
];

// Haversine distance formula in kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MobileMapScreen() {
  const { isLoggedIn, placeActiveOrder, createReservation } = useAuth();
  const router = useRouter();

  // Mati City Center default coordinates
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 6.954,
    longitude: 126.218,
  });
  const [locationName, setLocationName] = useState("Mati City Center (GPS loading...)");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "closest" | "open">("closest");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Live Catalog State for Modals
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
      }
      if (liveMenu.length > 0) {
        setFoodItems(liveMenu);
      }
    } catch {
      // fallback to mock fixtures
    }
  };

  const requestUserLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Mati City Center (Default GPS)");
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
      setLocationName("Mati City Center");
    } finally {
      setIsLocating(false);
    }
  };

  // Compute live distances to user
  const spotsWithDistance = EXPLORE_SPOTS.map((spot) => {
    const dist = calculateDistanceKm(
      userLocation.latitude,
      userLocation.longitude,
      spot.latitude,
      spot.longitude
    );
    return {
      ...spot,
      distanceKm: dist,
      distanceFormatted:
        dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
    };
  });

  // Sort / Filter spots
  const sortedSpots = [...spotsWithDistance].sort((a, b) => {
    if (activeFilter === "closest") return a.distanceKm - b.distanceKm;
    if (activeFilter === "open") return (b.open ? 1 : 0) - (a.open ? 1 : 0);
    return 0;
  });

  const selectedSpot = sortedSpots.find((s) => s.id === selectedSpotId) || sortedSpots[0];

  // Open Full Restaurant Profile Sheet
  const handleOpenRestaurant = (spotName: string) => {
    const resto = restaurants[spotName] || {
      name: spotName,
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
      imageUrl: selectedSpot.imageUrl,
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
  const handlePlaceOrderFromSheet = (orderPayload: {
    dish: FoodItem;
    qty: number;
    barangay: string;
    address: string;
    notes: string;
    fulfillment: "delivery" | "pickup";
    total: number;
  }) => {
    const subtotal = orderPayload.dish.price * orderPayload.qty;
    const deliveryFee = orderPayload.fulfillment === "delivery" ? 35 : 0;

    const orderNum = placeActiveOrder({
      restaurantName: orderPayload.dish.store || "Mama Letty's Karenderia",
      items: [
        {
          name: orderPayload.dish.name,
          quantity: orderPayload.qty,
          price: orderPayload.dish.price,
        },
      ],
      subtotal,
      deliveryFee,
      total: orderPayload.total,
      deliveryAddress: orderPayload.address,
      barangay: orderPayload.barangay,
      notes: orderPayload.notes,
    });

    setShowCheckoutModal(false);

    Alert.alert(
      "Order Placed Successfully! 🛵",
      `Order ${orderNum} has been received! The kitchen is preparing your meal. Track live updates in the Orders tab.`,
      [
        { text: "View Orders", onPress: () => router.push("/(mobile)/(tabs)/orders") },
        { text: "Continue Browsing" },
      ]
    );
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
              {sortedSpots.filter((s) => s.open).length} open near you
            </Text>
          </View>
        </View>

        {/* Proximity & Status Filter Chips */}
        <View className="flex-row gap-2 mt-2.5">
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
              All Spots ({sortedSpots.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. MAIN VIEW: MAP OR LIST */}
      {viewMode === "map" ? (
        <View className="flex-1">
          {/* Visual Map Surface with Mati Landmarks */}
          <View className="flex-1 bg-slate-100 items-center justify-center relative overflow-hidden">
            {/* Street Grid pattern */}
            <View className="absolute inset-0 opacity-20 flex-row flex-wrap">
              {[...Array(32)].map((_, i) => (
                <View key={i} className="w-1/4 h-24 border border-slate-300" />
              ))}
            </View>

            {/* Geographical Mati Landmarks */}
            <View className="absolute top-4 left-4 bg-white/95 px-3 py-1 rounded-xl shadow-xs border border-gray-200 flex-row items-center gap-1">
              <Text className="text-xs">🌊</Text>
              <Text className="text-[11px] font-black text-gray-800">Pujada Bay</Text>
            </View>
            <View className="absolute top-12 right-4 bg-white/95 px-3 py-1 rounded-xl shadow-xs border border-gray-200 flex-row items-center gap-1">
              <Text className="text-xs">🏖️</Text>
              <Text className="text-[11px] font-black text-gray-800">Dahican Beach</Text>
            </View>
            <View className="absolute bottom-56 left-5 bg-white/95 px-3 py-1 rounded-xl shadow-xs border border-gray-200 flex-row items-center gap-1">
              <Text className="text-xs">🏛️</Text>
              <Text className="text-[11px] font-black text-gray-800">Mati City Hall</Text>
            </View>

            {/* GPS Pulse Marker: YOU ARE HERE */}
            <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center z-30">
              <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center absolute" />
              <View className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md items-center justify-center">
                <View className="w-2 h-2 rounded-full bg-white" />
              </View>
              <View className="bg-blue-600 px-2 py-0.5 rounded-full mt-1 shadow-sm">
                <Text className="text-[9px] font-black text-white">YOU ARE HERE</Text>
              </View>
            </View>

            {/* Food Spot Pins on Map */}
            <View className="w-full h-full relative">
              {/* Pin 1 - Mama Letty's Karenderia */}
              <Pressable
                onPress={() => setSelectedSpotId(1)}
                className="absolute top-1/3 left-1/4 items-center z-20"
              >
                <View
                  className={`px-2.5 py-1 rounded-xl shadow-md mb-0.5 ${
                    selectedSpotId === 1 ? "bg-[#EA5410] scale-105" : "bg-white border border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      selectedSpotId === 1 ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Mama Letty's · {spotsWithDistance.find((s) => s.id === 1)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons
                  name="restaurant"
                  size={selectedSpotId === 1 ? 32 : 24}
                  color={selectedSpotId === 1 ? "#EA5410" : "#374151"}
                />
              </Pressable>

              {/* Pin 2 - Baywalk Seafood */}
              <Pressable
                onPress={() => setSelectedSpotId(2)}
                className="absolute top-3/5 left-1/2 items-center z-20"
              >
                <View
                  className={`px-2.5 py-1 rounded-xl shadow-md mb-0.5 ${
                    selectedSpotId === 2 ? "bg-[#EA5410] scale-105" : "bg-white border border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      selectedSpotId === 2 ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Baywalk Seafood · {spotsWithDistance.find((s) => s.id === 2)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons
                  name="restaurant"
                  size={selectedSpotId === 2 ? 32 : 24}
                  color={selectedSpotId === 2 ? "#EA5410" : "#374151"}
                />
              </Pressable>

              {/* Pin 3 - Dahican Beach Bites */}
              <Pressable
                onPress={() => setSelectedSpotId(3)}
                className="absolute top-1/4 right-6 items-center z-20"
              >
                <View
                  className={`px-2.5 py-1 rounded-xl shadow-md mb-0.5 ${
                    selectedSpotId === 3 ? "bg-[#EA5410] scale-105" : "bg-white border border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      selectedSpotId === 3 ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Dahican Beach · {spotsWithDistance.find((s) => s.id === 3)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons
                  name="restaurant"
                  size={selectedSpotId === 3 ? 32 : 24}
                  color={selectedSpotId === 3 ? "#EA5410" : "#374151"}
                />
              </Pressable>

              {/* Pin 5 - Subangan BBQ */}
              <Pressable
                onPress={() => setSelectedSpotId(5)}
                className="absolute bottom-52 right-1/3 items-center z-20"
              >
                <View
                  className={`px-2.5 py-1 rounded-xl shadow-md mb-0.5 ${
                    selectedSpotId === 5 ? "bg-[#EA5410] scale-105" : "bg-white border border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      selectedSpotId === 5 ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Subangan BBQ · {spotsWithDistance.find((s) => s.id === 5)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons
                  name="restaurant"
                  size={selectedSpotId === 5 ? 32 : 24}
                  color={selectedSpotId === 5 ? "#EA5410" : "#374151"}
                />
              </Pressable>
            </View>
          </View>

          {/* Selected Restaurant Floating Card at Bottom of Map */}
          <View className="m-4 p-4 bg-white rounded-3xl border border-gray-200 shadow-xl">
            <View className="flex-row items-center gap-3.5 mb-2.5">
              <Image
                source={{ uri: selectedSpot.imageUrl }}
                className="w-16 h-16 rounded-2xl bg-gray-100"
                resizeMode="cover"
              />
              <View className="flex-1 pr-1">
                <View className="flex-row items-center gap-1.5 mb-0.5">
                  <Text className="text-base font-black text-gray-900 flex-1 leading-tight" numberOfLines={1}>
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

                <View className="flex-row items-center gap-2 mt-1">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="star" size={12} color="#D97706" />
                    <Text className="text-xs font-black text-gray-800">{selectedSpot.rating}</Text>
                  </View>
                  <Text className="text-xs text-gray-400">·</Text>
                  <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                    <Text className="text-[10px] font-black text-[#EA5410]">
                      {selectedSpot.distanceFormatted}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text className="text-xs text-gray-600 font-medium mb-3" numberOfLines={1}>
              🔥 <Text className="font-bold text-[#EA5410]">Specialty:</Text> {selectedSpot.specialty}
            </Text>

            {/* Quick Actions: View Full Profile or Route */}
            <View className="flex-row gap-2.5 pt-2.5 border-t border-gray-100">
              <Pressable
                onPress={() => handleOpenRestaurant(selectedSpot.name)}
                className="flex-1 py-3 bg-[#EA5410] rounded-2xl items-center shadow-sm active:opacity-95"
              >
                <Text className="text-white font-black text-xs">View Details & Menu</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Turn-by-turn Navigation 🚗",
                    `Starting road route to ${selectedSpot.name} (${selectedSpot.area}). Straight-line distance: ${selectedSpot.distanceFormatted}.`
                  )
                }
                className="py-3 px-4 bg-gray-100 rounded-2xl items-center border border-gray-200 flex-row gap-1 active:bg-gray-200"
              >
                <Ionicons name="navigate-outline" size={15} color="#374151" />
                <Text className="text-gray-800 font-bold text-xs">Route</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* LIST VIEW: SORTED BY PROXIMITY */
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
                key={spot.id}
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

                  <Text className="text-[11px] text-[#EA5410] font-bold mb-1.5" numberOfLines={1}>
                    Specialty: {spot.specialty}
                  </Text>

                  <View className="flex-row items-center gap-2">
                    <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black text-[#EA5410]">
                        {spot.distanceFormatted}
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
        onConfirmReservation={(data) => {
          createReservation({
            restaurantName: data.restaurantName,
            date: data.date,
            time: data.time,
            partySize: data.partySize,
            specialNotes: data.specialNotes,
          });
          Alert.alert(
            "Booking Request Submitted! 🗓️",
            `Your table reservation for ${data.partySize} guests at ${data.restaurantName} has been submitted for store confirmation.`
          );
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
