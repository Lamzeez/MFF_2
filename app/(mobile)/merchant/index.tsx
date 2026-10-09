import React, { useState, useEffect } from "react";
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
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { OrderStatus } from "../../../types/order";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";
import {
  fetchStoreOrders,
  updateOrderStatus as updateDbOrderStatus,
  subscribeToOrders,
  calculateCodSettlement,
  confirmCodRemittance,
  CodSettlementSummary,
  LiveOrder,
} from "../../../services/orders";
import {
  fetchStoreReservations,
  subscribeToStoreReservations,
  updateReservationStatus as updateBackendReservationStatus,
  ReservationRow,
} from "../../../services/reservations";
import {
  fetchStoreMenuItems,
  updateMenuItemAvailability,
  createStoreMenuItem,
  subscribeToStoreMenuItems,
  fetchUserStoreId,
  fetchStoreById,
} from "../../../services/catalog";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { PrintableTableQrModal } from "../../../components/merchant/PrintableTableQrModal";

interface StoreDish {
  id: number;
  menuItemId?: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  available: boolean;
  emoji: string;
  description?: string;
}

interface KitchenOrder {
  id: string;
  rawId?: string;
  customer: string;
  phone: string;
  address: string;
  items: string[];
  total: number;
  paymentType: string;
  status: OrderStatus;
  time: string;
  notes: string;
  riderName?: string | null;
  isRebroadcast?: boolean;
}

