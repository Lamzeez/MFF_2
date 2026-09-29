import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { MATI_BARANGAYS } from "../../../mock/barangays";

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const { loginAsRegistered } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [barangay, setBarangay] = useState("Central (Poblacion)");
  const [address, setAddress] = useState("");
  const [personalization, setPersonalization] = useState(true);

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Required Fields", "Please enter your Name, Email, and Password.");
      return;
    }

    loginAsRegistered(name.trim(), email.trim());
    Alert.alert(
      "Account Created! 🎉",
      `Welcome to Mati FoodFinder, ${name.split(" ")[0]}! Personalization and COD ordering are now unlocked.`,
      [{ text: "Start Exploring", onPress: () => router.replace("/(mobile)/(tabs)") }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </Pressable>
        <View className="items-center">
          <Text className="text-base font-black text-gray-900">Create Customer Account</Text>
          <Text className="text-xs text-emerald-800 font-bold">Mati FoodFinder Foodie</Text>
        </View>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xs font-bold text-gray-700 mb-1.5">Full Name *</Text>
          <TextInput
            placeholder="e.g. Maria Santos"
            value={name}
            onChangeText={setName}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Mobile Phone (for delivery calls) *</Text>
          <TextInput
            placeholder="e.g. 0917 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Email Address *</Text>
          <TextInput
            placeholder="maria@mati.ph"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Password *</Text>
          <TextInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Default Barangay (Mati City) *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
            {MATI_BARANGAYS.map((brgy) => (
              <Pressable
                key={brgy}
                onPress={() => setBarangay(brgy)}
                className={`mr-2 px-3.5 py-2 rounded-xl border ${
                  barangay === brgy
                    ? "bg-emerald-700 border-emerald-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    barangay === brgy ? "text-white" : "text-gray-700"
                  }`}
                >
                  {brgy}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Delivery Street / Landmark *</Text>
          <TextInput
            placeholder="e.g. Purok 3, near Baywalk Pavilion, blue gate"
            value={address}
            onChangeText={setAddress}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-4"
            placeholderTextColor="#9ca3af"
          />

          {/* Personalization Toggle */}
          <View className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex-row items-center justify-between mb-5">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-bold text-emerald-900">Enable Personalization Mode</Text>
              <Text className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                Allows scanning restaurant stand QR codes and tailors your food recommendations.
              </Text>
            </View>
            <Switch
              value={personalization}
              onValueChange={setPersonalization}
              trackColor={{ false: "#d1d5db", true: "#047857" }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleRegister}
            className="w-full py-3.5 bg-emerald-700 rounded-xl items-center shadow-md mb-3"
          >
            <Text className="text-white font-bold text-sm">Create Account & Enter App</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(mobile)/(tabs)")}
            className="w-full py-3 items-center"
          >
            <Text className="text-gray-500 font-medium text-xs">
              Skip for now • Continue Browsing as Guest
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
