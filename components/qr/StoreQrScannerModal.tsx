import React from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <Text className="text-lg font-black text-gray-900">Scan Store Stand QR</Text>
              <Text className="text-xs text-emerald-700 font-bold">
                Account: {userName} (Personalization Active)
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {/* Camera Viewfinder Mock */}
            <View className="h-48 bg-gray-900 rounded-2xl items-center justify-center relative overflow-hidden mb-4">
              <View className="w-32 h-32 border-2 border-emerald-400 rounded-2xl items-center justify-center">
                <Ionicons name="scan-outline" size={44} color="#34d399" />
              </View>
              <Text className="text-white text-xs font-bold mt-2">
                Point camera at counter stand QR
              </Text>
            </View>

            <Text className="text-xs font-bold text-gray-700 mb-2">
              Simulate In-Store Stand Check-In:
            </Text>

            {/* Quick Check-in options */}
            <View className="gap-2.5 mb-6">
              <Pressable
                onPress={() => onPerformCheckIn("Mama Letty's Karenderia")}
                className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-xl">🍲</Text>
                  <View>
                    <Text className="text-xs font-black text-gray-900">Mama Letty's Karenderia</Text>
                    <Text className="text-[10px] text-emerald-800">Counter Stand #MFF-ST-101</Text>
                  </View>
                </View>
                <Text className="text-xs font-bold text-emerald-700">Check In →</Text>
              </Pressable>

              <Pressable
                onPress={() => onPerformCheckIn("Mati Baywalk Seafood Grill")}
                className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-xl">🐟</Text>
                  <View>
                    <Text className="text-xs font-black text-gray-900">Mati Baywalk Seafood Grill</Text>
                    <Text className="text-[10px] text-gray-500">Table Stand #MFF-ST-102</Text>
                  </View>
                </View>
                <Text className="text-xs font-bold text-gray-700">Check In →</Text>
              </Pressable>

              <Pressable
                onPress={() => onPerformCheckIn("Subangan Street Grills")}
                className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-xl">🍢</Text>
                  <View>
                    <Text className="text-xs font-black text-gray-900">Subangan Street Grills</Text>
                    <Text className="text-[10px] text-gray-500">Stand #MFF-ST-103</Text>
                  </View>
                </View>
                <Text className="text-xs font-bold text-gray-700">Check In →</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
