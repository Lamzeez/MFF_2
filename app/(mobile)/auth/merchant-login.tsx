import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function MerchantLoginScreen() {
  const router = useRouter();

  // Demo credentials pre-filled in development only
  const [merchantEmail, setMerchantEmail] = useState(__DEV__ ? "lette@karenderia.com" : "");
  const [merchantPassword, setMerchantPassword] = useState(__DEV__ ? "password123" : "");

  const handleLogin = () => {
    if (!merchantEmail.trim() || !merchantPassword.trim()) {
      Alert.alert("Credentials Required", "Please enter your Store Admin email and password.");
      return;
    }

    router.replace("/(mobile)/merchant");
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
          <Text className="text-base font-black text-gray-900">Store Partner Login</Text>
          <Text className="text-xs text-orange-600 font-bold">Kitchen Operations</Text>
        </View>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-6"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-orange-100 rounded-3xl items-center justify-center mb-3">
              <Text className="text-3xl">🏪</Text>
            </View>
            <Text className="text-xl font-black text-gray-900 text-center mb-1">
              Store Merchant Portal
            </Text>
            <Text className="text-xs text-gray-500 text-center max-w-xs leading-relaxed">
              Enter your Store Admin credentials to open kitchen operations, manage incoming orders, and handle table bookings in Mati City.
            </Text>
          </View>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Store Email *</Text>
              <TextInput
                placeholder="e.g. lette@karenderia.com"
                value={merchantEmail}
                onChangeText={setMerchantEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Password *</Text>
              <TextInput
                placeholder="••••••••"
                value={merchantPassword}
                onChangeText={setMerchantPassword}
                secureTextEntry
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            className="w-full py-3.5 bg-orange-500 rounded-xl items-center shadow-md mb-4"
          >
            <Text className="text-white font-bold text-sm">Verify & Enter Kitchen Mode</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(mobile)/auth/merchant-register")}
            className="py-3 items-center"
          >
            <Text className="text-xs text-orange-600 font-bold">
              Don't have a store account? Register here →
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
