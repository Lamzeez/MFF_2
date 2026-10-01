import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import { fetchStoreById, fetchStoreMenuItems, fetchUserStoreId, type LiveStoreProfile } from "../../../services/catalog";
import { fetchMerchantStoreMetrics, type StoreMetrics } from "../../../services/admin";
import { fetchStoreOrders, subscribeToOrders, type LiveOrder, type LiveOrderItem } from "../../../services/orders";
import type { FoodItem } from "../../../types/restaurant";

const DEFAULT_STORE_ID = "11111111-1111-1111-1111-111111111111";

export default function StoreDashboardOverview() {
  const { identity } = useSession();
  const [storeId, setStoreId] = useState<string>(DEFAULT_STORE_ID);

  const [isOpen, setIsOpen] = useState(true);
  const [store, setStore] = useState<LiveStoreProfile | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (identity?.id) {
      fetchUserStoreId(identity.id).then((id) => {
        if (id) setStoreId(id);
      });
    }
  }, [identity?.id]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [storeData, metricsData, ordersData, menuData] = await Promise.all([
          fetchStoreById(storeId),
          fetchMerchantStoreMetrics(storeId),
          fetchStoreOrders(storeId),
          fetchStoreMenuItems(storeId),
        ]);

        if (storeData) setStore(storeData);
        if (metricsData) setMetrics(metricsData);
        setOrders(ordersData);
        setMenuItems(menuData);
      } catch (err) {
        console.warn("Failed to load store dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    // Subscribe to realtime orders for this store
    unsubscribe = subscribeToOrders({ storeId }, () => {
      fetchStoreOrders(storeId).then((data) => setOrders(data));
      fetchMerchantStoreMetrics(storeId).then((m) => {
        if (m) setMetrics(m);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [storeId]);

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled"
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "placed":
        return { label: "New Order", color: "bg-amber-100 text-amber-800" };
      case "accepted":
        return { label: "Accepted", color: "bg-blue-100 text-blue-800" };
      case "preparing":
        return { label: "Preparing", color: "bg-orange-100 text-orange-800" };
      case "ready_for_pickup":
        return { label: "Ready for Pickup", color: "bg-purple-100 text-purple-800" };
      case "out_for_delivery":
        return { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800" };
      case "delivered":
        return { label: "Delivered", color: "bg-emerald-100 text-emerald-800" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

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
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            {store?.name || "Mama Letty's Karenderia"}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">
            {store?.barangay ? `${store.barangay}, Mati City` : "Poblacion, Mati City"} • Operating hours: 07:00 AM – 08:00 PM
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
              <Text className="text-white font-extrabold text-xs">Manage Menu</Text>
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
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            {metrics?.orders_today ?? orders.length} Orders
          </Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2 flex-row items-center">
            {activeOrders.length} active in kitchen
          </Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
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

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Table Bookings</Text>
            <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
              <Ionicons name="calendar" size={18} color="#2563EB" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">
            {metrics?.reservations_today ?? 0} Reserved
          </Text>
          <Text className="text-blue-600 font-bold text-xs mt-2">
            {metrics?.pending_reservations ?? 0} pending approval
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
            Target &lt; 15 mins
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
            <ScrollView className="max-h-[460px]">
              {orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const itemsSummary =
                  order.items?.map((i: LiveOrderItem) => `${i.quantity}x ${i.name}`).join(", ") ||
                  "Mati feast items";

                return (
                  <View
                    key={order.id}
                    className="px-8 py-5 border-b border-gray-100 flex-row items-center justify-between hover:bg-gray-50/80 transition-colors"
                  >
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="font-black text-gray-900 text-sm">{order.orderNumber}</Text>
                        <Text className="text-[10px] text-gray-400 font-medium">
                          • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>
                        {itemsSummary}
                      </Text>
                      <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
                        {order.deliveryAddress || `Barangay ${order.barangay}`}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-black text-[#EA5410] text-base mb-1.5">
                        ₱{order.total.toFixed(2)}
                      </Text>
                      <View className={`px-2.5 py-0.5 rounded-full ${badge.color}`}>
                        <Text className="text-[10px] font-black uppercase tracking-wider">{badge.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Top Items Widget */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200/80 p-8 flex-col justify-between">
          <View>
            <Text className="text-lg font-black text-gray-900 mb-1">Store Menu Highlights</Text>
            <Text className="text-xs text-gray-400 mb-6">Dishes available for diners in Mati</Text>

            <View className="gap-4">
              {menuItems.slice(0, 4).map((item, idx) => (
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
    </View>
  );
}
