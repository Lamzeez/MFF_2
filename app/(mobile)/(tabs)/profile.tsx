import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "expo-router";

export default function MobileCustomerProfileScreen() {
  const {
    isLoggedIn,
    user,
    loginAsRegistered,
    logoutToGuest,
    personalizationEnabled,
    togglePersonalization,
    storeVisits,
    mostVisitedStore,
  } = useAuth();
  const router = useRouter();

  // Auth Mode: "login" vs "register"
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // State for Customer Login
  const [custEmail, setCustEmail] = useState("");
  const [custPassword, setCustPassword] = useState("");

  // State for Customer Register
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBarangay, setRegBarangay] = useState("Central (Poblacion)");
  const [regAddress, setRegAddress] = useState("");

  // Customer Delivery Preferences (Mati City)
  const matiBarangays = ["Central (Poblacion)", "Dahican", "Sainz", "Matiao", "Badas", "Mayo"];
  const [defaultBarangay, setDefaultBarangay] = useState("Central (Poblacion)");
  const [savedAddress, setSavedAddress] = useState("Near Baywalk Pavilion, Blue Gate");

  // Discreet Switch Role Section (Made tricky/subtle so regular users won't misclick it)
  const [showAdvancedSession, setShowAdvancedSession] = useState(false);

  const handleCustomerLogin = () => {
    const name = custEmail ? custEmail.split("@")[0] : "Juan dela Cruz";
    loginAsRegistered(name, custEmail || "juan@mati.ph");
    Alert.alert("Signed In!", `Welcome back, ${name}! You can now order COD, book tables, and scan restaurant QR codes.`);
  };

  const handleCustomerRegister = () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      Alert.alert("Required Fields", "Please enter your Name, Email, and Password to register.");
      return;
    }
    loginAsRegistered(regName.trim(), regEmail.trim());
    setDefaultBarangay(regBarangay);
    if (regAddress.trim()) setSavedAddress(regAddress.trim());

    Alert.alert(
      "Account Created! 🎉",
      `Welcome to Mati FoodFinder, ${regName.split(" ")[0]}! Personalization and COD ordering are now active.`
    );
  };

  const handleTogglePersonalizationAttempt = () => {
    if (!isLoggedIn) {
      Alert.alert(
        "Registered Users Only 🔒",
        "Guests cannot enable Personalization feature mode. Because guest mode is anonymous, personal in-store visit history and customized recommendations cannot be saved.\n\nPlease sign in or register to enable Personalization.",
        [
          { text: "Continue as Guest", style: "cancel" },
          { text: "Sign In as Registered", onPress: () => handleCustomerLogin() },
        ]
      );
      return;
    }
    togglePersonalization();
  };

  const handleSwitchRoleConfirm = () => {
    Alert.alert(
      "Switch User Role?",
      "Are you sure you want to leave Customer Mode and return to the Mati FoodFinder access portal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Return to Portal",
          style: "destructive",
          onPress: () => router.replace("/(mobile)/portal"),
        },
      ]
    );
  };

  const totalScans = Object.values(storeVisits).reduce((sum, count) => sum + count, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="px-5 py-3.5 bg-white border-b border-gray-100 shadow-xs">
        <Text className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
          Customer Account
        </Text>
        <Text className="text-lg font-black text-gray-900">Profile & Preferences</Text>
      </View>

      <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* 1. CUSTOMER IDENTITY & ACCOUNT CARD */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <View className="flex-row items-center gap-4 mb-4">
            <View
              className={`w-14 h-14 rounded-2xl items-center justify-center ${
                isLoggedIn ? "bg-emerald-700" : "bg-gray-200"
              }`}
            >
              <Ionicons
                name={isLoggedIn ? "person" : "person-outline"}
                size={26}
                color={isLoggedIn ? "white" : "#6b7280"}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="text-lg font-black text-gray-900">
                  {isLoggedIn ? user?.name : "Guest User"}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded ${
                    isLoggedIn ? "bg-emerald-100" : "bg-orange-100"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isLoggedIn ? "text-emerald-800" : "text-orange-700"
                    } uppercase`}
                  >
                    {isLoggedIn ? "Registered" : "Guest Mode"}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500">
                {isLoggedIn
                  ? user?.email
                  : "Sign in or register to activate Orders tab, COD ordering & QR scans"}
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
              {/* Segmented Toggle: Sign In vs Register */}
              <View className="flex-row bg-gray-100 p-1 rounded-xl mb-3">
                <Pressable
                  onPress={() => setAuthMode("login")}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    authMode === "login" ? "bg-white shadow-xs" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      authMode === "login" ? "text-emerald-800" : "text-gray-500"
                    }`}
                  >
                    Sign In
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAuthMode("register")}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    authMode === "register" ? "bg-white shadow-xs" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      authMode === "register" ? "text-emerald-800" : "text-gray-500"
                    }`}
                  >
                    Register New Account
                  </Text>
                </Pressable>
              </View>

              {authMode === "login" ? (
                <>
                  <Text className="text-xs font-bold text-gray-700 mb-1">Email Address</Text>
                  <TextInput
                    placeholder="Email address"
                    value={custEmail}
                    onChangeText={setCustEmail}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 text-gray-900"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                  <Text className="text-xs font-bold text-gray-700 mb-1">Password</Text>
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
                    <Text className="text-white font-bold text-xs">
                      Sign In as Registered User
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text className="text-xs font-bold text-gray-700 mb-1">Full Name *</Text>
                  <TextInput
                    placeholder="e.g. Maria Santos"
                    value={regName}
                    onChangeText={setRegName}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />

                  <Text className="text-xs font-bold text-gray-700 mb-1">Mobile Phone (for deliveries) *</Text>
                  <TextInput
                    placeholder="0917 123 4567"
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />

                  <Text className="text-xs font-bold text-gray-700 mb-1">Email Address *</Text>
                  <TextInput
                    placeholder="maria@mati.ph"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />

                  <Text className="text-xs font-bold text-gray-700 mb-1">Password *</Text>
                  <TextInput
                    placeholder="Create secure password"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />

                  <Text className="text-xs font-bold text-gray-700 mb-1">Default Barangay *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                    {matiBarangays.map((brgy) => (
                      <Pressable
                        key={brgy}
                        onPress={() => setRegBarangay(brgy)}
                        className={`mr-1.5 px-2.5 py-1.5 rounded-lg border ${
                          regBarangay === brgy
                            ? "bg-emerald-700 border-emerald-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            regBarangay === brgy ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {brgy}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text className="text-xs font-bold text-gray-700 mb-1">Delivery Street / Landmark</Text>
                  <TextInput
                    placeholder="e.g. Purok 3, Near Baywalk Pavilion"
                    value={regAddress}
                    onChangeText={setRegAddress}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-3 text-gray-900"
                    placeholderTextColor="#9ca3af"
                  />

                  <Pressable
                    onPress={handleCustomerRegister}
                    className="w-full py-3 bg-emerald-700 rounded-xl items-center shadow-xs"
                  >
                    <Text className="text-white font-bold text-xs">
                      Create Account & Enable Personalization
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>

        {/* 2. PERSONALIZATION FEATURE MODE SETTINGS (REGISTERED USERS ONLY) */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center ${
                  isLoggedIn && personalizationEnabled ? "bg-purple-100" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name={isLoggedIn && personalizationEnabled ? "sparkles" : "sparkles-outline"}
                  size={18}
                  color={isLoggedIn && personalizationEnabled ? "#7e22ce" : "#6b7280"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-gray-900">Personalization Mode</Text>
                <Text className="text-[11px] text-gray-500">
                  In-store QR scanning & ML recommendations
                </Text>
              </View>
            </View>

            {/* Toggle Switch */}
            <Pressable onPress={handleTogglePersonalizationAttempt} hitSlop={10}>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#047857" }}
                thumbColor={isLoggedIn && personalizationEnabled ? "#ffffff" : "#f3f4f6"}
                ios_backgroundColor="#d1d5db"
                onValueChange={handleTogglePersonalizationAttempt}
                value={isLoggedIn && personalizationEnabled}
                disabled={!isLoggedIn}
              />
            </Pressable>
          </View>

          {/* Conditional Content based on Registered vs Guest */}
          {isLoggedIn ? (
            <View className="mt-2.5 pt-3 border-t border-gray-100">
              {personalizationEnabled ? (
                <>
                  <View className="flex-row items-center gap-1.5 mb-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <Ionicons name="checkmark-circle" size={14} color="#047857" />
                    <Text className="text-[11px] font-bold text-emerald-800">
                      Personalization Active • Restaurant QR Scanning Enabled
                    </Text>
                  </View>

                  <Text className="text-xs text-gray-600 leading-relaxed mb-3">
                    Your in-store QR code check-ins at Mati restaurants are tracked to
                    personalize your food feed with your #1 Most Visited spots and custom dish
                    recommendations.
                  </Text>

                  {/* Visit Stats Summary */}
                  <View className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex-row justify-between items-center">
                    <View>
                      <Text className="text-[10px] uppercase font-extrabold text-gray-400">
                        Total Check-ins
                      </Text>
                      <Text className="text-base font-black text-gray-900">
                        {totalScans} In-Store Scans
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] uppercase font-extrabold text-gray-400">
                        #1 Most Visited
                      </Text>
                      <Text className="text-xs font-bold text-emerald-800">
                        {mostVisitedStore ? mostVisitedStore.name : "None yet"}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-1.5 mb-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    <Ionicons name="pause-circle" size={14} color="#d97706" />
                    <Text className="text-[11px] font-bold text-amber-800">
                      Personalization Paused • In-Store QR Scans Disabled
                    </Text>
                  </View>

                  <Text className="text-xs text-gray-600 leading-relaxed mb-3">
                    Personalization is turned off. You cannot scan restaurant stand QR codes, and
                    your feed will show generic items instead of your top visited spots.
                  </Text>

                  <Pressable
                    onPress={() => togglePersonalization(true)}
                    className="py-2.5 bg-emerald-700 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs">
                      Turn On Personalization
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View className="mt-2.5 pt-3 border-t border-gray-100">
              <View className="flex-row items-center gap-1.5 mb-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
                <Ionicons name="lock-closed" size={13} color="#ea580c" />
                <Text className="text-[11px] font-bold text-orange-900">
                  Locked for Guest Users
                </Text>
              </View>

              <Text className="text-xs text-gray-600 leading-relaxed mb-3">
                Guests cannot enable Personalization feature mode. Because guest sessions are
                temporary, personal check-in history cannot be saved.
              </Text>

              <View className="bg-orange-50/70 p-3 rounded-xl border border-orange-100 mb-3">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="alert-circle" size={16} color="#c2410c" />
                  <Text className="text-[11px] text-orange-950 font-medium flex-1 leading-snug">
                    <Text className="font-bold">QR Scanning Restricted: </Text>
                    Only Registered Users can scan restaurant stand QR codes. Sign in to enable
                    Personalization and record visits.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setAuthMode("register")}
                className="py-2.5 bg-emerald-700 rounded-xl items-center shadow-xs"
              >
                <Text className="text-white font-bold text-xs">
                  Register as New Customer to Unlock
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 3. MATI CITY DELIVERY PREFERENCES */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="location-outline" size={18} color="#047857" />
            <Text className="text-sm font-black text-gray-900">Delivery Address in Mati</Text>
          </View>
          <Text className="text-xs text-gray-500 mb-3">
            Set your default Mati City barangay and delivery landmarks for faster checkout.
          </Text>

          <Text className="text-[11px] font-bold text-gray-700 mb-1.5">Default Barangay</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {matiBarangays.map((brgy) => (
              <Pressable
                key={brgy}
                onPress={() => setDefaultBarangay(brgy)}
                className={`mr-2 px-3 py-1.5 rounded-xl border ${
                  defaultBarangay === brgy
                    ? "bg-emerald-700 border-emerald-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    defaultBarangay === brgy ? "text-white" : "text-gray-700"
                  }`}
                >
                  {brgy}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-[11px] font-bold text-gray-700 mb-1">House / Landmark</Text>
          <TextInput
            value={savedAddress}
            onChangeText={setSavedAddress}
            placeholder="e.g. Near Baywalk Pavilion, blue gate"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-2"
            placeholderTextColor="#9ca3af"
          />
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="cash-outline" size={14} color="#047857" />
            <Text className="text-[11px] text-gray-500">
              Payment Method: <Text className="font-bold text-emerald-800">Cash on Delivery (COD)</Text>
            </Text>
          </View>
        </View>

        {/* 4. ORDERS & BOOKINGS SHORTCUTS */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-5">
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
            Quick Customer Shortcuts
          </Text>
          <View className="gap-2.5">
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/orders")}
              className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <View className="flex-row items-center gap-2.5">
                <Text className="text-base">🛵</Text>
                <Text className="text-xs font-bold text-gray-800">Active COD Deliveries</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#9ca3af" />
            </Pressable>

            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/orders")}
              className="flex-row justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <View className="flex-row items-center gap-2.5">
                <Text className="text-base">📅</Text>
                <Text className="text-xs font-bold text-gray-800">Dining Table Bookings</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        {/* 5. ABOUT MFF */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-8">
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
            About MFF
          </Text>
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

        {/* 6. DISCREET ROLE SWITCHER / PORTAL ACCESS (Tricky to find so normal users won't misclick) */}
        <View className="items-center mb-6">
          <Pressable
            onPress={() => setShowAdvancedSession(!showAdvancedSession)}
            className="py-2 px-4 flex-row items-center gap-1.5 opacity-60"
          >
            <Ionicons
              name={showAdvancedSession ? "chevron-down" : "ellipsis-horizontal"}
              size={14}
              color="#6b7280"
            />
            <Text className="text-[11px] font-semibold text-gray-500">
              Session Management & Role Portal
            </Text>
          </Pressable>

          {showAdvancedSession && (
            <View className="w-full mt-3 p-4 bg-gray-100 rounded-2xl border border-gray-200 items-center">
              <Text className="text-[11px] text-gray-500 text-center mb-3 leading-snug">
                Switching roles will exit Customer Mode and return to the main Mati FoodFinder
                access portal.
              </Text>
              <Pressable
                onPress={handleSwitchRoleConfirm}
                className="py-2.5 px-5 bg-gray-800 rounded-xl flex-row items-center gap-2 shadow-xs"
              >
                <Ionicons name="swap-horizontal" size={14} color="white" />
                <Text className="text-white font-bold text-xs">Switch User Role (Return to Portal)</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
