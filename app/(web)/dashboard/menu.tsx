import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchLiveMenuItems,
  updateMenuItemAvailability,
  createStoreMenuItem,
  fetchUserStoreId,
  CATEGORIES,
} from "../../../services/catalog";
import { useSession } from "../../../context/SessionContext";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import type { FoodItem } from "../../../types/restaurant";

const DEFAULT_STORE_ID = "11111111-1111-1111-1111-111111111111";

export default function MenuManager() {
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string>(DEFAULT_STORE_ID);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Add Dish Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishDescription, setDishDescription] = useState("");
  const [dishCategory, setDishCategory] = useState("Karenderias");
  const [savingDish, setSavingDish] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  useEffect(() => {
    if (identity?.id) {
      fetchUserStoreId(identity.id).then((id) => {
        if (id) setStoreId(id);
      });
    }
  }, [identity?.id]);

  const loadMenu = () => {
    setLoading(true);
    fetchLiveMenuItems()
      .then((items) => {
        if (items.length > 0) setMenuItems(items);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenu();
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

  const handleAddDish = async () => {
    setModalError(null);
    if (!dishName.trim() || !dishPrice.trim()) {
      setModalError("Please provide both a dish name and a price.");
      return;
    }
    const priceNum = parseFloat(dishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setModalError("Please enter a valid price in Philippine Pesos (₱).");
      return;
    }

    setSavingDish(true);
    try {
      const res = await createStoreMenuItem(storeId, {
        name: dishName.trim(),
        price: priceNum,
        description: dishDescription.trim() || `${dishCategory} special in Mati City`,
        isAvailable: true,
      });

      if (res.success && res.data) {
        setMenuItems((prev) => [res.data!, ...prev]);
        setShowAddModal(false);
        setDishName("");
        setDishPrice("");
        setDishDescription("");
        setModalError(null);
        setBanner({
          type: "success",
          message: `🎉 Dish "${res.data.name}" added to menu successfully!`,
        });
      } else {
        setModalError("Failed to add dish: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      setModalError("Error adding dish: " + (err?.message || "Unknown error"));
    } finally {
      setSavingDish(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.store && item.store.toLowerCase().includes(search.toLowerCase()));
    if (selectedFilter === "All") return matchesSearch;
    if (selectedFilter === "Available") return matchesSearch && item.available;
    if (selectedFilter === "Sold Out") return matchesSearch && !item.available;
    return matchesSearch;
  });

  return (
    <View className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-7xl self-center">
      {/* Page Header */}
      <View className="mb-6 sm:mb-8 flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
              CATALOG MANAGEMENT
            </Text>
            <View className="bg-orange-100 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-black text-[#EA5410] uppercase">Live Supabase</Text>
            </View>
          </View>
          <Text className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Store Menu Manager</Text>
          <Text className="text-gray-500 text-sm mt-1">
            Configure dish prices, descriptions, and toggle real-time availability in Mati City.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setModalError(null);
            setShowAddModal(true);
          }}
          className="bg-[#EA5410] px-5 py-3 rounded-2xl hover:bg-[#D04508] transition-colors shadow-sm flex-row items-center gap-2 cursor-pointer"
        >
          <Ionicons name="add-circle" size={18} color="white" />
          <Text className="text-white font-extrabold text-xs">Add New Dish</Text>
        </Pressable>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Search and Filters Bar */}
      <View className="flex-col lg:flex-row gap-4 mb-6">
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

        <View className="flex-row flex-wrap gap-2 bg-gray-100 p-1 rounded-2xl self-start lg:self-auto">
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
        <View className="flex-row bg-gray-50/80 px-6 lg:px-8 py-4 border-b border-gray-200 hidden lg:flex">
          <Text className="flex-[2] font-black text-xs text-gray-400 uppercase tracking-wider">Dish & Store</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Price (PHP)</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Availability</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider text-right">Status</Text>
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
                className="flex-col lg:flex-row px-5 sm:px-6 lg:px-8 py-4 items-start lg:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors gap-3 lg:gap-0"
              >
                {/* Dish Info */}
                <View className="w-full lg:w-auto lg:flex-[2] flex-row items-center gap-3.5">
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: item.imageUrl }
                        : require("../../../assets/food/welcome-feast.jpg")
                    }
                    className="w-12 h-12 rounded-xl bg-gray-100 shrink-0"
                    resizeMode="cover"
                  />
                  <View className="flex-1 pr-2 min-w-0">
                    <Text className="font-black text-gray-900 text-base">{item.name}</Text>
                    <Text className="text-xs text-gray-400 font-medium">Store: {item.store || "Mama Letty's Karenderia"}</Text>
                    {item.description ? (
                      <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Price */}
                <View className="lg:flex-1">
                  <Text className="font-black text-[#EA5410] text-base">
                    ₱{item.price.toFixed(2)}
                  </Text>
                </View>

                {/* Availability Toggle */}
                <View className="lg:flex-1">
                  <Pressable
                    onPress={() => toggleAvailability(item.id)}
                    className={`self-start px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5 transition-colors cursor-pointer ${
                      item.available
                        ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        : "bg-gray-100 border-gray-300 hover:bg-gray-200"
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

                {/* Status Indicator */}
                <View className="lg:flex-1 flex-row gap-2 lg:justify-end w-full lg:w-auto items-center">
                  <View className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl">
                    <Text className="text-gray-500 font-bold text-xs">
                      {item.available ? "Live on App" : "Hidden from Diners"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Add New Dish Interactive Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="max-w-lg w-full max-h-[90%]"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
          <View className="bg-white rounded-3xl p-5 sm:p-7 w-full shadow-2xl border border-gray-200">
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-100 mb-5">
              <View>
                <Text className="text-xl font-black text-gray-900">Add New Dish</Text>
                <Text className="text-xs text-gray-400">Add a dish to your store's live menu in Mati City</Text>
              </View>
              <Pressable
                onPress={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center cursor-pointer"
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>

            {modalError && (
              <View className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={16} color="#e11d48" />
                <Text className="text-xs font-bold text-rose-800 flex-1">{modalError}</Text>
              </View>
            )}

            <View className="gap-4">
              {/* Dish Name */}
              <View>
                <Text className="text-xs font-bold text-gray-700 uppercase mb-1">Dish Name *</Text>
                <TextInput
                  value={dishName}
                  onChangeText={setDishName}
                  placeholder="e.g. Special Pork Humba, Sinigang na Tuna..."
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none"
                />
              </View>

              {/* Price */}
              <View>
                <Text className="text-xs font-bold text-gray-700 uppercase mb-1">Price (₱ PHP) *</Text>
                <TextInput
                  value={dishPrice}
                  onChangeText={setDishPrice}
                  placeholder="e.g. 120.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none"
                />
              </View>

              {/* Category */}
              <View>
                <Text className="text-xs font-bold text-gray-700 uppercase mb-1">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setDishCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl border cursor-pointer ${
                        dishCategory === cat
                          ? "bg-orange-50 border-[#EA5410]"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          dishCategory === cat ? "text-[#EA5410]" : "text-gray-600"
                        }`}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View>
                <Text className="text-xs font-bold text-gray-700 uppercase mb-1">Description</Text>
                <TextInput
                  value={dishDescription}
                  onChangeText={setDishDescription}
                  placeholder="Rich and savory slow-cooked pork belly with banana blossoms..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none"
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View className="flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <Pressable
                disabled={savingDish}
                onPress={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                <Text className="text-xs font-bold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={savingDish}
                onPress={handleAddDish}
                className="px-5 py-2.5 rounded-xl bg-[#EA5410] hover:bg-[#D04508] shadow-sm flex-row items-center gap-1.5 cursor-pointer"
              >
                {savingDish ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                )}
                <Text className="text-xs font-bold text-white">
                  {savingDish ? "Adding..." : "Save to Menu"}
                </Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
