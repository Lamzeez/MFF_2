import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useRouter, Redirect } from "expo-router";
import { fetchCustomerOrders, subscribeToOrders, LiveOrder } from "../../../services/orders";
import {
  fetchCustomerReservations,
  subscribeToCustomerReservations,
  updateReservationStatus,
  CustomerReservation,
} from "../../../services/reservations";

export default function MobileOrdersScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"deliveries" | "reservations">("deliveries");
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [liveReservations, setLiveReservations] = useState<CustomerReservation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLiveOrders = async () => {
    try {
      const data = await fetchCustomerOrders();
      setLiveOrders(data);
    } catch (err) {
      console.error("Error fetching live orders:", err);
    }
  };

  const loadLiveReservations = async () => {
    try {
      const data = await fetchCustomerReservations();
      setLiveReservations(data);
    } catch (err) {
      console.error("Error fetching live reservations:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadLiveOrders(), loadLiveReservations()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadLiveOrders();
      loadLiveReservations();
      const unsubOrders = subscribeToOrders(null, loadLiveOrders);
      const unsubReservations = user?.id
        ? subscribeToCustomerReservations(user.id, loadLiveReservations)
        : () => {};
      return () => {
        unsubOrders();
        unsubReservations();
      };
    }
  }, [isLoggedIn, user?.id]);

  const displayOrders = liveOrders;
  const displayReservations = liveReservations;

  // Orders screen is strictly for registered customers. Guest users are redirected to Home.
  if (!isLoggedIn) {
    return <Redirect href="/(mobile)/(tabs)" />;
  }

  // Render individual Order Card for Virtualized FlatList
  const renderOrderItem = ({ item: order }: { item: LiveOrder }) => {
    const restaurantTitle = (order as any).restaurantName || (order as any).storeName || "Mati Kitchen";
    const isStep1 = ["placed", "accepted", "confirmed", "preparing", "prepped", "ready_for_pickup", "out_for_delivery", "on_the_way", "delivered"].includes(order.status);
    const isStep2 = ["accepted", "preparing", "prepped", "ready_for_pickup", "out_for_delivery", "on_the_way", "delivered"].includes(order.status);
    const isStep3 = ["out_for_delivery", "on_the_way", "delivered"].includes(order.status);
    const isStep4 = order.status === "delivered";

    const statusLabel =
      order.status === "placed"
        ? "Kitchen Received"
        : order.status === "accepted" || (order.status as string) === "confirmed"
        ? "Kitchen Confirmed"
        : order.status === "preparing" || (order.status as string) === "prepped"
        ? "Kitchen Preparing"
        : order.status === "ready_for_pickup"
        ? "Food Ready for Courier"
        : order.status === "out_for_delivery" || (order.status as string) === "on_the_way"
        ? "Out for Delivery"
        : order.status === "delivered"
        ? "Delivered"
        : "Cancelled";

    return (
      <View className="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-sm mb-4 mx-5">
        {/* Order Header */}
        <View className="flex-row justify-between items-start border-b border-gray-100 pb-3.5 mb-3.5">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="font-black text-gray-900 text-base">
                {order.orderNumber}
              </Text>
              <View className="bg-orange-100 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-black text-[#EA5410] uppercase">
                  COD
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600 font-semibold">
              {restaurantTitle}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-black text-[#EA5410] text-lg">
              ₱{order.total.toFixed(2)}
            </Text>
            <Text className="text-[10px] text-gray-400 font-medium">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View className="gap-1.5 mb-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
          {order.items.map((item: any, idx: number) => (
            <View key={idx} className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-800 font-medium">
                {item.quantity}x {item.name}
              </Text>
              <Text className="text-xs text-gray-500 font-semibold">
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View className="flex-row items-center gap-1.5 pt-2 mt-1 border-t border-gray-200/60">
            <Ionicons name="location-sharp" size={12} color="#EA5410" />
            <Text className="text-[11px] text-gray-500 flex-1" numberOfLines={1}>
              {order.deliveryAddress}, Brgy. {order.barangay}
            </Text>
          </View>
        </View>

        {/* Delivery Progress Bar & Handshake PIN OR Cancellation Alert */}
        {order.status === "cancelled" ? (
          <View className="bg-rose-50 rounded-2xl p-4 border border-rose-200 mb-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons name="alert-circle" size={18} color="#be123c" />
              <Text className="text-xs font-black text-rose-800 uppercase tracking-wide">
                {order.notes?.toLowerCase().includes("no-show")
                  ? "⚠️ Delivery Cancelled — Customer No-Show"
                  : "⚠️ Delivery Cancelled"}
              </Text>
            </View>
            <Text className="text-xs text-rose-700 leading-snug">
              {order.notes?.toLowerCase().includes("no-show")
                ? "The courier arrived at your delivery address but was unable to reach you. Verified courier GPS coordinates were logged at your drop-off location."
                : (order.notes || "This delivery order has been cancelled.")}
            </Text>
          </View>
        ) : (
          <>
            {/* Delivery Progress Bar */}
            <View className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/80 mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#EA5410]" />
                  <Text className="text-xs font-black text-gray-900">
                    Status: {statusLabel}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-[#EA5410]">
                  {order.status === "delivered" ? "Completed" : "~10-15 mins away"}
                </Text>
              </View>

              {/* Timeline Steps */}
              <View className="flex-row items-center justify-between mt-1 px-1">
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep1 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="checkmark" size={13} color="white" />
                  </View>
                  <Text className="text-[9px] font-bold text-gray-800 mt-1">Confirmed</Text>
                </View>
                <View className={`flex-1 h-0.5 mx-1 ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="checkmark" size={13} color="white" />
                  </View>
                  <Text className="text-[9px] font-bold text-gray-800 mt-1">Prepped</Text>
                </View>
                <View className={`flex-1 h-0.5 mx-1 ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="bicycle" size={13} color="white" />
                  </View>
                  <Text className={`text-[9px] font-bold mt-1 ${isStep3 ? "text-[#EA5410]" : "text-gray-400"}`}>On the Way</Text>
                </View>
                <View className={`flex-1 h-0.5 mx-1 ${isStep4 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep4 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    {isStep4 && <Ionicons name="checkmark" size={13} color="white" />}
                  </View>
                  <Text className={`text-[9px] mt-1 ${isStep4 ? "font-bold text-[#EA5410]" : "text-gray-400"}`}>Delivered</Text>
                </View>
              </View>
            </View>

            {/* Delivery Handshake PIN Card */}
            <View className="bg-[#EA5410]/5 p-4 rounded-2xl border border-[#EA5410]/20 mb-3.5 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-1.5 mb-0.5">
                  <Ionicons name="shield-checkmark" size={13} color="#EA5410" />
                  <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                    DELIVERY HANDSHAKE PIN
                  </Text>
                </View>
                <Text className="text-[11px] text-gray-600 leading-snug">
                  Tell this 4-digit code to the rider upon arrival for safe COD handoff
                </Text>
              </View>
              <View className="bg-[#111827] px-3.5 py-2 rounded-xl shadow-xs">
                <Text className="text-base font-black text-white font-mono tracking-widest">
                  {order.handshakePin || "4821"}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Rider Info Card */}
        <View className="flex-row items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <View className="flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${order.riderName ? "bg-[#111827]" : "bg-orange-100"}`}>
              <Ionicons name={order.riderName ? "bicycle" : "time-outline"} size={18} color={order.riderName ? "white" : "#EA5410"} />
            </View>
            <View>
              <Text className="text-xs font-bold text-gray-900">
                {order.riderName
                  ? `${order.riderName} (Courier)`
                  : order.status === "cancelled"
                  ? "Order Cancelled"
                  : order.status === "ready_for_pickup"
                  ? "Broadcasting to Couriers..."
                  : "Awaiting Courier Dispatch"}
              </Text>
              <Text className="text-[10px] text-gray-500">
                {order.riderName
                  ? (order.riderPhone ? `Contact: ${order.riderPhone}` : "Mati City Independent Courier")
                  : order.status === "cancelled"
                  ? "No courier assigned"
                  : order.status === "ready_for_pickup"
                  ? "Looking for nearby Mati riders"
                  : "Assigned upon kitchen completion"}
              </Text>
            </View>
          </View>
          {order.riderName && order.status !== "cancelled" ? (
            <Pressable
              onPress={() => Alert.alert("Calling Courier", `Connecting to ${order.riderName}${order.riderPhone ? ` (${order.riderPhone})` : ""}...`)}
              className="w-9 h-9 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-full items-center justify-center"
            >
              <Ionicons name="call" size={16} color="#EA5410" />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  // Render individual Reservation Card for Virtualized FlatList
  const renderReservationItem = ({ item: res }: { item: CustomerReservation }) => {
    const restoName = res.storeName || "Mati Restaurant";
    const bookingRef = res.reservation_number || `#${(res.id || "").slice(0, 8).toUpperCase()}`;
    const resDate = res.reservation_date;
    const resTime = res.reservation_time;
    const partySize = res.party_size;
    const specialNotes = res.special_notes;
    const isConfirmed = res.status === "confirmed";
    const isPending = res.status === "pending";
    const isDeclined = res.status === "declined";
    const isCancelled = res.status === "cancelled";

    return (
      <View
        className={`bg-white rounded-3xl p-5 border mb-4 mx-5 shadow-sm ${
          isConfirmed
            ? "border-emerald-300"
            : isPending
            ? "border-amber-300"
            : "border-gray-200"
        }`}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 pr-2">
            <Text className="text-base font-black text-gray-900">{restoName}</Text>
            <Text className="text-xs text-gray-400 font-medium">Booking {bookingRef}</Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${
              isConfirmed
                ? "bg-emerald-100"
                : isPending
                ? "bg-amber-100"
                : isCancelled
                ? "bg-gray-100"
                : "bg-red-100"
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase ${
                isConfirmed
                  ? "text-emerald-800"
                  : isPending
                  ? "text-amber-800"
                  : isCancelled
                  ? "text-gray-600"
                  : "text-red-800"
              }`}
            >
              {res.status}
            </Text>
          </View>
        </View>

        <View className="bg-gray-50 p-3.5 rounded-2xl mb-3 border border-gray-100 flex-row justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="calendar-outline" size={16} color="#EA5410" />
            <Text className="text-xs font-bold text-gray-800">{resDate}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={16} color="#EA5410" />
            <Text className="text-xs font-bold text-gray-800">{resTime}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="people-outline" size={16} color="#EA5410" />
            <Text className="text-xs font-bold text-gray-800">{partySize} Guests</Text>
          </View>
        </View>

        {specialNotes ? (
          <View className="bg-gray-50/70 p-2.5 rounded-xl mb-3 border border-gray-100">
            <Text className="text-[11px] text-gray-500 italic">"{specialNotes}"</Text>
          </View>
        ) : null}

        {isPending ? (
          <View className="pt-2 border-t border-gray-100 flex-row items-center justify-between">
            <Text className="text-[11px] text-gray-500 font-medium">Awaiting restaurant confirmation...</Text>
            <Pressable
              onPress={async () => {
                try {
                  await updateReservationStatus(res.id, "cancelled");
                  loadLiveReservations();
                  Alert.alert("Reservation Cancelled", "Your booking request has been cancelled.");
                } catch (err: any) {
                  Alert.alert("Error", err.message);
                }
              }}
              className="py-1 px-3 bg-gray-100 rounded-lg"
            >
              <Text className="text-xs font-bold text-gray-600">Cancel</Text>
            </Pressable>
          </View>
        ) : isConfirmed ? (
          <View className="pt-2 border-t border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text className="text-xs font-bold text-emerald-800">Seating Ready Upon Arrival</Text>
            </View>
            <Pressable
              onPress={() => Alert.alert("Directions", `Opening map directions to ${restoName}...`)}
              className="py-1 px-3 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <Text className="text-xs font-bold text-emerald-800">Directions</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 shadow-xs">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-[11px] font-extrabold text-[#EA5410] uppercase tracking-wider">
              MATI ORDERS & BOOKINGS
            </Text>
            <Text className="text-xl font-black text-gray-900 tracking-tight">
              Your Orders & Bookings
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)")}
            className="bg-[#EA5410]/10 border border-[#EA5410]/20 px-3 py-1.5 rounded-full flex-row items-center gap-1.5"
          >
            <Ionicons name="add-circle-outline" size={15} color="#EA5410" />
            <Text className="text-xs font-bold text-[#EA5410]">New Order</Text>
          </Pressable>
        </View>

        {/* View Switcher Segmented Control */}
        <View className="flex-row bg-gray-100 p-1.5 rounded-2xl gap-1">
          <Pressable
            onPress={() => setActiveTab("deliveries")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "deliveries" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="bicycle"
              size={16}
              color={activeTab === "deliveries" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "deliveries" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              COD Deliveries
            </Text>
            <View
              className={`px-1.5 py-0.5 rounded-full ${
                activeTab === "deliveries" ? "bg-[#EA5410]/10" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-[10px] font-black ${
                  activeTab === "deliveries" ? "text-[#EA5410]" : "text-gray-600"
                }`}
              >
                {displayOrders.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("reservations")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "reservations" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={activeTab === "reservations" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "reservations" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Table Bookings
            </Text>
            <View
              className={`px-1.5 py-0.5 rounded-full ${
                activeTab === "reservations" ? "bg-[#EA5410]/10" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-[10px] font-black ${
                  activeTab === "reservations" ? "text-[#EA5410]" : "text-gray-600"
                }`}
              >
                {liveReservations.length}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Virtualized Lists */}
      {activeTab === "deliveries" ? (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          ListHeaderComponent={
            <View className="px-5 pt-4 pb-2">
              <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                ACTIVE DELIVERIES ({displayOrders.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center my-6 mx-5 shadow-sm">
              <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                <Ionicons name="fast-food-outline" size={32} color="#EA5410" />
              </View>
              <Text className="text-base font-black text-gray-900 mt-1">No active orders right now</Text>
              <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                Browse Mati City restaurants and order freshly cooked food with Cash on Delivery.
              </Text>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)")}
                className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Browse Restaurants & Menus</Text>
              </Pressable>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#EA5410"]}
              tintColor="#EA5410"
            />
          }
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={displayReservations}
          keyExtractor={(item) => item.id}
          renderItem={renderReservationItem}
          ListHeaderComponent={
            <View className="px-5 pt-4 pb-2">
              <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                TABLE BOOKINGS ({displayReservations.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center my-6 mx-5 shadow-sm">
              <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                <Ionicons name="calendar-outline" size={32} color="#EA5410" />
              </View>
              <Text className="text-base font-black text-gray-900 mt-1">No table bookings yet</Text>
              <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                Skip waiting in line by reserving dining tables at popular Mati restaurants.
              </Text>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)")}
                className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Reserve a Table</Text>
              </Pressable>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#EA5410"]}
              tintColor="#EA5410"
            />
          }
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
