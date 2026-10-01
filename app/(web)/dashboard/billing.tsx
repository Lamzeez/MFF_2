import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StoreBilling() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-4xl self-center">
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            SUBSCRIPTION & BILLING
          </Text>
        </View>
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Billing & Plans</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Manage your Mati FoodFinder merchant partner plan and PayMongo settlement settings.
        </Text>
      </View>

      {/* Subscription Card */}
      <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 mb-8">
        <View className="flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-100">
          <View>
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">Current Merchant Plan</Text>
            <Text className="text-2xl font-black text-gray-900">Partner Pioneer Trial</Text>
            <Text className="text-xs text-gray-500 mt-1">Unlimited orders, live menu management, and zero commission on COD.</Text>
          </View>
          <View className="bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full mt-4 md:mt-0 flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-emerald-800 font-extrabold text-xs">Active Trial</Text>
          </View>
        </View>

        <View className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200/80 mb-6 flex-row items-center gap-3">
          <Ionicons name="information-circle" size={20} color="#EA5410" />
          <Text className="text-xs text-gray-700 leading-snug flex-1">
            Your pioneer trial period is active for <Text className="font-bold text-[#EA5410]">45 more days</Text>. No card charges or deduction fees will be applied during this period.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-4">
          <Pressable
            onPress={() => alert("PayMongo Portal: In production, opens PayMongo checkout for GCash/Maya/Card.")}
            className="flex-1 min-w-[200px] py-4 bg-[#111827] rounded-2xl hover:bg-black transition-colors items-center shadow-sm"
          >
            <Text className="text-white font-extrabold text-xs">Upgrade to Pro Merchant (₱499/mo)</Text>
          </Pressable>
        </View>
      </View>

      {/* Payment Methods */}
      <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80">
        <View className="flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <View>
            <Text className="text-lg font-black text-gray-900">Payment & Payout Methods</Text>
            <Text className="text-xs text-gray-400">GCash, Maya, and local bank transfers</Text>
          </View>
          <Pressable
            onPress={() => alert("Add Method: Add GCash or Bank Account for merchant settlements.")}
            className="px-4 py-2 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-xl"
          >
            <Text className="text-[#EA5410] font-bold text-xs">+ Add Payout Account</Text>
          </Pressable>
        </View>

        <View className="items-center py-10">
          <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center mb-3">
            <Ionicons name="card-outline" size={30} color="#9CA3AF" />
          </View>
          <Text className="text-gray-700 font-bold text-sm">No payout method added yet</Text>
          <Text className="text-gray-400 text-xs mt-1 text-center max-w-xs">
            Add a GCash or Bank account to receive weekly payouts for non-COD platform transactions.
          </Text>
        </View>
      </View>
    </View>
  );
}
