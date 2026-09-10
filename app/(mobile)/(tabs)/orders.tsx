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
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="lock-closed" size={28} color="#ea580c" />
        </View>
        <Text className="text-xl font-black text-gray-900 text-center mb-2">
          Registered Users Only
        </Text>
        <Text className="text-gray-500 text-center text-sm mb-6 max-w-xs">
          Please sign in or register to view your live orders, delivery progress, and table reservations.
        </Text>
        <Pressable 
          onPress={() => router.push("/(mobile)/(tabs)/profile")}
          className="bg-emerald-700 px-6 py-3 rounded-xl shadow-xs"
        >
          <Text className="text-white font-bold text-sm">Go to Sign In</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="px-5 pt-3.5 pb-3 bg-white border-b border-gray-100 shadow-xs">
        <View className="flex-row justify-between items-center mb-2.5">
          <View>
            <Text className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
              Your Queue
            </Text>
            <Text className="text-lg font-black text-gray-900">Orders & Reservations</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)")}
            className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex-row items-center gap-1"
          >
            <Ionicons name="add" size={14} color="#047857" />
            <Text className="text-xs font-bold text-emerald-800">New Order</Text>
          </Pressable>
        </View>

        {/* View Switcher */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          <Pressable
            onPress={() => setActiveTab("deliveries")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1.5 ${
              activeTab === "deliveries" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="bicycle"
              size={15}
              color={activeTab === "deliveries" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "deliveries" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              COD Deliveries ({orders.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("reservations")}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1.5 ${
              activeTab === "reservations" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={activeTab === "reservations" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "reservations" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Table Bookings ({reservations.length})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* TAB 1: COD DELIVERIES */}
        {activeTab === "deliveries" && (
          <View>
            <Text className="text-sm font-black text-gray-900 uppercase tracking-wider mb-3">
              Active Deliveries ({orders.length})
            </Text>

            {orders.length === 0 ? (
              <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center mb-6">
                <Ionicons name="fast-food-outline" size={38} color="#9ca3af" />
                <Text className="text-sm font-extrabold text-gray-800 mt-2">No active orders</Text>
                <Text className="text-xs text-gray-400 text-center mt-1 mb-4">
                  Browse Mati City karenderias and order with Cash on Delivery.
                </Text>
                <Pressable
                  onPress={() => router.push("/(mobile)/(tabs)")}
                  className="bg-emerald-700 px-4 py-2 rounded-xl"
                >
                  <Text className="text-white font-bold text-xs">Browse Menus</Text>
                </Pressable>
              </View>
            ) : (
              orders.map((order) => (
                <View
                  key={order.id}
                  className="bg-white rounded-2xl border-2 border-emerald-600 p-5 shadow-sm mb-5"
                >
                  {/* Order Header */}
                  <View className="flex-row justify-between items-start border-b border-gray-100 pb-3 mb-3">
                    <View>
                      <View className="flex-row items-center gap-1.5 mb-0.5">
                        <Text className="font-extrabold text-gray-900 text-base">
                          {order.orderNumber}
                        </Text>
                        <View className="bg-orange-100 px-2 py-0.5 rounded">
                          <Text className="text-[10px] font-bold text-orange-700 uppercase">
                            COD
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500 font-medium">
                        {order.restaurantName}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-black text-emerald-800 text-lg">
                        ₱{order.total.toFixed(2)}
                      </Text>
                      <Text className="text-[10px] text-gray-400 font-medium">{order.createdAt}</Text>
                    </View>
                  </View>

                  {/* Order Items */}
                  <View className="gap-1 mb-3">
                    {order.items.map((item, idx) => (
                      <Text key={idx} className="text-xs text-gray-700 font-medium">
                        • {item.quantity}x {item.name} (₱{(item.price * item.quantity).toFixed(2)})
                      </Text>
                    ))}
                    <Text className="text-[11px] text-gray-400">
                      Delivery: {order.deliveryAddress}, Brgy. {order.barangay}
                    </Text>
                  </View>

                  {/* Delivery Progress Bar */}
                  <View className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 mb-4">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-xs font-bold text-emerald-900">
                        Status: {order.status === "on_the_way" ? "Out for Delivery" : "Kitchen Preparing"}
                      </Text>
                      <Text className="text-xs font-bold text-emerald-700">~10-15 mins away</Text>
                    </View>

                    {/* Timeline Steps */}
                    <View className="flex-row items-center justify-between mt-1">
                      <View className="items-center">
                        <View className="w-5 h-5 rounded-full bg-emerald-600 items-center justify-center">
                          <Ionicons name="checkmark" size={12} color="white" />
                        </View>
                        <Text className="text-[9px] font-bold text-emerald-800 mt-1">Confirmed</Text>
                      </View>
                      <View className="flex-1 h-0.5 bg-emerald-600 mx-1" />
                      <View className="items-center">
                        <View className="w-5 h-5 rounded-full bg-emerald-600 items-center justify-center">
                          <Ionicons name="checkmark" size={12} color="white" />
                        </View>
                        <Text className="text-[9px] font-bold text-emerald-800 mt-1">Prepped</Text>
                      </View>
                      <View className="flex-1 h-0.5 bg-emerald-600 mx-1" />
                      <View className="items-center">
                        <View className="w-5 h-5 rounded-full bg-emerald-600 items-center justify-center">
                          <Ionicons name="bicycle" size={12} color="white" />
                        </View>
                        <Text className="text-[9px] font-bold text-emerald-800 mt-1">On the Way</Text>
                      </View>
                      <View className="flex-1 h-0.5 bg-gray-200 mx-1" />
                      <View className="items-center">
                        <View className="w-5 h-5 rounded-full bg-gray-200 items-center justify-center" />
                        <Text className="text-[9px] text-gray-400 mt-1">Delivered</Text>
                      </View>
                    </View>
                  </View>

                  {/* Rider Info Card */}
                  <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <View className="flex-row items-center gap-2.5">
                      <View className="w-9 h-9 bg-emerald-700 rounded-full items-center justify-center">
                        <Ionicons name="person" size={16} color="white" />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-gray-900">Kuya Mark (Rider)</Text>
                        <Text className="text-[10px] text-gray-500">Honda Wave • MC-7892</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => Alert.alert("Calling Rider", "Connecting to Kuya Mark (+63 917 123 4567)...")}
                      className="w-8 h-8 bg-emerald-100 rounded-full items-center justify-center"
                    >
                      <Ionicons name="call" size={15} color="#047857" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            {/* Past Orders History */}
            <Text className="text-sm font-black text-gray-900 uppercase tracking-wider mt-4 mb-3">
              Past Orders History
            </Text>

            <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-extrabold text-gray-900 text-sm">
                  Mati Baywalk Seafood Grill
                </Text>
                <Text className="text-xs font-bold text-emerald-700">Completed</Text>
              </View>
              <Text className="text-xs text-gray-500 mb-2">
                Yesterday • 1x Tuna Panga Grill (₱280.00)
              </Text>
              <Pressable
                onPress={() => Alert.alert("Re-ordered!", "Tuna Panga added to your active order.")}
                className="self-start py-1.5 px-3 bg-gray-100 rounded-lg"
              >
                <Text className="text-xs font-bold text-gray-700">Re-order</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* TAB 2: TABLE BOOKINGS */}
        {activeTab === "reservations" && (
          <View>
            <Text className="text-sm font-black text-gray-900 uppercase tracking-wider mb-3">
              Your Table Bookings ({reservations.length})
            </Text>

            {reservations.length === 0 ? (
              <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center">
                <Ionicons name="calendar-outline" size={38} color="#9ca3af" />
                <Text className="text-sm font-extrabold text-gray-800 mt-2">No table bookings yet</Text>
                <Text className="text-xs text-gray-400 text-center mt-1 mb-4">
                  Skip waiting in line by reserving dining tables at Mati restaurants.
                </Text>
                <Pressable
                  onPress={() => router.push("/(mobile)/(tabs)")}
                  className="bg-emerald-700 px-4 py-2 rounded-xl"
                >
                  <Text className="text-white font-bold text-xs">Reserve a Table</Text>
                </Pressable>
              </View>
            ) : (
              reservations.map((res) => {
                const isConfirmed = res.status === "confirmed";
                const isPending = res.status === "pending";
                return (
                  <View
                    key={res.id}
                    className={`bg-white rounded-2xl p-4 border mb-4 shadow-xs ${
                      isConfirmed ? "border-emerald-500" : isPending ? "border-amber-400" : "border-gray-200"
                    }`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-extrabold text-gray-900">
                          {res.restaurantName}
                        </Text>
                        <Text className="text-xs text-gray-500 font-medium">
                          Booking ID: {res.id.toUpperCase()}
                        </Text>
                      </View>
                      <View
                        className={`px-2.5 py-1 rounded-full ${
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
                    <View className="bg-gray-50 p-3 rounded-xl gap-1.5 mb-3 border border-gray-100">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="calendar-outline" size={14} color="#047857" />
                        <Text className="text-xs font-bold text-gray-800">
                          {res.date} at {res.time}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="people-outline" size={14} color="#047857" />
                        <Text className="text-xs text-gray-700">
                          Party Size: {res.partySize} {res.partySize === 1 ? "Guest" : "Guests"}
                        </Text>
                      </View>
                      {res.specialNotes ? (
                        <View className="flex-row items-start gap-2 pt-1">
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
                        className="flex-1 py-2 bg-emerald-50 rounded-xl items-center border border-emerald-200"
                      >
                        <Text className="text-emerald-800 font-bold text-xs">View Map</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            "Contact Restaurant",
                            `Calling ${res.restaurantName} (+63 917 234 5678)...`
                          )
                        }
                        className="flex-1 py-2 bg-gray-100 rounded-xl items-center"
                      >
                        <Text className="text-gray-700 font-bold text-xs">Call Restaurant</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}

            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)")}
              className="mt-2 py-3 bg-emerald-700 rounded-xl items-center shadow-xs"
            >
              <Text className="text-white font-extrabold text-xs">Book Another Table</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
