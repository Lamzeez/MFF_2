import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppNotification } from "../../context/AuthContext";

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
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <Text className="text-lg font-black text-gray-900">Notifications</Text>
              <Text className="text-xs text-gray-500 font-medium">
                Live updates for your Mati food orders & reservations
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {onMarkAllRead && (
                <Pressable onPress={onMarkAllRead} className="px-2.5 py-1 bg-emerald-50 rounded-lg">
                  <Text className="text-[11px] font-bold text-emerald-800">Mark all read</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>
          </View>

          {/* Filter Pills */}
          <View className="flex-row gap-2 my-3">
            {(["all", "order", "reservation", "community"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setSelectedFilter(tab)}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedFilter === tab
                    ? "bg-emerald-700 border-emerald-700"
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
          <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
            {filteredNotifications.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="notifications-off-outline" size={36} color="#9ca3af" />
                <Text className="text-xs text-gray-400 font-medium mt-2">
                  No notifications in this category
                </Text>
              </View>
            ) : (
              filteredNotifications.map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => onSelectNotification(notif)}
                  className={`p-3.5 mb-2.5 rounded-2xl border ${
                    notif.isRead ? "bg-white border-gray-200" : "bg-emerald-50/60 border-emerald-300"
                  }`}
                >
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-xs font-extrabold text-gray-900 flex-1 pr-2">
                      {notif.title}
                    </Text>
                    <Text className="text-[10px] text-gray-400 font-medium">{notif.timestamp}</Text>
                  </View>
                  <Text className="text-xs text-gray-600 leading-snug">{notif.message}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
