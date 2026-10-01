import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "../ui/BottomSheetModal";

interface StoreQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  onPerformCheckIn: (storeName: string) => void;
}

export function StoreQrScannerModal({
  visible,
  onClose,
  userName,
  onPerformCheckIn,
}: StoreQrScannerModalProps) {
  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.82}>
      {({ handleDismiss }) => (
        <View className="flex-1 bg-white p-5 flex-col">
          {/* Visual Drag Handle Pill */}
          <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <Text className="text-xl font-black text-gray-900 tracking-tight">Scan Store QR</Text>
              <Text className="text-xs text-[#EA5410] font-bold mt-0.5">
                Account: {userName} (Personalization Active)
              </Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close QR scanner"
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
            {/* Camera Viewfinder */}
            <View className="h-48 bg-gray-950 rounded-2xl items-center justify-center relative overflow-hidden mb-4">
              <View className="w-32 h-32 border-2 border-[#EA5410] rounded-2xl items-center justify-center bg-[#EA5410]/10">
                <Ionicons name="scan-outline" size={44} color="#EA5410" />
              </View>
              <Text className="text-white text-xs font-bold mt-2.5">
                Point camera at counter stand QR
              </Text>
            </View>

            <Text className="text-xs font-bold text-gray-700 mb-2">
              Simulate In-Store Stand Check-In:
            </Text>

            {/* Quick Check-in options */}
            <View className="gap-2.5 mb-6">
              <Pressable
                onPress={() => {
                  handleDismiss();
                  onPerformCheckIn("Mama Letty's Karenderia");
                }}
                className="bg-orange-50 border border-orange-200 p-3.5 rounded-2xl flex-row items-center justify-between active:opacity-90"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center">
                    <Ionicons name="restaurant" size={20} color="#EA5410" />
                  </View>
                  <View>
                    <Text className="text-xs font-black text-gray-900">Mama Letty's Karenderia</Text>
                    <Text className="text-[10px] text-gray-500">Counter Stand #MFF-ST-101</Text>
                  </View>
                </View>
                <View className="bg-white px-2.5 py-1 rounded-lg border border-orange-200">
                  <Text className="text-xs font-bold text-[#EA5410]">Check In →</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleDismiss();
                  onPerformCheckIn("Mati Baywalk Seafood Grill");
                }}
                className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex-row items-center justify-between active:opacity-90"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-gray-200 items-center justify-center">
                    <Ionicons name="fish" size={20} color="#4B5563" />
                  </View>
                  <View>
                    <Text className="text-xs font-black text-gray-900">Mati Baywalk Seafood Grill</Text>
                    <Text className="text-[10px] text-gray-500">Table Stand #MFF-ST-102</Text>
                  </View>
                </View>
                <View className="bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  <Text className="text-xs font-bold text-gray-700">Check In →</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleDismiss();
                  onPerformCheckIn("Subangan Street Grills");
                }}
                className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex-row items-center justify-between active:opacity-90"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-gray-200 items-center justify-center">
                    <Ionicons name="flame" size={20} color="#4B5563" />
                  </View>
                  <View>
                    <Text className="text-xs font-black text-gray-900">Subangan Street Grills</Text>
                    <Text className="text-[10px] text-gray-500">Stand #MFF-ST-103</Text>
                  </View>
                </View>
                <View className="bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  <Text className="text-xs font-bold text-gray-700">Check In →</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </BottomSheetModal>
  );
}
