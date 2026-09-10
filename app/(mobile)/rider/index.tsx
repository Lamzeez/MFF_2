import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function MobileRiderMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const [availableJobs, setAvailableJobs] = useState([
    {
      id: 2048,
      restaurant: "Mama Letty's Karenderia",
      pickupArea: "Central Public Market, Mati City",
      dropoffArea: "Madang District, Mati City",
      distance: "2.1 km",
      estTime: "15 min",
      deliveryFee: "₱65.00",
      codAmount: "₱220.00",
      customerName: "Maria Santos",
      customerPhone: "0917-889-1234",
      items: "2x Pork Humba, 2x Extra Rice",
    },
    {
      id: 2049,
      restaurant: "Mati Baywalk Seafood Grill",
      pickupArea: "Mati Baywalk Park",
      dropoffArea: "Dahican Beach Resort Area",
      distance: "6.8 km",
      estTime: "25 min",
      deliveryFee: "₱120.00",
      codAmount: "₱580.00",
      customerName: "John Reyes",
      customerPhone: "0928-554-9876",
      items: "1x Tuna Panga Grill, 1x Kinilaw",
    },
  ]);

  const acceptJob = (id: number) => {
    setActiveJobId(id);
    alert(`Accepted Delivery #MFF-${id}! Navigate to the restaurant for pickup.`);
  };

  const completeJob = () => {
    alert("Delivery completed! Cash of COD collected and delivery fee credited to your balance.");
    setAvailableJobs(availableJobs.filter((j) => j.id !== activeJobId));
    setActiveJobId(null);
  };

  const activeJob = availableJobs.find((j) => j.id === activeJobId);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      
      {/* Top Navigation & Status Bar */}
      <View className="px-5 py-3.5 bg-white border-b border-gray-200 shadow-xs">
        <View className="flex-row justify-between items-center mb-2">
          <Link href="/(mobile)/(tabs)" asChild>
            <Pressable className="flex-row items-center py-1">
              <Text className="text-emerald-700 font-bold text-xs">← Exit to Customer App</Text>
            </Pressable>
          </Link>

          <View className="flex-row items-center gap-2">
            <Text className={`font-bold text-xs ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
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

      <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Today's Earnings Card */}
        <View className="bg-sky-900 rounded-2xl p-5 shadow-sm mb-6 text-white">
          <Text className="text-sky-200 text-xs font-bold uppercase tracking-wider mb-1">Today's Delivery Earnings</Text>
          <View className="flex-row justify-between items-baseline mb-3">
            <Text className="text-3xl font-black text-white">₱620.00</Text>
            <Text className="text-xs text-sky-200 font-bold">7 completed trips</Text>
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
                <Text className="text-sm font-black text-emerald-800 uppercase">ACTIVE DELIVERY JOB</Text>
                <Text className="text-lg font-black text-gray-900">#MFF-{activeJob.id}</Text>
              </View>
              <View className="bg-emerald-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-emerald-800">Your Fee: {activeJob.deliveryFee}</Text>
              </View>
            </View>

            {/* Route */}
            <View className="gap-3 mb-4">
              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center mt-0.5">
                  <Ionicons name="restaurant" size={12} color="#ea580c" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-gray-500 uppercase">1. Pickup at Restaurant</Text>
                  <Text className="text-sm font-bold text-gray-900">{activeJob.restaurant}</Text>
                  <Text className="text-xs text-gray-500">{activeJob.pickupArea}</Text>
                </View>
              </View>

              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                  <Ionicons name="home" size={12} color="#047857" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-gray-500 uppercase">2. Dropoff to Customer</Text>
                  <Text className="text-sm font-bold text-gray-900">{activeJob.customerName}</Text>
                  <Text className="text-xs text-gray-500">{activeJob.dropoffArea}</Text>
                </View>
              </View>
            </View>

            {/* COD Cash to collect */}
            <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-[11px] font-bold text-amber-900">Cash on Delivery (COD) to Collect:</Text>
                <Text className="text-[10px] text-amber-700">Collect full amount from customer upon arrival</Text>
              </View>
              <Text className="text-lg font-black text-amber-950">{activeJob.codAmount}</Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => alert(`Calling Customer ${activeJob.customerName} at ${activeJob.customerPhone}`)}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center flex-row justify-center gap-1.5 border border-gray-200"
              >
                <Ionicons name="call" size={15} color="#374151" />
                <Text className="text-xs font-bold text-gray-700">Call Customer</Text>
              </Pressable>

              <Pressable 
                onPress={completeJob}
                className="flex-1 py-3 bg-emerald-700 rounded-xl items-center flex-row justify-center gap-1.5 shadow-sm"
              >
                <Ionicons name="checkmark-done" size={16} color="white" />
                <Text className="text-xs font-bold text-white">Mark Delivered</Text>
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
              <Text className="text-sm font-bold text-gray-500">No pending delivery requests right now.</Text>
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
                          <Text className="text-[10px] font-bold text-sky-800">Earn {job.deliveryFee}</Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500 font-medium">{job.restaurant}</Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-xs font-bold text-emerald-800">{job.distance} trip</Text>
                      <Text className="text-[10px] text-gray-400">Est. {job.estTime}</Text>
                    </View>
                  </View>

                  <View className="gap-1 mb-3">
                    <Text className="text-xs text-gray-700 font-medium">📍 Pickup: {job.pickupArea}</Text>
                    <Text className="text-xs text-gray-700 font-medium">🏁 Dropoff: {job.dropoffArea}</Text>
                    <Text className="text-[11px] text-orange-600 font-semibold">💵 COD Value: {job.codAmount}</Text>
                  </View>

                  <Pressable 
                    onPress={() => acceptJob(job.id)}
                    disabled={activeJobId !== null}
                    className={`w-full py-3 rounded-xl items-center ${
                      activeJobId !== null ? 'bg-gray-200' : 'bg-sky-600 shadow-xs'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${activeJobId !== null ? 'text-gray-400' : 'text-white'}`}>
                      {activeJobId !== null ? "Finish Current Job First" : "Accept Delivery Request"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
