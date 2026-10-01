import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { OrderStatus } from "../../../types/order";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";

interface KitchenOrder {
  id: string;
  customer: string;
  phone: string;
  address: string;
  items: string[];
  total: number;
  paymentType: string;
  status: OrderStatus;
  time: string;
  notes: string;
}

export default function MobileMerchantMode() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/(web)/auth/store-login" />;
  }

  const router = useRouter();
  const { reservations, updateReservationStatus } = useAuth();
  
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "reservations" | "menu" | "qr" | "settings">("orders");

  // Filter reservations for Mama Letty's Karenderia
  const storeReservations = reservations.filter(
    (r) => r.restaurantName === "Mama Letty's Karenderia"
  );

  // Live Orders Pipeline State
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([
    {
      id: "1094",
      customer: "Juan dela Cruz",
      phone: "+63 917 111 2222",
      address: "Near Baywalk Pavilion, blue gate",
      items: ["2x Classic Pork Humba", "2x Extra Rice"],
      total: 220,
      paymentType: "Cash on Delivery",
      status: "preparing",
      time: "5 mins ago",
      notes: "Extra spicy sauce please",
    },
    {
      id: "1095",
      customer: "Maria Santos",
      phone: "+63 928 333 4444",
      address: "Purok 4, Brgy. Sainz",
      items: ["1x Native Chicken Tinola", "1x Extra Rice"],
      total: 140,
      paymentType: "Cash on Delivery",
      status: "placed",
      time: "Just now",
      notes: "Hot sabaw please",
    },
    {
      id: "1093",
      customer: "Rico Alcantara",
      phone: "+63 939 555 6666",
      address: "Dahican Beach Road",
      items: ["1x Pork Sinigang", "2x Extra Rice"],
      total: 110,
      paymentType: "GCash Paid",
      status: "ready_for_pickup",
      time: "15 mins ago",
      notes: "",
    },
  ]);

  // Menu Inventory State
  const [menu, setMenu] = useState([
    { id: 1, name: "Classic Pork Humba", category: "Mains", price: 90, qty: 15, available: true, emoji: "🍲" },
    { id: 2, name: "Chicken Adobo", category: "Mains", price: 85, qty: 12, available: true, emoji: "🍗" },
    { id: 3, name: "Native Chicken Tinola", category: "Soups", price: 120, qty: 6, available: true, emoji: "🥣" },
    { id: 4, name: "Pork Sinigang", category: "Soups", price: 95, qty: 4, available: true, emoji: "🥘" },
    { id: 5, name: "Lechon Kawali", category: "Mains", price: 130, qty: 0, available: false, emoji: "🍖" },
    { id: 6, name: "Extra Rice", category: "Extras", price: 20, qty: 60, available: true, emoji: "🍚" },
    { id: 7, name: "Cold Calamansi Juice", category: "Beverages", price: 35, qty: 25, available: true, emoji: "🍹" },
  ]);

  // Modals
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishCategory, setNewDishCategory] = useState("Mains");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [newDishQty, setNewDishQty] = useState("");

  const [showKioskModal, setShowKioskModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Toggle item stock
  const toggleItem = (id: number) => {
    setMenu(menu.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  // Add new dish
  const handleAddDish = () => {
    if (!newDishName.trim() || !newDishPrice.trim()) {
      Alert.alert("Required Fields", "Please enter a dish name and price.");
      return;
    }

    const priceNum = parseFloat(newDishPrice) || 50;
    const qtyNum = parseInt(newDishQty) || 10;

    const newItem = {
      id: Date.now(),
      name: newDishName.trim(),
      category: newDishCategory,
      price: priceNum,
      qty: qtyNum,
      available: true,
      emoji: "🍽️",
    };

    setMenu([newItem, ...menu]);
    setNewDishName("");
    setNewDishPrice("");
    setNewDishQty("");
    setShowAddDishModal(false);
    Alert.alert("Dish Added! 🎉", `${newItem.name} (₱${priceNum}.00) is now live on Mati FoodFinder.`);
  };

  // Update order status in kitchen pipeline
  const updateOrderStatus = (id: string, newStatus: OrderStatus) => {
    if (newStatus === "cancelled") {
      setKitchenOrders(kitchenOrders.filter((o) => o.id !== id));
      Alert.alert("Order Cancelled", `Order #${id} was declined and removed from the queue.`);
    } else {
      setKitchenOrders(
        kitchenOrders.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
      const label =
        newStatus === "preparing"
          ? "PREPARING FOOD"
          : newStatus === "ready_for_pickup"
          ? "READY FOR RIDER PICKUP"
          : newStatus === "out_for_delivery"
          ? "HANDED TO COURIER"
          : newStatus.toUpperCase();
      Alert.alert("Status Updated 🍳", `Order #${id} is now ${label}.`);
    }
  };

  const handleExitToPortal = () => {
    Alert.alert(
      "Exit Merchant Mode?",
      "Are you sure you want to exit Store Kitchen Mode and return to the main Mati FoodFinder access portal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit to Portal",
          style: "destructive",
          onPress: () => router.replace("/(mobile)/portal"),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* TOP HEADER */}
      <View className="px-5 pt-3 pb-2.5 bg-white border-b border-gray-200 z-10 shadow-xs">
        <View className="flex-row justify-between items-center mb-2">
          <Pressable onPress={handleExitToPortal} className="flex-row items-center py-1">
            <Ionicons name="arrow-back" size={14} color="#047857" />
            <Text className="text-emerald-700 font-bold text-xs ml-1">Exit to Portal</Text>
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Text className={`font-bold text-xs ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isOnline ? 'ACCEPTING ORDERS' : 'CLOSED'}
            </Text>
            <Switch 
              value={isOnline} 
              onValueChange={setIsOnline} 
              trackColor={{ false: "#d1d5db", true: "#34d399" }}
              thumbColor={"#ffffff"}
            />
          </View>
        </View>

        <View className="flex-row justify-between items-end mb-2.5">
          <View>
            <Text className="text-xl font-black text-gray-900">Mama Letty's Karenderia</Text>
            <Text className="text-orange-600 font-bold text-[11px] uppercase tracking-wider">
              Store Merchant Mode • Mati City
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-400 font-bold">Today's COD</Text>
            <Text className="text-base font-black text-emerald-800">₱4,250.00</Text>
          </View>
        </View>

        {/* 5-TAB SEGMENTED BAR */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          <Pressable
            onPress={() => setActiveTab("orders")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1 ${
              activeTab === "orders" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="receipt"
              size={13}
              color={activeTab === "orders" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "orders" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Kitchen ({kitchenOrders.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("reservations")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1 ${
              activeTab === "reservations" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={activeTab === "reservations" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "reservations" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Tables ({storeReservations.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("menu")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1 ${
              activeTab === "menu" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="fast-food"
              size={13}
              color={activeTab === "menu" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "menu" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Menu
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("qr")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1 ${
              activeTab === "qr" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="qr-code"
              size={13}
              color={activeTab === "qr" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "qr" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Stand QR
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("settings")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1 ${
              activeTab === "settings" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="settings"
              size={13}
              color={activeTab === "settings" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "settings" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Billing
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* TAB 1: KITCHEN ORDERS */}
        {activeTab === "orders" && (
          <View className="p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                Live Kitchen Pipeline
              </Text>
              <Text className="text-xs font-bold text-orange-600">{kitchenOrders.length} active orders</Text>
            </View>

            <View className="gap-4">
              {kitchenOrders.map((order) => {
                const isPlaced = order.status === "placed";
                const isPreparing = order.status === "preparing";
                const isReadyForPickup = order.status === "ready_for_pickup";
                const isOutForDelivery = order.status === "out_for_delivery";

                return (
                  <View
                    key={order.id}
                    className={`bg-white p-4 rounded-2xl border shadow-xs ${
                      isPlaced
                        ? "border-orange-300"
                        : isPreparing
                        ? "border-amber-400"
                        : isReadyForPickup
                        ? "border-emerald-500"
                        : "border-sky-500"
                    }`}
                  >
                    {/* Header */}
                    <View className="flex-row justify-between items-start border-b border-gray-100 pb-2.5 mb-2.5">
                      <View>
                        <View className="flex-row items-center gap-2">
                          <Text className="font-extrabold text-gray-900 text-base">
                            Order #{order.id}
                          </Text>
                          <View
                            className={`px-2 py-0.5 rounded ${
                              isPlaced
                                ? "bg-orange-100"
                                : isPreparing
                                ? "bg-amber-100"
                                : isReadyForPickup
                                ? "bg-emerald-100"
                                : "bg-sky-100"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-black uppercase ${
                                isPlaced
                                  ? "text-orange-800"
                                  : isPreparing
                                  ? "text-amber-800"
                                  : isReadyForPickup
                                  ? "text-emerald-800"
                                  : "text-sky-800"
                              }`}
                            >
                              {order.status === "ready_for_pickup"
                                ? "READY FOR PICKUP"
                                : order.status === "out_for_delivery"
                                ? "OUT FOR DELIVERY"
                                : order.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-gray-500 font-medium mt-0.5">
                          {order.customer} • {order.time}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-black text-gray-900 text-base">
                          ₱{order.total.toFixed(2)}
                        </Text>
                        <Text className="text-[10px] font-bold text-orange-700 uppercase">
                          {order.paymentType}
                        </Text>
                      </View>
                    </View>

                    {/* Items List */}
                    <View className="gap-1 mb-3">
                      {order.items.map((item, idx) => (
                        <Text key={idx} className="text-xs font-bold text-gray-800">
                          • {item}
                        </Text>
                      ))}
                      <Text className="text-[11px] text-gray-500 mt-1">
                        📍 {order.address}
                      </Text>
                      {order.notes ? (
                        <Text className="text-[11px] text-amber-800 italic">
                          "{order.notes}"
                        </Text>
                      ) : null}
                    </View>

                    {/* Pipeline Actions */}
                    <View className="flex-row gap-2 pt-2 border-t border-gray-100">
                      {isPlaced && (
                        <>
                          <Pressable
                            onPress={() => updateOrderStatus(order.id, "cancelled")}
                            className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
                          >
                            <Text className="text-gray-700 font-bold text-xs">Decline</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => updateOrderStatus(order.id, "preparing")}
                            className="flex-1 py-3 bg-orange-500 rounded-xl items-center shadow-xs"
                          >
                            <Text className="text-white font-extrabold text-xs">Accept & Cook 🍳</Text>
                          </Pressable>
                        </>
                      )}

                      {isPreparing && (
                        <>
                          <Pressable
                            onPress={() => Alert.alert("Customer Contact", `Calling ${order.customer} (${order.phone})...`)}
                            className="w-11 h-11 bg-gray-100 rounded-xl items-center justify-center"
                          >
                            <Ionicons name="call-outline" size={16} color="#374151" />
                          </Pressable>
                          <Pressable
                            onPress={() => updateOrderStatus(order.id, "ready_for_pickup")}
                            className="flex-1 py-3 bg-emerald-700 rounded-xl items-center shadow-xs"
                          >
                            <Text className="text-white font-extrabold text-xs">Mark Ready for Rider 🥡</Text>
                          </Pressable>
                        </>
                      )}

                      {isReadyForPickup && (
                        <View className="flex-1 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                            <Ionicons name="bicycle" size={16} color="#047857" />
                            <Text className="text-xs font-bold text-emerald-800">
                              Rider Jun (#M-402) arriving (~4 mins)
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => updateOrderStatus(order.id, "out_for_delivery")}
                            className="px-3 py-2 bg-emerald-700 rounded-xl shadow-xs"
                          >
                            <Text className="text-xs font-bold text-white">Hand to Rider 🛵</Text>
                          </Pressable>
                        </View>
                      )}

                      {isOutForDelivery && (
                        <View className="flex-1 flex-row items-center justify-between bg-sky-50 p-2.5 rounded-xl border border-sky-200">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons name="navigate-circle" size={18} color="#0284c7" />
                            <Text className="text-xs font-bold text-sky-900">
                              Dispatched with Courier Jun
                            </Text>
                          </View>
                          <Text className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            COD Pending
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 2: TABLE RESERVATIONS */}
        {activeTab === "reservations" && (
          <View className="p-5">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                  Table Reservations
                </Text>
                <Text className="text-xs text-gray-500 font-medium">
                  Approve seating requests in advance
                </Text>
              </View>
              <View className="bg-emerald-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-black text-emerald-800">4 of 6 Tables Left</Text>
              </View>
            </View>

            {storeReservations.length === 0 ? (
              <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center">
                <Ionicons name="calendar-outline" size={38} color="#9ca3af" />
                <Text className="text-sm font-extrabold text-gray-800 mt-2">No reservations yet</Text>
                <Text className="text-xs text-gray-400 text-center mt-1">
                  Customer dining table booking requests will appear here.
                </Text>
              </View>
            ) : (
              storeReservations.map((res) => {
                const isPending = res.status === "pending";
                const isConfirmed = res.status === "confirmed";

                return (
                  <View
                    key={res.id}
                    className={`bg-white p-4 rounded-2xl border mb-4 shadow-xs ${
                      isPending ? "border-amber-400" : "border-emerald-300"
                    }`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View>
                        <Text className="font-black text-base text-gray-900">
                          Party of {res.partySize} Guests
                        </Text>
                        <Text className="text-xs text-gray-500 font-medium">
                          {res.date} at {res.time} • ID: {res.id.toUpperCase()}
                        </Text>
                      </View>
                      <View
                        className={`px-2.5 py-0.5 rounded-md ${
                          isConfirmed ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            isConfirmed ? "text-emerald-800" : "text-amber-800"
                          }`}
                        >
                          {res.status}
                        </Text>
                      </View>
                    </View>

                    {res.specialNotes ? (
                      <View className="bg-gray-50 p-2.5 rounded-xl mb-3 border border-gray-100">
                        <Text className="text-xs text-gray-600 italic">
                          "{res.specialNotes}"
                        </Text>
                      </View>
                    ) : null}

                    {isPending ? (
                      <View className="flex-row gap-2.5 pt-2 border-t border-gray-100">
                        <Pressable
                          onPress={() => {
                            updateReservationStatus(res.id, "declined");
                            Alert.alert("Reservation Declined", "Customer has been notified.");
                          }}
                          className="flex-1 py-2.5 bg-gray-100 rounded-xl items-center"
                        >
                          <Text className="text-gray-700 font-bold text-xs">Decline</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            updateReservationStatus(res.id, "confirmed");
                            Alert.alert("Reservation Approved! 🎉", "Customer has been notified with table confirmation.");
                          }}
                          className="flex-1 py-2.5 bg-emerald-700 rounded-xl items-center shadow-xs"
                        >
                          <Text className="text-white font-bold text-xs">Approve Table</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View className="pt-2 border-t border-gray-100 flex-row items-center justify-between">
                        <Text className="text-xs font-bold text-emerald-800">
                          Table Assigned & Confirmed
                        </Text>
                        <Pressable
                          onPress={() => Alert.alert("Customer Contact", "Calling guest Juan (+63 917 234 5678)...")}
                          className="px-3 py-1 bg-gray-100 rounded-lg"
                        >
                          <Text className="text-xs font-bold text-gray-700">Call Guest</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: MENU & STOCK INVENTORY */}
        {activeTab === "menu" && (
          <View className="p-5">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                  Menu & Live Stock
                </Text>
                <Text className="text-xs text-gray-500 font-medium">Tap switch to update availability</Text>
              </View>
              <Pressable
                onPress={() => setShowAddDishModal(true)}
                className="bg-emerald-700 px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-xs"
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white text-xs font-bold">Add Dish</Text>
              </Pressable>
            </View>

            <View className="gap-3">
              {menu.map((dish) => (
                <View
                  key={dish.id}
                  className={`flex-row justify-between items-center p-3.5 rounded-2xl border ${
                    dish.available ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-70'
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-3">
                    <Text className="text-2xl">{dish.emoji}</Text>
                    <View className="flex-1">
                      <Text className={`font-black text-sm ${dish.available ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                        {dish.name}
                      </Text>
                      <Text className="text-xs font-bold text-emerald-800">₱{dish.price}.00 • {dish.category}</Text>
                      <Text className="text-[10px] text-gray-400 mt-0.5">{dish.qty} servings remaining</Text>
                    </View>
                  </View>

                  <View className="items-end gap-1.5">
                    <Switch
                      value={dish.available}
                      onValueChange={() => toggleItem(dish.id)}
                      trackColor={{ false: "#d1d5db", true: "#34d399" }}
                      thumbColor={"#ffffff"}
                    />
                    <Text className={`text-[9px] font-black ${dish.available ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {dish.available ? 'IN STOCK' : 'SOLD OUT'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 4: STORE STAND QR & ANALYTICS (NEW REQUESTED FEATURE!) */}
        {activeTab === "qr" && (
          <View className="p-5">
            <View className="mb-4">
              <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                Store Stand QR Code
              </Text>
              <Text className="text-xs text-gray-500 font-medium">
                Unique scannable code for your counter stand or dining tables
              </Text>
            </View>

            {/* Stand QR Display Card */}
            <View className="bg-white p-6 rounded-3xl border-2 border-emerald-600 items-center shadow-sm mb-5">
              <View className="bg-emerald-100 px-3 py-1 rounded-full mb-3">
                <Text className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  Store Stand Identifier: #MFF-ST-101
                </Text>
              </View>

              <Text className="text-xl font-black text-gray-900 text-center mb-1">
                Mama Letty's Karenderia
              </Text>
              <Text className="text-xs text-gray-500 text-center mb-5">
                Scan with Mati FoodFinder to check in & earn foodie visit points!
              </Text>

              {/* Stylized QR Visual Frame */}
              <View className="w-56 h-56 bg-white p-3 border-4 border-gray-900 rounded-3xl items-center justify-center relative mb-4 shadow-sm">
                {/* QR Pattern Simulation Grid */}
                <View className="w-full h-full border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center p-3">
                  <View className="flex-row gap-2 mb-2">
                    <View className="w-10 h-10 bg-gray-900 rounded-lg items-center justify-center">
                      <View className="w-4 h-4 bg-white rounded-xs" />
                    </View>
                    <View className="flex-1 bg-gray-200 rounded-lg" />
                    <View className="w-10 h-10 bg-gray-900 rounded-lg items-center justify-center">
                      <View className="w-4 h-4 bg-white rounded-xs" />
                    </View>
                  </View>

                  <View className="w-16 h-16 bg-emerald-800 rounded-2xl items-center justify-center my-2 shadow-xs">
                    <Text className="text-3xl">🍲</Text>
                  </View>

                  <View className="flex-row gap-2 mt-2 w-full">
                    <View className="w-10 h-10 bg-gray-900 rounded-lg items-center justify-center">
                      <View className="w-4 h-4 bg-white rounded-xs" />
                    </View>
                    <View className="flex-1 bg-gray-200 rounded-lg" />
                    <View className="w-6 h-6 bg-gray-800 rounded-md" />
                  </View>
                </View>

                {/* Center Badge */}
                <View className="absolute bg-white px-2 py-0.5 rounded-full border border-gray-300">
                  <Text className="text-[9px] font-black text-emerald-800 uppercase">MFF STAND</Text>
                </View>
              </View>

              <Text className="text-[11px] text-gray-400 font-medium text-center mb-5">
                URI: mff://checkin?store=Mama+Letty%27s+Karenderia&id=store_101
              </Text>

              {/* Actions: Kiosk Mode & Printable Poster */}
              <View className="flex-row gap-2.5 w-full">
                <Pressable
                  onPress={() => setShowKioskModal(true)}
                  className="flex-1 py-3 bg-emerald-700 rounded-xl items-center flex-row justify-center gap-1.5 shadow-xs"
                >
                  <Ionicons name="tv-outline" size={16} color="white" />
                  <Text className="text-white font-bold text-xs">Kiosk Display</Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowPrintModal(true)}
                  className="flex-1 py-3 bg-gray-100 rounded-xl items-center flex-row justify-center gap-1.5"
                >
                  <Ionicons name="print-outline" size={16} color="#374151" />
                  <Text className="text-gray-800 font-bold text-xs">Print Poster</Text>
                </Pressable>
              </View>
            </View>

            {/* In-Store Check-ins Analytics Card */}
            <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs mb-4">
              <View className="flex-row justify-between items-start mb-3">
                <View>
                  <Text className="text-sm font-black text-gray-900">In-Store Check-ins Analytics</Text>
                  <Text className="text-xs text-gray-500 font-medium">Powers the ML "Most Visited" ranking</Text>
                </View>
                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
                  <Ionicons name="stats-chart" size={16} color="#047857" />
                </View>
              </View>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Text className="text-xs text-gray-500 font-bold">Today</Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">28</Text>
                  <Text className="text-[10px] text-emerald-600 font-bold mt-1">↑ +6 vs yesterday</Text>
                </View>

                <View className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Text className="text-xs text-gray-500 font-bold">This Month</Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">142</Text>
                  <Text className="text-[10px] text-emerald-600 font-bold mt-1">Unique diners</Text>
                </View>
              </View>

              <Text className="text-[11px] text-gray-500 leading-snug">
                💡 When customers scan this stand QR code, your karenderia climbs to the top of their personal "Most Visited Places" recommendation carousel.
              </Text>
            </View>
          </View>
        )}

        {/* TAB 5: BILLING & STORE PROFILE */}
        {activeTab === "settings" && (
          <View className="p-5">
            <View className="mb-4">
              <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                Store Profile & Billing
              </Text>
              <Text className="text-xs text-gray-500 font-medium">PayMongo subscription & business info</Text>
            </View>

            {/* 2-Month Free Trial Banner */}
            <View className="bg-gradient-to-r from-emerald-800 to-emerald-900 bg-emerald-800 p-5 rounded-3xl shadow-sm mb-5">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                    Store Partner Plan
                  </Text>
                  <Text className="text-xl font-black text-white">2-Month Free Trial Active</Text>
                </View>
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white font-black text-xs">48 Days Left</Text>
                </View>
              </View>
              <Text className="text-xs text-emerald-100 leading-relaxed mb-3">
                Enjoy zero platform commissions on all live menus, table bookings, and COD delivery orders during your trial.
              </Text>
              <View className="bg-white/10 p-2.5 rounded-xl flex-row justify-between items-center">
                <Text className="text-[11px] text-white font-medium">PayMongo Auto-renewal</Text>
                <Text className="text-xs text-emerald-200 font-black">₱499 / month</Text>
              </View>
            </View>

            {/* Store Information */}
            <View className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs gap-3 mb-5">
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Business Information
              </Text>
              <View className="flex-row justify-between pb-2 border-b border-gray-100">
                <Text className="text-xs text-gray-500">Address</Text>
                <Text className="text-xs font-bold text-gray-800">Magsaysay St, Brgy. Central, Mati</Text>
              </View>
              <View className="flex-row justify-between pb-2 border-b border-gray-100">
                <Text className="text-xs text-gray-500">Phone</Text>
                <Text className="text-xs font-bold text-gray-800">+63 917 234 5678</Text>
              </View>
              <View className="flex-row justify-between pb-2 border-b border-gray-100">
                <Text className="text-xs text-gray-500">Operating Hours</Text>
                <Text className="text-xs font-bold text-gray-800">7:00 AM - 8:30 PM Daily</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-gray-500">Seating Capacity</Text>
                <Text className="text-xs font-bold text-gray-800">6 Dining Tables (4 available)</Text>
              </View>
            </View>

            {/* Exit Button */}
            <Pressable
              onPress={handleExitToPortal}
              className="bg-gray-800 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 shadow-xs"
            >
              <Ionicons name="swap-horizontal" size={16} color="white" />
              <Text className="text-white font-bold text-xs">Exit Kitchen Mode & Return to Portal</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: ADD NEW DISH */}
      <Modal visible={showAddDishModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <Text className="text-lg font-black text-gray-900">Add New Dish</Text>
              <Pressable onPress={() => setShowAddDishModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3">
              <Text className="text-xs font-bold text-gray-700 mb-1">Dish Name *</Text>
              <TextInput
                placeholder="e.g. Crispy Pork Kawali"
                value={newDishName}
                onChangeText={setNewDishName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Category *</Text>
              <View className="flex-row gap-2 mb-3">
                {["Mains", "Soups", "Extras", "Beverages"].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setNewDishCategory(cat)}
                    className={`px-3 py-2 rounded-xl border ${
                      newDishCategory === cat ? 'bg-emerald-700 border-emerald-700' : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${newDishCategory === cat ? 'text-white' : 'text-gray-700'}`}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-1">Price (₱ PHP) *</Text>
              <TextInput
                placeholder="e.g. 120"
                keyboardType="numeric"
                value={newDishPrice}
                onChangeText={setNewDishPrice}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Daily Servings Quantity</Text>
              <TextInput
                placeholder="e.g. 15"
                keyboardType="numeric"
                value={newDishQty}
                onChangeText={setNewDishQty}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-5"
                placeholderTextColor="#9ca3af"
              />

              <Pressable
                onPress={handleAddDish}
                className="bg-emerald-700 py-3.5 rounded-xl items-center mb-6 shadow-xs"
              >
                <Text className="text-white font-extrabold text-sm">Publish to Live Menu</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: FULLSCREEN KIOSK DISPLAY MODE */}
      <Modal visible={showKioskModal} transparent={false} animationType="fade">
        <SafeAreaView className="flex-1 bg-white items-center justify-between p-6">
          <View className="items-center mt-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="storefront" size={20} color="#047857" />
              <Text className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                Mati FoodFinder Stand Terminal
              </Text>
            </View>
            <Text className="text-3xl font-black text-gray-900 text-center">
              Mama Letty's Karenderia
            </Text>
            <Text className="text-sm font-bold text-gray-500 text-center mt-1">
              Scan with your phone to Check In & View Today's Fresh Menu
            </Text>
          </View>

          {/* Huge QR Visual */}
          <View className="w-72 h-72 bg-white p-4 border-4 border-gray-900 rounded-3xl items-center justify-center shadow-xl">
            <View className="w-full h-full border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center p-4">
              <View className="flex-row gap-3 mb-3">
                <View className="w-14 h-14 bg-gray-900 rounded-xl items-center justify-center">
                  <View className="w-6 h-6 bg-white rounded-xs" />
                </View>
                <View className="flex-1 bg-gray-200 rounded-xl" />
                <View className="w-14 h-14 bg-gray-900 rounded-xl items-center justify-center">
                  <View className="w-6 h-6 bg-white rounded-xs" />
                </View>
              </View>

              <View className="w-20 h-20 bg-emerald-800 rounded-3xl items-center justify-center my-3 shadow-md">
                <Text className="text-4xl">🍲</Text>
              </View>

              <View className="flex-row gap-3 mt-3 w-full">
                <View className="w-14 h-14 bg-gray-900 rounded-xl items-center justify-center">
                  <View className="w-6 h-6 bg-white rounded-xs" />
                </View>
                <View className="flex-1 bg-gray-200 rounded-xl" />
                <View className="w-8 h-8 bg-gray-800 rounded-lg" />
              </View>
            </View>
          </View>

          <View className="items-center w-full mb-6">
            <Text className="text-xs font-black text-emerald-800 mb-4 uppercase tracking-wider">
              ✨ Earn Mati Foodie Visit Points
            </Text>
            <Pressable
              onPress={() => setShowKioskModal(false)}
              className="bg-gray-100 px-8 py-3 rounded-2xl"
            >
              <Text className="text-gray-700 font-bold text-xs">Exit Kiosk Display Mode</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: PRINTABLE TENT CARD / POSTER PREVIEW */}
      <Modal visible={showPrintModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <Text className="text-base font-black text-gray-900">Printable Store Stand Poster</Text>
              <Pressable onPress={() => setShowPrintModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Stand Tent Card Preview */}
              <View className="bg-white p-6 border-2 border-dashed border-gray-400 rounded-2xl items-center shadow-xs mb-4">
                <View className="bg-emerald-800 px-3 py-1 rounded-full mb-2">
                  <Text className="text-white text-[10px] font-black tracking-widest uppercase">
                    Mati FoodFinder Official Partner
                  </Text>
                </View>

                <Text className="text-2xl font-black text-gray-900 text-center mb-0.5">
                  Mama Letty's Karenderia
                </Text>
                <Text className="text-xs text-gray-500 text-center mb-4">
                  Magsaysay St, Brgy. Central, Mati City
                </Text>

                {/* Scannable Frame */}
                <View className="w-48 h-48 bg-white p-3 border-2 border-gray-900 rounded-2xl items-center justify-center mb-4 shadow-sm">
                  <View className="w-16 h-16 bg-emerald-800 rounded-2xl items-center justify-center mb-2">
                    <Text className="text-3xl">🍲</Text>
                  </View>
                  <Text className="text-xs font-black text-gray-900 uppercase">SCAN WITH APP</Text>
                  <Text className="text-[10px] text-gray-400">#MFF-STAND-101</Text>
                </View>

                <View className="w-full bg-gray-50 p-3 rounded-xl gap-1 mb-2">
                  <Text className="text-[11px] font-bold text-gray-800">1. Open Mati FoodFinder mobile app</Text>
                  <Text className="text-[11px] font-bold text-gray-800">2. Tap 'Scan Store QR' in the top bar</Text>
                  <Text className="text-[11px] font-bold text-gray-800">3. Check in & view today's hot dishes!</Text>
                </View>
              </View>

              {/* Print Button */}
              <Pressable
                onPress={() => {
                  setShowPrintModal(false);
                  Alert.alert("Print Job Sent! 🖨️", "Stand poster formatted for A4/Tent-Card and sent to printer.");
                }}
                className="bg-emerald-700 py-3.5 rounded-xl items-center mb-6 shadow-xs flex-row justify-center gap-2"
              >
                <Ionicons name="print" size={16} color="white" />
                <Text className="text-white font-extrabold text-sm">Print / Save Stand Poster (PDF)</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
