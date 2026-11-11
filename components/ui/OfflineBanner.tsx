import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOffline, isReconnecting, wasOffline, retryConnection } = useNetworkStatus();

  if (isOffline) {
    return (
      <View
        testID="offline-banner"
        className="bg-amber-600 px-4 py-2 border-b border-amber-700 shadow-sm z-50"
      >
        <View className="w-full max-w-7xl self-center flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 flex-1 pr-2">
            <Ionicons name="cloud-offline-outline" size={16} color="white" />
            <Text className="text-white text-xs font-bold flex-1" numberOfLines={2}>
              Weak or No Cellular Signal in Mati City · Reconnecting...
            </Text>
          </View>

          <Pressable
            onPress={() => retryConnection()}
            disabled={isReconnecting}
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
            className="bg-amber-700/80 active:bg-amber-800 px-2.5 py-1 rounded-lg flex-row items-center gap-1.5 shrink-0"
          >
            {isReconnecting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="refresh" size={12} color="white" />
                <Text className="text-white text-xs font-extrabold">Retry</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (wasOffline) {
    return (
      <View
        testID="reconnected-banner"
        className="bg-emerald-600 px-4 py-2 flex-row items-center justify-center gap-2 border-b border-emerald-700 shadow-sm z-50"
      >
        <Ionicons name="checkmark-circle" size={16} color="white" />
        <Text className="text-white text-xs font-bold">
          Reconnected to Mati FoodFinder network ✓
        </Text>
      </View>
    );
  }

  return null;
}
