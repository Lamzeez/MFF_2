import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "expo-router";

export default function MobileProfileScreen() {
  const { isLoggedIn, user, loginAsRegistered, logoutToGuest } = useAuth();
  const router = useRouter();

  // State for Customer Login
  const [custEmail, setCustEmail] = useState("");
  const [custPassword, setCustPassword] = useState("");

  // State for Merchant Mode Modal
  const [merchantModalVisible, setMerchantModalVisible] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantPassword, setMerchantPassword] = useState("");

  // State for Rider Mode Modal
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [riderId, setRiderId] = useState("");
  const [riderPin, setRiderPin] = useState("");

  const handleCustomerLogin = () => {
    const name = custEmail ? custEmail.split("@")[0] : "Juan dela Cruz";
    loginAsRegistered(name, custEmail || "juan@mati.ph");
  };

  const handleEnterMerchantMode = () => {
    if (!merchantEmail || !merchantPassword) {
      alert("Please enter your Store Admin email and password.");
      return;
    }
    setMerchantModalVisible(false);
    setMerchantEmail("");
    setMerchantPassword("");
    router.push("/(mobile)/merchant");
  };

  const handleEnterRiderMode = () => {
    if (!riderId || !riderPin) {
      alert("Please enter your Rider ID / Email and PIN.");
      return;
    }
    setRiderModalVisible(false);
    setRiderId("");
    setRiderPin("");
    router.push("/(mobile)/rider");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      
      {/* Top Header */}
      <View className="px-5 py-3.5 bg-white border-b border-gray-100 shadow-xs">
        <Text className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Account</Text>
        <Text className="text-lg font-black text-gray-900">User Profile & Roles</Text>
      </View>

      <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* 1. Customer User Card */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <View className="flex-row items-center gap-4 mb-4">
            <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isLoggedIn ? 'bg-emerald-700' : 'bg-gray-200'}`}>
              <Ionicons name={isLoggedIn ? "person" : "person-outline"} size={26} color={isLoggedIn ? "white" : "#6b7280"} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="text-lg font-black text-gray-900">
                  {isLoggedIn ? user?.name : "Guest User"}
                </Text>
                <View className={`px-2 py-0.5 rounded ${isLoggedIn ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  <Text className={`text-[10px] font-bold ${isLoggedIn ? 'text-emerald-800' : 'text-orange-700'} uppercase`}>
                    {isLoggedIn ? "Registered" : "Guest Mode"}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500">
                {isLoggedIn ? user?.email : "Sign in to activate Orders tab & COD ordering"}
              </Text>
            </View>
          </View>

          {isLoggedIn ? (
            <Pressable 
              onPress={logoutToGuest}
              className="w-full py-2.5 bg-gray-100 rounded-xl items-center border border-gray-200"
            >
              <Text className="text-xs font-bold text-gray-700">Log Out to Guest Mode</Text>
            </Pressable>
          ) : (
            <View className="pt-2 border-t border-gray-100">
              <Text className="text-xs font-bold text-gray-700 mb-2">Customer Sign In / Test</Text>
              <TextInput 
                placeholder="Email address"
                value={custEmail}
                onChangeText={setCustEmail}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 text-gray-900"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              <TextInput 
                placeholder="Password"
                value={custPassword}
                onChangeText={setCustPassword}
                secureTextEntry
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
              <Pressable 
                onPress={handleCustomerLogin}
                className="w-full py-3 bg-emerald-700 rounded-xl items-center shadow-xs"
              >
                <Text className="text-white font-bold text-xs">Sign In as Registered User (Unlocks Orders Tab)</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 2. Delivery Rider Section */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 bg-sky-100 rounded-xl items-center justify-center">
              <Text className="text-xl">🛵</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-gray-900">Are you a Delivery Rider?</Text>
              <Text className="text-xs text-gray-500">Accept Cash-on-Delivery jobs in Mati City</Text>
            </View>
          </View>

          <Text className="text-xs text-gray-600 mb-4 leading-relaxed">
            Switch into Rider Mode to accept live delivery requests from local Karenderias, navigate using Mati maps, and earn delivery fees.
          </Text>

          <Pressable 
            onPress={() => setRiderModalVisible(true)}
            className="w-full py-3 bg-sky-600 rounded-xl items-center flex-row justify-center gap-2 shadow-xs"
          >
            <Ionicons name="bicycle-outline" size={16} color="white" />
            <Text className="text-white font-bold text-xs">Switch to Delivery Rider Mode</Text>
          </Pressable>
        </View>

        {/* 3. Store Merchant Section */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 bg-orange-100 rounded-xl items-center justify-center">
              <Text className="text-xl">🍳</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-gray-900">Are you a Store Partner?</Text>
              <Text className="text-xs text-gray-500">Karenderia & restaurant kitchen operations</Text>
            </View>
          </View>

          <Text className="text-xs text-gray-600 mb-4 leading-relaxed">
            Switch into in-app Merchant Mode to toggle dish stock, accept incoming orders, and manage kitchen queue.
          </Text>

          <Pressable 
            onPress={() => setMerchantModalVisible(true)}
            className="w-full py-3 bg-gray-900 rounded-xl items-center flex-row justify-center gap-2 shadow-xs"
          >
            <Ionicons name="key-outline" size={16} color="white" />
            <Text className="text-white font-bold text-xs">Switch to Store Merchant Mode</Text>
          </Pressable>
        </View>

        {/* 4. App Info */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">About MFF</Text>
          
          <View className="gap-3">
            <View className="flex-row justify-between items-center py-1 border-b border-gray-100">
              <Text className="text-xs text-gray-600">Coverage</Text>
              <Text className="text-xs font-bold text-emerald-800">Mati City Exclusive</Text>
            </View>
            <View className="flex-row justify-between items-center py-1 border-b border-gray-100">
              <Text className="text-xs text-gray-600">Payment Protocol</Text>
              <Text className="text-xs font-bold text-gray-800">Cash on Delivery (COD)</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">App Version</Text>
              <Text className="text-xs font-mono text-gray-500">v1.0.0 (Expo SDK 57)</Text>
            </View>
          </View>
        </View>

        {/* Modal: Merchant Mode Authentication */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={merchantModalVisible}
          onRequestClose={() => setMerchantModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-5">
            <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl items-center relative">
              
              <Pressable 
                onPress={() => setMerchantModalVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Text className="text-gray-500 font-bold text-sm">✕</Text>
              </Pressable>

              <View className="w-14 h-14 bg-orange-100 rounded-2xl items-center justify-center mb-3">
                <Text className="text-2xl">🏪</Text>
              </View>

              <Text className="text-xl font-black text-gray-900 text-center mb-1">
                Store Merchant Login
              </Text>
              <Text className="text-xs text-gray-500 text-center mb-5">
                Enter your Store Admin credentials to open kitchen operations.
              </Text>

              <View className="w-full gap-3 mb-5">
                <View>
                  <Text className="text-[11px] font-bold text-gray-700 mb-1">Store Email</Text>
                  <TextInput 
                    placeholder="e.g. lette@karenderia.com"
                    value={merchantEmail}
                    onChangeText={setMerchantEmail}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text className="text-[11px] font-bold text-gray-700 mb-1">Password</Text>
                  <TextInput 
                    placeholder="••••••••"
                    value={merchantPassword}
                    onChangeText={setMerchantPassword}
                    secureTextEntry
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <Pressable 
                onPress={handleEnterMerchantMode}
                className="w-full py-3.5 bg-orange-500 rounded-xl items-center shadow-md mb-2"
              >
                <Text className="text-white font-bold text-sm">Verify & Enter Kitchen Mode</Text>
              </Pressable>

              <Pressable 
                onPress={() => setMerchantModalVisible(false)}
                className="w-full py-2.5 items-center"
              >
                <Text className="text-xs font-bold text-gray-500">Cancel</Text>
              </Pressable>

            </View>
          </View>
        </Modal>

        {/* Modal: Rider Mode Authentication */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={riderModalVisible}
          onRequestClose={() => setRiderModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-5">
            <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl items-center relative">
              
              <Pressable 
                onPress={() => setRiderModalVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Text className="text-gray-500 font-bold text-sm">✕</Text>
              </Pressable>

              <View className="w-14 h-14 bg-sky-100 rounded-2xl items-center justify-center mb-3">
                <Text className="text-2xl">🛵</Text>
              </View>

              <Text className="text-xl font-black text-gray-900 text-center mb-1">
                Delivery Rider Login
              </Text>
              <Text className="text-xs text-gray-500 text-center mb-5">
                Enter your Rider ID / Phone and PIN to open active delivery routing in Mati.
              </Text>

              <View className="w-full gap-3 mb-5">
                <View>
                  <Text className="text-[11px] font-bold text-gray-700 mb-1">Rider ID / Phone</Text>
                  <TextInput 
                    placeholder="e.g. R-402 or 0917-xxx-xxxx"
                    value={riderId}
                    onChangeText={setRiderId}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text className="text-[11px] font-bold text-gray-700 mb-1">Security PIN</Text>
                  <TextInput 
                    placeholder="••••"
                    value={riderPin}
                    onChangeText={setRiderPin}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <Pressable 
                onPress={handleEnterRiderMode}
                className="w-full py-3.5 bg-sky-600 rounded-xl items-center shadow-md mb-2"
              >
                <Text className="text-white font-bold text-sm">Verify & Enter Rider Mode</Text>
              </Pressable>

              <Pressable 
                onPress={() => setRiderModalVisible(false)}
                className="w-full py-2.5 items-center"
              >
                <Text className="text-xs font-bold text-gray-500">Cancel</Text>
              </Pressable>

            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}
