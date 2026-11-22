import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "../../../context/AuthContext";
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
import { createOrder } from "../../../services/orders";
import { createReservation } from "../../../services/reservations";
import { RestaurantProfileSheet } from "../../../components/restaurant/RestaurantProfileSheet";
import { CheckoutSheet, CheckoutConfirmedPayload } from "../../../components/checkout/CheckoutSheet";
import { ReservationSheet } from "../../../components/reservation/ReservationSheet";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import { FloatingCartBar } from "../../../components/cart/FloatingCartBar";
import { useCart } from "../../../context/CartContext";
import MatiInteractiveMap, { MapMarker } from "../../../components/map/MatiInteractiveMap";
import { fetchMatiRoadRoute, MatiRouteResult } from "../../../lib/mati-routing";
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
    category: "Meals",
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
    category: "Meals",
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
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const isWideMap = windowWidth >= 900;
  const isTwoColList = windowWidth >= 768;

  // Mati City Center default coordinates
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>(
    MATI_CITY_HALL_COORDS
  );
  const [locationName, setLocationName] = useState("Mati City Center (GPS loading...)");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | number | null>(
    EXPLORE_FALLBACK_SPOTS[0].id
  );
  const [cameraFocus, setCameraFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    key?: number | string;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<"closest" | "serviceable" | "open" | "all">(
    "closest"
  );
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Live Road Navigation & Routing State
  const [activeRoute, setActiveRoute] = useState<MatiRouteResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);

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
  const { addItem } = useCart();
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateAction, setGuestGateAction] = useState<string>("order food or reserve tables");
  const [fitRouteKey, setFitRouteKey] = useState(0);

  // Fetch real device location on mount
  useEffect(() => {
    requestUserLocation();
    loadLiveCatalog();
    const unsubStores = subscribeToStores(loadLiveCatalog);
    const unsubMenu = subscribeToAllMenuItems(loadLiveCatalog);
    return () => {
      unsubStores();
      unsubMenu();
    };
  }, []);

  // Live GPS tracking when an active route is open: keeps userLocation updated as device moves
  useEffect(() => {
    if (!activeRoute || !selectedSpotId) return;
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startLiveTracking = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 4000,
              distanceInterval: 10,
            },
            (newLoc) => {
              if (!isMounted) return;
              setUserLocation({
                latitude: newLoc.coords.latitude,
                longitude: newLoc.coords.longitude,
              });
            }
          );
        }
      } catch (e) {
        console.warn("Live GPS tracking watch error:", e);
      }
    };

    startLiveTracking();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [Boolean(activeRoute), selectedSpotId]);

  // Handle incoming deep link navigation (e.g. from table reservation "Directions")
  useEffect(() => {
    if ((params.storeId || params.storeName) && rawSpots.length > 0) {
      const target = rawSpots.find(
        (s) =>
          (params.storeId && String(s.storeId) === String(params.storeId)) ||
          (params.storeId && String(s.id) === String(params.storeId)) ||
          (params.storeName && s.name.toLowerCase().trim() === params.storeName.toLowerCase().trim())
      );
      if (target) {
        setSelectedSpotId(target.id);
        setViewMode("map");
        void handleComputeRouteToSpot(target);
      }
    }
  }, [params.storeId, params.storeName, rawSpots]);

  const loadLiveCatalog = async () => {
    try {
      const [liveStores, liveMenu] = await Promise.all([
        fetchLiveStores(),
        fetchLiveMenuItems(),
      ]);

      if (liveStores.length > 0) {
        const storeMap: Record<string, RestaurantProfile> = {};
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

  const applyUserLocation = (lat: number, lng: number, accuracy?: number) => {
    setUserLocation({ latitude: lat, longitude: lng });
    const isMatiRegion = lat >= 6.88 && lat <= 7.02 && lng >= 126.15 && lng <= 126.32;
    const accuracyNote = accuracy ? ` (±${Math.round(accuracy)}m)` : "";
    if (isMatiRegion) {
      setLocationName(`Your Location · Live GPS${accuracyNote}`);
    } else {
      setLocationName(`Your Location · ${lat.toFixed(4)}, ${lng.toFixed(4)}${accuracyNote}`);
    }

    // Immediately fly map camera right to the user's real coordinates
    setCameraFocus({
      latitude: lat,
      longitude: lng,
      zoom: 16,
      key: Date.now(),
    });
    setSelectedSpotId(null);
    setActiveRoute(null);
    setIsLocating(false);
  };

  const fallbackExpoLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Mati City Hall, Poblacion (Default GPS)");
        setIsLocating(false);
        Alert.alert(
          "Location Access Needed",
          "Please enable location services in your browser or device settings to view restaurants near your exact position."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      applyUserLocation(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy ?? undefined
      );
    } catch (err) {
      console.warn("Expo location fallback error:", err);
      setLocationName("Mati City Hall, Poblacion (Default GPS)");
      setIsLocating(false);
    }
  };

  const requestUserLocation = async () => {
    try {
      setIsLocating(true);

      // Web: Direct HTML5 Geolocation API with high accuracy
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyUserLocation(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.accuracy
            );
          },
          async (err) => {
            console.warn("Web navigator.geolocation returned error, trying expo fallback:", err.message);
            await fallbackExpoLocation();
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
        return;
      }

      await fallbackExpoLocation();
    } catch (e) {
      console.warn("Location request failed:", e);
      setLocationName("Mati City Hall, Poblacion (Default GPS)");
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

  const selectedSpot = selectedSpotId
    ? sortedSpots.find((s) => s.id === selectedSpotId) ||
      spotsWithEvaluation.find((s) => s.id === selectedSpotId) ||
      null
    : null;

  const mapMarkers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = sortedSpots.map((spot) => ({
      id: String(spot.id),
      latitude: spot.latitude,
      longitude: spot.longitude,
      title: spot.name,
      subtitle: `${spot.category} · ${spot.evaluation.roadDistanceKm.toFixed(1)} km (${spot.evaluation.roadRouteFormatted.replace(" road trip", "")})`,
      type: "store",
      color:
        selectedSpot?.id === spot.id
          ? "#EA5410"
          : spot.evaluation.isServiceable
          ? "#059669"
          : "#6B7280",
    }));

    list.push({
      id: "user-current-location",
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      title: "Your Location",
      subtitle: locationName,
      type: "customer",
      color: "#2563EB",
    });

    return list;
  }, [sortedSpots, selectedSpot?.id, userLocation.latitude, userLocation.longitude, locationName]);

  const handleComputeRouteToSpot = async (spot: ExploreSpotItem) => {
    setIsRouting(true);
    try {
      const route = await fetchMatiRoadRoute(userLocation, {
        latitude: spot.latitude,
        longitude: spot.longitude,
      });
      setActiveRoute(route);
      // Auto-fit bounds so map zooms in or out to fit user and destination
      setFitRouteKey((k) => k + 1);
    } catch (err) {
      console.warn("Mati road route calculation failed:", err);
    } finally {
      setIsRouting(false);
    }
  };

  const handleMarkerPress = (markerId: string) => {
    if (markerId === "user-current-location") {
      setCameraFocus({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: 16,
        key: Date.now(),
      });
      return;
    }
    setCameraFocus(null);
    const match = rawSpots.find(
      (s) => String(s.id) === markerId || String(s.storeId) === markerId
    );
    if (match) {
      setSelectedSpotId(match.id);
      if (activeRoute) {
        void handleComputeRouteToSpot(match);
      }
    }
  };

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
  const handlePlaceOrderFromSheet = async (orderPayload: CheckoutConfirmedPayload) => {
    const isUuid = (val?: string | null) =>
      typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    let targetStoreId =
      (orderPayload.storeId && isUuid(orderPayload.storeId) ? orderPayload.storeId : null) ||
      (orderPayload.dish?.storeId && isUuid(orderPayload.dish.storeId) ? orderPayload.dish.storeId : null);
    const targetStoreName = orderPayload.storeName || orderPayload.dish?.store || "";
    if (!targetStoreId && targetStoreName) {
      const match = Object.values(restaurants).find(
        (r: any) =>
          (r.name && r.name.toLowerCase().trim() === targetStoreName.toLowerCase().trim()) ||
          (r.id && r.name && r.name.toLowerCase().includes(targetStoreName.toLowerCase().trim()))
      ) as any;
      targetStoreId = match?.id && isUuid(match.id) ? match.id : null;
    }
    if (!targetStoreId) {
      targetStoreId = "11111111-1111-1111-1111-111111111111";
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
        deliveryAddress: orderPayload.address,
        barangay: orderPayload.barangay,
        notes: orderPayload.notes,
        voucherCode: orderPayload.voucherCode,
        voucherId: orderPayload.voucherId,
        discount: orderPayload.discount,
        bypassHoursCheck: true,
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
      <View className="px-4 pt-1.5 pb-2.5 bg-white border-b border-gray-100 shadow-xs">
        <View className="w-full max-w-6xl self-center">
        <View className="flex-row flex-wrap items-center justify-between gap-2 mb-1.5">
          <View className="flex-1 min-w-[160px]">
            <Text className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
              MATI CITY EXPLORE
            </Text>
            <Text className="text-base font-black text-gray-900 tracking-tight" numberOfLines={1}>
              Live Food Map & Nearby
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 shrink-0">
            {/* View Mode Dual-Segmented Switcher (Map vs List) */}
            <View className="flex-row items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200">
              <Pressable
                onPress={() => setViewMode("map")}
                className={`flex-row items-center gap-1 px-2.5 py-1 rounded-lg ${
                  viewMode === "map"
                    ? "bg-white shadow-2xs border border-gray-200/80"
                    : "opacity-60"
                }`}
                accessibilityRole="button"
                accessibilityLabel="Switch to Map View"
              >
                <Ionicons
                  name="map"
                  size={12}
                  color={viewMode === "map" ? "#EA5410" : "#4B5563"}
                />
                <Text
                  className={`text-[11px] font-black ${
                    viewMode === "map" ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  Map
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setViewMode("list")}
                className={`flex-row items-center gap-1 px-2.5 py-1 rounded-lg ${
                  viewMode === "list"
                    ? "bg-white shadow-2xs border border-gray-200/80"
                    : "opacity-60"
                }`}
                accessibilityRole="button"
                accessibilityLabel="Switch to List View"
              >
                <Ionicons
                  name="list"
                  size={12}
                  color={viewMode === "list" ? "#EA5410" : "#4B5563"}
                />
                <Text
                  className={`text-[11px] font-black ${
                    viewMode === "list" ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  List
                </Text>
              </Pressable>
            </View>

            {/* GPS Refresh */}
            <Pressable
              onPress={requestUserLocation}
              disabled={isLocating}
              accessibilityLabel="Refresh GPS location"
              className="w-7.5 h-7.5 rounded-full bg-orange-50 items-center justify-center border border-orange-200 active:bg-orange-100"
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#EA5410" />
              ) : (
                <Ionicons name="locate" size={15} color="#EA5410" />
              )}
            </Pressable>

            {/* If Guest: 1-Tap Sign In Pill */}
            {!isLoggedIn && (
              <Pressable
                onPress={() => router.push("/(mobile)/auth/customer-login")}
                className="bg-[#EA5410] px-3 py-1 rounded-xl flex-row items-center gap-1 shadow-xs active:opacity-90"
              >
                <Ionicons name="log-in-outline" size={13} color="white" />
                <Text className="text-white text-[11px] font-black">Sign In</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Current Location Strip */}
        <View className="flex-row items-center gap-1.5 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-200">
          <View className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <Text className="text-[11px] font-bold text-gray-900 flex-1" numberOfLines={1}>
            {locationName}
          </Text>
          <View className="bg-orange-100 px-1.5 py-0.2 rounded-full shrink-0">
            <Text className="text-[9px] font-black text-[#EA5410] uppercase">
              {spotsWithEvaluation.filter((s) => s.evaluation.isServiceable).length} deliverable
            </Text>
          </View>
        </View>

        {/* Proximity & Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 flex-row">
          <View className="flex-row gap-1.5 pr-4">
            <Pressable
              onPress={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-full border ${
                activeFilter === "all"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  activeFilter === "all" ? "text-white" : "text-gray-700"
                }`}
              >
                All ({spotsWithEvaluation.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter("closest")}
              className={`px-2.5 py-1 rounded-full border ${
                activeFilter === "closest"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  activeFilter === "closest" ? "text-white" : "text-gray-700"
                }`}
              >
                Near Me
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter("open")}
              className={`px-2.5 py-1 rounded-full border ${
                activeFilter === "open"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  activeFilter === "open" ? "text-white" : "text-gray-700"
                }`}
              >
                Open Now
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter("serviceable")}
              className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${
                activeFilter === "serviceable"
                  ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                  : "bg-white border-gray-200"
              }`}
            >
              <Ionicons
                name="bicycle"
                size={11}
                color={activeFilter === "serviceable" ? "white" : "#EA5410"}
              />
              <Text
                className={`text-[11px] font-bold ${
                  activeFilter === "serviceable" ? "text-white" : "text-gray-700"
                }`}
              >
                Deliverable
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        </View>
      </View>

      {/* 2. MAIN VIEW: MAP OR LIST */}
      {viewMode === "map" ? (
        <View
          className={`flex-1 w-full max-w-6xl self-center ${
            isWideMap ? "flex-row p-4 gap-4 items-stretch" : "flex-col"
          }`}
        >
          {/* Real Interactive Map Canvas */}
          <View
            className={`relative overflow-hidden ${
              isWideMap
                ? "flex-1 rounded-3xl border border-gray-200 shadow-sm min-h-[440px]"
                : selectedSpot
                ? "flex-1 rounded-b-2xl"
                : "h-[280px] rounded-b-2xl"
            }`}
          >
            <MatiInteractiveMap
              initialCenter={userLocation}
              zoom={14}
              markers={mapMarkers}
              selectedMarkerId={selectedSpot ? String(selectedSpot.id) : undefined}
              focusCoords={
                cameraFocus ||
                (selectedSpot && !activeRoute
                  ? {
                      latitude: selectedSpot.latitude,
                      longitude: selectedSpot.longitude,
                      zoom: 16,
                    }
                  : undefined)
              }
              fitRouteKey={fitRouteKey}
              fitRouteBounds={
                activeRoute && selectedSpot
                  ? {
                      key: fitRouteKey,
                      points:
                        activeRoute.polyline.length > 0
                          ? activeRoute.polyline
                          : [
                              userLocation,
                              {
                                latitude: selectedSpot.latitude,
                                longitude: selectedSpot.longitude,
                              },
                            ],
                    }
                  : undefined
              }
              routePolyline={activeRoute?.polyline || []}
              interactive={true}
              showLandmarks={true}
              height="100%"
              onMarkerPress={handleMarkerPress}
            />

            {/* Active Live Route Summary Pill Overlay (In-App GPS Navigation Only) */}
            {activeRoute && selectedSpot && (
              <View className="absolute top-3 left-3 right-3 bg-white/95 rounded-2xl p-3 border border-orange-200 shadow-md flex-row items-center justify-between z-20">
                <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                  <View className="w-8 h-8 rounded-full bg-[#EA5410] items-center justify-center">
                    <Ionicons name="navigate" size={16} color="white" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[11px] font-black text-gray-900" numberOfLines={1}>
                        In-App Directions to {selectedSpot.name}
                      </Text>
                      <View className="bg-orange-100 px-1.5 py-0.2 rounded">
                        <Text className="text-[9px] font-black text-[#EA5410]">
                          ~{activeRoute.estMinutes} mins
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[10px] text-gray-500 font-semibold" numberOfLines={1}>
                      {activeRoute.roadDistanceKm.toFixed(1)} km · Live Device GPS Navigation
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Pressable
                    onPress={() => setFitRouteKey((k) => k + 1)}
                    accessibilityLabel="Fit Route View"
                    className="px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl flex-row items-center gap-1 active:bg-orange-100"
                  >
                    <Ionicons name="scan-outline" size={13} color="#EA5410" />
                    <Text className="text-[11px] font-bold text-[#EA5410]">Fit View</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setActiveRoute(null)}
                    accessibilityLabel="Close Directions"
                    className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Bottom / Side Panel: Selected Spot Card OR Live Location + Nearest Recommendations Feed */}
          {selectedSpot ? (() => {
            const restoProfile =
              restaurants[selectedSpot.name] ||
              Object.values(restaurants).find(
                (r) => r.name.toLowerCase() === selectedSpot.name.toLowerCase()
              );
            const spotDishes = foodItems
              .filter(
                (d) =>
                  d.store?.toLowerCase() === selectedSpot.name.toLowerCase() ||
                  d.storeId === selectedSpot.id ||
                  d.storeId === (selectedSpot as any).storeId
              )
              .slice(0, 2);

            return (
              <View
                className={`bg-white rounded-2xl border border-gray-200 shadow-xl ${
                  isWideMap
                    ? "w-[360px] p-4 self-stretch justify-between"
                    : "mx-3 mb-2.5 mt-2 p-3.5"
                }`}
              >
                <View>
                  {/* Header: Photo, Name, Rating & Close */}
                  <View className="flex-row items-center gap-3 mb-2.5">
                    <Image
                      source={{ uri: selectedSpot.imageUrl }}
                      className="w-14 h-14 rounded-xl bg-gray-100"
                      resizeMode="cover"
                    />
                    <View className="flex-1 min-w-0 pr-1">
                      <View className="flex-row items-center justify-between gap-1 mb-0.5">
                        <Text
                          className="text-sm font-black text-gray-900 flex-1 leading-tight"
                          numberOfLines={1}
                        >
                          {selectedSpot.name}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setSelectedSpotId(null);
                            setActiveRoute(null);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Close preview"
                          className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                        >
                          <Ionicons name="close" size={13} color="#6B7280" />
                        </Pressable>
                      </View>

                      <Text className="text-[11px] text-gray-500 font-medium mb-1.5" numberOfLines={1}>
                        {selectedSpot.category} · {selectedSpot.area}
                      </Text>

                      {/* Clean info chips: Rating, Est. Travel Time, Open Tables */}
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          <Ionicons name="star" size={10} color="#D97706" />
                          <Text className="text-[10px] font-black text-amber-900">{selectedSpot.rating}</Text>
                        </View>
                        <View className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md flex-row items-center gap-1">
                          <Ionicons name="navigate-outline" size={10} color="#EA5410" />
                          <Text className="text-[10px] font-bold text-[#EA5410]">
                            {selectedSpot.evaluation.roadDistanceKm.toFixed(1)} km · {selectedSpot.evaluation.roadRouteFormatted.replace(" road trip", "")}
                          </Text>
                        </View>
                        <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-row items-center gap-1">
                          <Ionicons name="restaurant-outline" size={10} color="#047857" />
                          <Text className="text-[10px] font-bold text-emerald-800">
                            {restoProfile?.availableTables ?? 8} Tables Open
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Signature Dishes Preview with 1-Tap Add */}
                  {spotDishes.length > 0 && (
                    <View className="my-2 pt-2 border-t border-gray-100">
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Signature Dishes Preview
                      </Text>
                      <View className="gap-1.5">
                        {spotDishes.map((dish) => (
                          <View
                            key={dish.id}
                            className="flex-row items-center justify-between p-1.5 bg-gray-50/80 rounded-xl border border-gray-200/80"
                          >
                            <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
                              <Image
                                source={{
                                  uri:
                                    dish.imageUrl ||
                                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500",
                                }}
                                className="w-8 h-8 rounded-lg bg-gray-200 shrink-0"
                                resizeMode="cover"
                              />
                              <View className="flex-1 min-w-0">
                                <Text
                                  className="text-xs font-bold text-gray-900 leading-tight"
                                  numberOfLines={1}
                                >
                                  {dish.name}
                                </Text>
                                <Text className="text-[10px] text-[#EA5410] font-black">
                                  ₱{dish.price.toFixed(2)}
                                </Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() => {
                                addItem(dish, 1);
                                Alert.alert(
                                  "Added to Basket! 🛍️",
                                  `1x ${dish.name} added to your basket from ${selectedSpot.name}. Tap Store Profile or Cart to checkout.`,
                                  [{ text: "OK" }]
                                );
                              }}
                              className="px-2.5 py-1 bg-[#EA5410] rounded-lg flex-row items-center gap-1 active:opacity-90 shrink-0 shadow-xs"
                            >
                              <Ionicons name="add" size={12} color="white" />
                              <Text className="text-[10px] font-black text-white">Add</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* 3 Main Store Actions: Directions, Make Reservation & View Menu */}
                <View className="flex-row gap-1.5 pt-2.5 border-t border-gray-100">
                  <Pressable
                    onPress={() => {
                      if (activeRoute) {
                        setActiveRoute(null);
                      } else if (selectedSpot) {
                        void handleComputeRouteToSpot(selectedSpot);
                      }
                    }}
                    className={`flex-1 py-2 px-1 rounded-xl border flex-row items-center justify-center gap-1 active:opacity-90 ${
                      activeRoute
                        ? "bg-orange-50 border-[#EA5410]"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name={activeRoute ? "close-circle-outline" : "navigate-outline"}
                      size={13}
                      color={activeRoute ? "#EA5410" : "#374151"}
                    />
                    <Text
                      className={`font-black text-[11px] ${
                        activeRoute ? "text-[#EA5410]" : "text-gray-800"
                      }`}
                      numberOfLines={1}
                    >
                      {activeRoute ? "Clear Route" : "Directions"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleOpenReservation(selectedSpot.name)}
                    className="flex-1 py-2 px-1 bg-white border border-gray-200 rounded-xl flex-row items-center justify-center gap-1 active:bg-gray-50"
                  >
                    <Ionicons name="calendar-outline" size={13} color="#374151" />
                    <Text className="text-gray-800 font-bold text-[11px]" numberOfLines={1}>
                      Make Reservation
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const targetId = selectedSpot.storeId || String(selectedSpot.id);
                      router.push({
                        pathname: "/(mobile)/store/[id]",
                        params: { id: targetId, name: selectedSpot.name },
                      });
                    }}
                    className="flex-1 py-2 px-1 bg-[#EA5410] rounded-xl flex-row items-center justify-center gap-1 shadow-xs active:opacity-95"
                  >
                    <Ionicons name="storefront-outline" size={13} color="white" />
                    <Text className="text-white font-black text-[11px]" numberOfLines={1}>
                      Store Profile
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })() : (
            /* Welcoming Live Location Hub & Nearest Spots Recommendations when no store is selected */
            <ScrollView
              className={`flex-1 ${isWideMap ? "w-[360px]" : "w-full"}`}
              contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Live Location & Service Area Status Card */}
              <View className="bg-white rounded-2xl border border-blue-200/80 p-3 shadow-xs mb-3">
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2 flex-1 mr-2">
                    <View className="w-7 h-7 rounded-lg bg-blue-500/10 items-center justify-center shrink-0">
                      <Ionicons name="navigate" size={14} color="#2563EB" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">
                        YOUR CURRENT POSITION
                      </Text>
                      <Text className="text-xs font-black text-gray-900" numberOfLines={1}>
                        {locationName}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={requestUserLocation}
                    className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg flex-row items-center gap-1 active:bg-blue-100 shrink-0"
                  >
                    <Ionicons name="locate" size={12} color="#2563EB" />
                    <Text className="text-[10px] font-bold text-blue-700">Recenter</Text>
                  </Pressable>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-1">
                  <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                    <Text className="text-[10px] font-bold text-emerald-800">
                      {spotsWithEvaluation.filter((s) => s.evaluation.isServiceable).length} Delivery Spots Available
                    </Text>
                  </View>
                  <Text className="text-[10px] text-gray-500 font-medium">
                    Mati City Service Area
                  </Text>
                </View>
              </View>

              {/* 2. Nearest Recommendations Header */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs font-black text-gray-900">
                    Nearest Dining Spots
                  </Text>
                  <View className="bg-orange-100 px-1.5 py-0.2 rounded-full">
                    <Text className="text-[9px] font-black text-[#EA5410]">TOP PICKS</Text>
                  </View>
                </View>
                <Text className="text-[10px] text-gray-400">Tap pin or card to preview</Text>
              </View>

              {/* 3. Top Nearest Spots Cards */}
              <View className="gap-2">
                {sortedSpots.slice(0, 3).map((spot) => (
                  <Pressable
                    key={String(spot.id)}
                    onPress={() => {
                      setSelectedSpotId(spot.id);
                      setCameraFocus({
                        latitude: spot.latitude,
                        longitude: spot.longitude,
                        zoom: 16,
                        key: Date.now(),
                      });
                    }}
                    className="bg-white rounded-2xl border border-gray-200/90 p-2.5 shadow-xs flex-row items-center gap-2.5 active:bg-orange-50/50"
                  >
                    <Image
                      source={{ uri: spot.imageUrl }}
                      style={{ width: 48, height: 48, borderRadius: 12 }}
                      className="bg-gray-100 shrink-0"
                      resizeMode="cover"
                    />
                    <View className="flex-1 min-w-0 pr-1">
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text className="text-xs font-black text-gray-900 flex-1 mr-1" numberOfLines={1}>
                          {spot.name}
                        </Text>
                        <View className="bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex-row items-center gap-0.5">
                          <Ionicons name="star" size={9} color="#D97706" />
                          <Text className="text-[10px] font-black text-amber-900">{spot.rating}</Text>
                        </View>
                      </View>
                      <Text className="text-[10px] text-gray-500 font-medium mb-1" numberOfLines={1}>
                        {spot.category} · {spot.area}
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <View className="bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded">
                          <Text className="text-[9px] font-bold text-[#EA5410]">
                            {spot.evaluation.roadDistanceKm.toFixed(1)} km · {spot.evaluation.roadRouteFormatted.replace(" road trip", "")}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-gray-500 font-medium">
                          {spot.deliveryEnabled ? `₱${spot.deliveryFee} delivery` : "Dine-in"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : (
        /* LIST VIEW: SORTED BY PROXIMITY & SERVICEABILITY */
        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-5xl self-center">
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

          <View className="flex-row flex-wrap gap-2.5">
            {sortedSpots.map((spot) => {
              const targetId = spot.storeId || String(spot.id);
              return (
                <Pressable
                  key={String(spot.id)}
                  onPress={() => {
                    router.push({
                      pathname: "/(mobile)/store/[id]",
                      params: { id: targetId, name: spot.name },
                    });
                  }}
                  style={isTwoColList ? { width: "48.8%" } : { width: "100%" }}
                  className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs flex-row items-center gap-2.5 active:bg-orange-50/40"
                >
                  <Image
                    source={{ uri: spot.imageUrl }}
                    className="w-16 h-16 rounded-xl bg-gray-100"
                    resizeMode="cover"
                  />

                  <View className="flex-1 pr-1">
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="font-black text-gray-900 text-xs flex-1 mr-1" numberOfLines={1}>
                        {spot.name}
                      </Text>
                      <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <Text className="text-[8px] font-bold text-emerald-800">
                          {spot.open ? "Open" : "Closed"}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-[11px] text-gray-500 font-medium mb-1.5" numberOfLines={1}>
                      {spot.area} · {spot.category}
                    </Text>

                    <View className="flex-row items-center gap-1.5">
                      <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        <Ionicons name="star" size={9} color="#D97706" />
                        <Text className="text-[10px] font-black text-amber-900">{spot.rating}</Text>
                      </View>
                      <View className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] font-bold text-[#EA5410]">
                          {spot.evaluation.roadDistanceKm.toFixed(1)} km · {spot.evaluation.roadRouteFormatted.replace(" road trip", "")}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-gray-500 font-medium">
                        {spot.deliveryEnabled ? `₱${spot.deliveryFee} delivery` : "Dine-in"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
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
          if (activeRestaurant) {
            const spotMatch = rawSpots.find(
              (s) => s.name.toLowerCase() === activeRestaurant.name.toLowerCase()
            );
            if (spotMatch) {
              setSelectedSpotId(spotMatch.id);
            }
          }
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
          const isUuid = (val?: string | null) =>
            typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
          const storeEntry = Object.values(restaurants).find(
            (s) => s.name.toLowerCase() === data.restaurantName.toLowerCase()
          );
          const storeId = (storeEntry?.id && isUuid(storeEntry.id) ? storeEntry.id : null) || "11111111-1111-1111-1111-111111111111";
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

      {/* Floating Bottom Basket Pill */}
      <FloatingCartBar onPress={() => setShowCheckoutModal(true)} />
    </SafeAreaView>
  );
}
