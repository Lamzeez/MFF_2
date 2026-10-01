import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppNotification } from "../../context/AuthContext";
import { BottomSheetModal } from "../ui/BottomSheetModal";

interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onSelectNotification: (notif: AppNotification) => void;
  onMarkAllRead?: () => void;
}

export function NotificationsSheet({
  visible,
  onClose,
  notifications,
  onSelectNotification,
  onMarkAllRead,
}: NotificationsSheetProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "order" | "reservation" | "community">("all");

  const filteredNotifications = notifications.filter(
    (n) => selectedFilter === "all" || n.type === selectedFilter
  );

  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.80}>
      {({ handleDismiss }) => (
        <View className="flex-1 bg-white p-5 flex-col">
          {/* Visual Drag Handle Pill */}
          <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <Text className="text-xl font-black text-gray-900 tracking-tight">Notifications</Text>
              <Text className="text-xs text-gray-500 font-medium">
                Live updates for your Mati orders & reservations
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {onMarkAllRead && (
                <Pressable
                  onPress={onMarkAllRead}
                  className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-xl"
                >
                  <Text className="text-[11px] font-bold text-[#EA5410]">Mark all read</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close notifications sheet"
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={20} color="#374151" />
              </Pressable>
            </View>
          </View>

          {/* Filter Pills */}
          <View className="flex-row gap-2 my-3.5">
            {(["all", "order", "reservation", "community"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setSelectedFilter(tab)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  selectedFilter === tab
                    ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    selectedFilter === tab ? "text-white" : "text-gray-700"
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Notifications List */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {filteredNotifications.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="notifications-off-outline" size={36} color="#9CA3AF" />
                <Text className="text-xs text-gray-400 font-medium mt-2">
                  No notifications in this category
                </Text>
              </View>
            ) : (
              filteredNotifications.map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => {
                    handleDismiss();
                    onSelectNotification(notif);
                  }}
                  className={`p-3.5 mb-2.5 rounded-2xl border ${
                    notif.isRead
                      ? "bg-white border-gray-200"
                      : "bg-orange-50/80 border-orange-200"
                  }`}
                >
                  <View className="flex-row items-start justify-between mb-1">
                    <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                      {!notif.isRead && (
                        <View className="w-2 h-2 rounded-full bg-[#EA5410]" />
                      )}
                      <Text className="text-xs font-black text-gray-900 flex-1">
                        {notif.title}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-gray-400 font-medium">{notif.timestamp}</Text>
                  </View>
                  <Text className="text-xs text-gray-600 leading-snug">{notif.message}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </BottomSheetModal>
  );
}
