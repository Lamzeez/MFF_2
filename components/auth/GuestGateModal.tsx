import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GuestGateModalProps {
  visible: boolean;
  onClose: () => void;
  actionDescription: string;
  onQuickSignIn: () => void;
  onNavigateToAuth: () => void;
}

export function GuestGateModal({
  visible,
  onClose,
  actionDescription,
  onQuickSignIn,
  onNavigateToAuth,
}: GuestGateModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-5">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
          <View className="w-14 h-14 bg-emerald-50 rounded-2xl items-center justify-center self-center mb-3">
            <Ionicons name="sparkles" size={26} color="#047857" />
          </View>
          <Text className="text-lg font-black text-gray-900 text-center mb-1">
            Join Mati FoodFinder
          </Text>
          <Text className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
            Please sign in to {actionDescription}.
          </Text>

          <View className="bg-gray-50 p-3 rounded-2xl mb-4 border border-gray-100 gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-emerald-700 font-bold">✓</Text>
              <Text className="text-[11px] text-gray-700">Live Cash on Delivery order tracking</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-emerald-700 font-bold">✓</Text>
              <Text className="text-[11px] text-gray-700">Instant dining table reservations</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-emerald-700 font-bold">✓</Text>
              <Text className="text-[11px] text-gray-700">Personalized local food recommendations</Text>
            </View>
          </View>

          <Pressable
            onPress={onQuickSignIn}
            className="w-full py-3.5 bg-emerald-700 rounded-xl items-center shadow-md mb-2.5"
          >
            <Text className="text-white font-bold text-sm">Quick Demo Sign In</Text>
          </Pressable>

          <Pressable
            onPress={onNavigateToAuth}
            className="w-full py-2.5 bg-gray-100 rounded-xl items-center mb-2"
          >
            <Text className="text-gray-700 font-bold text-xs">Create Account / Sign In</Text>
          </Pressable>

          <Pressable onPress={onClose} className="py-2 items-center">
            <Text className="text-xs text-gray-400 font-medium">Continue Browsing as Guest</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
