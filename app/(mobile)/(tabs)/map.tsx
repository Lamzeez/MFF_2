import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

// Coordinates for food spots around Mati City
const RESTAURANTS = [
  {
    id: 1,
    name: "Mama Letty's Karenderia",
    category: "Home-style Karenderia",
    latitude: 6.9552,
    longitude: 126.2168,
    area: "Central Public Market",
    rating: "4.8",
    open: true,
    specialty: "Pork Humba, Chicken Adobo & Sinigang",
    estDeliveryTime: "15-20 mins",
  },
  {
    id: 2,
    name: "Mati Baywalk Seafood Grill",
    category: "Seafood & Grill",
    latitude: 6.9490,
    longitude: 126.2240,
    area: "Mati Baywalk Park",
    rating: "4.9",
    open: true,
    specialty: "Grilled Tuna Panga & Kinilaw na Isda",
    estDeliveryTime: "25-35 mins",
  },
  {
    id: 3,
    name: "Dahican Beach Surf Bites",
    category: "Beachfront Cafe & Fast Food",
    latitude: 6.9200,
    longitude: 126.2750,
    area: "Dahican Coastline",
    rating: "4.7",
    open: true,
    specialty: "Seafood Pasta, Burgers & Smoothies",
    estDeliveryTime: "30-40 mins",
  },
  {
    id: 4,
    name: "Aling Nena's Native Eatery",
    category: "Budget Karenderia",
    latitude: 6.9620,
    longitude: 126.2100,
    area: "Madang District",
    rating: "4.6",
    open: false,
    specialty: "Native Chicken Tinola & Balbacua",
    estDeliveryTime: "20-30 mins",
  },
  {
    id: 5,
    name: "Subangan Cultural BBQ",
    category: "Grill & Merienda",
    latitude: 6.9420,
    longitude: 126.2300,
    area: "Subangan Museum Grounds",
    rating: "4.9",
    open: true,
    specialty: "Pork BBQ Skewers & Isaw",
    estDeliveryTime: "15-25 mins",
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
  const router = useRouter();

  // Mati City Center default coordinates
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 6.9540,
    longitude: 126.2180,
  });
  const [locationName, setLocationName] = useState("Mati City Center (GPS loading...)");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "closest" | "open">("closest");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Fetch real device location on mount
  useEffect(() => {
    requestUserLocation();
  }, []);

  const requestUserLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Mati City Center (Permission default)");
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
    } catch (err) {
      setLocationName("Mati City Center");
    } finally {
      setIsLocating(false);
    }
  };

  // Compute live distances to user
  const spotsWithDistance = RESTAURANTS.map((spot) => {
    const dist = calculateDistanceKm(
      userLocation.latitude,
      userLocation.longitude,
      spot.latitude,
      spot.longitude
    );
    return {
      ...spot,
      distanceKm: dist,
      distanceFormatted: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
    };
  });

  // Sort / Filter spots
  const sortedSpots = [...spotsWithDistance].sort((a, b) => {
    if (activeFilter === "closest") return a.distanceKm - b.distanceKm;
    if (activeFilter === "open") return (b.open ? 1 : 0) - (a.open ? 1 : 0);
    return 0;
  });

  const selectedSpot = sortedSpots.find((s) => s.id === selectedSpotId) || sortedSpots[0];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 shadow-xs">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Mati City Live Map</Text>
            <Text className="text-lg font-black text-gray-900">Nearby Karenderias</Text>
          </View>

          <View className="flex-row items-center gap-2">
            {/* View Mode Switcher */}
            <Pressable
              onPress={() => setViewMode(viewMode === "map" ? "list" : "map")}
              className="flex-row items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200"
            >
              <Ionicons name={viewMode === "map" ? "list" : "map"} size={14} color="#374151" />
              <Text className="text-xs font-bold text-gray-700">
                {viewMode === "map" ? "List" : "Map"}
              </Text>
            </Pressable>

            {/* GPS Refresh */}
            <Pressable
              onPress={requestUserLocation}
              disabled={isLocating}
              className="bg-emerald-50 w-8 h-8 rounded-full items-center justify-center border border-emerald-200"
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#047857" />
              ) : (
                <Ionicons name="locate" size={16} color="#047857" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Current Location Badge */}
        <View className="flex-row items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
          <Text className="text-xs font-bold text-emerald-900 flex-1 truncate">
            {locationName}
          </Text>
          <Text className="text-[10px] font-bold text-emerald-700 uppercase">
            {sortedSpots.filter((s) => s.open).length} open near you
          </Text>
        </View>

        {/* Filters */}
        <View className="flex-row gap-2 mt-2.5">
          <Pressable
            onPress={() => setActiveFilter("closest")}
            className={`px-3 py-1 rounded-full border ${
              activeFilter === "closest" ? "bg-emerald-700 border-emerald-700" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-[11px] font-bold ${activeFilter === "closest" ? "text-white" : "text-gray-600"}`}>
              Closest to Me
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter("open")}
            className={`px-3 py-1 rounded-full border ${
              activeFilter === "open" ? "bg-emerald-700 border-emerald-700" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-[11px] font-bold ${activeFilter === "open" ? "text-white" : "text-gray-600"}`}>
              Open Now
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full border ${
              activeFilter === "all" ? "bg-emerald-700 border-emerald-700" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-[11px] font-bold ${activeFilter === "all" ? "text-white" : "text-gray-600"}`}>
              All ({sortedSpots.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main View: Map or List */}
      {viewMode === "map" ? (
        <View className="flex-1">
          {/* Visual Map Surface */}
          <View className="flex-1 bg-emerald-950/10 items-center justify-center relative overflow-hidden">
            
            {/* Street Grid pattern */}
            <View className="absolute inset-0 opacity-15 flex-row flex-wrap">
              {[...Array(28)].map((_, i) => (
                <View key={i} className="w-1/4 h-24 border border-emerald-900/30" />
              ))}
            </View>

            {/* Geographical Mati Landmarks */}
            <View className="absolute top-4 left-5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg shadow-xs">
              <Text className="text-[10px] font-bold text-emerald-900">🌊 Pujada Bay</Text>
            </View>
            <View className="absolute top-12 right-5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg shadow-xs">
              <Text className="text-[10px] font-bold text-emerald-900">🏖️ Dahican Beach</Text>
            </View>
            <View className="absolute bottom-52 left-6 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg shadow-xs">
              <Text className="text-[10px] font-bold text-emerald-900">🏛️ Mati City Hall</Text>
            </View>

            {/* YOU ARE HERE - Pulsing Blue GPS Marker */}
            <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center z-30">
              <View className="w-10 h-10 rounded-full bg-blue-500/25 items-center justify-center animate-ping absolute" />
              <View className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md items-center justify-center">
                <View className="w-2 h-2 rounded-full bg-white" />
              </View>
              <View className="bg-blue-600 px-2 py-0.5 rounded-full mt-1 shadow-xs">
                <Text className="text-[9px] font-black text-white">YOU ARE HERE</Text>
              </View>
            </View>

            {/* Food Spot Pins on Map */}
            <View className="w-full h-full relative">
              
              {/* Pin 1 - Mama Letty's */}
              <Pressable 
                onPress={() => setSelectedSpotId(1)}
                className="absolute top-1/3 left-1/4 items-center z-20"
              >
                <View className={`px-2 py-0.5 rounded-md shadow-md mb-0.5 ${selectedSpotId === 1 ? 'bg-orange-500 scale-110' : 'bg-white'}`}>
                  <Text className={`text-[9px] font-black ${selectedSpotId === 1 ? 'text-white' : 'text-gray-900'}`}>
                    Mama Letty's • {spotsWithDistance.find(s => s.id === 1)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons name="restaurant" size={selectedSpotId === 1 ? 30 : 22} color={selectedSpotId === 1 ? "#ea580c" : "#047857"} />
              </Pressable>

              {/* Pin 2 - Baywalk Seafood */}
              <Pressable 
                onPress={() => setSelectedSpotId(2)}
                className="absolute top-3/5 left-1/2 items-center z-20"
              >
                <View className={`px-2 py-0.5 rounded-md shadow-md mb-0.5 ${selectedSpotId === 2 ? 'bg-orange-500 scale-110' : 'bg-white'}`}>
                  <Text className={`text-[9px] font-black ${selectedSpotId === 2 ? 'text-white' : 'text-gray-900'}`}>
                    Baywalk Seafood • {spotsWithDistance.find(s => s.id === 2)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons name="restaurant" size={selectedSpotId === 2 ? 30 : 22} color={selectedSpotId === 2 ? "#ea580c" : "#047857"} />
              </Pressable>

              {/* Pin 3 - Dahican Beach Surf Bites */}
              <Pressable 
                onPress={() => setSelectedSpotId(3)}
                className="absolute top-1/4 right-8 items-center z-20"
              >
                <View className={`px-2 py-0.5 rounded-md shadow-md mb-0.5 ${selectedSpotId === 3 ? 'bg-orange-500 scale-110' : 'bg-white'}`}>
                  <Text className={`text-[9px] font-black ${selectedSpotId === 3 ? 'text-white' : 'text-gray-900'}`}>
                    Surf Bites • {spotsWithDistance.find(s => s.id === 3)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons name="restaurant" size={selectedSpotId === 3 ? 30 : 22} color={selectedSpotId === 3 ? "#ea580c" : "#047857"} />
              </Pressable>

              {/* Pin 5 - Subangan BBQ */}
              <Pressable 
                onPress={() => setSelectedSpotId(5)}
                className="absolute bottom-56 right-1/3 items-center z-20"
              >
                <View className={`px-2 py-0.5 rounded-md shadow-md mb-0.5 ${selectedSpotId === 5 ? 'bg-orange-500 scale-110' : 'bg-white'}`}>
                  <Text className={`text-[9px] font-black ${selectedSpotId === 5 ? 'text-white' : 'text-gray-900'}`}>
                    Subangan BBQ • {spotsWithDistance.find(s => s.id === 5)?.distanceFormatted}
                  </Text>
                </View>
                <Ionicons name="restaurant" size={selectedSpotId === 5 ? 30 : 22} color={selectedSpotId === 5 ? "#ea580c" : "#047857"} />
              </Pressable>

            </View>

          </View>

          {/* Selected Restaurant Bottom Card */}
          <View className="p-4 bg-white border-t border-gray-200 shadow-xl">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-base font-black text-gray-900">{selectedSpot.name}</Text>
                  <View className={`px-2 py-0.5 rounded ${selectedSpot.open ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                    <Text className={`text-[9px] font-bold ${selectedSpot.open ? 'text-emerald-800' : 'text-gray-600'}`}>
                      {selectedSpot.open ? "Open Now" : "Closed"}
                    </Text>
                  </View>
                </View>
                
                <Text className="text-xs text-gray-500 font-medium mb-1">
                  {selectedSpot.category} • {selectedSpot.area}
                </Text>
                <Text className="text-xs text-orange-600 font-bold">
                  🔥 Best Seller: {selectedSpot.specialty}
                </Text>
              </View>

              <View className="items-end">
                <View className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 mb-1">
                  <Text className="text-xs font-black text-emerald-800">{selectedSpot.distanceFormatted}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={11} color="#f59e0b" />
                  <Text className="text-[11px] font-bold text-gray-700">{selectedSpot.rating}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-3 mt-2 pt-2 border-t border-gray-100">
              <Pressable 
                onPress={() => router.push("/(mobile)/(tabs)")}
                className="flex-1 py-2.5 bg-emerald-700 rounded-xl items-center shadow-xs"
              >
                <Text className="text-white font-bold text-xs">View Live Menu & Order</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => alert(`Starting turn-by-turn navigation to ${selectedSpot.name} (${selectedSpot.area}). Distance: ${selectedSpot.distanceFormatted}.`)}
                className="py-2.5 px-4 bg-gray-100 rounded-xl items-center border border-gray-200 flex-row gap-1"
              >
                <Ionicons name="navigate-outline" size={14} color="#374151" />
                <Text className="text-gray-700 font-bold text-xs">Route</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* List View: Sorted by proximity */
        <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 30 }}>
          <Text className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
            Restaurants Sorted by Distance from You
          </Text>

          <View className="gap-3">
            {sortedSpots.map((spot) => (
              <Pressable
                key={spot.id}
                onPress={() => {
                  setSelectedSpotId(spot.id);
                  setViewMode("map");
                }}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex-row justify-between items-center"
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="font-extrabold text-gray-900 text-sm">{spot.name}</Text>
                    <View className={`px-1.5 py-0.5 rounded ${spot.open ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <Text className={`text-[9px] font-bold ${spot.open ? 'text-emerald-800' : 'text-gray-500'}`}>
                        {spot.open ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-500 mb-1">{spot.area} • {spot.category}</Text>
                  <Text className="text-[11px] text-orange-600 font-medium">Specialty: {spot.specialty}</Text>
                </View>

                <View className="items-end">
                  <View className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 mb-1">
                    <Text className="text-xs font-black text-emerald-800">{spot.distanceFormatted}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-400 font-medium">Tap to see on Map →</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}
