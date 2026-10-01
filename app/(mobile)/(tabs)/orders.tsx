import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "expo-router";

export default function MobileOrdersScreen() {
  const { isLoggedIn, user, orders, reservations } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"deliveries" | "reservations">("deliveries");

  if (!isLoggedIn) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]">
        {/* Top Header */}
        <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 flex-row justify-between items-center shadow-xs">
          <View>
            <Text className="text-[11px] font-extrabold text-[#EA5410] uppercase tracking-wider">
              MATI ORDERS
            </Text>
            <Text className="text-xl font-black text-gray-900 tracking-tight">
              Track & History
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(mobile)/auth/customer-login")}
            className="bg-[#EA5410]/10 border border-[#EA5410]/20 px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5"
          >
            <Ionicons name="log-in-outline" size={15} color="#EA5410" />
            <Text className="text-xs font-bold text-[#EA5410]">Sign In</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-5"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Guest Hero Card */}
          <View className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm mb-5">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="bg-orange-100 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-extrabold text-[#EA5410] uppercase tracking-wider">
                  GUEST MODE
                </Text>
              </View>
            </View>

            <View className="w-16 h-16 bg-[#EA5410]/10 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="receipt-outline" size={32} color="#EA5410" />
            </View>

            <Text className="text-xl font-black text-gray-900 mb-2 leading-snug">
              Track Live Orders & Table Bookings
            </Text>
            <Text className="text-xs text-gray-500 leading-relaxed mb-5">
              Sign in to your Mati FoodFinder account to track real-time Cash on Delivery orders, view your 4-digit rider handshake PIN, and manage dine-in table reservations.
            </Text>

            {/* Feature Perks */}
            <View className="gap-3 mb-6 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-orange-100 items-center justify-center">
                  <Ionicons name="bicycle" size={16} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-900">Live Delivery Tracking</Text>
                  <Text className="text-[11px] text-gray-500">Track your courier from store to door</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-orange-100 items-center justify-center">
                  <Ionicons name="key-outline" size={16} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-900">Secure Handshake PIN</Text>
                  <Text className="text-[11px] text-gray-500">4-digit PIN ensures safe COD handoffs</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-orange-100 items-center justify-center">
                  <Ionicons name="calendar-outline" size={16} color="#EA5410" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-900">Table Reservations</Text>
                  <Text className="text-[11px] text-gray-500">Skip lines at top Mati restaurants</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-login")}
              className="w-full py-3.5 bg-[#EA5410] rounded-2xl items-center shadow-sm mb-3"
            >
              <Text className="text-white font-extrabold text-sm">Sign In to Your Account</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)")}
              className="w-full py-3 bg-gray-100 rounded-2xl items-center border border-gray-200/80"
            >
              <Text className="text-gray-700 font-bold text-xs">Explore Mati Restaurants</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
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
                {orders.length}
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
                {reservations.length}
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
                ACTIVE DELIVERIES ({orders.length})
              </Text>
            </View>

            {orders.length === 0 ? (
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
              orders.map((order) => (
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
                        {order.restaurantName}
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
                    {order.items.map((item, idx) => (
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
                          Status: {order.status === "on_the_way" ? "Out for Delivery" : "Kitchen Preparing"}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-[#EA5410]">~10-15 mins away</Text>
                    </View>

                    {/* Timeline Steps */}
                    <View className="flex-row items-center justify-between mt-1 px-1">
                      <View className="items-center">
                        <View className="w-6 h-6 rounded-full bg-[#EA5410] items-center justify-center shadow-2xs">
                          <Ionicons name="checkmark" size={13} color="white" />
                        </View>
                        <Text className="text-[9px] font-bold text-gray-800 mt-1">Confirmed</Text>
                      </View>
                      <View className="flex-1 h-0.5 bg-[#EA5410] mx-1" />
                      <View className="items-center">
                        <View className="w-6 h-6 rounded-full bg-[#EA5410] items-center justify-center shadow-2xs">
                          <Ionicons name="checkmark" size={13} color="white" />
                        </View>
                        <Text className="text-[9px] font-bold text-gray-800 mt-1">Prepped</Text>
                      </View>
                      <View className="flex-1 h-0.5 bg-[#EA5410] mx-1" />
                      <View className="items-center">
                        <View className="w-6 h-6 rounded-full bg-[#EA5410] items-center justify-center shadow-2xs">
                          <Ionicons name="bicycle" size={13} color="white" />
                        </View>
                        <Text className="text-[9px] font-bold text-[#EA5410] mt-1">On the Way</Text>
                      </View>
                      <View className="flex-1 h-0.5 bg-gray-200 mx-1" />
                      <View className="items-center">
                        <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center" />
                        <Text className="text-[9px] text-gray-400 mt-1">Delivered</Text>
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
                        4821
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
              ))
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
                TABLE BOOKINGS ({reservations.length})
              </Text>
            </View>

            {reservations.length === 0 ? (
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
              reservations.map((res) => {
                const isConfirmed = res.status === "confirmed";
                const isPending = res.status === "pending";
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
                          {res.restaurantName}
                        </Text>
                        <Text className="text-xs text-gray-400 font-medium">
                          Booking #{res.id.toUpperCase()}
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${
                          isConfirmed
                            ? "bg-emerald-100"
                            : isPending
                            ? "bg-amber-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            isConfirmed
                              ? "text-emerald-800"
                              : isPending
                              ? "text-amber-800"
                              : "text-gray-600"
                          }`}
                        >
                          {isConfirmed ? "Confirmed" : isPending ? "Pending Approval" : "Declined"}
                        </Text>
                      </View>
                    </View>

                    {/* Reservation Details */}
                    <View className="bg-gray-50/80 p-3.5 rounded-2xl gap-2 mb-3.5 border border-gray-100">
                      <View className="flex-row items-center gap-2.5">
                        <Ionicons name="calendar-outline" size={15} color="#EA5410" />
                        <Text className="text-xs font-bold text-gray-800">
                          {res.date} at {res.time}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2.5">
                        <Ionicons name="people-outline" size={15} color="#EA5410" />
                        <Text className="text-xs text-gray-700">
                          Party Size: {res.partySize} {res.partySize === 1 ? "Guest" : "Guests"}
                        </Text>
                      </View>
                      {res.specialNotes ? (
                        <View className="flex-row items-start gap-2 pt-1 border-t border-gray-200/60 mt-0.5">
                          <Ionicons name="chatbox-outline" size={13} color="#6b7280" />
                          <Text className="text-xs text-gray-500 italic flex-1">
                            "{res.specialNotes}"
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => router.push("/(mobile)/(tabs)/map")}
                        className="flex-1 py-2.5 bg-gray-100 rounded-xl items-center border border-gray-200/80"
                      >
                        <Text className="text-gray-700 font-bold text-xs">View Map</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            "Contact Restaurant",
                            `Calling ${res.restaurantName} (+63 917 234 5678)...`
                          )
                        }
                        className="flex-1 py-2.5 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-xl items-center"
                      >
                        <Text className="text-[#EA5410] font-bold text-xs">Call Restaurant</Text>
                      </Pressable>
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
