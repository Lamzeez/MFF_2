import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { getSupabaseClient } from "../../../lib/supabase/client";

export default function StoreLogin() {
  const router = useRouter();
  const { signIn, logoutToGuest } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Enter your store merchant email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
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
        setErrorMessage("This account does not have an active store merchant role.");
        return;
      }

      router.replace("/(web)/dashboard");
    } catch (err: any) {
      const msg = authMessage(err);
      setErrorMessage(err.message && !err.code ? err.message : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC] items-center justify-center p-6">
      <View className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-200/80">
        {/* Back Link */}
        <Link href="/portal" asChild>
          <Pressable className="flex-row items-center gap-1.5 mb-6 self-start opacity-70 hover:opacity-100 transition-opacity">
            <Ionicons name="arrow-back" size={16} color="#4B5563" />
            <Text className="text-xs font-bold text-gray-600">Back to Portal</Text>
          </Pressable>
        </Link>

        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-[#EA5410]/10 rounded-2xl items-center justify-center mb-4 border border-[#EA5410]/20">
            <Text className="text-3xl">🏪</Text>
          </View>
          <Text className="text-2xl font-black text-gray-900 tracking-tight">Store Merchant Login</Text>
          <Text className="text-gray-500 text-center text-xs mt-2 leading-relaxed">
            Manage your Mati City Karenderia or Restaurant menu, live availability, and table bookings.
          </Text>
        </View>

        {errorMessage ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2">
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text className="text-red-700 text-xs font-semibold flex-1">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="gap-4">
          <View>
            <Text className="text-xs font-bold text-gray-700 mb-1.5 ml-1">Store Admin Email</Text>
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5 z-10">
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
              </View>
              <TextInput
                placeholder="e.g. merchant.letty@mati-foodfinder.com"
                value={email}
                onChangeText={setEmail}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white transition-colors"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-700 mb-1.5 ml-1">Password</Text>
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5 z-10">
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
              </View>
              <TextInput
                placeholder="••••••••••••"
                value={password}
                onChangeText={setPassword}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white transition-colors"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 z-10"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6B7280"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            className="w-full bg-[#EA5410] py-4 rounded-2xl items-center shadow-sm hover:bg-[#D04508] transition-colors mt-2"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-extrabold text-sm tracking-wide">
                Sign In to Store Dashboard
              </Text>
            )}
          </Pressable>
        </View>


        <View className="flex-row justify-center mt-6 gap-1">
          <Text className="text-xs text-gray-500">Need to partner your restaurant?</Text>
          <Link href="/(web)/auth/store-register" asChild>
            <Pressable>
              <Text className="text-xs text-[#EA5410] font-bold hover:underline">Register store here</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
