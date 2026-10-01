import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { getSupabaseClient } from "../../../lib/supabase/client";

export default function SystemAdminGate({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  const { signIn, logoutToGuest } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminAuth = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter your System Administrator email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Authentication failed.");

      // Verify platform admin role
      const { data: roles, error: rolesError } = await client.rpc("get_my_application_roles");
      const hasAdminRole = roles && (roles.includes("superadmin") || roles.includes("admin") || roles.includes("staff"));

      if (rolesError || !hasAdminRole) {
        await logoutToGuest();
        setErrorMsg("Access Denied: This account does not have Platform Administrator authorization.");
        return;
      }

      onUnlock();
    } catch (err: any) {
      const msg = authMessage(err);
      setErrorMsg(err.message && !err.code ? err.message : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-[#0B0F17] px-6">
      <View className="bg-white rounded-3xl p-8 md:p-10 w-full max-w-md shadow-2xl border border-gray-800/10">
        {/* Back Link */}
        <Link href="/portal" asChild>
          <Pressable className="flex-row items-center gap-1.5 mb-6 self-start opacity-70 hover:opacity-100 transition-opacity">
            <Ionicons name="arrow-back" size={16} color="#4B5563" />
            <Text className="text-xs font-bold text-gray-600">Back to Portal</Text>
          </Pressable>
        </Link>

        {/* Security Shield Icon */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-[#0B0F17] items-center justify-center mb-3 shadow-sm border border-gray-800">
            <Ionicons name="shield-checkmark" size={32} color="#EA5410" />
          </View>
          <Text className="text-2xl font-black text-gray-900 tracking-tight">System Admin Gate</Text>
          <Text className="text-gray-500 text-xs text-center mt-1.5">
            Protected area. Authenticate with platform superadmin credentials to proceed.
          </Text>
        </View>

        {/* Error Alert */}
        {errorMsg && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 flex-row items-center gap-2">
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text className="text-red-700 text-xs font-semibold flex-1 leading-snug">{errorMsg}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View className="gap-4">
          <View>
            <Text className="text-xs font-bold text-gray-700 mb-1.5 ml-1">Admin Email</Text>
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5 z-10">
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@mati-foodfinder.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white"
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
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                secureTextEntry={!showPassword}
                onSubmitEditing={handleAdminAuth}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white"
                placeholderTextColor="#9ca3af"
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
            onPress={handleAdminAuth}
            disabled={loading}
            className="mt-2 bg-[#EA5410] rounded-2xl py-3.5 items-center shadow-sm hover:bg-[#D04508] transition-colors"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-extrabold text-sm tracking-wide">
                Unlock Admin Dashboard
              </Text>
            )}
          </Pressable>
        </View>

      </View>
    </View>
  );
}
