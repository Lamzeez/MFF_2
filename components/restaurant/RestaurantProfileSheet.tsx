import React from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantProfile, FoodItem } from "../../types/restaurant";
import { BottomSheetModal } from "../ui/BottomSheetModal";

interface RestaurantProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  restaurant: RestaurantProfile | null;
  onBookTable: (restaurantName: string) => void;
  onViewMap: () => void;
  menuItems?: FoodItem[];
  onSelectDish?: (dish: FoodItem) => void;
}

export function RestaurantProfileSheet({
  visible,
  onClose,
  restaurant,
  onBookTable,
  onViewMap,
  menuItems = [],
  onSelectDish,
}: RestaurantProfileSheetProps) {
  if (!restaurant) return null;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.88}>
      {({ handleDismiss }) => (
        <View className="flex-1 bg-white">
          {/* 1. HERO COVER BANNER WITH DRAG PILL & BADGES */}
          <View className="h-52 w-full relative bg-gray-100">
            {/* Visual Drag Handle Pill */}
            <View className="absolute top-2.5 self-center z-20 w-12 h-1.5 rounded-full bg-white/80 shadow-xs" />

            <Image
              source={{
                uri:
                  restaurant.imageUrl ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Dark Gradient Overlay for Badge Legibility */}
            <View className="absolute inset-0 bg-black/25" />

            {/* Top Bar with Badges and Close Button */}
            <View className="absolute top-5 left-4 right-4 flex-row items-center justify-between z-10">
              <View className="flex-row items-center gap-2">
                <View className="bg-white/95 px-3 py-1 rounded-full shadow-sm flex-row items-center gap-1.5">
                  <Ionicons name="star" size={13} color="#D97706" />
                  <Text className="text-xs font-black text-gray-900">{restaurant.rating}</Text>
                  <Text className="text-[10px] font-bold text-gray-500">
                    ({restaurant.reviews || 120})
                  </Text>
                </View>

                <View className="bg-white/95 px-3 py-1 rounded-full shadow-sm flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={13} color="#EA5410" />
                  <Text className="text-xs font-bold text-gray-800">
                    {restaurant.deliveryTime || "20-30 min"}
                  </Text>
                </View>
              </View>

              {/* Close Button that smoothly dismisses */}
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close restaurant sheet"
                className="w-9 h-9 rounded-full bg-white/95 items-center justify-center shadow-md active:bg-white"
              >
                <Ionicons name="close" size={20} color="#1F2937" />
              </Pressable>
            </View>

            {/* Bottom Overlay Pill: Delivery Fee */}
            <View className="absolute bottom-3 left-4 bg-gray-900/90 px-3 py-1 rounded-full flex-row items-center gap-1.5">
              <Ionicons name="bicycle" size={13} color="#EA5410" />
              <Text className="text-[11px] font-extrabold text-white">
                ₱{restaurant.deliveryFee || 35} Flat Mati Delivery
              </Text>
            </View>
          </View>

          {/* 2. SCROLLABLE RESTAURANT BODY */}
          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Store Name, Badges & Category */}
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-2xl font-black text-gray-900 tracking-tight flex-1 mr-2">
                  {restaurant.name}
                </Text>
                <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
                  <Ionicons name="checkmark-circle" size={13} color="#047857" />
                  <Text className="text-[11px] font-bold text-emerald-800">Verified</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[11px] font-bold text-[#EA5410]">
                    {restaurant.category}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 font-medium">· Mati City Local Partner</Text>
              </View>
            </View>

            {/* Store Description */}
            <Text className="text-xs text-gray-600 leading-relaxed mb-4">
              {restaurant.description}
            </Text>

            {/* Store Information Grid */}
            <View className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 mb-5 gap-2.5">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-orange-100/70 items-center justify-center">
                  <Ionicons name="location-outline" size={16} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Location / Address
                  </Text>
                  <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>
                    {restaurant.address}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-orange-100/70 items-center justify-center">
                  <Ionicons name="time-outline" size={16} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Operating Hours
                  </Text>
                  <Text className="text-xs font-bold text-gray-800">
                    {restaurant.hours}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-orange-100/70 items-center justify-center">
                  <Ionicons name="call-outline" size={16} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Contact / Inquiries
                  </Text>
                  <Text className="text-xs font-bold text-gray-800">
                    {restaurant.phone}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2.5 pt-2 border-t border-gray-200">
                <View className="w-8 h-8 rounded-xl bg-emerald-100/80 items-center justify-center">
                  <Ionicons name="restaurant-outline" size={16} color="#047857" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Table Reservation
                  </Text>
                  <Text className="text-xs font-extrabold text-emerald-800">
                    {restaurant.availableTables} Tables Available for Dine-in
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. SIGNATURE DISHES & MENU SECTION */}
            <View className="mb-5">
              <View className="mb-3">
                <Text className="text-base font-black text-gray-900 tracking-tight">
                  Signature Menu & Popular Dishes
                </Text>
                <Text className="text-[11px] text-gray-500">
                  Tap any dish to order Cash on Delivery or pickup
                </Text>
              </View>

              {menuItems && menuItems.length > 0 ? (
                <View className="gap-2.5">
                  {menuItems.map((dish) => (
                    <Pressable
                      key={dish.id}
                      onPress={() => onSelectDish && onSelectDish(dish)}
                      className="bg-white border border-gray-200 rounded-2xl p-3 flex-row items-center gap-3 active:bg-orange-50/50 shadow-xs"
                    >
                      <Image
                        source={{
                          uri:
                            dish.imageUrl ||
                            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                        }}
                        className="w-18 h-18 rounded-xl bg-gray-100"
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <Text className="text-xs font-black text-gray-900 leading-tight" numberOfLines={1}>
                          {dish.name}
                        </Text>
                        <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                          {dish.category}
                        </Text>
                        <Text className="text-sm font-black text-[#EA5410] mt-1">
                          ₱{dish.price.toFixed(2)}
                        </Text>
                      </View>
                      <View className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl flex-row items-center gap-1">
                        <Ionicons name="add" size={14} color="#EA5410" />
                        <Text className="text-xs font-black text-[#EA5410]">Order</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 items-center">
                  <Ionicons name="restaurant-outline" size={24} color="#9CA3AF" />
                  <Text className="text-xs text-gray-500 font-medium mt-1">
                    Authentic daily specials served at the counter
                  </Text>
                </View>
              )}
            </View>

            {/* 4. ACTIONS: BOOK TABLE & EXPLORE MAP */}
            <View className="gap-2.5">
              <Pressable
                onPress={() => onBookTable(restaurant.name)}
                className="bg-[#EA5410] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm active:opacity-95"
              >
                <Ionicons name="calendar-outline" size={18} color="white" />
                <Text className="text-white font-black text-sm">
                  Book a Dining Table Here
                </Text>
              </Pressable>

              <Pressable
                onPress={onViewMap}
                className="bg-gray-100 py-3 rounded-2xl flex-row items-center justify-center gap-2 active:bg-gray-200"
              >
                <Ionicons name="navigate-outline" size={16} color="#374151" />
                <Text className="text-gray-800 font-bold text-xs">
                  View Location on Map 🗺️
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </BottomSheetModal>
  );
}
