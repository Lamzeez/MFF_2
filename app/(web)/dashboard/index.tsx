import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import {
  fetchStoreById,
  fetchStoreMenuItems,
  fetchUserStoreId,
  updateStoreOpenStatus,
  type LiveStoreProfile,
} from "../../../services/catalog";
import { fetchMerchantStoreMetrics, type StoreMetrics } from "../../../services/admin";
import {
  fetchStoreOrders,
  subscribeToOrders,
  updateOrderStatus,
  merchantRebroadcastOrder,
  type LiveOrder,
  type LiveOrderItem,
} from "../../../services/orders";
import {
  fetchStoreReservations,
  updateReservationStatus,
  subscribeToStoreReservations,
  type ReservationRow,
  type ReservationStatus,
} from "../../../services/reservations";
import { getOrderStatusTheme, getReservationStatusTheme } from "../../../lib/status-tokens";
import { formatReservationDate } from "../../../lib/reservation-dates";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import { PrintableTableQrModal } from "../../../components/merchant/PrintableTableQrModal";
import type { FoodItem } from "../../../types/restaurant";
import type { OrderStatus } from "../../../types/order";

const DEFAULT_STORE_ID = "11111111-1111-1111-1111-111111111111";
const TOTAL_TABLES_CAPACITY = 6;

