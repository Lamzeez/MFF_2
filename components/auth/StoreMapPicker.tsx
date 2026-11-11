import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { MATI_CITY_HALL_COORDS } from "../../lib/geo-serviceability";

export interface StoreMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  onError?: (message: string) => void;
  onClearError?: () => void;
}

export default function StoreMapPicker({
  latitude,
  longitude,
  onChange,
  onError,
  onClearError,
}: StoreMapPickerProps) {
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    onClearError?.();
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        onError?.("Location permission denied. Select a Barangay to center your store pin.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onClearError?.();
      onChange(
        Number(pos.coords.latitude.toFixed(6)),
        Number(pos.coords.longitude.toFixed(6))
      );
    } catch {
      onError?.("Could not read GPS location. Using current pin coordinates.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
      <View className="flex-row items-center justify-between gap-2 mb-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-6 h-6 rounded-md bg-orange-100 items-center justify-center">
            <Ionicons name="location" size={13} color="#EA5410" />
          </View>
          <View>
            <Text className="text-xs font-semibold text-gray-900">Store Pinpoint Coordinates</Text>
            <Text className="text-[11px] text-gray-500">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={locating}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 flex-row items-center gap-1.5"
        >
          {locating ? (
            <ActivityIndicator size="small" color="#EA5410" />
          ) : (
            <Ionicons name="locate-outline" size={13} color="#EA5410" />
          )}
          <Text className="text-[11px] font-semibold text-gray-700">Use Current Location</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          onClearError?.();
          onChange(MATI_CITY_HALL_COORDS.latitude, MATI_CITY_HALL_COORDS.longitude);
        }}
        className="py-2 px-3 rounded-lg bg-white border border-gray-200 items-center"
      >
        <Text className="text-[11px] text-gray-500">
          Pin drops at your chosen Barangay centroid or GPS position.
        </Text>
      </Pressable>
    </View>
  );
}
