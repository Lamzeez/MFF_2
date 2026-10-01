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
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Redirect } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";

export default function MerchantLoginScreen() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/(web)/auth/store-login" />;
  }

  const router = useRouter();
  const { signIn, logoutToGuest } = useSession();

  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantPassword, setMerchantPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!merchantEmail.trim() || !merchantPassword.trim()) {
      Alert.alert("Credentials Required", "Please enter your Store Admin email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(merchantEmail.trim(), merchantPassword);
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Authentication failed.");

      const { data: memberships, error: memError } = await client
        .from("store_memberships")
        .select("role, store_id, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (memError || !memberships || memberships.length === 0) {
        await logoutToGuest();
        Alert.alert(
          "Merchant Access Denied",
          "This account is not registered as an active store merchant in Mati FoodFinder. Please register your store or use customer sign-in."
        );
        return;
      }

      router.replace("/(mobile)/merchant");
    } catch (err: any) {
      const msg = authMessage(err);
      Alert.alert("Sign In Failed", err.message && !err.code ? err.message : msg);
    } finally {
      setLoading(false);
    }
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
                placeholder="e.g. merchant.letty@mati-foodfinder.com"
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
              <View className="relative flex-row items-center">
                <TextInput
                  placeholder="••••••••"
                  value={merchantPassword}
                  onChangeText={setMerchantPassword}
                  secureTextEntry={!showPassword}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-3.5 pr-11 py-3 text-sm text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                  className="absolute right-3.5 z-10"
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-orange-500 rounded-xl items-center shadow-md mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">Verify & Enter Kitchen Mode</Text>
            )}
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
