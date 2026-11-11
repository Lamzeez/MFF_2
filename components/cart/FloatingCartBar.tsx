import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";

interface FloatingCartBarProps {
  onPress: () => void;
  bottomOffset?: number;
}

export function FloatingCartBar({
  onPress,
  bottomOffset = Platform.OS === "ios" ? 85 : 70,
}: FloatingCartBarProps) {
  const { totalCount, foodSubtotal, storeName } = useCart();

  if (totalCount === 0) return null;

  return (
    <View
      style={{ bottom: bottomOffset }}
      className="absolute left-4 right-4 z-40 items-center"
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View basket with ${totalCount} items from ${storeName}, subtotal ₱${foodSubtotal}`}
        className="w-full max-w-xl self-center bg-[#EA5410] rounded-2xl p-3.5 flex-row items-center justify-between gap-2 shadow-lg shadow-orange-500/30 active:opacity-95 border border-orange-400"
      >
        {/* Left: Badge & Item Count */}
        <View className="flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center">
            <Ionicons name="bag-handle" size={18} color="white" />
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white font-black text-sm">
                {totalCount} {totalCount === 1 ? "item" : "items"}
              </Text>
              <Text className="text-orange-200 text-xs">·</Text>
              <Text className="text-white font-black text-sm">₱{foodSubtotal}.00</Text>
            </View>
            <Text className="text-orange-100 text-[11px] font-bold" numberOfLines={1}>
              {storeName || "Mati Restaurant"}
            </Text>
          </View>
        </View>

        {/* Right: Action CTA */}
        <View className="bg-white px-3.5 py-1.5 rounded-xl flex-row items-center gap-1 shadow-xs">
          <Text className="text-[#EA5410] font-black text-xs">View Basket</Text>
          <Ionicons name="arrow-forward" size={13} color="#EA5410" />
        </View>
      </Pressable>
    </View>
  );
}
