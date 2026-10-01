import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchLiveMenuItems, updateMenuItemAvailability } from "../../../services/catalog";
import type { FoodItem } from "../../../types/restaurant";

export default function MenuManager() {
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  useEffect(() => {
    fetchLiveMenuItems()
      .then((items) => {
        if (items.length > 0) setMenuItems(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleAvailability = async (id: number) => {
    const target = menuItems.find((m) => m.id === id);
    if (!target) return;
    const newStatus = !target.available;

    // Optimistic update
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: newStatus } : item
      )
    );

    if (target.menuItemId) {
      const res = await updateMenuItemAvailability(target.menuItemId, newStatus);
      if (!res.success) {
        console.warn("Failed to persist availability to Supabase:", res.error);
        setMenuItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, available: !newStatus } : item
          )
        );
      }
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.store && item.store.toLowerCase().includes(search.toLowerCase()));
    if (selectedFilter === "All") return matchesSearch;
    if (selectedFilter === "Available") return matchesSearch && item.available;
    if (selectedFilter === "Sold Out") return matchesSearch && !item.available;
    return matchesSearch;
  });

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Page Header */}
      <View className="mb-8 flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
              CATALOG MANAGEMENT
            </Text>
            <View className="bg-orange-100 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-black text-[#EA5410] uppercase">Live Supabase</Text>
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Store Menu Manager</Text>
          <Text className="text-gray-500 text-sm mt-1">
            Configure dish prices, descriptions, and toggle real-time availability in Mati City.
          </Text>
        </View>

        <Pressable
          onPress={() => alert("Add Dish Modal: In production, opens upload form with name, price, photo, and ingredients.")}
          className="bg-[#EA5410] px-5 py-3 rounded-2xl hover:bg-[#D04508] transition-colors shadow-sm flex-row items-center gap-2"
        >
          <Ionicons name="add-circle" size={18} color="white" />
          <Text className="text-white font-extrabold text-xs">Add New Dish</Text>
        </Pressable>
      </View>

      {/* Search and Filters Bar */}
      <View className="flex-col md:flex-row gap-4 mb-6">
        <View className="flex-1 bg-white border border-gray-200/90 rounded-2xl px-4 py-2.5 shadow-2xs flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search dish name or category..."
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-gray-900 outline-none"
            placeholderTextColor="#9ca3af"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-2 bg-gray-100 p-1 rounded-2xl">
          {["All", "Available", "Sold Out"].map((f) => (
            <Pressable
              key={f}
              onPress={() => setSelectedFilter(f)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                selectedFilter === f ? "bg-white shadow-2xs" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedFilter === f ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Menu Table Card */}
      <View className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50/80 px-8 py-4 border-b border-gray-200 hidden md:flex">
          <Text className="flex-[2] font-black text-xs text-gray-400 uppercase tracking-wider">Dish & Store</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Price (PHP)</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Availability</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider text-right">Actions</Text>
        </View>

        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#EA5410" />
            <Text className="text-gray-500 mt-3 text-xs font-semibold">Loading live dishes from Supabase catalog...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <Ionicons name="restaurant-outline" size={36} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-sm mt-3">No dishes match your filter</Text>
            <Text className="text-gray-400 text-xs mt-1">Try clearing your search query</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[640px]">
            {filteredItems.map((item) => (
              <View
                key={item.id}
                className="flex-col md:flex-row px-8 py-4 items-start md:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
              >
                {/* Dish Info */}
                <View className="flex-[2] flex-row items-center gap-3.5 mb-2 md:mb-0">
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: item.imageUrl }
                        : require("../../../assets/food/welcome-feast.jpg")
                    }
                    className="w-12 h-12 rounded-xl bg-gray-100"
                    resizeMode="cover"
                  />
                  <View className="flex-1 pr-2">
                    <Text className="font-black text-gray-900 text-base">{item.name}</Text>
                    <Text className="text-xs text-gray-400 font-medium">Store: {item.store || "Mama Letty's Karenderia"}</Text>
                  </View>
                </View>

                {/* Price */}
                <View className="flex-1 mb-2 md:mb-0">
                  <Text className="font-black text-[#EA5410] text-base">
                    ₱{item.price.toFixed(2)}
                  </Text>
                </View>

                {/* Availability Toggle */}
                <View className="flex-1 mb-3 md:mb-0">
                  <Pressable
                    onPress={() => toggleAvailability(item.id)}
                    className={`self-start px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5 transition-colors ${
                      item.available
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <View className={`w-2 h-2 rounded-full ${item.available ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <Text
                      className={`font-black text-xs ${
                        item.available ? "text-emerald-800" : "text-gray-600"
                      }`}
                    >
                      {item.available ? "AVAILABLE" : "SOLD OUT"}
                    </Text>
                  </Pressable>
                </View>

                {/* Actions */}
                <View className="flex-1 flex-row gap-2 md:justify-end w-full md:w-auto">
                  <Pressable
                    onPress={() => alert(`Edit Dish: ${item.name}`)}
                    className="px-3.5 py-1.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center"
                  >
                    <Text className="text-gray-700 font-bold text-xs">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => alert(`Toggle Visibility: ${item.name}`)}
                    className="px-3.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors flex-1 md:flex-none items-center"
                  >
                    <Text className="text-[#EA5410] font-bold text-xs">Hide</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
