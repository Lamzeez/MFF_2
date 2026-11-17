import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
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
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose} statusBarTranslucent={true}>
      <View className="flex-1 items-center justify-center bg-black/60 px-5 relative">
        {/* Backdrop tap outside to close */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        />

        <View className="bg-white rounded-2xl p-4.5 w-full max-w-xs shadow-xl z-10">
          <View className="w-11 h-11 bg-orange-50 border border-orange-100 rounded-xl items-center justify-center self-center mb-2.5">
            <Ionicons name="sparkles" size={22} color="#EA5410" />
          </View>
          <Text className="text-base font-black text-gray-900 text-center mb-0.5 tracking-tight">
            Join Mati FoodFinder
          </Text>
          <Text className="text-[11px] text-gray-500 text-center mb-3 leading-relaxed">
            Please sign in to {actionDescription}.
          </Text>

          <View className="bg-gray-50 p-2.5 rounded-xl mb-3 border border-gray-100 gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-[#EA5410] font-black">✓</Text>
              <Text className="text-[11px] text-gray-700 font-medium">Live Cash on Delivery order tracking</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-[#EA5410] font-black">✓</Text>
              <Text className="text-[11px] text-gray-700 font-medium">Instant dining table reservations</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-[#EA5410] font-black">✓</Text>
              <Text className="text-[11px] text-gray-700 font-medium">Personalized local food recommendations</Text>
            </View>
          </View>

          <Pressable
            onPress={onQuickSignIn}
            className="w-full py-2.5 bg-[#EA5410] rounded-xl items-center shadow-xs active:opacity-95 mb-2"
          >
            <Text className="text-white font-black text-xs">Sign In to Your Account</Text>
          </Pressable>

          <Pressable
            onPress={onNavigateToAuth}
            className="w-full py-2 bg-gray-100 rounded-xl items-center mb-1.5 active:bg-gray-200"
          >
            <Text className="text-gray-800 font-bold text-[11px]">Create New Account</Text>
          </Pressable>

          <Pressable onPress={onClose} className="py-1.5 items-center">
            <Text className="text-[11px] text-gray-400 font-bold">Continue Browsing as Guest</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
