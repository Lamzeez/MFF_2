import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, Modal, Alert, TextInput, Platform, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Redirect } from "expo-router";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";

export default function MobileRiderMode() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/portal" />;
  }

  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [jobStage, setJobStage] = useState<"heading_to_store" | "picked_up" | "arrived">("heading_to_store");
  const [showHandshakeModal, setShowHandshakeModal] = useState(false);
  const [handshakePin, setHandshakePin] = useState("");
  const [cashCollectedConfirmed, setCashCollectedConfirmed] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(620.0);
  const [completedTrips, setCompletedTrips] = useState(7);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [availableJobs, setAvailableJobs] = useState([
    {
      id: 2048,
      restaurant: "Mama Letty's Karenderia",
      pickupArea: "Central Public Market, Mati City",
      dropoffArea: "Madang District, Mati City",
      distance: "2.1 km",
      estTime: "15 min",
      deliveryFee: "₱65.00",
      deliveryFeeNum: 65,
      codAmount: "₱220.00",
      customerName: "Maria Santos",
      customerPhone: "0917-889-1234",
      items: "2x Pork Humba, 2x Extra Rice",
      completionPin: "4821",
    },
    {
      id: 2049,
      restaurant: "Mati Baywalk Seafood Grill",
      pickupArea: "Mati Baywalk Park",
      dropoffArea: "Dahican Beach Resort Area",
      distance: "6.8 km",
      estTime: "25 min",
      deliveryFee: "₱120.00",
      deliveryFeeNum: 120,
      codAmount: "₱580.00",
      customerName: "John Reyes",
      customerPhone: "0928-554-9876",
      items: "1x Tuna Panga Grill, 1x Kinilaw",
      completionPin: "3914",
    },
  ]);

  const acceptJob = (id: number) => {
    setActiveJobId(id);
    setJobStage("heading_to_store");
    setCashCollectedConfirmed(false);
    setHandshakePin("");
    Alert.alert("Job Accepted! 🛵", `Accepted Delivery #MFF-${id}! Navigate to restaurant for pickup.`);
  };

  const handleVerifyHandshakeAndComplete = () => {
    if (!cashCollectedConfirmed) {
      Alert.alert(
        "Cash Collection Required",
        "Please check the confirmation box indicating you have collected the Cash on Delivery amount from the customer."
      );
      return;
    }

    const currentJob = availableJobs.find((j) => j.id === activeJobId);
    const expectedPin = currentJob?.completionPin || "4821";

    if (handshakePin.trim() && handshakePin.trim() !== expectedPin) {
      Alert.alert(
        "Invalid Delivery PIN",
        `The PIN you entered (${handshakePin}) does not match the customer's PIN. Ask ${currentJob?.customerName} for the 4-digit code shown in their app.`
      );
      return;
    }

    const fee = currentJob?.deliveryFeeNum || 65;
    setTodayEarnings((prev) => prev + fee);
    setCompletedTrips((prev) => prev + 1);
    setShowHandshakeModal(false);
    setAvailableJobs((prev) => prev.filter((j) => j.id !== activeJobId));
    setActiveJobId(null);

    Alert.alert(
      "Delivery Completed! 🎉",
      `Cash on Delivery collected successfully! ₱${fee}.00 delivery fee has been credited to your Rider Wallet.`
    );
  };

  const handleExitToPortal = () => {
    Alert.alert(
      "Exit Rider Mode?",
      "Are you sure you want to go offline and return to the main Mati FoodFinder access portal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit to Portal",
          style: "destructive",
          onPress: () => {
            setProfileModalVisible(false);
            router.replace("/(mobile)/portal");
          },
        },
      ]
    );
  };

  const activeJob = availableJobs.find((j) => j.id === activeJobId);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Navigation & Status Bar */}
      <View className="px-5 py-3.5 bg-white border-b border-gray-200 shadow-xs">
        <View className="flex-row justify-between items-center mb-2">
          {/* Rider Profile Button */}
          <Pressable
            onPress={() => setProfileModalVisible(true)}
            className="flex-row items-center gap-1.5 py-1"
          >
            <Ionicons name="person-circle" size={18} color="#0284c7" />
            <Text className="text-sky-700 font-bold text-xs">Rider Profile & Settings</Text>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Text
              className={`font-bold text-xs ${
                isOnline ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              {isOnline ? "ACCEPTING ORDERS" : "OFFLINE"}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: "#d1d5db", true: "#047857" }}
              thumbColor={"#ffffff"}
            />
          </View>
        </View>

        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-xl font-black text-gray-900">Kuya Mark</Text>
            <Text className="text-sky-600 font-extrabold text-xs tracking-wider">
              INDEPENDENT RIDER #M-402 • MATI
            </Text>
          </View>
          <View className="bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
            <Text className="text-[10px] font-bold text-sky-800">Motorcycle: Honda Wave</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Today's Earnings Card */}
        <View className="bg-sky-900 rounded-2xl p-5 shadow-sm mb-6 text-white">
          <Text className="text-sky-200 text-xs font-bold uppercase tracking-wider mb-1">
            Today's Delivery Earnings
          </Text>
          <View className="flex-row justify-between items-baseline mb-3">
            <Text className="text-3xl font-black text-white">₱{todayEarnings.toFixed(2)}</Text>
            <Text className="text-xs text-sky-200 font-bold">{completedTrips} completed trips</Text>
          </View>
          <View className="pt-3 border-t border-sky-800 flex-row justify-between items-center">
            <Text className="text-xs text-sky-100 font-medium">Payment Protocol:</Text>
            <Text className="text-xs font-bold text-amber-300">100% Cash-on-Delivery (COD)</Text>
          </View>
        </View>

        {/* If an active job is accepted */}
        {activeJob && (
          <View className="bg-white rounded-2xl border-2 border-emerald-600 p-5 shadow-md mb-6">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 mb-3">
              <View>
                <Text className="text-sm font-black text-emerald-800 uppercase">
                  ACTIVE DELIVERY JOB
                </Text>
                <Text className="text-lg font-black text-gray-900">#MFF-{activeJob.id}</Text>
              </View>
              <View className="bg-emerald-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-emerald-800">
                  Your Fee: {activeJob.deliveryFee}
                </Text>
              </View>
            </View>

            {/* Stage Progress Indicator */}
            <View className="flex-row gap-1.5 mb-4">
              <View
                className={`flex-1 h-1.5 rounded-full ${
                  jobStage === "heading_to_store" || jobStage === "picked_up" || jobStage === "arrived"
                    ? "bg-emerald-600"
                    : "bg-gray-200"
                }`}
              />
              <View
                className={`flex-1 h-1.5 rounded-full ${
                  jobStage === "picked_up" || jobStage === "arrived" ? "bg-emerald-600" : "bg-gray-200"
                }`}
              />
              <View
                className={`flex-1 h-1.5 rounded-full ${
                  jobStage === "arrived" ? "bg-emerald-600" : "bg-gray-200"
                }`}
              />
            </View>

            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-[10px] font-extrabold uppercase text-gray-500">
                Current Status:
              </Text>
              <View
                className={`px-2 py-0.5 rounded-md ${
                  jobStage === "heading_to_store"
                    ? "bg-amber-100"
                    : jobStage === "picked_up"
                    ? "bg-sky-100"
                    : "bg-emerald-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-black uppercase ${
                    jobStage === "heading_to_store"
                      ? "text-amber-800"
                      : jobStage === "picked_up"
                      ? "text-sky-800"
                      : "text-emerald-800"
                  }`}
                >
                  {jobStage === "heading_to_store"
                    ? "Heading to Store"
                    : jobStage === "picked_up"
                    ? "Out for Delivery"
                    : "At Customer Location"}
                </Text>
              </View>
            </View>

            {/* Route */}
            <View className="gap-3 mb-4">
              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center mt-0.5">
                  <Ionicons name="restaurant" size={12} color="#ea580c" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-gray-500 uppercase">
                    1. Pickup at Restaurant
                  </Text>
                  <Text className="text-sm font-bold text-gray-900">{activeJob.restaurant}</Text>
                  <Text className="text-xs text-gray-500">{activeJob.pickupArea}</Text>
                </View>
              </View>

              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                  <Ionicons name="home" size={12} color="#047857" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-gray-500 uppercase">
                    2. Dropoff to Customer
                  </Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {activeJob.customerName}
                  </Text>
                  <Text className="text-xs text-gray-500">{activeJob.dropoffArea}</Text>
                </View>
              </View>
            </View>

            {/* COD Cash to collect */}
            <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-[11px] font-bold text-amber-900">
                  Cash on Delivery (COD) to Collect:
                </Text>
                <Text className="text-[10px] text-amber-700">
                  Collect full amount from customer upon arrival
                </Text>
              </View>
              <Text className="text-lg font-black text-amber-950">{activeJob.codAmount}</Text>
            </View>

            {/* Action Buttons based on stage */}
            <View className="gap-2.5">
              {jobStage === "heading_to_store" && (
                <Pressable
                  onPress={() => {
                    setJobStage("picked_up");
                    Alert.alert(
                      "Food Picked Up! 🥡",
                      `You have collected order #MFF-${activeJob.id} from ${activeJob.restaurant}. Head towards ${activeJob.customerName} at ${activeJob.dropoffArea}.`
                    );
                  }}
                  className="w-full py-3.5 bg-orange-500 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm"
                >
                  <Ionicons name="bag-check" size={16} color="white" />
                  <Text className="text-xs font-bold text-white">Confirm Food Picked Up →</Text>
                </Pressable>
              )}

              {jobStage === "picked_up" && (
                <Pressable
                  onPress={() => {
                    setJobStage("arrived");
                    Alert.alert(
                      "Arrived at Customer! 📍",
                      `You've arrived at ${activeJob.dropoffArea}. Call ${activeJob.customerName}, collect ${activeJob.codAmount} COD cash, and enter their 4-digit PIN.`
                    );
                  }}
                  className="w-full py-3.5 bg-sky-600 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm"
                >
                  <Ionicons name="location" size={16} color="white" />
                  <Text className="text-xs font-bold text-white">Mark Arrived at Customer →</Text>
                </Pressable>
              )}

              {jobStage === "arrived" && (
                <Pressable
                  onPress={() => setShowHandshakeModal(true)}
                  className="w-full py-3.5 bg-emerald-700 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm"
                >
                  <Ionicons name="lock-closed" size={16} color="white" />
                  <Text className="text-xs font-black text-white">🔐 Verify PIN & Handshake Delivery</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  Alert.alert("Calling Customer", `Dialing ${activeJob.customerName} at ${activeJob.customerPhone}...`)
                }
                className="w-full py-2.5 bg-gray-100 rounded-xl items-center flex-row justify-center gap-1.5 border border-gray-200"
              >
                <Ionicons name="call" size={15} color="#374151" />
                <Text className="text-xs font-bold text-gray-700">Call Customer ({activeJob.customerPhone})</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Live Delivery Requests Pool */}
        <View>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Available Delivery Requests ({availableJobs.length})
            </Text>
            <Text className="text-xs font-bold text-sky-700">Mati City Area</Text>
          </View>

          {availableJobs.length === 0 ? (
            <View className="bg-white p-6 rounded-2xl border border-gray-200 items-center justify-center">
              <Text className="text-sm font-bold text-gray-500">
                No pending delivery requests right now.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {availableJobs.map((job) => (
                <View
                  key={job.id}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs"
                >
                  <View className="flex-row justify-between items-start mb-3 border-b border-gray-100 pb-2.5">
                    <View>
                      <View className="flex-row items-center gap-2 mb-0.5">
                        <Text className="text-base font-black text-gray-900">#{job.id}</Text>
                        <View className="bg-sky-100 px-2 py-0.5 rounded">
                          <Text className="text-[10px] font-bold text-sky-800">
                            Earn {job.deliveryFee}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500 font-medium">{job.restaurant}</Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-xs font-bold text-emerald-800">
                        {job.distance} trip
                      </Text>
                      <Text className="text-[10px] text-gray-400">Est. {job.estTime}</Text>
                    </View>
                  </View>

                  <View className="gap-1 mb-3">
                    <Text className="text-xs text-gray-700 font-medium">
                      📍 Pickup: {job.pickupArea}
                    </Text>
                    <Text className="text-xs text-gray-700 font-medium">
                      🏁 Dropoff: {job.dropoffArea}
                    </Text>
                    <Text className="text-[11px] text-orange-600 font-semibold">
                      💵 COD Value: {job.codAmount}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => acceptJob(job.id)}
                    disabled={activeJobId !== null}
                    className={`w-full py-3 rounded-xl items-center ${
                      activeJobId !== null ? "bg-gray-200" : "bg-sky-600 shadow-xs"
                    }`}
                  >
                    <Text
                      className={`font-bold text-xs ${
                        activeJobId !== null ? "text-gray-400" : "text-white"
                      }`}
                    >
                      {activeJobId !== null
                        ? "Finish Current Job First"
                        : "Accept Delivery Request"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL: DEDICATED RIDER PROFILE & SETTINGS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Rider Profile & Settings</Text>
                <Text className="text-xs text-sky-700 font-bold">Mati City Express Dispatch</Text>
              </View>
              <Pressable
                onPress={() => setProfileModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Rider Identity Card */}
              <View className="flex-row items-center gap-3.5 p-4 bg-sky-50 rounded-2xl border border-sky-200 mb-4">
                <View className="w-12 h-12 bg-sky-600 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">🛵</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-black text-gray-900">Kuya Mark</Text>
                    <View className="bg-emerald-100 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-bold text-emerald-800">Verified</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-sky-800 font-semibold">Rider ID: #M-402</Text>
                  <Text className="text-[11px] text-gray-500">Phone: +63 917 234 5678</Text>
                </View>
              </View>

              {/* Vehicle & Logistics Details */}
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200 gap-2 mb-4">
                <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1">
                  Courier Details
                </Text>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Vehicle Registered</Text>
                  <Text className="text-xs font-bold text-gray-800">Honda Wave 110 (1102-DA)</Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Operating Coverage</Text>
                  <Text className="text-xs font-bold text-gray-800">Mati City Wide</Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Cash on Hand (COD)</Text>
                  <Text className="text-xs font-bold text-amber-900">₱800.00</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-xs text-gray-500">Earned Delivery Wallet</Text>
                  <Text className="text-xs font-black text-emerald-800">₱{todayEarnings.toFixed(2)}</Text>
                </View>
              </View>

              {/* Exit / Switch Role Button */}
              <Pressable
                onPress={handleExitToPortal}
                className="bg-gray-800 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 mb-6"
              >
                <Ionicons name="swap-horizontal" size={16} color="white" />
                <Text className="text-white font-bold text-xs">
                  Exit Rider Mode & Return to Portal
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* COD HANDSHAKE VERIFICATION MODAL */}
      <Modal
        visible={showHandshakeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHandshakeModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl">🔐</Text>
                <View>
                  <Text className="text-base font-black text-gray-900 uppercase">
                    COD Handshake Verification
                  </Text>
                  <Text className="text-xs text-emerald-700 font-bold">
                    Order #MFF-{activeJob?.id}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowHandshakeModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-gray-600 mb-3 leading-relaxed">
                Ask customer <Text className="font-bold text-gray-900">{activeJob?.customerName}</Text> for their 4-digit Delivery PIN before releasing order:
              </Text>

              {/* PIN Input */}
              <View className="mb-4">
                <Text className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 text-center">
                  Customer 4-Digit PIN (Demo: {activeJob?.completionPin || "4821"})
                </Text>
                <TextInput
                  value={handshakePin}
                  onChangeText={setHandshakePin}
                  placeholder="••••"
                  keyboardType="number-pad"
                  maxLength={4}
                  className="bg-gray-100 text-center font-mono font-black text-2xl py-3 rounded-2xl border border-gray-300 text-gray-900 tracking-widest"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Cash Collection Checkbox */}
              <Pressable
                onPress={() => setCashCollectedConfirmed(!cashCollectedConfirmed)}
                className={`p-4 rounded-2xl border mb-5 flex-row items-center gap-3 ${
                  cashCollectedConfirmed
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-amber-50 border-amber-300"
                }`}
              >
                <Ionicons
                  name={cashCollectedConfirmed ? "checkbox" : "square-outline"}
                  size={24}
                  color={cashCollectedConfirmed ? "#047857" : "#d97706"}
                />
                <View className="flex-1">
                  <Text className="text-xs font-black text-gray-900">
                    I have collected the COD cash in full
                  </Text>
                  <Text className="text-xs text-amber-900 font-bold mt-0.5">
                    Amount to collect: {activeJob?.codAmount}
                  </Text>
                </View>
              </Pressable>

              {/* Complete Delivery Action */}
              <Pressable
                onPress={handleVerifyHandshakeAndComplete}
                className="w-full py-4 bg-emerald-700 rounded-xl items-center shadow-md mb-4"
              >
                <Text className="text-white font-black text-sm">
                  Confirm Cash Received & Complete Delivery ✓
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowHandshakeModal(false)}
                className="py-2 items-center"
              >
                <Text className="text-xs font-bold text-gray-400">Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
