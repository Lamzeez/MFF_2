import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
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

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
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

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: COD DELIVERIES */}
        {activeTab === "deliveries" && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                ACTIVE DELIVERIES ({displayOrders.length})
              </Text>
            </View>

            {displayOrders.length === 0 ? (
              <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center mb-6 shadow-sm">
                <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                  <Ionicons name="fast-food-outline" size={32} color="#EA5410" />
                </View>
                <Text className="text-base font-black text-gray-900 mt-1">No active orders right now</Text>
                <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                  Browse Mati City restaurants and order freshly cooked food with Cash on Delivery.
                </Text>
                <Pressable
                  onPress={() => router.push("/(mobile)/(tabs)")}
                  className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm"
                >
                  <Text className="text-white font-extrabold text-xs">Browse Restaurants & Menus</Text>
                </Pressable>
              </View>
            ) : (
              displayOrders.map((order: any) => {
                const restaurantTitle = order.restaurantName || order.storeName || "Mati Kitchen";
                const isStep1 = ["placed", "accepted", "confirmed", "preparing", "prepped", "ready_for_pickup", "out_for_delivery", "on_the_way", "delivered"].includes(order.status);
                const isStep2 = ["accepted", "preparing", "prepped", "ready_for_pickup", "out_for_delivery", "on_the_way", "delivered"].includes(order.status);
                const isStep3 = ["out_for_delivery", "on_the_way", "delivered"].includes(order.status);
                const isStep4 = order.status === "delivered";

                const statusLabel =
                  order.status === "placed"
                    ? "Kitchen Received"
                    : order.status === "accepted" || order.status === "confirmed"
                    ? "Kitchen Confirmed"
                    : order.status === "preparing" || order.status === "prepped"
                    ? "Kitchen Preparing"
                    : order.status === "ready_for_pickup"
                    ? "Food Ready for Courier"
                    : order.status === "out_for_delivery" || order.status === "on_the_way"
                    ? "Out for Delivery"
                    : order.status === "delivered"
                    ? "Delivered"
                    : "Cancelled";

                return (
                  <View
                    key={order.id}
                    className="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-sm mb-4"
                  >
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
                        <Text className="text-[10px] text-gray-400 font-medium">{order.createdAt}</Text>
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
                          <View className={`w-6 h-6 rounded-full items-center justify-center shadow-2xs ${isStep1 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                            <Ionicons name="checkmark" size={13} color="white" />
                          </View>
                          <Text className="text-[9px] font-bold text-gray-800 mt-1">Confirmed</Text>
                        </View>
                        <View className={`flex-1 h-0.5 mx-1 ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                        <View className="items-center">
                          <View className={`w-6 h-6 rounded-full items-center justify-center shadow-2xs ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                            <Ionicons name="checkmark" size={13} color="white" />
                          </View>
                          <Text className="text-[9px] font-bold text-gray-800 mt-1">Prepped</Text>
                        </View>
                        <View className={`flex-1 h-0.5 mx-1 ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                        <View className="items-center">
                          <View className={`w-6 h-6 rounded-full items-center justify-center shadow-2xs ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
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

                  {/* Rider Info Card */}
                  <View className="flex-row items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 bg-[#111827] rounded-full items-center justify-center">
                        <Ionicons name="person" size={18} color="white" />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-gray-900">Kuya Mark (Rider)</Text>
                        <Text className="text-[10px] text-gray-500">Honda Wave • MC-7892</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => Alert.alert("Calling Rider", "Connecting to Kuya Mark (+63 917 123 4567)...")}
                      className="w-9 h-9 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-full items-center justify-center"
                    >
                      <Ionicons name="call" size={16} color="#EA5410" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

            {/* Past Orders History */}
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mt-3 mb-3">
              PAST ORDERS HISTORY
            </Text>

            <View className="bg-white rounded-3xl border border-gray-200/80 p-4 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-extrabold text-gray-900 text-sm">
                  Mati Baywalk Seafood Grill
                </Text>
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-emerald-700">Completed</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 mb-3">
                Yesterday • 1x Tuna Panga Grill (₱280.00)
              </Text>
              <Pressable
                onPress={() => Alert.alert("Re-ordered!", "Tuna Panga added to your active order.")}
                className="self-start py-1.5 px-4 bg-gray-100 rounded-xl border border-gray-200/60"
              >
                <Text className="text-xs font-bold text-gray-700">Re-order</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* TAB 2: TABLE BOOKINGS */}
        {activeTab === "reservations" && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                TABLE BOOKINGS ({displayReservations.length})
              </Text>
            </View>

            {displayReservations.length === 0 ? (
              <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center shadow-sm">
                <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                  <Ionicons name="calendar-outline" size={32} color="#EA5410" />
                </View>
                <Text className="text-base font-black text-gray-900 mt-1">No table bookings yet</Text>
                <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                  Skip waiting in line by reserving dining tables at popular Mati restaurants.
                </Text>
                <Pressable
                  onPress={() => router.push("/(mobile)/(tabs)")}
                  className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm"
                >
                  <Text className="text-white font-extrabold text-xs">Reserve a Table</Text>
                </Pressable>
              </View>
            ) : (
              displayReservations.map((res: any) => {
                const restoName = res.storeName || res.restaurantName || "Restaurant";
                const bookingRef = res.reservation_number || `#${(res.id || "").slice(0, 8).toUpperCase()}`;
                const resDate = res.reservation_date || res.date;
                const resTime = res.reservation_time || res.time;
                const partySize = res.party_size || res.partySize;
                const specialNotes = res.special_notes || res.specialNotes;
                const isConfirmed = res.status === "confirmed";
                const isPending = res.status === "pending";
                const isDeclined = res.status === "declined";
                const isCancelled = res.status === "cancelled";

                return (
                  <View
                    key={res.id}
                    className={`bg-white rounded-3xl p-5 border mb-4 shadow-sm ${
                      isConfirmed
                        ? "border-emerald-300"
                        : isPending
                        ? "border-amber-300"
                        : "border-gray-200"
                    }`}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-black text-gray-900">
                          {restoName}
                        </Text>
                        <Text className="text-xs text-gray-400 font-medium">
                          Booking {bookingRef}
                        </Text>
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
                              : "text-red-700"
                          }`}
                        >
                          {isConfirmed
                            ? "Confirmed"
                            : isPending
                            ? "Pending Approval"
                            : isCancelled
                            ? "Cancelled"
                            : "Declined"}
                        </Text>
                      </View>
                    </View>

                    {/* Reservation Details */}
                    <View className="bg-gray-50/80 p-3.5 rounded-2xl gap-2 mb-3.5 border border-gray-100">
                      <View className="flex-row items-center gap-2.5">
                        <Ionicons name="calendar-outline" size={15} color="#EA5410" />
                        <Text className="text-xs font-bold text-gray-800">
                          {resDate} at {resTime}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2.5">
                        <Ionicons name="people-outline" size={15} color="#EA5410" />
                        <Text className="text-xs text-gray-700">
                          Party Size: {partySize} {partySize === 1 ? "Guest" : "Guests"}
                        </Text>
                      </View>
                      {specialNotes ? (
                        <View className="flex-row items-start gap-2 pt-1 border-t border-gray-200/60 mt-0.5">
                          <Ionicons name="chatbox-outline" size={13} color="#6b7280" />
                          <Text className="text-xs text-gray-500 italic flex-1">
                            "{specialNotes}"
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => router.push("/(mobile)/(tabs)/map")}
                        className="flex-1 py-2.5 bg-gray-100 rounded-xl items-center border border-gray-200/80 active:bg-gray-200"
                      >
                        <Text className="text-gray-700 font-bold text-xs">View Map</Text>
                      </Pressable>
                      {(isPending || isConfirmed) ? (
                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              "Cancel Reservation",
                              "Are you sure you want to cancel this booking?",
                              [
                                { text: "Keep Booking", style: "cancel" },
                                {
                                  text: "Yes, Cancel",
                                  style: "destructive",
                                  onPress: async () => {
                                    try {
                                      await updateReservationStatus(res.id, "cancelled");
                                      loadLiveReservations();
                                      Alert.alert("Reservation Cancelled", "Your booking has been cancelled.");
                                    } catch (err: any) {
                                      Alert.alert("Cancellation Failed", err.message);
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl items-center active:bg-red-100"
                        >
                          <Text className="text-red-700 font-bold text-xs">Cancel</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              "Contact Restaurant",
                              `Calling ${restoName} (+63 917 234 5678)...`
                            )
                          }
                          className="flex-1 py-2.5 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-xl items-center"
                        >
                          <Text className="text-[#EA5410] font-bold text-xs">Call Restaurant</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)")}
              className="mt-2 py-3.5 bg-[#EA5410] rounded-2xl items-center shadow-sm"
            >
              <Text className="text-white font-extrabold text-xs">Book Another Table</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
