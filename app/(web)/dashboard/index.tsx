import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function StoreDashboardOverview() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Header Banner */}
      <View className="mb-8 flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
              MATI STORE DASHBOARD
            </Text>
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-800">Live Kitchen</Text>
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Mama Letty's Karenderia</Text>
          <Text className="text-gray-500 text-sm mt-1">
            Poblacion, Mati City • Operating hours: 07:00 AM – 08:00 PM
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          {/* Store Open / Closed Toggle */}
          <Pressable
            onPress={() => setIsOpen(!isOpen)}
            className={`px-4 py-2.5 rounded-2xl flex-row items-center gap-2 border transition-colors ${
              isOpen
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <View className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-red-500"}`} />
            <Text className={`text-xs font-black ${isOpen ? "text-emerald-800" : "text-red-700"}`}>
              {isOpen ? "STORE IS OPEN" : "STORE IS CLOSED"}
            </Text>
          </Pressable>

          <Link href="/(web)/dashboard/menu" asChild>
            <Pressable className="bg-[#EA5410] px-5 py-2.5 rounded-2xl hover:bg-[#D04508] transition-colors shadow-sm flex-row items-center gap-2">
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-white font-extrabold text-xs">Add Menu Item</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* KPI Stats Grid */}
      <View className="flex-row flex-wrap gap-5 mb-10">
        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Today's Orders</Text>
            <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center">
              <Ionicons name="receipt" size={18} color="#EA5410" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">42 Orders</Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2 flex-row items-center">
            ↑ 8 more than yesterday
          </Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Today's Gross Sales</Text>
            <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
              <Ionicons name="cash" size={18} color="#047857" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">₱4,250.00</Text>
          <Text className="text-gray-500 font-semibold text-xs mt-2">
            100% Cash on Delivery
          </Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Table Bookings</Text>
            <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
              <Ionicons name="calendar" size={18} color="#2563EB" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">4 Reserved</Text>
          <Text className="text-blue-600 font-bold text-xs mt-2">
            2 pending approval
          </Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Avg Prep Speed</Text>
            <View className="w-9 h-9 rounded-xl bg-purple-100 items-center justify-center">
              <Ionicons name="time" size={18} color="#7C3AED" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">12 mins</Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2">
            Within 15-min target
          </Text>
        </View>
      </View>

      {/* Main Grid: Live Orders + Top Selling Items */}
      <View className="flex-col xl:flex-row gap-8 w-full">
        {/* Recent Orders Widget */}
        <View className="flex-[2] bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
          <View className="px-8 py-5 border-b border-gray-100 flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-black text-gray-900">Live Kitchen Queue</Text>
              <Text className="text-xs text-gray-400">Incoming Cash on Delivery orders in Mati City</Text>
            </View>
            <View className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
              <Text className="text-[10px] font-black text-[#EA5410] uppercase">3 Active</Text>
            </View>
          </View>

          <ScrollView className="max-h-[460px]">
            {[
              { id: "MFF-8421", items: "2x Chicken Inasal, 3x Rice", address: "Brgy. Central, Blue Gate", total: "₱280.00", status: "Preparing", time: "5 mins ago", tagColor: "bg-amber-100 text-amber-800" },
              { id: "MFF-8420", items: "1x Grilled Tuna Panga, 2x Rice", address: "Brgy. Dahican, Purok 3", total: "₱320.00", status: "Ready for Pickup", time: "12 mins ago", tagColor: "bg-blue-100 text-blue-800" },
              { id: "MFF-8419", items: "1x Pork Humba, 1x Kinilaw de Mati", address: "Brgy. Sainz, Near Pavilion", total: "₱265.00", status: "Out for Delivery", time: "22 mins ago", tagColor: "bg-purple-100 text-purple-800" },
              { id: "MFF-8418", items: "3x Beef Pares, 3x Rice", address: "Brgy. Matiao", total: "₱360.00", status: "Delivered", time: "45 mins ago", tagColor: "bg-emerald-100 text-emerald-800" },
            ].map((order) => (
              <View
                key={order.id}
                className="px-8 py-5 border-b border-gray-100 flex-row items-center justify-between hover:bg-gray-50/80 transition-colors"
              >
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="font-black text-gray-900 text-sm">{order.id}</Text>
                    <Text className="text-[10px] text-gray-400 font-medium">• {order.time}</Text>
                  </View>
                  <Text className="text-xs font-bold text-gray-800">{order.items}</Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5">{order.address}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-black text-[#EA5410] text-base mb-1.5">{order.total}</Text>
                  <View className={`px-2.5 py-0.5 rounded-full ${order.tagColor}`}>
                    <Text className="text-[10px] font-black uppercase tracking-wider">{order.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Top Items Widget */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200/80 p-8 flex-col justify-between">
          <View>
            <Text className="text-lg font-black text-gray-900 mb-1">Top Selling Today</Text>
            <Text className="text-xs text-gray-400 mb-6">Dishes with highest sales volume</Text>

            <View className="gap-4">
              <View className="flex-row justify-between items-center pb-3.5 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                  <Text className="w-6 text-sm font-black text-[#EA5410]">01</Text>
                  <View>
                    <Text className="font-bold text-gray-900 text-sm">Grilled Tuna Panga</Text>
                    <Text className="text-xs text-gray-400">₱280.00</Text>
                  </View>
                </View>
                <Text className="font-extrabold text-gray-900 text-xs">28 sold</Text>
              </View>

              <View className="flex-row justify-between items-center pb-3.5 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                  <Text className="w-6 text-sm font-black text-[#EA5410]">02</Text>
                  <View>
                    <Text className="font-bold text-gray-900 text-sm">Pork Humba Mati</Text>
                    <Text className="text-xs text-gray-400">₱130.00</Text>
                  </View>
                </View>
                <Text className="font-extrabold text-gray-900 text-xs">24 sold</Text>
              </View>

              <View className="flex-row justify-between items-center pb-3.5 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                  <Text className="w-6 text-sm font-black text-[#EA5410]">03</Text>
                  <View>
                    <Text className="font-bold text-gray-900 text-sm">Chicken Inasal</Text>
                    <Text className="text-xs text-gray-400">₱120.00</Text>
                  </View>
                </View>
                <Text className="font-extrabold text-gray-900 text-xs">19 sold</Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <Text className="w-6 text-sm font-black text-gray-400">04</Text>
                  <View>
                    <Text className="font-bold text-gray-900 text-sm">Kinilaw de Mati</Text>
                    <Text className="text-xs text-gray-400">₱160.00</Text>
                  </View>
                </View>
                <Text className="font-extrabold text-gray-900 text-xs">15 sold</Text>
              </View>
            </View>
          </View>

          <Link href="/(web)/dashboard/menu" asChild>
            <Pressable className="mt-8 py-3 bg-gray-50 border border-gray-200 rounded-2xl items-center hover:bg-gray-100 transition-colors">
              <Text className="text-xs font-bold text-gray-700">View Full Menu Catalog</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