export default function StoreDashboardOverview() {
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string>(DEFAULT_STORE_ID);

  const [isOpen, setIsOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [store, setStore] = useState<LiveStoreProfile | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [processingResId, setProcessingResId] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  useEffect(() => {
    if (identity?.id) {
      fetchUserStoreId(identity.id).then((id) => {
        if (id) setStoreId(id);
      });
    }
  }, [identity?.id]);

  useEffect(() => {
    let unsubOrders: (() => void) | undefined;
    let unsubReservations: (() => void) | undefined;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [storeData, metricsData, ordersData, menuData, resData] = await Promise.all([
          fetchStoreById(storeId),
          fetchMerchantStoreMetrics(storeId),
          fetchStoreOrders(storeId),
          fetchStoreMenuItems(storeId),
          fetchStoreReservations(storeId).catch(() => []),
        ]);

        if (storeData) {
          setStore(storeData);
          setIsOpen(storeData.isOpen ?? true);
        }
        if (metricsData) setMetrics(metricsData);
        setOrders(ordersData);
        setMenuItems(menuData);
        setReservations(resData);
      } catch (err) {
        console.warn("Failed to load store dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    // Subscribe to realtime orders for this store
    unsubOrders = subscribeToOrders({ storeId }, () => {
      fetchStoreOrders(storeId).then((data) => setOrders(data));
      fetchMerchantStoreMetrics(storeId).then((m) => {
        if (m) setMetrics(m);
      });
    });

    // Subscribe to realtime table reservations for this store
    unsubReservations = subscribeToStoreReservations(storeId, () => {
      fetchStoreReservations(storeId)
        .then((data) => setReservations(data))
        .catch(() => {});
      fetchMerchantStoreMetrics(storeId).then((m) => {
        if (m) setMetrics(m);
      });
    });

    return () => {
      if (unsubOrders) unsubOrders();
      if (unsubReservations) unsubReservations();
    };
  }, [storeId]);

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled"
  );

  const confirmedReservationsCount = reservations.filter(
    (r) => r.status === "confirmed"
  ).length;
  const availableTablesCount = Math.max(0, TOTAL_TABLES_CAPACITY - confirmedReservationsCount);

  // Toggle Store Open / Closed
  const handleToggleOpen = async () => {
    const nextStatus = !isOpen;
    setIsOpen(nextStatus);
    setTogglingOpen(true);
    const res = await updateStoreOpenStatus(storeId, nextStatus);
    setTogglingOpen(false);
    if (!res.success) {
      setIsOpen(!nextStatus);
      setBanner({
        type: "error",
        message: `Failed to update store status: ${res.error || "Unknown error"}`,
      });
    } else {
      setBanner({
        type: "success",
        message: `Store is now marked as ${nextStatus ? "OPEN" : "CLOSED"}.`,
      });
    }
  };

  // Kitchen Order State Transitions
  const handleOrderStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    setProcessingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
      const updated = await fetchStoreOrders(storeId);
      setOrders(updated);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Could not update order status: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Re-broadcast Dispatch
  const handleRebroadcast = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      await merchantRebroadcastOrder(orderId);
      setBanner({
        type: "success",
        message: "Dispatch Re-broadcasted! 📢 The order is now open for any active courier in Mati City.",
      });
      const updated = await fetchStoreOrders(storeId);
      setOrders(updated);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Failed to re-broadcast: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Table Reservation Status Updates
  const handleReservationUpdate = async (resId: string, nextStatus: ReservationStatus) => {
    setProcessingResId(resId);
    try {
      await updateReservationStatus(resId, nextStatus, undefined, "merchant");
      const updated = await fetchStoreReservations(storeId);
      setReservations(updated);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Could not update reservation: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingResId(null);
    }
  };

  return (
    <View className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-7xl self-center">
      {/* Header Banner */}
      <View className="mb-6 sm:mb-8 flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
              MATI STORE DASHBOARD
            </Text>
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-800">Live Kitchen</Text>
            </View>
          </View>
          <Text className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {store?.name || "Mama Letty's Karenderia"}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">
            {store?.barangay ? `${store.barangay}, Mati City` : "Poblacion, Mati City"} • Operating hours: 07:00 AM – 08:00 PM
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Store Open / Closed Toggle with Supabase Persistence */}
          <Pressable
            onPress={handleToggleOpen}
            disabled={togglingOpen}
            className={`px-4 py-2.5 rounded-2xl flex-row items-center gap-2 border transition-colors ${
              isOpen
                ? "bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
                : "bg-red-50 border-red-300 hover:bg-red-100"
            }`}
          >
            <View className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-red-500"}`} />
            <Text className={`text-xs font-black ${isOpen ? "text-emerald-800" : "text-red-700"}`}>
              {togglingOpen ? "UPDATING..." : isOpen ? "STORE IS OPEN" : "STORE IS CLOSED"}
            </Text>
          </Pressable>

          <Link href="/(web)/dashboard/menu" asChild>
            <Pressable className="bg-[#EA5410] px-5 py-2.5 rounded-2xl hover:bg-[#D04508] transition-colors shadow-sm flex-row items-center gap-2">
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-white font-extrabold text-xs">Manage Menu</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* KPI Stats Grid */}
      <View className="flex-row flex-wrap gap-4 sm:gap-5 mb-8 sm:mb-10">
        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Today's Orders</Text>
            <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center">
              <Ionicons name="receipt" size={18} color="#EA5410" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            {metrics?.orders_today ?? orders.length} Orders
          </Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2 flex-row items-center">
            {activeOrders.length} active in kitchen
          </Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Today's Gross Sales</Text>
            <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
              <Ionicons name="cash" size={18} color="#047857" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            ₱{((metrics?.gross_sales_centavos ?? 0) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </Text>
          <Text className="text-gray-500 font-semibold text-xs mt-2">
            100% Cash on Delivery
          </Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Table Bookings</Text>
            <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
              <Ionicons name="calendar" size={18} color="#2563EB" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            {reservations.length} Bookings
          </Text>
          <Text className="text-blue-600 font-bold text-xs mt-2">
            {availableTablesCount} of {TOTAL_TABLES_CAPACITY} tables available
          </Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Avg Prep Speed</Text>
            <View className="w-9 h-9 rounded-xl bg-purple-100 items-center justify-center">
              <Ionicons name="time" size={18} color="#7C3AED" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">12 mins</Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2">
            Target &lt; 15 mins
          </Text>
        </View>
      </View>

      {/* Main Grid: Live Orders + Top Selling Items */}
      <View className="flex-col xl:flex-row gap-6 sm:gap-8 w-full mb-8 sm:mb-10">
        {/* Recent Orders / Kitchen Queue Widget */}
        <View className="flex-[2] bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
          <View className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex-row flex-wrap justify-between items-center gap-2">
            <View>
              <Text className="text-lg font-black text-gray-900">Live Kitchen Queue</Text>
              <Text className="text-xs text-gray-400">Incoming Cash on Delivery orders in Mati City</Text>
            </View>
            <View className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
              <Text className="text-[10px] font-black text-[#EA5410] uppercase">
                {activeOrders.length} Active
              </Text>
            </View>
          </View>

          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="small" color="#EA5410" />
              <Text className="text-xs text-gray-400 mt-2">Loading live kitchen orders...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View className="py-16 items-center justify-center">
              <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
              <Text className="text-gray-700 font-bold text-sm mt-3">No orders received yet today</Text>
              <Text className="text-gray-400 text-xs mt-1">New customer orders will appear here automatically</Text>
            </View>
          ) : (
            <ScrollView className="max-h-[580px]">
              {orders.map((order) => {
                const token = getOrderStatusTheme(order.status);
                const itemsSummary =
                  order.items?.map((i: LiveOrderItem) => `${i.quantity}x ${i.name}`).join(", ") ||
                  "Mati feast items";
                const isProcessing = processingOrderId === order.id;

                return (
                  <View
                    key={order.id}
                    className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                          <Text className="font-black text-gray-900 text-sm">{order.orderNumber}</Text>
                          <Text className="text-[10px] text-gray-400 font-medium">
                            • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                          {order.isRebroadcast && (
                            <View className="bg-amber-100 px-2 py-0.5 rounded">
                              <Text className="text-[9px] font-black text-amber-900 uppercase">📢 Re-broadcast</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs font-bold text-gray-800" numberOfLines={2}>
                          {itemsSummary}
                        </Text>
                        <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>
                          📍 {order.deliveryAddress || `Barangay ${order.barangay}`}
                          {order.customerPhone ? ` • 📞 ${order.customerPhone}` : ""}
                        </Text>
                        {order.riderName && (
                          <Text className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                            🛵 Courier: {order.riderName} {order.riderPhone ? `(${order.riderPhone})` : ""}
                          </Text>
                        )}
                        {order.podImageUrl && (
                          <View className="flex-row items-center gap-1.5 mt-2 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl self-start">
                            <Ionicons name="camera" size={12} color="#047857" />
                            <Text className="text-[10px] font-bold text-emerald-800">Verified Drop-off Photo on file</Text>
                          </View>
                        )}
                      </View>

                      <View className="items-end">
                        <Text className="font-black text-[#EA5410] text-base mb-1.5">
                          ₱{order.total.toFixed(2)}
                        </Text>
                        <View className={`px-2.5 py-0.5 rounded-full ${token.badgeBg}`}>
                          <Text className={`text-[10px] font-black uppercase tracking-wider ${token.badgeText}`}>
                            {token.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Operational Action Buttons */}
                    <View className="flex-row flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                      {order.status === "placed" && (
                        <>
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleOrderStatusUpdate(order.id, "accepted")}
                            className="bg-[#EA5410] hover:bg-[#D04508] px-4 py-2 rounded-xl flex-row items-center gap-1.5 shadow-2xs"
                          >
                            <Ionicons name="checkmark-circle" size={14} color="white" />
                            <Text className="text-xs font-bold text-white">Accept Order</Text>
                          </Pressable>
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleOrderStatusUpdate(order.id, "cancelled")}
                            className="bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl flex-row items-center gap-1"
                          >
                            <Ionicons name="close-circle" size={14} color="#6B7280" />
                            <Text className="text-xs font-bold text-gray-700">Decline</Text>
                          </Pressable>
                        </>
                      )}

                      {order.status === "accepted" && (
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleOrderStatusUpdate(order.id, "preparing")}
                          className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5 shadow-2xs"
                        >
                          <Ionicons name="restaurant" size={14} color="white" />
                          <Text className="text-xs font-bold text-white">Start Cooking 🍳</Text>
                        </Pressable>
                      )}

                      {order.status === "preparing" && (
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleOrderStatusUpdate(order.id, "ready_for_pickup")}
                          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl flex-row items-center gap-1.5 shadow-2xs"
                        >
                          <Ionicons name="cube" size={14} color="white" />
                          <Text className="text-xs font-bold text-white">Mark Ready for Pickup 📦</Text>
                        </Pressable>
                      )}

                      {order.status === "ready_for_pickup" && (
                        <>
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleOrderStatusUpdate(order.id, "out_for_delivery")}
                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl flex-row items-center gap-1.5 shadow-2xs"
                          >
                            <Ionicons name="bicycle" size={14} color="white" />
                            <Text className="text-xs font-bold text-white">Hand to Rider 🛵</Text>
                          </Pressable>
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleRebroadcast(order.id)}
                            className="bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl flex-row items-center gap-1 border border-amber-300"
                          >
                            <Ionicons name="megaphone" size={14} color="#B45309" />
                            <Text className="text-xs font-bold text-amber-900">Re-broadcast Courier 📢</Text>
                          </Pressable>
                        </>
                      )}

                      {order.status === "out_for_delivery" && (
                        <View className="flex-row items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                          <Ionicons name="navigate" size={13} color="#4338CA" />
                          <Text className="text-xs font-bold text-indigo-900">
                            Dispatched with Courier {order.riderName || "in transit"}
                          </Text>
                        </View>
                      )}

                      {order.status === "delivered" && (
                        <View className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                          <Ionicons name="checkmark-done" size={13} color="#047857" />
                          <Text className="text-xs font-bold text-emerald-800">
                            Delivered & Cash Settled ✓
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Top Items Widget */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200/80 p-5 sm:p-8 flex-col justify-between">
          <View>
            <Text className="text-lg font-black text-gray-900 mb-1">Store Menu Highlights</Text>
            <Text className="text-xs text-gray-400 mb-6">Dishes available for diners in Mati</Text>

            <View className="gap-4">
              {menuItems.slice(0, 5).map((item, idx) => (
                <View
                  key={item.id}
                  className="flex-row justify-between items-center pb-3.5 border-b border-gray-100"
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="w-6 text-sm font-black text-[#EA5410]">
                      {String(idx + 1).padStart(2, "0")}
                    </Text>
                    <View>
                      <Text className="font-bold text-gray-900 text-sm">{item.name}</Text>
                      <Text className="text-xs text-gray-400">₱{item.price.toFixed(2)}</Text>
                    </View>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      item.available ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Text className="text-[10px] font-black uppercase">
                      {item.available ? "Available" : "Sold Out"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Link href="/(web)/dashboard/menu" asChild>
            <Pressable className="mt-8 py-3 bg-gray-50 border border-gray-200 rounded-2xl items-center hover:bg-gray-100 transition-colors">
              <Text className="text-xs font-bold text-gray-700">View Full Menu Catalog</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Table Bookings Section */}
      <View className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-5 sm:p-8 mb-10">
        <View className="flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100 mb-5">
          <View>
            <Text className="text-lg font-black text-gray-900">Dine-in Table Bookings</Text>
            <Text className="text-xs text-gray-400">Manage customer seat reservations at your Mati establishment</Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-2 shrink-0">
            <View className="bg-emerald-100 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-black text-emerald-800">
                {availableTablesCount} of {TOTAL_TABLES_CAPACITY} Tables Free
              </Text>
            </View>
            <Pressable
              onPress={() => setQrModalVisible(true)}
              className="px-3.5 py-1.5 rounded-full bg-gray-900 hover:bg-black flex-row items-center gap-1.5"
            >
              <Ionicons name="qr-code-outline" size={14} color="white" />
              <Text className="text-xs font-bold text-white">Print Table QR</Text>
            </Pressable>
          </View>
        </View>

        {reservations.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Ionicons name="calendar-outline" size={36} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-sm mt-3">No table bookings yet today</Text>
            <Text className="text-gray-400 text-xs mt-1">Guest table bookings will appear here in real time</Text>
          </View>
        ) : (
          <View className="gap-3">
            {reservations.map((res) => {
              const resToken = getReservationStatusTheme(res.status);
              const isPending = res.status === "pending";
              const isConfirmed = res.status === "confirmed";
              const isProcessing = processingResId === res.id;

              return (
                <View
                  key={res.id}
                  className="p-4 rounded-2xl border border-gray-200/90 hover:bg-gray-50/60 transition-colors flex-col md:flex-row justify-between items-start md:items-center gap-3"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="font-black text-gray-900 text-sm">
                        {res.customer_name || "Guest Diner"}
                      </Text>
                      <Text className="text-xs text-gray-500 font-bold">
                        • Party of {res.party_size}
                      </Text>
                      <View className={`px-2 py-0.5 rounded-md ${resToken.badgeBg}`}>
                        <Text className={`text-[10px] font-black uppercase ${resToken.badgeText}`}>
                          {resToken.label}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500">
                      📅 {formatReservationDate(res.reservation_date)} at {res.reservation_time} • Seating: {res.seating_preference || "Standard"}
                      {res.customer_phone ? ` • 📞 ${res.customer_phone}` : ""}
                    </Text>
                    {res.special_notes ? (
                      <Text className="text-xs text-gray-600 italic mt-1 bg-gray-50 p-2 rounded-lg">
                        "{res.special_notes}"
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View className="flex-row flex-wrap gap-2">
                    {isPending && (
                      <>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleReservationUpdate(res.id, "confirmed")}
                          className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 shadow-2xs"
                        >
                          <Ionicons name="checkmark" size={14} color="white" />
                          <Text className="text-xs font-bold text-white">Approve Table</Text>
                        </Pressable>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleReservationUpdate(res.id, "declined")}
                          className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl flex-row items-center gap-1"
                        >
                          <Ionicons name="close" size={14} color="#4B5563" />
                          <Text className="text-xs font-bold text-gray-700">Decline</Text>
                        </Pressable>
                      </>
                    )}

                    {isConfirmed && (
                      <>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleReservationUpdate(res.id, "completed")}
                          className="bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 shadow-2xs"
                        >
                          <Ionicons name="restaurant" size={14} color="white" />
                          <Text className="text-xs font-bold text-white">Complete Dining</Text>
                        </Pressable>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleReservationUpdate(res.id, "no_show")}
                          className="bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl flex-row items-center gap-1"
                        >
                          <Ionicons name="alert-circle" size={14} color="#BE123C" />
                          <Text className="text-xs font-bold text-rose-800">No-Show</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <PrintableTableQrModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        storeId={storeId}
        storeName={store?.name || "Mati Partner Store"}
      />
    </View>
  );
}
