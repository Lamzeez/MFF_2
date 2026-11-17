import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantProfile, FoodItem } from "../../types/restaurant";
import { BottomSheetModal } from "../ui/BottomSheetModal";
import { callPhoneNumber } from "../../lib/phone";
import { useCart } from "../../context/CartContext";
import { isStoreCurrentlyOpen } from "../../lib/geo-serviceability";

interface RestaurantProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  restaurant: RestaurantProfile | null;
  onBookTable: (restaurantName: string) => void;
  onViewMap?: () => void;
  menuItems?: FoodItem[];
  onSelectDish?: (dish: FoodItem) => void;
  onOpenBasket?: () => void;
}

export function RestaurantProfileSheet({
  visible,
  onClose,
  restaurant,
  onBookTable,
  onViewMap,
  menuItems = [],
  onSelectDish,
  onOpenBasket,
}: RestaurantProfileSheetProps) {
  const {
    items: cartItems,
    storeName: cartStoreName,
    totalCount: cartTotalCount,
    foodSubtotal: cartFoodSubtotal,
    addItem,
    updateQuantity,
    getItemQuantity,
  } = useCart();

  // Dish Customization / Modifiers state
  const [customizingDish, setCustomizingDish] = useState<FoodItem | null>(null);
  const [selectedSpice, setSelectedSpice] = useState<string>("Regular");
  const [selectedAddon, setSelectedAddon] = useState<string>("None");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  if (!restaurant) return null;

  const isCurrentlyOpen = restaurant.isOpen !== false && isStoreCurrentlyOpen(restaurant.hours);

  const handleOpenCustomize = (dish: FoodItem) => {
    setCustomizingDish(dish);
    setSelectedSpice("Regular");
    setSelectedAddon("None");
  };

  const handleConfirmCustomize = (forceReplace: boolean = false) => {
    if (!customizingDish) return;
    let extraPrice = 0;
    if (selectedSpice === "Extra Spicy") extraPrice += 10;
    if (selectedAddon === "Extra Rice (+₱20)") extraPrice += 20;
    if (selectedAddon === "Unlimited Sabaw (+₱15)") extraPrice += 15;

    const modifierSummary = `${selectedSpice}${selectedAddon !== "None" ? ` · ${selectedAddon}` : ""}`;
    const selectedMods: Record<string, string> = {
      "Spice Level": selectedSpice,
      "Add-on": selectedAddon,
    };

    const res = addItem(customizingDish, 1, forceReplace, selectedMods, extraPrice, modifierSummary);
    if (!res.success && res.conflictStore) {
      Alert.alert(
        "Start New Order?",
        `Your basket currently contains items from "${res.conflictStore}". Adding items from "${customizingDish.store || restaurant.name}" will clear your previous basket. Do you want to start a new order?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Start New Order",
            style: "destructive",
            onPress: () => handleConfirmCustomize(true),
          },
        ]
      );
      return;
    }
    setCustomizingDish(null);
  };

  const handleAddDish = (dish: FoodItem) => {
    handleOpenCustomize(dish);
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.94}>
      {({ handleDismiss }) => (
        <View className="flex-1 bg-white">
          {/* 1. HERO COVER BANNER WITH DRAG PILL & BADGES (Scaled from h-52 to h-40) */}
          <View className="h-44 w-full relative bg-gray-100">
            {/* Visual Drag Handle Pill */}
            <View className="absolute top-2.5 self-center z-20 w-12 h-1.5 rounded-full bg-white/80 shadow-xs" />

            <Image
              source={{
                uri:
                  restaurant.imageUrl ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Dark Gradient Overlay for Badge Legibility */}
            <View className="absolute inset-0 bg-black/25" />

            {/* Top Bar with Badges and Close Button */}
            <View className="absolute top-4 left-3.5 right-3.5 flex-row items-center justify-between z-10">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <View className="bg-white/95 px-2.5 py-0.5 rounded-full shadow-xs flex-row items-center gap-1">
                  <Ionicons name="star" size={11} color="#D97706" />
                  <Text className="text-[11px] font-black text-gray-900">{restaurant.rating}</Text>
                  <Text className="text-[9px] font-bold text-gray-500">
                    ({restaurant.reviews || 120})
                  </Text>
                </View>

                <View className="bg-white/95 px-2.5 py-0.5 rounded-full shadow-xs flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={11} color="#EA5410" />
                  <Text className="text-[11px] font-bold text-gray-800">
                    {restaurant.deliveryTime || "20-30 min"}
                  </Text>
                </View>

                {/* Real-time Open/Closed Badge */}
                <View
                  className={`px-2.5 py-0.5 rounded-full shadow-xs flex-row items-center gap-1 ${
                    isCurrentlyOpen ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  <View className="w-1.5 h-1.5 rounded-full bg-white" />
                  <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                    {isCurrentlyOpen ? "Open" : "Closed"}
                  </Text>
                </View>
              </View>

              {/* Close Button that smoothly dismisses */}
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close restaurant sheet"
                className="w-8 h-8 rounded-full bg-white/95 items-center justify-center shadow-xs active:bg-white"
              >
                <Ionicons name="close" size={18} color="#1F2937" />
              </Pressable>
            </View>
          </View>

          {/* 2. SCROLLABLE RESTAURANT BODY */}
          <ScrollView
            className="flex-1 px-4 pt-3.5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: cartTotalCount > 0 ? 80 : 35 }}
          >
            {/* Store Name, Badges & Category */}
            <View className="mb-2.5">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-black text-gray-900 tracking-tight flex-1 mr-2">
                  {restaurant.name}
                </Text>
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full flex-row items-center gap-1">
                  <Ionicons name="checkmark-circle" size={11} color="#047857" />
                  <Text className="text-[10px] font-bold text-emerald-800">Verified</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <View className="bg-orange-50 border border-orange-200 px-2 py-0.2 rounded-full">
                  <Text className="text-[10px] font-bold text-[#EA5410]">
                    {restaurant.category}
                  </Text>
                </View>
                <Text className="text-[11px] text-gray-500 font-medium">· Mati City Local Partner</Text>
              </View>
            </View>

            {/* Store Description */}
            <Text className="text-xs text-gray-600 leading-snug mb-3">
              {restaurant.description}
            </Text>

            {/* Store Information Grid (Operating Hours, Contact, Table Availability) */}
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 gap-2">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg bg-orange-100/70 items-center justify-center">
                  <Ionicons name="time-outline" size={14} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Operating Hours
                  </Text>
                  <Text className="text-xs font-bold text-gray-800">
                    {restaurant.hours}
                  </Text>
                </View>
                <View
                  className={`px-2 py-0.5 rounded-full flex-row items-center gap-1 border ${
                    isCurrentlyOpen
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-rose-50 border-rose-200"
                  }`}
                >
                  <View
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCurrentlyOpen ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <Text
                    className={`text-[9px] font-black uppercase tracking-wider ${
                      isCurrentlyOpen ? "text-emerald-800" : "text-rose-700"
                    }`}
                  >
                    {isCurrentlyOpen ? "Open Now" : "Closed"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => callPhoneNumber(restaurant.phone, restaurant.name)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${restaurant.name}`}
                className="flex-row items-center gap-2 active:opacity-70 p-1 -m-1 rounded-lg"
              >
                <View className="w-7 h-7 rounded-lg bg-orange-100/70 items-center justify-center">
                  <Ionicons name="call-outline" size={14} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Contact / Inquiries
                  </Text>
                  <Text className="text-xs font-bold text-gray-800">
                    {restaurant.phone || "No phone listed"}
                  </Text>
                </View>
                <View className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 flex-row items-center gap-1">
                  <Ionicons name="call" size={10} color="#EA5410" />
                  <Text className="text-[9px] font-bold text-orange-600">Tap to Call</Text>
                </View>
              </Pressable>

              {/* Pillar 5: Real-time Table Capacity Indicator */}
              <View className="flex-row items-center gap-2 pt-2 border-t border-gray-200">
                <View className={`w-7 h-7 rounded-lg items-center justify-center ${
                  (restaurant.availableTables ?? 0) > 0 ? "bg-emerald-100" : "bg-rose-100"
                }`}>
                  <Ionicons
                    name="restaurant"
                    size={14}
                    color={(restaurant.availableTables ?? 0) > 0 ? "#047857" : "#e11d48"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Live Table Availability
                  </Text>
                  <Text className={`text-xs font-black ${
                    (restaurant.availableTables ?? 0) > 0 ? "text-emerald-800" : "text-rose-700"
                  }`}>
                    {(restaurant.availableTables ?? 0) > 0
                      ? `🟢 ${restaurant.availableTables} Tables Open · Instant Booking`
                      : "🔴 Tables Fully Booked Tonight"}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. STORE MENU & CATEGORY FILTER */}
            <View className="mb-4">
              <View className="mb-2">
                <Text className="text-sm font-black text-gray-900 tracking-tight">
                  Full Menu & Specialties
                </Text>
                <Text className="text-[10px] text-gray-500">
                  Select dishes & drinks to add to your basket
                </Text>
              </View>

              {/* Menu Category Filter Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-2.5 -mx-1"
                contentContainerStyle={{ paddingHorizontal: 4, gap: 6 }}
              >
                {["All", "Meals", "Seafood", "BBQ & Grill", "Merienda", "Beverages"].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full border ${
                      selectedCategory === cat
                        ? "bg-[#EA5410] border-[#EA5410]"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        selectedCategory === cat ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {menuItems && menuItems.length > 0 ? (
                <View className="gap-2">
                  {menuItems
                    .filter((dish) => {
                      if (selectedCategory === "All") return true;
                      const target = selectedCategory.toLowerCase().trim().replace(/s$/, "");
                      const cat = (dish.category || "").toLowerCase().trim().replace(/s$/, "");
                      return cat === target || cat.includes(target) || target.includes(cat);
                    })
                    .map((dish) => {
                    const itemQty = getItemQuantity(dish.id);
                    return (
                      <View
                        key={dish.id}
                        className={`bg-white border rounded-xl p-2.5 flex-row items-center gap-2.5 shadow-xs ${
                          itemQty > 0 ? "border-[#EA5410]/50 bg-orange-50/20" : "border-gray-200"
                        }`}
                      >
                        <Image
                          source={{
                            uri:
                              dish.imageUrl ||
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                          }}
                          className="w-14 h-14 rounded-lg bg-gray-100"
                          style={{ width: 56, height: 56 }}
                          resizeMode="cover"
                        />
                        <View className="flex-1">
                          <Text className="text-xs font-black text-gray-900 leading-tight" numberOfLines={1}>
                            {dish.name}
                          </Text>
                          <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={1}>
                            {dish.category}
                          </Text>
                          <Text className="text-xs font-black text-[#EA5410] mt-0.5">
                            ₱{dish.price.toFixed(2)}
                          </Text>
                        </View>

                        {/* Quantity Stepper or Add Button */}
                        {itemQty > 0 ? (
                          <View className="flex-row items-center bg-orange-50 border border-orange-200 rounded-lg p-0.5 gap-1.5">
                            <Pressable
                              onPress={() => updateQuantity(dish.id, itemQty - 1)}
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease quantity of ${dish.name}`}
                              className="w-6 h-6 rounded bg-white items-center justify-center active:bg-orange-100 border border-orange-100"
                            >
                              <Ionicons name="remove" size={12} color="#EA5410" />
                            </Pressable>
                            <Text className="text-xs font-black text-gray-900 min-w-[14px] text-center">
                              {itemQty}
                            </Text>
                            <Pressable
                              onPress={() => addItem(dish, 1)}
                              accessibilityRole="button"
                              accessibilityLabel={`Increase quantity of ${dish.name}`}
                              className="w-6 h-6 rounded bg-[#EA5410] items-center justify-center active:opacity-90"
                            >
                              <Ionicons name="add" size={12} color="white" />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleAddDish(dish)}
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${dish.name} to basket`}
                            className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                          >
                            <Ionicons name="add" size={13} color="#EA5410" />
                            <Text className="text-xs font-black text-[#EA5410]">Add</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 items-center">
                  <Ionicons name="restaurant-outline" size={20} color="#9CA3AF" />
                  <Text className="text-[11px] text-gray-500 font-medium mt-1">
                    Authentic daily specials served at the counter
                  </Text>
                </View>
              )}
            </View>

            {/* 4. ACTIONS: MAKE RESERVATION */}
            <View className="gap-2">
              <Pressable
                onPress={() => onBookTable(restaurant.name)}
                className="bg-[#EA5410] py-3 rounded-xl flex-row items-center justify-center gap-1.5 shadow-xs active:opacity-95"
              >
                <Ionicons name="calendar-outline" size={16} color="white" />
                <Text className="text-white font-black text-xs">
                  Make Reservation
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* 5. STICKY BOTTOM BASKET FOOTER */}
          {cartTotalCount > 0 && cartStoreName === restaurant.name && (
            <View className="px-5 py-3.5 bg-white border-t border-gray-100 shadow-lg shadow-black/5">
              <Pressable
                onPress={() => {
                  handleDismiss();
                  if (onOpenBasket) {
                    onOpenBasket();
                  } else if (onSelectDish && cartItems.length > 0) {
                    const firstDish = menuItems.find((d) => d.id === cartItems[0].dishId) || menuItems[0];
                    if (firstDish) onSelectDish(firstDish);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`View basket with ${cartTotalCount} items, total ₱${cartFoodSubtotal}`}
                className="bg-[#EA5410] py-3.5 px-4 rounded-2xl flex-row items-center justify-between shadow-sm active:opacity-95"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-xl bg-white/20 items-center justify-center">
                    <Ionicons name="bag-handle" size={16} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-black text-sm">
                      {cartTotalCount} {cartTotalCount === 1 ? "item" : "items"} in Basket
                    </Text>
                    <Text className="text-orange-100 text-[11px] font-bold">
                      Food Subtotal: ₱{cartFoodSubtotal}.00
                    </Text>
                  </View>
                </View>
                <View className="bg-white/20 px-3 py-1.5 rounded-xl flex-row items-center gap-1">
                  <Text className="text-white font-black text-xs">View Basket</Text>
                  <Ionicons name="arrow-forward" size={13} color="white" />
                </View>
              </Pressable>
            </View>
          )}

          {/* 6. DISH CUSTOMIZATION MODAL */}
          {customizingDish && (
            <Modal
              visible={Boolean(customizingDish)}
              transparent
              animationType="slide"
              onRequestClose={() => setCustomizingDish(null)}
            >
              <View className="flex-1 bg-black/60 justify-end">
                <View className="w-full max-w-xl self-center bg-white rounded-t-3xl p-6 border-t border-gray-100 max-h-[85%]">
                  {/* Modal Header */}
                  <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100">
                    <View className="flex-1 pr-3">
                      <Text className="text-lg font-black text-gray-900">{customizingDish.name}</Text>
                      <Text className="text-xs text-gray-500 font-medium">
                        Customize dish options for your order
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setCustomizingDish(null)}
                      className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                    >
                      <Ionicons name="close" size={18} color="#4B5563" />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                    {/* Spice Level Section */}
                    <Text className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                      🌶️ Spice Level
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {["Regular", "Spicy", "Extra Spicy"].map((spice) => {
                        const isSelected = selectedSpice === spice;
                        const extraText = spice === "Extra Spicy" ? " (+₱10)" : "";
                        return (
                          <Pressable
                            key={spice}
                            onPress={() => setSelectedSpice(spice)}
                            className={`px-3.5 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                              isSelected
                                ? "bg-orange-50 border-[#EA5410]"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <View
                              className={`w-3.5 h-3.5 rounded-full border items-center justify-center ${
                                isSelected ? "border-[#EA5410] bg-[#EA5410]" : "border-gray-400"
                              }`}
                            >
                              {isSelected && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </View>
                            <Text
                              className={`text-xs font-bold ${
                                isSelected ? "text-[#EA5410]" : "text-gray-700"
                              }`}
                            >
                              {spice}{extraText}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Add-ons & Sides Section */}
                    <Text className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                      🍚 Add-ons & Sides
                    </Text>
                    <View className="gap-2 mb-2">
                      {[
                        { label: "None", cost: 0 },
                        { label: "Extra Rice (+₱20)", cost: 20 },
                        { label: "Unlimited Sabaw (+₱15)", cost: 15 },
                      ].map((addon) => {
                        const isSelected = selectedAddon === addon.label;
                        return (
                          <Pressable
                            key={addon.label}
                            onPress={() => setSelectedAddon(addon.label)}
                            className={`p-3 rounded-2xl border flex-row items-center justify-between ${
                              isSelected
                                ? "bg-orange-50/80 border-[#EA5410]"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                isSelected ? "text-[#EA5410]" : "text-gray-800"
                              }`}
                            >
                              {addon.label}
                            </Text>
                            <View
                              className={`w-4 h-4 rounded-full border items-center justify-center ${
                                isSelected ? "border-[#EA5410] bg-[#EA5410]" : "border-gray-300"
                              }`}
                            >
                              {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Add to Basket Action */}
                  {(() => {
                    let totalCustomPrice = customizingDish.price;
                    if (selectedSpice === "Extra Spicy") totalCustomPrice += 10;
                    if (selectedAddon === "Extra Rice (+₱20)") totalCustomPrice += 20;
                    if (selectedAddon === "Unlimited Sabaw (+₱15)") totalCustomPrice += 15;

                    return (
                      <Pressable
                        onPress={() => handleConfirmCustomize(false)}
                        className="bg-[#EA5410] py-3.5 px-5 rounded-2xl flex-row items-center justify-between shadow-sm active:opacity-95"
                      >
                        <Text className="text-white font-black text-sm">Add to Basket</Text>
                        <Text className="text-white font-black text-base">
                          ₱{totalCustomPrice.toFixed(2)}
                        </Text>
                      </Pressable>
                    );
                  })()}
                </View>
              </View>
            </Modal>
          )}
        </View>
      )}
    </BottomSheetModal>
  );
}
