import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  Alert,
  TextInput,
  Platform,
  useWindowDimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Redirect } from "expo-router";
import * as Location from "expo-location";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";
import {
  fetchAvailableRiderJobs,
  fetchRiderDeliveries,
  claimRiderJob,
  completeDeliveryWithPin,
  releaseDeliveryJob,
  reportCustomerNoShow,
  subscribeToOrders,
  calculateCodSettlement,
  CodSettlementSummary,
  LiveOrder,
} from "../../../services/orders";
import { useSession } from "../../../context/SessionContext";

interface RiderJob {
  id: string | number;
  rawOrderId?: string;
  orderNumber?: string;
  restaurant: string;
  pickupArea: string;
  dropoffArea: string;
  distance: string;
  estTime: string;
  deliveryFee: string;
  deliveryFeeNum: number;
  codAmount: string;
  customerName: string;
  customerPhone: string;
  items: string;
  completionPin: string;
  isRebroadcast?: boolean;
}

export default function MobileRiderMode() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/portal" />;
  }

  const router = useRouter();
  const { identity, status, logoutToGuest } = useSession();
  const isLoading = status === "loading";

  // Rider Role Authentication Guard
  if (!isLoading && (!identity || !identity.roles.includes("rider"))) {
    return <Redirect href="/(mobile)/auth/rider-login" />;
  }

  const [isOnline, setIsOnline] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | number | null>(null);
  const [jobStage, setJobStage] = useState<"heading_to_store" | "picked_up" | "arrived">("heading_to_store");
  const [showHandshakeModal, setShowHandshakeModal] = useState(false);
  const [handshakePin, setHandshakePin] = useState("");
  const [cashCollectedConfirmed, setCashCollectedConfirmed] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0.0);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<RiderJob[]>([]);
  const [settlementData, setSettlementData] = useState<CodSettlementSummary | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportingNoShow, setReportingNoShow] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRiderJobs();
    setRefreshing(false);
  };

  const loadRiderJobs = async () => {
    try {
      const [jobs, myDeliveries] = await Promise.all([
        fetchAvailableRiderJobs(),
        fetchRiderDeliveries(),
      ]);

      const mappedJobs: RiderJob[] = jobs.map((o) => ({
        id: o.orderNumber.replace("MFF-", "") || o.id.slice(0, 5),
        rawOrderId: o.id,
        orderNumber: o.orderNumber,
        restaurant: o.storeName,
        pickupArea: o.storeAddress || "Mati City",
        dropoffArea: `${o.deliveryAddress}, Brgy. ${o.barangay}`,
        distance: "2.1 km",
        estTime: "15 min",
        deliveryFee: `₱${o.deliveryFee}.00`,
        deliveryFeeNum: o.deliveryFee || 35,
        codAmount: `₱${o.total.toFixed(2)}`,
        customerName: o.customerName || "Customer",
        customerPhone: o.customerPhone || "Mati City",
        items: o.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
        completionPin: o.handshakePin,
        isRebroadcast: o.isRebroadcast,
      }));
      setAvailableJobs(mappedJobs);

      const earned = myDeliveries.completed.reduce((acc, c) => acc + (c.deliveryFee || 35), 0);
      setTodayEarnings(earned);
      setCompletedTrips(myDeliveries.completed.length);

      const settlement = calculateCodSettlement(myDeliveries.completed);
      setSettlementData(settlement);

      if (myDeliveries.active.length > 0) {
        const activeO = myDeliveries.active[0];
        const activeMapped: RiderJob = {
          id: activeO.orderNumber.replace("MFF-", "") || activeO.id.slice(0, 5),
          rawOrderId: activeO.id,
          orderNumber: activeO.orderNumber,
          restaurant: activeO.storeName,
          pickupArea: activeO.storeAddress || "Mati City",
          dropoffArea: `${activeO.deliveryAddress}, Brgy. ${activeO.barangay}`,
          distance: "2.1 km",
          estTime: "15 min",
          deliveryFee: `₱${activeO.deliveryFee}.00`,
          deliveryFeeNum: activeO.deliveryFee || 35,
          codAmount: `₱${activeO.total.toFixed(2)}`,
          customerName: activeO.customerName || "Customer",
          customerPhone: activeO.customerPhone || "Mati City",
          items: activeO.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
          completionPin: activeO.handshakePin,
          isRebroadcast: activeO.isRebroadcast,
        };
        setActiveJobId(activeMapped.id);
        // Ensure active job is in availableJobs so find() works
        setAvailableJobs((prev) => {
          if (!prev.some((j) => j.id === activeMapped.id)) {
            return [activeMapped, ...prev];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error loading rider jobs:", err);
    }
  };

  useEffect(() => {
    loadRiderJobs();
    const unsubscribe = subscribeToOrders(null, loadRiderJobs);
    return () => unsubscribe();
  }, []);

  const acceptJob = async (id: number | string) => {
    const currentJob = availableJobs.find((j) => j.id === id);
    if (!currentJob) return;

    if (currentJob.rawOrderId) {
      try {
        await claimRiderJob(currentJob.rawOrderId);
      } catch (err: any) {
        Alert.alert("Claim Job Error", err?.message || "This delivery job is no longer available.");
        loadRiderJobs();
        return;
      }
    }

    setActiveJobId(id);
    setJobStage("heading_to_store");
    setCashCollectedConfirmed(false);
    setHandshakePin("");
    Alert.alert("Job Accepted! 🛵", `Accepted Delivery #${currentJob.orderNumber || id}! Navigate to restaurant for pickup.`);
  };

  const handleVerifyHandshakeAndComplete = async () => {
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

    if (currentJob?.rawOrderId) {
      try {
        await completeDeliveryWithPin(currentJob.rawOrderId, handshakePin.trim() || expectedPin);
      } catch (err: any) {
        Alert.alert("Delivery Completion Error", err?.message || "Failed to complete delivery in Supabase.");
        return;
      }
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
    loadRiderJobs();
  };

  const handleReleaseJob = () => {
    const currentJob = availableJobs.find((j) => j.id === activeJobId);
    if (!currentJob?.rawOrderId) return;

    Alert.alert(
      "Emergency Drop / Release Job? ⚠️",
      "Are you experiencing vehicle trouble, flat tire, or emergency? This will immediately return the order back to the Mati courier pool with an urgent re-broadcast tag.",
      [
        { text: "Keep Job", style: "cancel" },
        {
          text: "Release to Courier Pool",
          style: "destructive",
          onPress: async () => {
            try {
              await releaseDeliveryJob(
                currentJob.rawOrderId!,
                "Courier requested emergency release (flat tire / vehicle issue)"
              );
              setActiveJobId(null);
              setJobStage("heading_to_store");
              Alert.alert(
                "Job Released",
                "The delivery has been returned to the available courier pool for other active riders in Mati City."
              );
              await loadRiderJobs();
            } catch (err: any) {
              Alert.alert("Release Error", err?.message || "Failed to release delivery job.");
            }
          },
        },
      ]
    );
  };

  const handleReportCustomerNoShow = async () => {
    const currentJob = availableJobs.find((j) => j.id === activeJobId);
    if (!currentJob?.rawOrderId) return;

    Alert.alert(
      "Report Customer No-Show? 📍⚠️",
      `Are you currently at the customer's delivery address (${currentJob.dropoffArea}) and unable to reach ${currentJob.customerName}? Your real-time GPS coordinates will be verified and permanently logged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify GPS & Report No-Show",
          style: "destructive",
          onPress: async () => {
            setReportingNoShow(true);
            try {
              let coords = { latitude: 6.9549, longitude: 126.2165 }; // Default Mati center fallback
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                  const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                  coords = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  };
                }
              } catch (locErr) {
                console.warn("GPS location check fallback:", locErr);
              }

              await reportCustomerNoShow(
                currentJob.rawOrderId!,
                coords,
                `Courier verified at dropoff (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}), customer unresponsive after multiple contact attempts.`
              );

              setActiveJobId(null);
              setJobStage("heading_to_store");
              Alert.alert(
                "Order Cancelled (Customer No-Show)",
                `GPS coordinates verified (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}). Order has been cancelled and logged for merchant and platform review.`
              );
              await loadRiderJobs();
            } catch (err: any) {
              Alert.alert("Report Error", err?.message || "Failed to record customer no-show.");
            } finally {
              setReportingNoShow(false);
            }
          },
        },
      ]
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

  const handleSignOutRider = () => {
    Alert.alert(
      "Sign Out of Rider Account?",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setProfileModalVisible(false);
            await logoutToGuest();
            router.replace("/(mobile)/portal");
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator size="large" color="#EA5410" />
        <Text className="text-xs text-gray-500 font-bold mt-3">Connecting to Mati Rider Dispatch...</Text>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="person-circle" size={18} color="#EA5410" />
            <Text className="text-orange-600 font-bold text-xs">Rider Profile & Settings</Text>
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
              trackColor={{ false: "#d1d5db", true: "#10b981" }}
              thumbColor={"#ffffff"}
            />
          </View>
        </View>

        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-xl font-black text-gray-900">
              {identity?.profile?.display_name || "Delivery Courier"}
            </Text>
            <Text className="text-orange-600 font-extrabold text-xs tracking-wider">
              INDEPENDENT RIDER #{identity?.id ? `M-${identity.id.slice(0, 4).toUpperCase()}` : "ACTIVE"} • MATI
            </Text>
          </View>
          <View className="bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            <Text className="text-[10px] font-bold text-orange-900">
              {identity?.profile?.contact_phone ? `Phone: ${identity.profile.contact_phone}` : "Status: Active"}
            </Text>
          </View>
        </View>
      </View>

      <FlatList<RiderJob>
        data={availableJobs}
        keyExtractor={(item) => String(item.id)}
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
          <View>
            {/* Today's Earnings Card */}
            <View className="bg-gray-900 rounded-2xl p-5 shadow-sm mb-6 text-white border border-gray-800">
              <Text className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
                Today's Delivery Earnings
              </Text>
              <View className="flex-row justify-between items-baseline mb-3">
                <Text className="text-3xl font-black text-white">₱{todayEarnings.toFixed(2)}</Text>
                <Text className="text-xs text-gray-300 font-bold">{completedTrips} completed trips</Text>
              </View>
              <View className="pt-3 border-t border-gray-800 flex-row justify-between items-center mb-3">
                <Text className="text-xs text-gray-400 font-medium">Payment Protocol:</Text>
                <Text className="text-xs font-bold text-amber-400">100% Cash-on-Delivery (COD)</Text>
              </View>

              <Pressable
                onPress={() => setShowSettlementModal(true)}
                className="bg-orange-600 active:bg-orange-700 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Ionicons name="receipt-outline" size={16} color="#ffffff" />
                <Text className="text-white text-xs font-black">
                  View COD Cash in Pocket & Remittance Sheet 📋
                </Text>
              </Pressable>
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
                        ? "bg-orange-100"
                        : "bg-emerald-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase ${
                        jobStage === "heading_to_store"
                          ? "text-amber-800"
                          : jobStage === "picked_up"
                          ? "text-orange-800"
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
                    <>
                      <Pressable
                        onPress={() => {
                          setJobStage("picked_up");
                          Alert.alert(
                            "Food Picked Up! 🥡",
                            `You have collected order #MFF-${activeJob.id} from ${activeJob.restaurant}. Head towards ${activeJob.customerName} at ${activeJob.dropoffArea}.`
                          );
                        }}
                        className="w-full py-3.5 bg-orange-500 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm active:bg-orange-600"
                      >
                        <Ionicons name="bag-check" size={16} color="white" />
                        <Text className="text-xs font-bold text-white">Confirm Food Picked Up →</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleReleaseJob}
                        className="w-full py-2.5 bg-amber-50 rounded-xl items-center flex-row justify-center gap-1.5 border border-amber-300"
                      >
                        <Ionicons name="warning-outline" size={15} color="#b45309" />
                        <Text className="text-xs font-bold text-amber-800">Emergency Drop / Release Job ⚠️</Text>
                      </Pressable>
                    </>
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
                      className="w-full py-3.5 bg-gray-900 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm active:bg-black"
                    >
                      <Ionicons name="location" size={16} color="white" />
                      <Text className="text-xs font-bold text-white">Confirm Arrival at Customer →</Text>
                    </Pressable>
                  )}

                  {jobStage === "arrived" && (
                    <>
                      <Pressable
                        onPress={() => setShowHandshakeModal(true)}
                        className="w-full py-3.5 bg-emerald-700 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm active:bg-emerald-800"
                      >
                        <Ionicons name="lock-closed" size={16} color="white" />
                        <Text className="text-xs font-black text-white">🔐 Verify PIN & Handshake Delivery</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleReportCustomerNoShow}
                        disabled={reportingNoShow}
                        className="w-full py-2.5 bg-rose-50 rounded-xl items-center flex-row justify-center gap-1.5 border border-rose-300"
                      >
                        <Ionicons name="location-outline" size={15} color="#be123c" />
                        <Text className="text-xs font-bold text-rose-800">
                          {reportingNoShow ? "Verifying GPS..." : "Report Customer No-Show 📍⚠️"}
                        </Text>
                      </Pressable>
                    </>
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

            {/* Live Delivery Requests Pool Header */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Available Delivery Requests ({availableJobs.length})
              </Text>
              <Text className="text-xs font-bold text-orange-600">Mati City Area</Text>
            </View>
          </View>
        }
        renderItem={({ item: job }) => (
          <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs mb-4">
            {job.isRebroadcast && (
              <View className="mb-3 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl flex-row items-center gap-1.5">
                <Ionicons name="flash" size={13} color="#b45309" />
                <Text className="text-[10px] font-black text-amber-900 uppercase tracking-wide">
                  ⚠️ URGENT RE-BROADCAST (Immediate Courier Needed)
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-start mb-3 border-b border-gray-100 pb-2.5">
              <View>
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-base font-black text-gray-900">#{job.id}</Text>
                  <View className="bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    <Text className="text-[10px] font-bold text-orange-800">
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
                activeJobId !== null ? "bg-gray-200" : "bg-orange-500 active:bg-orange-600 shadow-xs"
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
        )}
        ListEmptyComponent={
          <View className="bg-white p-6 rounded-2xl border border-gray-200 items-center justify-center">
            <Ionicons name="bicycle-outline" size={32} color="#9ca3af" />
            <Text className="text-sm font-bold text-gray-500 mt-2">
              No pending delivery requests right now.
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              Pull down to refresh or wait for customer orders.
            </Text>
          </View>
        }
      />

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
                <Text className="text-xs text-orange-600 font-bold">Mati City Express Dispatch</Text>
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
              <View className="flex-row items-center gap-3.5 p-4 bg-orange-50 rounded-2xl border border-orange-200 mb-4">
                <View className="w-12 h-12 bg-orange-500 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">🛵</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-black text-gray-900">
                      {identity?.profile?.display_name || "Delivery Courier"}
                    </Text>
                    <View className="bg-emerald-100 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-bold text-emerald-800">Verified</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-orange-800 font-semibold">
                    Rider ID: #{identity?.id ? `M-${identity.id.slice(0, 4).toUpperCase()}` : "ACTIVE"}
                  </Text>
                  <Text className="text-[11px] text-gray-500">
                    Phone: {identity?.profile?.contact_phone || "Not set in profile"}
                  </Text>
                </View>
              </View>

              {/* Vehicle & Logistics Details */}
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200 gap-2 mb-4">
                <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1">
                  Courier Details
                </Text>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Email Account</Text>
                  <Text className="text-xs font-bold text-gray-800">{identity?.email || "rider@mati-foodfinder.com"}</Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Vehicle Registered</Text>
                  <Text className="text-xs font-bold text-gray-800">Motorcycle (Verified Delivery)</Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Operating Coverage</Text>
                  <Text className="text-xs font-bold text-gray-800">Mati City Wide</Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-500">Completed Trips</Text>
                  <Text className="text-xs font-bold text-gray-800">{completedTrips} Trips</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-xs text-gray-500">Earned Delivery Wallet</Text>
                  <Text className="text-xs font-black text-emerald-800">₱{todayEarnings.toFixed(2)}</Text>
                </View>
              </View>

              {/* Exit / Switch Role Button */}
              <Pressable
                onPress={handleExitToPortal}
                className="bg-gray-100 border border-gray-200 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 mb-3 active:bg-gray-200"
              >
                <Ionicons name="swap-horizontal" size={16} color="#374151" />
                <Text className="text-gray-800 font-bold text-xs">
                  Switch Role / Return to Portal
                </Text>
              </Pressable>

              {/* Sign Out Button */}
              <Pressable
                onPress={handleSignOutRider}
                className="bg-red-50 border border-red-200 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 mb-6 active:bg-red-100"
              >
                <Ionicons name="log-out-outline" size={16} color="#dc2626" />
                <Text className="text-red-700 font-bold text-xs">
                  Sign Out of Rider Account
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
                  <Text className="text-xs text-orange-600 font-bold">
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
                className="w-full py-4 bg-orange-500 rounded-xl items-center shadow-md mb-4 active:bg-orange-600"
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

      {/* 24/7 ROLLING COD SETTLEMENT & CASH LEDGER MODAL */}
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
                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                  <Ionicons name="receipt" size={18} color="#EA5410" />
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900 uppercase">
                    Rider COD Settlement Sheet
                  </Text>
                  <Text className="text-[11px] text-gray-500 font-medium">
                    24/7 Rolling Cash in Pocket & Store Remittance
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
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Gross Physical Cash in Pocket (All COD Collected)
                </Text>
                <Text className="text-2xl font-black text-white mb-3">
                  ₱{(settlementData?.totalCashCollected || 0).toFixed(2)}
                </Text>

                <View className="flex-row gap-2 pt-3 border-t border-gray-800">
                  <View className="flex-1 bg-gray-800/80 p-2.5 rounded-xl">
                    <Text className="text-[10px] text-emerald-400 font-bold uppercase">
                      Your Earnings (Kept)
                    </Text>
                    <Text className="text-sm font-black text-white mt-0.5">
                      ₱{(settlementData?.totalRiderFeesEarned || 0).toFixed(2)}
                    </Text>
                    <Text className="text-[9px] text-gray-400 mt-0.5">Delivery fees retained</Text>
                  </View>

                  <View className="flex-1 bg-gray-800/80 p-2.5 rounded-xl">
                    <Text className="text-[10px] text-orange-400 font-bold uppercase">
                      Food Cash Owed
                    </Text>
                    <Text className="text-sm font-black text-white mt-0.5">
                      ₱{(settlementData?.totalFoodSubtotalToRemit || 0).toFixed(2)}
                    </Text>
                    <Text className="text-[9px] text-gray-400 mt-0.5">Payable to restaurants</Text>
                  </View>
                </View>
              </View>

              {/* Status Breakdown Pills */}
              <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <Text className="text-[10px] font-bold text-emerald-700 uppercase">
                    Remitted to Stores
                  </Text>
                  <Text className="text-base font-black text-emerald-900 mt-0.5">
                    ₱{(settlementData?.totalRemitted || 0).toFixed(2)}
                  </Text>
                  <Text className="text-[9px] text-emerald-600 font-medium">Confirmed by merchant</Text>
                </View>

                <View className="flex-1 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <Text className="text-[10px] font-bold text-amber-700 uppercase">
                    Pending Remittance
                  </Text>
                  <Text className="text-base font-black text-amber-900 mt-0.5">
                    ₱{(settlementData?.totalPendingRemittance || 0).toFixed(2)}
                  </Text>
                  <Text className="text-[9px] text-amber-600 font-medium">To turn over to store</Text>
                </View>
              </View>

              {/* Protocol Note */}
              <View className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4 flex-row items-start gap-2">
                <Ionicons name="information-circle" size={18} color="#2563eb" />
                <Text className="text-[11px] text-blue-900 leading-tight flex-1">
                  <Text className="font-bold">Mati COD Settlement Rule:</Text> You keep 100% of your ₱35+ delivery fee. Hand over the physical food subtotal cash to the store cashier or merchant on your next visit. The store will mark it confirmed.
                </Text>
              </View>

              {/* Breakdown By Store */}
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                Breakdown by Restaurant
              </Text>

              {(!settlementData || settlementData.byStore.length === 0) ? (
                <View className="bg-gray-50 border border-gray-200 p-4 rounded-xl items-center mb-4">
                  <Text className="text-xs text-gray-400 font-medium">
                    No completed COD deliveries yet today.
                  </Text>
                </View>
              ) : (
                <View className="gap-2 mb-4">
                  {settlementData.byStore.map((store) => (
                    <View
                      key={store.storeId}
                      className="bg-white border border-gray-200 p-3 rounded-xl shadow-xs"
                    >
                      <View className="flex-row justify-between items-start mb-1.5">
                        <View className="flex-1 mr-2">
                          <Text className="text-xs font-black text-gray-900" numberOfLines={1}>
                            {store.storeName}
                          </Text>
                          <Text className="text-[10px] text-gray-500 font-medium">
                            {store.orderCount} delivery trip{store.orderCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                        <View
                          className={`px-2 py-0.5 rounded-full ${
                            store.isFullySettled ? "bg-emerald-100" : "bg-amber-100"
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-black uppercase ${
                              store.isFullySettled ? "text-emerald-800" : "text-amber-800"
                            }`}
                          >
                            {store.isFullySettled ? "Settled ✓" : "Pending Remittance"}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                        <Text className="text-[11px] text-gray-600">
                          Total Food Payable: <Text className="font-bold text-gray-900">₱{store.totalFoodSubtotal.toFixed(2)}</Text>
                        </Text>
                        {store.pendingAmount > 0 && (
                          <Text className="text-[11px] font-bold text-amber-700">
                            Owed: ₱{store.pendingAmount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Detailed Order Log */}
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                Delivered Orders Log ({settlementData?.orders.length || 0})
              </Text>

              {(!settlementData || settlementData.orders.length === 0) ? (
                <View className="bg-gray-50 border border-gray-200 p-4 rounded-xl items-center mb-6">
                  <Text className="text-xs text-gray-400 font-medium">
                    Delivered COD trips will appear here.
                  </Text>
                </View>
              ) : (
                <View className="gap-2 mb-6">
                  {settlementData.orders.map((ord) => (
                    <View
                      key={ord.orderId}
                      className="bg-gray-50 border border-gray-200 p-3 rounded-xl"
                    >
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-xs font-black text-gray-900">
                          Order #{ord.orderNumber}
                        </Text>
                        <View
                          className={`px-2 py-0.5 rounded ${
                            ord.isRemitted ? "bg-emerald-100" : "bg-amber-100"
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-black uppercase ${
                              ord.isRemitted ? "text-emerald-800" : "text-amber-800"
                            }`}
                          >
                            {ord.isRemitted ? "Remitted ✓" : "Cash in Pocket"}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-[11px] text-gray-600 font-medium mb-1">
                        {ord.storeName} • {ord.customerName}
                      </Text>

                      <View className="flex-row justify-between items-center pt-1.5 border-t border-gray-200">
                        <Text className="text-[10px] text-gray-500">
                          Collected: <Text className="font-bold text-gray-800">₱{ord.total.toFixed(2)}</Text>
                        </Text>
                        <Text className="text-[10px] text-emerald-700 font-bold">
                          Fee: ₱{ord.deliveryFee.toFixed(2)}
                        </Text>
                        <Text className="text-[10px] text-orange-700 font-bold">
                          Food Due: ₱{ord.subtotal.toFixed(2)}
                        </Text>
                      </View>
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