export default function MobileMerchantMode() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/(web)/auth/store-login" />;
  }

  const router = useRouter();
  const { identity, status, logoutToGuest } = useSession();
  const isLoading = status === "loading";

  // Merchant Role Authentication Guard
  if (!isLoading && (!identity || !identity.roles.includes("merchant"))) {
    return <Redirect href="/(web)/auth/store-login" />;
  }

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "reservations" | "menu" | "qr" | "settings">("orders");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Loading Store...");
  const [storeAddress, setStoreAddress] = useState<string>("Mati City");
  const [storePhone, setStorePhone] = useState<string>("+63 917 234 5678");

  // Live State
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [liveReservations, setLiveReservations] = useState<ReservationRow[]>([]);
  const [menu, setMenu] = useState<StoreDish[]>([]);
  const [settlementData, setSettlementData] = useState<CodSettlementSummary | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchantStoreAndOrders();
    setRefreshing(false);
  };

  const displayReservations = liveReservations;

  const loadMerchantStoreAndOrders = async () => {
    if (!identity?.id) return;
    try {
      const targetStoreId = await fetchUserStoreId(identity.id);
      if (!targetStoreId) {
        setStoreId(null);
        setStoreName("No Store Assigned");
        return;
      }

      setStoreId(targetStoreId);

      // Load Store Profile
      const storeProfile = await fetchStoreById(targetStoreId);
      if (storeProfile) {
        setStoreName(storeProfile.name);
        if (storeProfile.address) setStoreAddress(storeProfile.address);
        if (storeProfile.phone) setStorePhone(storeProfile.phone);
      }

      // Load Orders
      const liveOrders = await fetchStoreOrders(targetStoreId);
      const settlement = calculateCodSettlement(liveOrders || []);
      setSettlementData(settlement);

      const mapped: KitchenOrder[] = (liveOrders || []).map((o) => ({
        id: o.orderNumber.replace("MFF-", "") || o.id.slice(0, 5),
        rawId: o.id,
        customer: o.customerName || "Customer",
        phone: o.customerPhone || "Mati City",
        address: `${o.deliveryAddress}, Brgy. ${o.barangay}`,
        items: o.items.map((i) => `${i.quantity}x ${i.name}`),
        total: o.total,
        paymentType: o.paymentMethod === "cod" ? "Cash on Delivery" : "GCash Paid",
        status: o.status,
        time: new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        notes: o.notes || "",
        riderName: o.riderName,
        isRebroadcast: o.isRebroadcast,
      }));
      setKitchenOrders(mapped);

      // Load Reservations
      const resData = await fetchStoreReservations(targetStoreId);
      setLiveReservations(resData || []);

      // Load Menu Items
      const menuData = await fetchStoreMenuItems(targetStoreId);
      setMenu(
        (menuData || []).map((m) => ({
          id: m.id,
          menuItemId: m.menuItemId,
          name: m.name,
          category: m.category || "Mains",
          price: m.price,
          qty: m.available ? 20 : 0,
          available: m.available,
          emoji: m.emoji || "🍲",
          description: m.description,
        }))
      );
    } catch (err) {
      console.error("Error loading merchant store orders and reservations:", err);
    }
  };

  useEffect(() => {
    if (identity?.id) {
      loadMerchantStoreAndOrders();
    }
  }, [identity?.id]);

  useEffect(() => {
    if (!storeId) return;
    const unsubOrders = subscribeToOrders({ storeId }, () => {
      loadMerchantStoreAndOrders();
    });
    const unsubReservations = subscribeToStoreReservations(storeId, () => {
      loadMerchantStoreAndOrders();
    });
    const unsubMenu = subscribeToStoreMenuItems(storeId, () => {
      loadMerchantStoreAndOrders();
    });
    return () => {
      unsubOrders();
      unsubReservations();
      unsubMenu();
    };
  }, [storeId]);

  // Modals
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishCategory, setNewDishCategory] = useState("Mains");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [newDishQty, setNewDishQty] = useState("");

  const [showKioskModal, setShowKioskModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showStandGeneratorModal, setShowStandGeneratorModal] = useState(false);

  // Toggle item stock in database
  const toggleItem = async (id: number) => {
    const target = menu.find((item) => item.id === id);
    if (!target) return;
    const newStatus = !target.available;

    // Optimistic UI update
    setMenu((prev) =>
      prev.map((item) => (item.id === id ? { ...item, available: newStatus } : item))
    );

    if (target.menuItemId) {
      const res = await updateMenuItemAvailability(target.menuItemId, newStatus);
      if (!res.success) {
        Alert.alert("Update Error", res.error || "Could not update availability in database.");
        setMenu((prev) =>
          prev.map((item) => (item.id === id ? { ...item, available: !newStatus } : item))
        );
      }
    }
  };

  // Add new dish to database
  const handleAddDish = async () => {
    if (!newDishName.trim() || !newDishPrice.trim()) {
      Alert.alert("Required Fields", "Please enter a dish name and price.");
      return;
    }

    const priceNum = parseFloat(newDishPrice) || 50;
    const qtyNum = parseInt(newDishQty) || 10;

    if (!storeId) {
      Alert.alert("Error", "No active store identified to add dish to.");
      return;
    }

    try {
      const res = await createStoreMenuItem(storeId, {
        name: newDishName.trim(),
        price: priceNum,
        description: `${newDishCategory} in Mati`,
        isAvailable: true,
      });

      if (res.success && res.data) {
        const created: StoreDish = {
          id: res.data.id,
          menuItemId: res.data.menuItemId,
          name: res.data.name,
          category: newDishCategory,
          price: res.data.price,
          qty: qtyNum,
          available: true,
          emoji: res.data.emoji || "🍽️",
          description: res.data.description,
        };
        setMenu((prev) => [created, ...prev]);
        setNewDishName("");
        setNewDishPrice("");
        setNewDishQty("");
        setShowAddDishModal(false);
        Alert.alert("Dish Added! 🎉", `${created.name} (₱${priceNum}.00) is now live on Mati FoodFinder.`);
      } else {
        Alert.alert("Failed to Add Dish", res.error || "Could not save to database.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save dish to database.");
    }
  };

  // Update order status in kitchen pipeline
  const updateOrderStatus = async (id: string, newStatus: OrderStatus) => {
    const targetOrder = kitchenOrders.find((o) => o.id === id);
    if (targetOrder?.rawId) {
      try {
        await updateDbOrderStatus(targetOrder.rawId, newStatus);
      } catch (err: any) {
        Alert.alert("Status Update Error", err?.message || "Could not update order status in Supabase.");
        return;
      }
    }

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

  const handleConfirmRemittance = async (orderId: string, foodAmount: number) => {
    Alert.alert(
      "Confirm Cash Remittance?",
      `Confirm that the courier has remitted ₱${foodAmount.toFixed(2)} physical food cash to ${storeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Received 🤝",
          onPress: async () => {
            try {
              setConfirmingOrderId(orderId);
              await confirmCodRemittance(orderId, storeName);
              Alert.alert(
                "Remittance Confirmed! 🎉",
                `₱${foodAmount.toFixed(2)} food cash has been recorded as remitted to ${storeName}.`
              );
              await loadMerchantStoreAndOrders();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to confirm COD remittance.");
            } finally {
              setConfirmingOrderId(null);
            }
          },
        },
      ]
    );
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

  const handleSignOutMerchant = () => {
    Alert.alert(
      "Sign Out of Store Merchant?",
      "Are you sure you want to sign out of this store account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logoutToGuest();
            router.replace("/portal");
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator size="large" color="#EA5410" />
        <Text className="text-xs text-gray-500 font-bold mt-3">Connecting to Kitchen Operations...</Text>
      </SafeAreaView>
    );
  }

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
          <View className="flex-1 pr-2">
            <Text className="text-xl font-black text-gray-900" numberOfLines={1}>
              {storeName}
            </Text>
            <Text className="text-orange-600 font-bold text-[11px] uppercase tracking-wider">
              Store Merchant Mode • Mati City
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-400 font-bold">Pipeline Sales</Text>
            <Text className="text-base font-black text-emerald-800">
              ₱{kitchenOrders
                .filter((o) => o.status === "delivered" || o.status === "ready_for_pickup" || o.status === "preparing")
                .reduce((sum, o) => sum + (o.total || 0), 0)
                .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
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
              color={activeTab === "orders" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "orders" ? "text-orange-600" : "text-gray-600"
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
              color={activeTab === "reservations" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "reservations" ? "text-orange-600" : "text-gray-600"
              }`}
            >
              Tables ({liveReservations.length})
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
              color={activeTab === "menu" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "menu" ? "text-orange-600" : "text-gray-600"
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
              color={activeTab === "qr" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "qr" ? "text-orange-600" : "text-gray-600"
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
              color={activeTab === "settings" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                activeTab === "settings" ? "text-orange-600" : "text-gray-600"
              }`}
            >
              Billing
            </Text>
          </Pressable>
        </View>
      </View>

      {/* TAB 1: KITCHEN ORDERS (VIRTUALIZED) */}
      {activeTab === "orders" && (
        <FlatList<KitchenOrder>
          data={kitchenOrders}
          keyExtractor={(order) => order.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#EA5410"]}
              tintColor="#EA5410"
            />
          }
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          ListHeaderComponent={
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                  Live Kitchen Pipeline
                </Text>
                <Text className="text-xs font-bold text-orange-600">{kitchenOrders.length} active orders</Text>
              </View>

              {/* COD Daily Settlement Sheet Button */}
              <Pressable
                onPress={() => setShowSettlementModal(true)}
                className="bg-emerald-700 active:bg-emerald-800 p-3.5 rounded-2xl flex-row items-center justify-between shadow-xs mb-1"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center">
                    <Ionicons name="cash-outline" size={18} color="#ffffff" />
                  </View>
                  <View>
                    <Text className="text-white text-xs font-black uppercase tracking-wider">
                      COD Remittance & Settlement Log 📋
                    </Text>
                    <Text className="text-emerald-200 text-[11px] font-medium">
                      {settlementData?.orders.length || 0} delivered orders • ₱{(settlementData?.totalPendingRemittance || 0).toFixed(2)} pending
                    </Text>
                  </View>
                </View>
                <View className="bg-emerald-800 px-2.5 py-1 rounded-lg flex-row items-center gap-1">
                  <Text className="text-white text-[11px] font-bold">Open Sheet</Text>
                  <Ionicons name="chevron-forward" size={12} color="#ffffff" />
                </View>
              </Pressable>
            </View>
          }
          renderItem={({ item: order }) => {
            const isPlaced = order.status === "placed";
            const isPreparing = order.status === "preparing";
            const isReadyForPickup = order.status === "ready_for_pickup";
            const isOutForDelivery = order.status === "out_for_delivery";
            const isCancelled = order.status === "cancelled";

            return (
              <View
                key={order.id}
                className={`bg-white p-4 rounded-2xl border shadow-xs mb-4 ${
                  isPlaced
                    ? "border-orange-300"
                    : isPreparing
                    ? "border-amber-400"
                    : isReadyForPickup
                    ? "border-emerald-500"
                    : isCancelled
                    ? "border-rose-400"
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
                            : isCancelled
                            ? "bg-rose-100"
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
                              : isCancelled
                              ? "text-rose-800"
                              : "text-sky-800"
                          }`}
                        >
                          {order.status === "ready_for_pickup"
                            ? "READY FOR PICKUP"
                            : order.status === "out_for_delivery"
                            ? "OUT FOR DELIVERY"
                            : order.status === "cancelled"
                            ? "CANCELLED"
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
                        className="flex-1 py-3 bg-gray-100 rounded-xl items-center active:bg-gray-200"
                      >
                        <Text className="text-gray-700 font-bold text-xs">Decline</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateOrderStatus(order.id, "preparing")}
                        className="flex-1 py-3 bg-orange-500 rounded-xl items-center shadow-xs active:bg-orange-600"
                      >
                        <Text className="text-white font-extrabold text-xs">Accept & Cook 🍳</Text>
                      </Pressable>
                    </>
                  )}

                  {isPreparing && (
                    <>
                      <Pressable
                        onPress={() => Alert.alert("Customer Contact", `Calling ${order.customer} (${order.phone})...`)}
                        className="w-11 h-11 bg-gray-100 rounded-xl items-center justify-center active:bg-gray-200"
                      >
                        <Ionicons name="call-outline" size={16} color="#374151" />
                      </Pressable>
                      <Pressable
                        onPress={() => updateOrderStatus(order.id, "ready_for_pickup")}
                        className="flex-1 py-3 bg-orange-500 rounded-xl items-center shadow-xs active:bg-orange-600"
                      >
                        <Text className="text-white font-extrabold text-xs">Mark Ready for Rider 🥡</Text>
                      </Pressable>
                    </>
                  )}

                  {isReadyForPickup && (
                    <View className="flex-1 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                        <Ionicons name="bicycle" size={16} color={order.isRebroadcast ? "#b45309" : "#047857"} />
                        <Text className={`text-xs font-bold ${order.isRebroadcast ? "text-amber-800" : "text-emerald-800"}`}>
                          {order.isRebroadcast
                            ? "⚠️ Re-broadcasting to couriers..."
                            : order.riderName
                            ? `Courier ${order.riderName} assigned`
                            : "Awaiting courier claim..."}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => updateOrderStatus(order.id, "out_for_delivery")}
                        className="px-3 py-2 bg-orange-500 rounded-xl shadow-xs active:bg-orange-600"
                      >
                        <Text className="text-xs font-bold text-white">Hand to Rider 🛵</Text>
                      </Pressable>
                    </View>
                  )}

                  {isOutForDelivery && (
                    <View className="flex-1 flex-row items-center justify-between bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="navigate-circle" size={18} color="#EA5410" />
                        <Text className="text-xs font-bold text-orange-950">
                          {order.riderName ? `Dispatched with Courier ${order.riderName}` : "Dispatched with Courier"}
                        </Text>
                      </View>
                      <Text className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        COD Pending
                      </Text>
                    </View>
                  )}

                  {isCancelled && (
                    <View className="flex-1 flex-row items-center justify-between bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                        <Ionicons name="alert-circle" size={18} color="#be123c" />
                        <Text className="text-xs font-bold text-rose-950">
                          {order.notes?.toLowerCase().includes("no-show")
                            ? "Cancelled: Customer No-Show (GPS Verified)"
                            : (order.notes || "Order Cancelled")}
                        </Text>
                      </View>
                      <Text className="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        Cancelled
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center">
              <Ionicons name="receipt-outline" size={38} color="#9ca3af" />
              <Text className="text-sm font-extrabold text-gray-800 mt-2">No active orders</Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                Incoming customer orders will appear here in real time.
              </Text>
            </View>
          }
        />
      )}

      {/* TAB 2: TABLE RESERVATIONS (VIRTUALIZED) */}
      {activeTab === "reservations" && (
        <FlatList<ReservationRow>
          data={displayReservations}
          keyExtractor={(res: any) => String(res.id)}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#EA5410"]}
              tintColor="#EA5410"
            />
          }
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          ListHeaderComponent={
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
          }
          renderItem={({ item: res }) => {
            const isPending = res.status === "pending";
            const isConfirmed = res.status === "confirmed";
            const partySize = (res as any).party_size || (res as any).partySize;
            const date = (res as any).reservation_date || (res as any).date;
            const time = (res as any).reservation_time || (res as any).time;
            const idRef = (res as any).reservation_number || res.id.slice(0, 8).toUpperCase();
            const specialNotes = (res as any).special_notes || (res as any).specialNotes;
            const guestName = (res as any).customer_name || "Guest";
            const guestPhone = (res as any).customer_phone || "+63 917 234 5678";

            return (
              <View
                key={res.id}
                className={`bg-white p-4 rounded-2xl border mb-4 shadow-xs ${
                  isPending ? "border-amber-400" : isConfirmed ? "border-emerald-300" : "border-gray-200"
                }`}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="font-black text-base text-gray-900">
                      {guestName} • Party of {partySize} Guests
                    </Text>
                    <Text className="text-xs text-gray-500 font-medium">
                      {date} at {time} • Ref: {idRef}
                    </Text>
                  </View>
                  <View
                    className={`px-2.5 py-0.5 rounded-md ${
                      isConfirmed ? "bg-emerald-100" : isPending ? "bg-amber-100" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase ${
                        isConfirmed ? "text-emerald-800" : isPending ? "text-amber-800" : "text-gray-600"
                      }`}
                    >
                      {res.status}
                    </Text>
                  </View>
                </View>

                {specialNotes ? (
                  <View className="bg-gray-50 p-2.5 rounded-xl mb-3 border border-gray-100">
                    <Text className="text-xs text-gray-600 italic">
                      "{specialNotes}"
                    </Text>
                  </View>
                ) : null}

                {isPending ? (
                  <View className="flex-row gap-2.5 pt-2 border-t border-gray-100">
                    <Pressable
                      onPress={async () => {
                        try {
                          await updateBackendReservationStatus(res.id, "declined");
                          loadMerchantStoreAndOrders();
                          Alert.alert("Reservation Declined", "Customer has been notified.");
                        } catch (err: any) {
                          Alert.alert("Error", err.message);
                        }
                      }}
                      className="flex-1 py-2.5 bg-gray-100 rounded-xl items-center active:bg-gray-200"
                    >
                      <Text className="text-gray-700 font-bold text-xs">Decline</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        try {
                          await updateBackendReservationStatus(res.id, "confirmed");
                          loadMerchantStoreAndOrders();
                          Alert.alert("Reservation Approved! 🎉", "Customer has been notified with table confirmation.");
                        } catch (err: any) {
                          Alert.alert("Error", err.message);
                        }
                      }}
                      className="flex-1 py-2.5 bg-orange-500 rounded-xl items-center shadow-xs active:bg-orange-600"
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
                      onPress={() => Alert.alert("Customer Contact", `Calling guest ${guestName} (${guestPhone})...`)}
                      className="px-3 py-1 bg-gray-100 rounded-lg active:bg-gray-200"
                    >
                      <Text className="text-xs font-bold text-gray-700">Call Guest</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center">
              <Ionicons name="calendar-outline" size={38} color="#9ca3af" />
              <Text className="text-sm font-extrabold text-gray-800 mt-2">No reservations yet</Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                Customer dining table booking requests will appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* TAB 3: MENU & STOCK INVENTORY (VIRTUALIZED) */}
      {activeTab === "menu" && (
        <FlatList<typeof menu[0]>
          data={menu}
          keyExtractor={(dish) => String(dish.id)}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          ListHeaderComponent={
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
                  Menu & Live Stock
                </Text>
                <Text className="text-xs text-gray-500 font-medium">Tap switch to update availability</Text>
              </View>
              <Pressable
                onPress={() => setShowAddDishModal(true)}
                className="bg-orange-500 px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-xs active:bg-orange-600"
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white text-xs font-bold">Add Dish</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: dish }) => (
            <View
              key={dish.id}
              className={`flex-row justify-between items-center p-3.5 rounded-2xl border mb-3 ${
                dish.available ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-70'
              }`}
            >
              <View className="flex-row items-center gap-3 flex-1 pr-3">
                <Text className="text-2xl">{dish.emoji}</Text>
                <View className="flex-1">
                  <Text className={`font-black text-sm ${dish.available ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                    {dish.name}
                  </Text>
                  <Text className="text-xs font-bold text-orange-600">₱{dish.price}.00 • {dish.category}</Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">{dish.qty} servings remaining</Text>
                </View>
              </View>

              <View className="items-end gap-1.5">
                <Switch
                  value={dish.available}
                  onValueChange={() => toggleItem(dish.id)}
                  trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  thumbColor={"#ffffff"}
                />
                <Text className={`text-[9px] font-black ${dish.available ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {dish.available ? 'IN STOCK' : 'SOLD OUT'}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* TAB 4: STORE STAND QR & ANALYTICS */}
      {activeTab === "qr" && (
        <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 60 }}>
          <View className="mb-4">
            <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
              Store Stand QR Code
            </Text>
            <Text className="text-xs text-gray-500 font-medium">
              Unique scannable code for your counter stand or dining tables
            </Text>
          </View>

          {/* Stand Generator Trigger Button */}
          <Pressable
            onPress={() => setShowStandGeneratorModal(true)}
            className="w-full py-3.5 bg-orange-500 rounded-xl items-center flex-row justify-center gap-2 mb-4 shadow-xs active:bg-orange-600"
          >
            <Ionicons name="print" size={18} color="white" />
            <Text className="text-white font-extrabold text-sm">Open Table Stand Generator (A6 Print) 🖨️</Text>
          </Pressable>

          {/* Stand QR Display Card */}
          <View className="bg-white p-6 rounded-3xl border-2 border-gray-900 items-center shadow-sm mb-5">
            <View className="bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-200">
              <Text className="text-[10px] font-black text-orange-800 uppercase tracking-wider">
                Store Stand Identifier: #MFF-ST-{storeId ? storeId.slice(0, 4).toUpperCase() : "ACTIVE"}
              </Text>
            </View>

            <Text className="text-xl font-black text-gray-900 text-center mb-1">
              {storeName}
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

                <View className="w-16 h-16 bg-gray-900 rounded-2xl items-center justify-center my-2 shadow-xs">
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
                <Text className="text-[9px] font-black text-orange-600 uppercase">MFF STAND</Text>
              </View>
            </View>

            <Text className="text-[11px] text-gray-400 font-medium text-center mb-5">
              URI: mff://checkin?store={encodeURIComponent(storeName)}&id={storeId || "store"}
            </Text>

            {/* Actions: Kiosk Mode & Printable Poster */}
            <View className="flex-row gap-2.5 w-full">
              <Pressable
                onPress={() => setShowKioskModal(true)}
                className="flex-1 py-3 bg-gray-900 rounded-xl items-center flex-row justify-center gap-1.5 shadow-xs active:bg-black"
              >
                <Ionicons name="tv-outline" size={16} color="white" />
                <Text className="text-white font-bold text-xs">Kiosk Display</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowPrintModal(true)}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center flex-row justify-center gap-1.5 active:bg-gray-200"
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
                <Text className="text-xs text-gray-500 font-medium">Powers the "Most Visited" ranking</Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center border border-orange-200">
                <Ionicons name="stats-chart" size={16} color="#EA5410" />
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
        </ScrollView>
      )}

      {/* TAB 5: BILLING & STORE PROFILE */}
      {activeTab === "settings" && (
        <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 60 }}>
          <View className="mb-4">
            <Text className="text-base font-black text-gray-900 uppercase tracking-wider">
              Store Profile & Billing
            </Text>
            <Text className="text-xs text-gray-500 font-medium">Subscription & business info</Text>
          </View>

          {/* 2-Month Free Trial Banner */}
          <View className="bg-gray-900 p-5 rounded-3xl shadow-sm mb-5 border border-gray-800">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Store Partner Plan
                </Text>
                <Text className="text-xl font-black text-white">2-Month Free Trial Active</Text>
              </View>
              <View className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
                <Text className="text-white font-black text-xs">48 Days Left</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-300 leading-relaxed mb-3">
              Enjoy zero platform commissions on all live menus, table bookings, and COD delivery orders during your trial.
            </Text>
            <View className="bg-white/10 p-2.5 rounded-xl flex-row justify-between items-center">
              <Text className="text-[11px] text-gray-300 font-medium">Auto-renewal</Text>
              <Text className="text-xs text-orange-400 font-black">₱499 / month</Text>
            </View>
          </View>

          {/* Store Information */}
          <View className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs gap-3 mb-5">
            <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Business Information
            </Text>
            <View className="flex-row justify-between pb-2 border-b border-gray-100">
              <Text className="text-xs text-gray-500">Store Name</Text>
              <Text className="text-xs font-bold text-gray-800">{storeName}</Text>
            </View>
            <View className="flex-row justify-between pb-2 border-b border-gray-100">
              <Text className="text-xs text-gray-500">Address</Text>
              <Text className="text-xs font-bold text-gray-800">{storeAddress}</Text>
            </View>
            <View className="flex-row justify-between pb-2 border-b border-gray-100">
              <Text className="text-xs text-gray-500">Phone</Text>
              <Text className="text-xs font-bold text-gray-800">{storePhone}</Text>
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
            className="bg-gray-100 border border-gray-200 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 mb-3 active:bg-gray-200"
          >
            <Ionicons name="swap-horizontal" size={16} color="#374151" />
            <Text className="text-gray-800 font-bold text-xs">Switch Role / Return to Portal</Text>
          </Pressable>

          {/* Sign Out Button */}
          <Pressable
            onPress={handleSignOutMerchant}
            className="bg-red-50 border border-red-200 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 shadow-xs active:bg-red-100"
          >
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
            <Text className="text-red-700 font-bold text-xs">Sign Out of Merchant Account</Text>
          </Pressable>
        </ScrollView>
      )}

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
                      newDishCategory === cat ? 'bg-orange-500 border-orange-500' : 'bg-gray-100 border-gray-200'
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
                className="bg-orange-500 py-3.5 rounded-xl items-center mb-6 shadow-xs active:bg-orange-600"
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
              <Ionicons name="storefront" size={20} color="#EA5410" />
              <Text className="text-xs font-black text-orange-600 uppercase tracking-widest">
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

              <View className="w-20 h-20 bg-gray-900 rounded-3xl items-center justify-center my-3 shadow-md">
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
            <Text className="text-xs font-black text-orange-600 mb-4 uppercase tracking-wider">
              ✨ Earn Mati Foodie Visit Points
            </Text>
            <Pressable
              onPress={() => setShowKioskModal(false)}
              className="bg-gray-100 px-8 py-3 rounded-2xl active:bg-gray-200"
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
                <View className="bg-gray-900 px-3 py-1 rounded-full mb-2">
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
                  <View className="w-16 h-16 bg-gray-900 rounded-2xl items-center justify-center mb-2">
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
                className="bg-orange-500 py-3.5 rounded-xl items-center mb-6 shadow-xs flex-row justify-center gap-2 active:bg-orange-600"
              >
                <Ionicons name="print" size={16} color="white" />
                <Text className="text-white font-extrabold text-sm">Print / Save Stand Poster (PDF)</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: ACRYLIC TABLE STAND VECTOR QR GENERATOR */}
      <PrintableTableQrModal
        visible={showStandGeneratorModal}
        onClose={() => setShowStandGeneratorModal(false)}
        storeId={storeId || ""}
        storeName={storeName}
      />

      {/* MODAL 5: 24/7 COD SETTLEMENT & CASH REMITTANCE LOG */}
      <Modal
        visible={showSettlementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettlementModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
                  <Ionicons name="receipt" size={18} color="#059669" />
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900 uppercase">
                    Store COD Settlement Log
                  </Text>
                  <Text className="text-[11px] text-gray-500 font-medium">
                    {storeName} • 24/7 Rolling Courier Reconciliation
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowSettlementModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Financial Snapshot Cards */}
              <View className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800">
                <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Gross Food Sales via Cash-on-Delivery (COD)
                </Text>
                <Text className="text-2xl font-black text-white mb-3">
                  ₱{(settlementData?.totalFoodSubtotalToRemit || 0).toFixed(2)}
                </Text>

                <View className="flex-row gap-2 pt-3 border-t border-gray-800">
                  <View className="flex-1 bg-gray-800/80 p-2.5 rounded-xl">
                    <Text className="text-[10px] text-gray-400 font-bold uppercase">
                      Delivered Trips
                    </Text>
                    <Text className="text-base font-black text-white mt-0.5">
                      {settlementData?.totalDeliveredOrders || 0}
                    </Text>
                    <Text className="text-[9px] text-gray-400 mt-0.5">Completed orders</Text>
                  </View>

                  <View className="flex-1 bg-gray-800/80 p-2.5 rounded-xl">
                    <Text className="text-[10px] text-emerald-400 font-bold uppercase">
                      Cash Remitted
                    </Text>
                    <Text className="text-base font-black text-emerald-400 mt-0.5">
                      ₱{(settlementData?.totalRemitted || 0).toFixed(2)}
                    </Text>
                    <Text className="text-[9px] text-gray-400 mt-0.5">Turned over in full</Text>
                  </View>
                </View>
              </View>

              {/* Status Breakdown Pills */}
              <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <Text className="text-[10px] font-bold text-emerald-700 uppercase">
                    Remitted Food Cash
                  </Text>
                  <Text className="text-base font-black text-emerald-900 mt-0.5">
                    ₱{(settlementData?.totalRemitted || 0).toFixed(2)}
                  </Text>
                  <Text className="text-[9px] text-emerald-600 font-medium">Received by cashier</Text>
                </View>

                <View className="flex-1 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <Text className="text-[10px] font-bold text-amber-700 uppercase">
                    Pending Courier Turnover
                  </Text>
                  <Text className="text-base font-black text-amber-900 mt-0.5">
                    ₱{(settlementData?.totalPendingRemittance || 0).toFixed(2)}
                  </Text>
                  <Text className="text-[9px] text-amber-600 font-medium">Couriers currently hold</Text>
                </View>
              </View>

              {/* Accounting Notice */}
              <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 flex-row items-start gap-2">
                <Ionicons name="information-circle" size={18} color="#059669" />
                <Text className="text-[11px] text-emerald-900 leading-tight flex-1">
                  <Text className="font-bold">Mati Courier Protocol:</Text> Independent couriers collect total cash from customers (Food + ₱35 Delivery Fee). Couriers retain their ₱35 delivery fee and remit the food subtotal to your cashier. Tap 'Confirm Cash Received' when cash is handed over.
                </Text>
              </View>

              {/* Order Breakdown List */}
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                Delivered COD Orders ({settlementData?.orders.length || 0})
              </Text>

              {(!settlementData || settlementData.orders.length === 0) ? (
                <View className="bg-gray-50 border border-gray-200 p-6 rounded-xl items-center mb-6">
                  <Ionicons name="receipt-outline" size={32} color="#9ca3af" />
                  <Text className="text-xs text-gray-500 font-bold mt-2">
                    No completed COD orders recorded yet.
                  </Text>
                  <Text className="text-[11px] text-gray-400 text-center mt-1">
                    When riders complete COD deliveries, they will appear here for remittance reconciliation.
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5 mb-6">
                  {settlementData.orders.map((ord) => (
                    <View
                      key={ord.orderId}
                      className="bg-white border border-gray-200 p-3.5 rounded-2xl shadow-xs"
                    >
                      <View className="flex-row justify-between items-center mb-1.5">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs font-black text-gray-900">
                            Order #{ord.orderNumber}
                          </Text>
                          <Text className="text-[11px] text-gray-400">•</Text>
                          <Text className="text-[11px] text-gray-600 font-medium">
                            {ord.customerName}
                          </Text>
                        </View>
                        <View
                          className={`px-2 py-0.5 rounded-full ${
                            ord.isRemitted ? "bg-emerald-100" : "bg-amber-100"
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-black uppercase ${
                              ord.isRemitted ? "text-emerald-800" : "text-amber-800"
                            }`}
                          >
                            {ord.isRemitted ? "Remitted ✓" : "Pending Cash"}
                          </Text>
                        </View>
                      </View>

                      {/* Courier & Amount Info */}
                      <View className="bg-gray-50 p-2.5 rounded-xl flex-row justify-between items-center mb-2">
                        <View>
                          <Text className="text-[10px] text-gray-400 uppercase font-bold">
                            Courier
                          </Text>
                          <Text className="text-xs font-bold text-gray-800">
                            🛵 {ord.riderName || "Independent Rider"}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[10px] text-gray-400 uppercase font-bold">
                            Food Subtotal Due
                          </Text>
                          <Text className="text-sm font-black text-emerald-800">
                            ₱{ord.subtotal.toFixed(2)}
                          </Text>
                          <Text className="text-[9px] text-gray-400">
                            Collected: ₱{ord.total.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* Action Button if Pending */}
                      {!ord.isRemitted ? (
                        <Pressable
                          onPress={() => handleConfirmRemittance(ord.orderId, ord.subtotal)}
                          disabled={confirmingOrderId === ord.orderId}
                          className="bg-emerald-600 active:bg-emerald-700 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-2"
                        >
                          {confirmingOrderId === ord.orderId ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                              <Text className="text-white text-xs font-black">
                                Confirm Cash Received (₱{ord.subtotal.toFixed(2)}) 🤝
                              </Text>
                            </>
                          )}
                        </Pressable>
                      ) : (
                        <View className="flex-row items-center gap-1.5 pt-1">
                          <Ionicons name="shield-checkmark" size={14} color="#059669" />
                          <Text className="text-[10px] text-emerald-700 font-semibold">
                            Food cash confirmed received & remitted to store ledger.
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => setShowSettlementModal(false)}
                className="w-full py-3.5 bg-gray-900 rounded-xl items-center mb-4 active:bg-gray-800"
              >
                <Text className="text-white font-bold text-xs uppercase tracking-wider">
                  Close Settlement Sheet
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
