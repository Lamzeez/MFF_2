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

export default function RiderLoginScreen() {
  const router = useRouter();

  const [riderId, setRiderId] = useState(__DEV__ ? "R-402" : "");
  const [riderPin, setRiderPin] = useState(__DEV__ ? "1234" : "");

  const handleLogin = () => {
    if (!riderId.trim() || !riderPin.trim()) {
      Alert.alert("Credentials Required", "Please enter your Rider ID / Phone and PIN.");
      return;
    }

    router.replace("/(mobile)/rider");
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
          <Text className="text-base font-black text-gray-900">Delivery Rider Login</Text>
          <Text className="text-xs text-sky-700 font-bold">Mati City Express Dispatch</Text>
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
            <View className="w-16 h-16 bg-sky-100 rounded-3xl items-center justify-center mb-3">
              <Text className="text-3xl">🛵</Text>
            </View>
            <Text className="text-xl font-black text-gray-900 text-center mb-1">
              Rider Dispatch Portal
            </Text>
            <Text className="text-xs text-gray-500 text-center max-w-xs leading-relaxed">
              Enter your Rider ID / Phone and PIN to start receiving Cash-on-Delivery delivery requests across Mati City.
            </Text>
          </View>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Rider ID / Phone *</Text>
              <TextInput
                placeholder="e.g. R-402 or 0917-xxx-xxxx"
                value={riderId}
                onChangeText={setRiderId}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Security PIN *</Text>
              <TextInput
                placeholder="••••"
                value={riderPin}
                onChangeText={setRiderPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            className="w-full py-3.5 bg-sky-600 rounded-xl items-center shadow-md mb-4"
          >
            <Text className="text-white font-bold text-sm">Verify & Enter Rider Mode</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(mobile)/auth/rider-register")}
            className="py-3 items-center"
          >
            <Text className="text-xs text-sky-700 font-bold">
              New rider in Mati? Apply to deliver here →
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
