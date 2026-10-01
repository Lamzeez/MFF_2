import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AccountForm } from "./AccountForm";
import { useSession } from "../../context/SessionContext";

export function AccountScreen({ initialMode }: { initialMode: "login" | "register" }) {
  const router = useRouter();
  const { identity, recovering, logoutToGuest } = useSession();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* APP BAR HEADER */}
      <View className="flex-row items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 shadow-xs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(mobile)/portal"))}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-200 active:bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </Pressable>
        <View className="items-center">
          <Text className="text-base font-black text-gray-900 tracking-tight">Mati FoodFinder</Text>
          <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">Mati City</Text>
        </View>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {identity && !recovering ? (
            <View className="bg-white border border-gray-200/90 rounded-3xl p-6 items-center my-6 shadow-sm">
              {/* Active Session Tag */}
              <View className="bg-orange-100 px-3 py-1 rounded-full mb-5">
                <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                  ACTIVE SESSION
                </Text>
              </View>

              {/* Avatar with Verified Badge */}
              <View className="relative mb-4">
                <View className="w-20 h-20 rounded-3xl bg-[#111827] items-center justify-center shadow-sm">
                  <Ionicons name="person" size={38} color="white" />
                </View>
                <View className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white items-center justify-center absolute -bottom-1 -right-1 shadow-xs">
                  <Ionicons name="checkmark" size={13} color="white" />
                </View>
              </View>

              <Text className="text-2xl font-black text-gray-900 mb-1 text-center tracking-tight">
                Welcome back, {identity.profile.display_name || "Foodie"}!
              </Text>
              <Text className="text-xs text-gray-500 mb-5 text-center font-medium">
                You're signed in with {identity.email}
              </Text>

              {/* Quick Perks / Attributes */}
              <View className="flex-row items-center justify-center gap-2 mb-6">
                <View className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                  <Ionicons name="shield-checkmark" size={13} color="#047857" />
                  <Text className="text-[11px] font-bold text-emerald-800">Verified Account</Text>
                </View>
                <View className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                  <Ionicons name="cash-outline" size={13} color="#EA5410" />
                  <Text className="text-[11px] font-bold text-[#EA5410]">COD Active</Text>
                </View>
              </View>

              {/* Primary Action: Explore Mati Food */}
              <Pressable
                onPress={() => router.replace("/(mobile)/(tabs)")}
                className="w-full py-4 bg-[#EA5410] rounded-2xl items-center shadow-sm active:opacity-90 flex-row justify-center gap-2 mb-3"
              >
                <Ionicons name="restaurant-outline" size={18} color="white" />
                <Text className="font-extrabold text-white text-sm">Start Exploring Mati Food</Text>
              </Pressable>

              {/* Secondary Action: View Orders */}
              <Pressable
                onPress={() => router.replace("/(mobile)/(tabs)/orders")}
                className="w-full py-3.5 bg-gray-100 rounded-2xl items-center border border-gray-200/80 active:bg-gray-200 flex-row justify-center gap-2 mb-4"
              >
                <Ionicons name="receipt-outline" size={16} color="#374151" />
                <Text className="font-bold text-gray-800 text-xs">View Orders & Table Bookings</Text>
              </Pressable>

              {/* Sign Out / Switch User */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out of this account"
                onPress={async () => {
                  await logoutToGuest();
                }}
                className="py-2 px-4 items-center flex-row justify-center gap-1.5"
              >
                <Ionicons name="log-out-outline" size={15} color="#dc2626" />
                <Text className="text-xs font-bold text-red-600">Switch Account or Sign Out</Text>
              </Pressable>
            </View>
          ) : (
            <AccountForm initialMode={initialMode} />
          )}

          {!identity && (
            <Pressable
              onPress={() => router.replace("/(mobile)/(tabs)")}
              className="py-4 items-center flex-row justify-center gap-1.5 mt-2"
            >
              <Text className="text-xs font-bold text-gray-500">
                Continue browsing as Guest
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#6b7280" />
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
