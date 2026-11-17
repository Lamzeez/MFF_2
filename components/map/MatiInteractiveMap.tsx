/**
 * components/map/MatiInteractiveMap.tsx
 *
 * Native (iOS/Android) fallback for MatiInteractiveMap.
 * Renders consistent Mati landmarks, pins, and street layout using native views.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GeoCoordinates, MATI_CITY_HALL_COORDS, projectGeoToMapPercent } from "../../lib/geo-serviceability";
import { RouteCoordinate } from "../../lib/mati-routing";
import type { MapMarker } from "./MatiInteractiveMap.web";

export type { MapMarker } from "./MatiInteractiveMap.web";

export interface MatiInteractiveMapProps {
  initialCenter?: GeoCoordinates;
  zoom?: number;
  markers?: MapMarker[];
  selectedMarkerId?: string;
  focusCoords?: { latitude: number; longitude: number; zoom?: number; key?: number | string };
  fitRouteKey?: number | string;
  fitRouteBounds?: { key: number | string; points: RouteCoordinate[] };
  routePolyline?: RouteCoordinate[];
  liveRider?: {
    latitude: number;
    longitude: number;
    heading?: number;
  };
  showLandmarks?: boolean;
  interactive?: boolean;
  height?: DimensionValue;
  onMapClick?: (coords: GeoCoordinates) => void;
  onMarkerPress?: (id: string) => void;
}

export default function MatiInteractiveMap({
  markers = [],
  selectedMarkerId,
  liveRider,
  showLandmarks = true,
  height = 280,
  onMarkerPress,
}: MatiInteractiveMapProps) {
  const riderPercent = liveRider
    ? projectGeoToMapPercent(liveRider.latitude, liveRider.longitude)
    : null;

  return (
    <View style={[styles.container, { height }]}>
      {/* Grid Pattern */}
      <View className="absolute inset-0 opacity-20 flex-row flex-wrap pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <View key={i} className="w-1/4 h-20 border border-slate-300" />
        ))}
      </View>

      {/* Mati Landmarks */}
      {showLandmarks && (
        <>
          <View className="absolute bottom-2 left-2 bg-white/95 px-2 py-0.5 rounded-lg border border-gray-200 flex-row items-center gap-1 z-10">
            <Text className="text-[10px]">🌊</Text>
            <Text className="text-[9px] font-black text-gray-800">Pujada Bay</Text>
          </View>
          <View className="absolute bottom-2 right-2 bg-white/95 px-2 py-0.5 rounded-lg border border-gray-200 flex-row items-center gap-1 z-10">
            <Text className="text-[10px]">🏖️</Text>
            <Text className="text-[9px] font-black text-gray-800">Dahican Beach</Text>
          </View>
          <View className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-lg border border-gray-200 flex-row items-center gap-1 z-10">
            <Text className="text-[10px]">🏛️</Text>
            <Text className="text-[9px] font-black text-gray-800">Mati City Hall</Text>
          </View>
        </>
      )}

      {/* Markers */}
      {markers.map((m) => {
        const { xPercent, yPercent } = projectGeoToMapPercent(m.latitude, m.longitude);
        const isUser = m.id === "user-current-location" || m.type === ("user" as any);
        const isStore = m.type === "store";
        const isCustomer = m.type === "customer" && !isUser;

        return (
          <Pressable
            key={m.id}
            onPress={() => onMarkerPress?.(m.id)}
            style={{
              position: "absolute",
              left: `${xPercent}%`,
              top: `${yPercent}%`,
              transform: [{ translateX: -16 }, { translateY: -16 }],
            }}
            className="items-center z-20"
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-md ${
                isUser
                  ? "bg-blue-600 shadow-blue-500/50"
                  : isStore
                  ? "bg-[#EA5410]"
                  : isCustomer
                  ? "bg-emerald-600"
                  : "bg-amber-500"
              }`}
            >
              <Text className="text-xs">{isUser ? "📍" : isStore ? "🍽️" : isCustomer ? "🏡" : "📍"}</Text>
            </View>
            {m.title && (
              <View className="bg-white/95 px-1.5 py-0.5 rounded shadow-xs border border-gray-200 mt-0.5">
                <Text className="text-[9px] font-black text-gray-800 truncate" numberOfLines={1}>
                  {m.title}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Live Rider Marker */}
      {riderPercent && (
        <View
          style={{
            position: "absolute",
            left: `${riderPercent.xPercent}%`,
            top: `${riderPercent.yPercent}%`,
            transform: [{ translateX: -18 }, { translateY: -18 }],
          }}
          className="items-center z-30"
        >
          <View className="w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-lg items-center justify-center">
            <Text className="text-sm">🛵</Text>
          </View>
          <View className="bg-blue-600 px-1.5 py-0.5 rounded-full mt-0.5">
            <Text className="text-[8px] font-black text-white uppercase">You</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
});
