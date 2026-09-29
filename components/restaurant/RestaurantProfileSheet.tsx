import React from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantProfile } from "../../types/restaurant";

interface RestaurantProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  restaurant: RestaurantProfile | null;
  onBookTable: (restaurantName: string) => void;
  onViewMap: () => void;
}

export function RestaurantProfileSheet({
  visible,
  onClose,
  restaurant,
  onBookTable,
  onViewMap,
}: RestaurantProfileSheetProps) {
  if (!restaurant) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View className="flex-row items-center gap-2.5">
              <View className="w-12 h-12 rounded-2xl bg-gray-100 items-center justify-center text-2xl">
                <Text className="text-2xl">{restaurant.emoji}</Text>
              </View>
              <View>
                <Text className="text-lg font-black text-gray-900">{restaurant.name}</Text>
                <Text className="text-xs text-emerald-700 font-bold">{restaurant.category}</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            <Text className="text-xs text-gray-600 leading-relaxed mb-4">
              {restaurant.description}
            </Text>

            {/* Info Badges */}
            <View className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 gap-2.5 mb-5">
              <View className="flex-row items-center gap-2">
                <Ionicons name="star" size={15} color="#f59e0b" />
                <Text className="text-xs font-bold text-gray-800">
                  Rating: {restaurant.rating} / 5.0 (Mati FoodFinder verified)
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="location-outline" size={15} color="#047857" />
                <Text className="text-xs text-gray-700 font-medium">{restaurant.address}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="time-outline" size={15} color="#6b7280" />
                <Text className="text-xs text-gray-700 font-medium">Hours: {restaurant.hours}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="call-outline" size={15} color="#2563eb" />
                <Text className="text-xs text-gray-700 font-medium">{restaurant.phone}</Text>
              </View>
              <View className="flex-row items-center gap-2 pt-1 border-t border-gray-200">
                <Ionicons name="restaurant-outline" size={15} color="#047857" />
                <Text className="text-xs font-extrabold text-emerald-800">
                  {restaurant.availableTables} Tables Available for Dining Reservation
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View className="gap-2.5 mb-6">
              <Pressable
                onPress={() => onBookTable(restaurant.name)}
                className="bg-emerald-700 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs"
              >
                <Ionicons name="calendar-outline" size={18} color="white" />
                <Text className="text-white font-extrabold text-sm">Book a Dining Table Here</Text>
              </Pressable>

              <Pressable
                onPress={onViewMap}
                className="bg-gray-100 py-3 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Ionicons name="navigate-outline" size={16} color="#374151" />
                <Text className="text-gray-800 font-bold text-xs">View Location on Map</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
