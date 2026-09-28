import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function MobileLandingPortal() {
  const router = useRouter();
  const { loginAsRegistered } = useAuth();

  const matiBarangays = [
    "Central (Poblacion)",
    "Dahican",
    "Sainz",
    "Matiao",
    "Badas",
    "Mayo",
  ];

  // ==========================================
  // MODAL STATES
  // ==========================================
  // Customer Register Modal
  const [custRegVisible, setCustRegVisible] = useState(false);
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custPassword, setCustPassword] = useState("");
  const [custBarangay, setCustBarangay] = useState("Central (Poblacion)");
  const [custAddress, setCustAddress] = useState("");
  const [custPersonalization, setCustPersonalization] = useState(true);

  // Store Merchant Login Modal
  const [merchantLoginVisible, setMerchantLoginVisible] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState("lette@karenderia.com");
  const [merchantPassword, setMerchantPassword] = useState("password123");

  // Store Merchant Register Modal (1:1 Web store-register.tsx match)
  const [merchantRegVisible, setMerchantRegVisible] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeOwnerName, setStoreOwnerName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePassword, setStorePassword] = useState("");
  const [hasUploadedDoc, setHasUploadedDoc] = useState(false);
  const [storeSubmittedVisible, setStoreSubmittedVisible] = useState(false);

  // Rider Login Modal
  const [riderLoginVisible, setRiderLoginVisible] = useState(false);
  const [riderId, setRiderId] = useState("R-402");
  const [riderPin, setRiderPin] = useState("1234");

  // Rider Register Modal
  const [riderRegVisible, setRiderRegVisible] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderMotorcycle, setRiderMotorcycle] = useState("");
  const [riderPlate, setRiderPlate] = useState("");
  const [riderLicense, setRiderLicense] = useState("");
  const [riderBarangay, setRiderBarangay] = useState("Central (Poblacion)");
  const [riderNewPin, setRiderNewPin] = useState("");
  const [riderCodAgreed, setRiderCodAgreed] = useState(true);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleEnterCustomerGuest = () => {
    router.push("/(mobile)/(tabs)");
  };

  const handleRegisterCustomer = () => {
    if (!custName.trim() || !custEmail.trim() || !custPassword.trim()) {
      Alert.alert("Required Fields", "Please enter your Name, Email, and Password.");
      return;
    }
    loginAsRegistered(custName.trim(), custEmail.trim());
    setCustRegVisible(false);
    Alert.alert(
      "Account Created! 🎉",
      `Welcome to Mati FoodFinder, ${custName.split(" ")[0]}! Personalization and COD ordering are now unlocked.`,
      [{ text: "Start Exploring", onPress: () => router.push("/(mobile)/(tabs)") }]
    );
  };

  const handleVerifyMerchantLogin = () => {
    if (!merchantEmail.trim() || !merchantPassword.trim()) {
      Alert.alert("Credentials Required", "Please enter your Store Admin email and password.");
      return;
    }
    setMerchantLoginVisible(false);
    router.push("/(mobile)/merchant");
  };

  const handleRegisterStore = () => {
    if (
      !storeName.trim() ||
      !storeAddress.trim() ||
      !storeOwnerName.trim() ||
      !storePhone.trim() ||
      !storeEmail.trim() ||
      !storePassword.trim()
    ) {
      Alert.alert(
        "Missing Fields",
        "Please fill in all 6 required store and owner fields."
      );
      return;
    }
    if (!hasUploadedDoc) {
      Alert.alert(
        "Verification Document Required",
        "Please tap the upload box to attach a photo of your Store Front or Business Permit."
      );
      return;
    }

    setMerchantRegVisible(false);
    setStoreSubmittedVisible(true);
  };

  const handleVerifyRiderLogin = () => {
    if (!riderId.trim() || !riderPin.trim()) {
      Alert.alert("Credentials Required", "Please enter your Rider ID / Phone and PIN.");
      return;
    }
    setRiderLoginVisible(false);
    router.push("/(mobile)/rider");
  };

  const handleRegisterRider = () => {
    if (!riderName.trim() || !riderPhone.trim() || !riderMotorcycle.trim() || !riderNewPin.trim()) {
      Alert.alert("Missing Fields", "Please fill in your Name, Phone, Motorcycle Model, and 4-Digit PIN.");
      return;
    }
    if (!riderCodAgreed) {
      Alert.alert("Agreement Required", "Please agree to the Cash-on-Delivery remittance protocol.");
      return;
    }

    setRiderRegVisible(false);
    Alert.alert(
      "Rider Application Approved! 🏍️",
      `Welcome ${riderName}! You have been registered as Independent Courier #M-403 in Mati City.`,
      [{ text: "Open Rider Mode", onPress: () => router.push("/(mobile)/rider") }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO & APP INTRODUCTION */}
        <View className="bg-emerald-800 px-6 pt-6 pb-8 rounded-b-3xl shadow-sm">
          {/* Brand Row */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <Image
                source={require("../../assets/logo.jpg")}
                className="w-12 h-12 rounded-2xl border-2 border-emerald-400"
                resizeMode="cover"
              />
              <View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="location" size={12} color="#a7f3d0" />
                  <Text className="text-[10px] font-black text-emerald-200 tracking-widest uppercase">
                    Mati City, Davao Oriental
                  </Text>
                </View>
                <Text className="text-xl font-black text-white tracking-tight">
                  Mati FoodFinder
                </Text>
              </View>
            </View>

            <View className="bg-emerald-900/80 px-2.5 py-1 rounded-full border border-emerald-700">
              <Text className="text-[10px] font-bold text-emerald-200">v1.0.0 Mobile</Text>
            </View>
          </View>

          {/* Short Intro */}
          <Text className="text-white text-base font-extrabold leading-snug mb-2">
            Your Local Karenderia & Dining Network
          </Text>
          <Text className="text-emerald-100 text-xs leading-relaxed mb-4">
            Connecting hungry foodies, local eatery owners, and delivery riders across Mati City.
            Enjoy fresh Pujada Bay seafood, authentic Central karenderias, and Dahican beach favorites.
          </Text>

          {/* Key Feature Badges Grid */}
          <View className="flex-row flex-wrap gap-2 pt-2 border-t border-emerald-700/60">
            <View className="flex-row items-center gap-1 bg-emerald-900/70 px-2.5 py-1 rounded-lg">
              <Text className="text-xs">🍲</Text>
              <Text className="text-[11px] font-bold text-emerald-100">Live Daily Menus</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-emerald-900/70 px-2.5 py-1 rounded-lg">
              <Text className="text-xs">🛵</Text>
              <Text className="text-[11px] font-bold text-emerald-100">Cash on Delivery</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-emerald-900/70 px-2.5 py-1 rounded-lg">
              <Text className="text-xs">📅</Text>
              <Text className="text-[11px] font-bold text-emerald-100">Table Bookings</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-emerald-900/70 px-2.5 py-1 rounded-lg">
              <Text className="text-xs">📱</Text>
              <Text className="text-[11px] font-bold text-emerald-100">Stand QR Check-ins</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-emerald-900/70 px-2.5 py-1 rounded-lg">
              <Text className="text-xs">🧠</Text>
              <Text className="text-[11px] font-bold text-emerald-100">ML Personalization</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-emerald-900/70 px-2.5 py-1 rounded-lg">
              <Text className="text-xs">👥</Text>
              <Text className="text-[11px] font-bold text-emerald-100">Foodie Community</Text>
            </View>
          </View>
        </View>

        {/* 2. UNIFIED ROLE SELECTION PORTAL WITH LOGIN & REGISTER */}
        <View className="px-5 pt-6">
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="apps" size={16} color="#047857" />
              <Text className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                Mobile Access Portal
              </Text>
            </View>
            <Text className="text-xl font-black text-gray-900">
              Select Your Role to Continue
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Choose how you will be using the app today:
            </Text>
          </View>

          {/* ROLE CARD 1: HUNGRY CUSTOMER */}
          <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-4">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-emerald-100 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">🍔</Text>
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900">Hungry Customer</Text>
                  <Text className="text-xs font-bold text-emerald-700">Food Discovery & Ordering</Text>
                </View>
              </View>
              <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Text className="text-[10px] font-black text-emerald-800 uppercase">Primary</Text>
              </View>
            </View>

            <Text className="text-xs text-gray-600 leading-relaxed mb-4">
              Browse live menus across Mati City, reserve dining tables, order Cash on Delivery, scan in-store stand QR codes, and share food reviews.
            </Text>

            <View className="flex-row gap-2 pt-3 border-t border-gray-100">
              <Pressable
                onPress={handleEnterCustomerGuest}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl items-center border border-gray-200"
              >
                <Text className="text-gray-700 font-bold text-xs">Enter as Guest</Text>
              </Pressable>

              <Pressable
                onPress={() => setCustRegVisible(true)}
                className="flex-1 py-2.5 bg-emerald-700 rounded-xl items-center flex-row justify-center gap-1 shadow-xs"
              >
                <Ionicons name="sparkles" size={13} color="white" />
                <Text className="text-white font-bold text-xs">Register Account</Text>
              </Pressable>
            </View>
          </View>

          {/* ROLE CARD 2: STORE MERCHANT */}
          <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-4">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-orange-100 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">🍳</Text>
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900">Store Partner</Text>
                  <Text className="text-xs font-bold text-orange-700">Karenderia & Kitchen Operations</Text>
                </View>
              </View>
              <View className="bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                <Text className="text-[10px] font-black text-orange-800 uppercase">Merchant</Text>
              </View>
            </View>

            <Text className="text-xs text-gray-600 leading-relaxed mb-4">
              For Karenderia owners. Run your live kitchen order queue, approve table bookings, toggle menu item availability, and generate your Store Stand QR.
            </Text>

            <View className="flex-row gap-2 pt-3 border-t border-gray-100">
              <Pressable
                onPress={() => setMerchantLoginVisible(true)}
                className="flex-1 py-2.5 bg-gray-900 rounded-xl items-center flex-row justify-center gap-1 shadow-xs"
              >
                <Ionicons name="key" size={12} color="white" />
                <Text className="text-white font-bold text-xs">Merchant Login</Text>
              </Pressable>

              <Pressable
                onPress={() => setMerchantRegVisible(true)}
                className="flex-1 py-2.5 bg-white border border-orange-500 rounded-xl items-center flex-row justify-center gap-1"
              >
                <Ionicons name="storefront" size={13} color="#ea580c" />
                <Text className="text-orange-600 font-bold text-xs">Register Store</Text>
              </Pressable>
            </View>
          </View>

          {/* ROLE CARD 3: DELIVERY RIDER */}
          <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs mb-4">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-sky-100 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">🛵</Text>
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900">Delivery Rider</Text>
                  <Text className="text-xs font-bold text-sky-700">Mati City Express Dispatch</Text>
                </View>
              </View>
              <View className="bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                <Text className="text-[10px] font-black text-sky-800 uppercase">Courier</Text>
              </View>
            </View>

            <Text className="text-xs text-gray-600 leading-relaxed mb-4">
              For independent motorcycle riders. Accept incoming Cash-on-Delivery delivery requests, view drop-off areas in Mati, and track daily trip earnings.
            </Text>

            <View className="flex-row gap-2 pt-3 border-t border-gray-100">
              <Pressable
                onPress={() => setRiderLoginVisible(true)}
                className="flex-1 py-2.5 bg-sky-600 rounded-xl items-center flex-row justify-center gap-1 shadow-xs"
              >
                <Ionicons name="bicycle" size={14} color="white" />
                <Text className="text-white font-bold text-xs">Rider Login</Text>
              </Pressable>

              <Pressable
                onPress={() => setRiderRegVisible(true)}
                className="flex-1 py-2.5 bg-white border border-sky-600 rounded-xl items-center flex-row justify-center gap-1"
              >
                <Ionicons name="person-add" size={13} color="#0284c7" />
                <Text className="text-sky-700 font-bold text-xs">Apply as Rider</Text>
              </Pressable>
            </View>
          </View>

          {/* WEB DESKTOP NOTICE */}
          <View className="bg-gray-100 p-4 rounded-2xl border border-gray-200 mt-2">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="laptop-outline" size={15} color="#4b5563" />
              <Text className="text-xs font-bold text-gray-800">System Admin & Web Portal</Text>
            </View>
            <Text className="text-[11px] text-gray-500 leading-snug">
              Store verification, compliance approvals, and system-wide metrics are accessible via the Mati FoodFinder Web Portal on desktop browsers.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* 1. MODAL: CUSTOMER REGISTRATION */}
      {/* ========================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={custRegVisible}
        onRequestClose={() => setCustRegVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Create Customer Account</Text>
                <Text className="text-xs text-emerald-800 font-bold">Mati FoodFinder Foodie</Text>
              </View>
              <Pressable
                onPress={() => setCustRegVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold text-gray-700 mb-1">Full Name *</Text>
              <TextInput
                placeholder="e.g. Maria Santos"
                value={custName}
                onChangeText={setCustName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Mobile Phone (for delivery calls) *</Text>
              <TextInput
                placeholder="e.g. 0917 123 4567"
                value={custPhone}
                onChangeText={setCustPhone}
                keyboardType="phone-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Email Address *</Text>
              <TextInput
                placeholder="maria@mati.ph"
                value={custEmail}
                onChangeText={setCustEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Password *</Text>
              <TextInput
                placeholder="••••••••"
                value={custPassword}
                onChangeText={setCustPassword}
                secureTextEntry
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Default Barangay (Mati City) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {matiBarangays.map((brgy) => (
                  <Pressable
                    key={brgy}
                    onPress={() => setCustBarangay(brgy)}
                    className={`mr-2 px-3 py-1.5 rounded-xl border ${
                      custBarangay === brgy
                        ? "bg-emerald-700 border-emerald-700"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        custBarangay === brgy ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {brgy}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="text-xs font-bold text-gray-700 mb-1">Delivery Street / Landmark *</Text>
              <TextInput
                placeholder="e.g. Purok 3, near Baywalk Pavilion, blue gate"
                value={custAddress}
                onChangeText={setCustAddress}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-4"
                placeholderTextColor="#9ca3af"
              />

              <View className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex-row items-center justify-between mb-5">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold text-emerald-900">Enable Personalization Mode</Text>
                  <Text className="text-[11px] text-emerald-800 leading-tight">
                    Allows scanning restaurant stand QR codes and tailors your food recommendations.
                  </Text>
                </View>
                <Switch
                  value={custPersonalization}
                  onValueChange={setCustPersonalization}
                  trackColor={{ false: "#d1d5db", true: "#047857" }}
                  thumbColor="#ffffff"
                />
              </View>

              <Pressable
                onPress={handleRegisterCustomer}
                className="w-full py-3.5 bg-emerald-700 rounded-xl items-center shadow-md mb-6"
              >
                <Text className="text-white font-bold text-sm">Create Account & Enter App</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* 2. MODAL: STORE MERCHANT LOGIN */}
      {/* ========================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={merchantLoginVisible}
        onRequestClose={() => setMerchantLoginVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/60 items-center justify-center p-5"
        >
          <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl items-center relative">
            <Pressable
              onPress={() => setMerchantLoginVisible(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#4b5563" />
            </Pressable>

            <View className="w-14 h-14 bg-orange-100 rounded-2xl items-center justify-center mb-3">
              <Text className="text-2xl">🏪</Text>
            </View>

            <Text className="text-xl font-black text-gray-900 text-center mb-1">
              Store Merchant Login
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
              Enter your Store Admin credentials to open kitchen operations in Mati City.
            </Text>

            <View className="w-full gap-3 mb-4">
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
              onPress={handleVerifyMerchantLogin}
              className="w-full py-3.5 bg-orange-500 rounded-xl items-center shadow-md mb-3"
            >
              <Text className="text-white font-bold text-sm">Verify & Enter Kitchen Mode</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMerchantLoginVisible(false);
                setMerchantRegVisible(true);
              }}
              className="py-2 items-center"
            >
              <Text className="text-xs text-orange-600 font-bold">
                Don't have a store account? Register here →
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* 3. MODAL: STORE MERCHANT REGISTRATION (1:1 with Web) */}
      {/* ========================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={merchantRegVisible}
        onRequestClose={() => setMerchantRegVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Partner with MFF</Text>
                <Text className="text-xs text-orange-600 font-bold">2-Month Free Introductory Trial</Text>
              </View>
              <Pressable
                onPress={() => setMerchantRegVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              {/* SECTION 1: STORE INFORMATION */}
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                1. Store Information
              </Text>

              <Text className="text-xs font-bold text-gray-700 mb-1">Store Name *</Text>
              <TextInput
                placeholder="e.g. Mama Letty's Karenderia"
                value={storeName}
                onChangeText={setStoreName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Complete Address *</Text>
              <TextInput
                placeholder="Street, Barangay, Landmark (Mati City only)"
                value={storeAddress}
                onChangeText={setStoreAddress}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-4"
                placeholderTextColor="#9ca3af"
              />

              {/* SECTION 2: OWNER DETAILS */}
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 pt-2 border-t border-gray-100">
                2. Owner Details
              </Text>

              <Text className="text-xs font-bold text-gray-700 mb-1">Full Name *</Text>
              <TextInput
                placeholder="Owner's Name"
                value={storeOwnerName}
                onChangeText={setStoreOwnerName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Mobile Number (GCash) *</Text>
              <TextInput
                placeholder="09XX XXX XXXX"
                value={storePhone}
                onChangeText={setStorePhone}
                keyboardType="phone-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Email Address *</Text>
              <TextInput
                placeholder="store@example.com"
                value={storeEmail}
                onChangeText={setStoreEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Password *</Text>
              <TextInput
                placeholder="Create a secure password"
                value={storePassword}
                onChangeText={setStorePassword}
                secureTextEntry
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-4"
                placeholderTextColor="#9ca3af"
              />

              {/* SECTION 3: VERIFICATION DOCUMENTS */}
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1 pt-2 border-t border-gray-100">
                3. Verification Documents
              </Text>
              <Text className="text-[11px] text-gray-500 mb-3">
                To ensure platform quality, please upload a clear photo of your Store Front or Business Permit.
              </Text>

              <Pressable
                onPress={() => {
                  setHasUploadedDoc(true);
                  Alert.alert("Document Attached 📸", "Store front / permit photo attached successfully.");
                }}
                className={`w-full p-4 rounded-2xl border-2 border-dashed items-center justify-center mb-5 ${
                  hasUploadedDoc
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-gray-50 border-gray-300"
                }`}
              >
                <Text className="text-2xl mb-1">{hasUploadedDoc ? "✅" : "📸"}</Text>
                <Text className={`font-bold text-xs ${hasUploadedDoc ? "text-emerald-800" : "text-gray-700"}`}>
                  {hasUploadedDoc ? "Document Attached (permit_mati.jpg)" : "Click to Upload Store Document"}
                </Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</Text>
              </Pressable>

              {/* Promo Banner */}
              <View className="bg-orange-50 border border-orange-200 p-3 rounded-xl mb-4">
                <Text className="text-[11px] font-bold text-orange-900">
                  🎉 2-Month Free Introductory Trial Included
                </Text>
                <Text className="text-[10px] text-orange-800 mt-0.5 leading-snug">
                  No upfront fees. PayMongo auto-renewal at ₱499/month starts after 60 days. Cancel anytime.
                </Text>
              </View>

              <Pressable
                onPress={handleRegisterStore}
                className="w-full py-3.5 bg-orange-500 rounded-xl items-center shadow-md mb-6"
              >
                <Text className="text-white font-bold text-sm">Submit Store Application</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* 4. MODAL: STORE APPLICATION SUBMITTED (Matches verification.tsx) */}
      {/* ========================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={storeSubmittedVisible}
        onRequestClose={() => setStoreSubmittedVisible(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center p-5">
          <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl items-center text-center">
            <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">⏳</Text>
            </View>

            <Text className="text-xl font-black text-gray-900 text-center mb-2">
              Application Received!
            </Text>

            <Text className="text-xs text-gray-600 text-center mb-5 leading-relaxed">
              Thank you for applying to join Mati FoodFinder! Our System Admin team is currently reviewing your documents to verify your store's location. This usually takes less than 24 hours. We will email you once approved!
            </Text>

            <Pressable
              onPress={() => {
                setStoreSubmittedVisible(false);
              }}
              className="w-full py-3 bg-gray-900 rounded-xl items-center mb-2.5"
            >
              <Text className="text-white font-bold text-xs">Return to Access Portal</Text>
            </Pressable>

            {/* Development / Testing Bypass */}
            <Pressable
              onPress={() => {
                setStoreSubmittedVisible(false);
                router.push("/(mobile)/merchant");
              }}
              className="w-full py-2.5 bg-emerald-50 rounded-xl items-center border border-emerald-200"
            >
              <Text className="text-emerald-800 font-bold text-xs">
                Demo Mode: Test Kitchen Mode Now →
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 5. MODAL: DELIVERY RIDER LOGIN */}
      {/* ========================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={riderLoginVisible}
        onRequestClose={() => setRiderLoginVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/60 items-center justify-center p-5"
        >
          <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl items-center relative">
            <Pressable
              onPress={() => setRiderLoginVisible(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#4b5563" />
            </Pressable>

            <View className="w-14 h-14 bg-sky-100 rounded-2xl items-center justify-center mb-3">
              <Text className="text-2xl">🛵</Text>
            </View>

            <Text className="text-xl font-black text-gray-900 text-center mb-1">
              Delivery Rider Login
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
              Enter your Rider ID / Phone and PIN to open active delivery routing in Mati.
            </Text>

            <View className="w-full gap-3 mb-4">
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
              onPress={handleVerifyRiderLogin}
              className="w-full py-3.5 bg-sky-600 rounded-xl items-center shadow-md mb-3"
            >
              <Text className="text-white font-bold text-sm">Verify & Enter Rider Mode</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setRiderLoginVisible(false);
                setRiderRegVisible(true);
              }}
              className="py-2 items-center"
            >
              <Text className="text-xs text-sky-700 font-bold">
                New rider in Mati? Apply to deliver here →
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* 6. MODAL: DELIVERY RIDER APPLICATION / REGISTER */}
      {/* ========================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={riderRegVisible}
        onRequestClose={() => setRiderRegVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Apply as Delivery Rider</Text>
                <Text className="text-xs text-sky-700 font-bold">Earn ₱65 - ₱120 per trip</Text>
              </View>
              <Pressable
                onPress={() => setRiderRegVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold text-gray-700 mb-1">Full Legal Name *</Text>
              <TextInput
                placeholder="e.g. Roberto D. Tan"
                value={riderName}
                onChangeText={setRiderName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Mobile Phone (Active for Dispatch) *</Text>
              <TextInput
                placeholder="e.g. 0917 987 6543"
                value={riderPhone}
                onChangeText={setRiderPhone}
                keyboardType="phone-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Motorcycle Make, Model & Color *</Text>
              <TextInput
                placeholder="e.g. Honda Wave 110 - Black"
                value={riderMotorcycle}
                onChangeText={setRiderMotorcycle}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Plate Number / MV File No. *</Text>
              <TextInput
                placeholder="e.g. 1102-DA"
                value={riderPlate}
                onChangeText={setRiderPlate}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Driver's License Number *</Text>
              <TextInput
                placeholder="e.g. L02-19-123456"
                value={riderLicense}
                onChangeText={setRiderLicense}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-3"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Barangay of Residence *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {matiBarangays.map((brgy) => (
                  <Pressable
                    key={brgy}
                    onPress={() => setRiderBarangay(brgy)}
                    className={`mr-2 px-3 py-1.5 rounded-xl border ${
                      riderBarangay === brgy
                        ? "bg-sky-600 border-sky-600"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        riderBarangay === brgy ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {brgy}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="text-xs font-bold text-gray-700 mb-1">Create 4-Digit Shift Login PIN *</Text>
              <TextInput
                placeholder="••••"
                value={riderNewPin}
                onChangeText={setRiderNewPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 mb-4"
                placeholderTextColor="#9ca3af"
              />

              {/* COD Remittance Checkbox */}
              <Pressable
                onPress={() => setRiderCodAgreed(!riderCodAgreed)}
                className="flex-row items-center gap-2.5 bg-sky-50 p-3 rounded-xl border border-sky-200 mb-5"
              >
                <Ionicons
                  name={riderCodAgreed ? "checkbox" : "square-outline"}
                  size={20}
                  color={riderCodAgreed ? "#0284c7" : "#6b7280"}
                />
                <Text className="text-[11px] text-sky-950 font-medium flex-1 leading-tight">
                  I agree to collect and remit Cash on Delivery (COD) order payments accurately to Mati FoodFinder partner restaurants.
                </Text>
              </Pressable>

              <Pressable
                onPress={handleRegisterRider}
                className="w-full py-3.5 bg-sky-600 rounded-xl items-center shadow-md mb-6"
              >
                <Text className="text-white font-bold text-sm">Submit Rider Application</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
