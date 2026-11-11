import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSession } from "../../context/SessionContext";
import { authMessage, hasAdminApplicationRole } from "../../services/auth";
import { getSupabaseClient } from "../../lib/supabase/client";

const adminBackdrop = require("../../assets/admin-bg.jpg");
const mffLogo = require("../../assets/logo.jpg");

export default function SystemAdminGate({
  onUnlock,
}: {
  onUnlock?: () => void;
}) {
  const { signIn, logoutToGuest } = useSession("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminAuth = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter your administrator email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      const client = getSupabaseClient("admin");
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Authentication failed.");

      const { data: roles, error: rolesError } = await client.rpc("get_my_application_roles");
      const hasAdminRole = !!roles && hasAdminApplicationRole(roles);

      if (rolesError || !hasAdminRole) {
        await logoutToGuest();
        setErrorMsg("Access Denied: This account does not have administrator permissions.");
        return;
      }

      onUnlock?.();
    } catch (err: unknown) {
      const msg = authMessage(err);
      const errMessage =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "";
      const hasCode = typeof err === "object" && err !== null && "code" in err;
      setErrorMsg(errMessage && !hasCode ? errMessage : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#141413]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 w-full max-w-[1160px] self-center px-5 sm:px-6 lg:px-8 py-5 md:py-6 flex-col md:flex-row gap-6 lg:gap-10 items-stretch">
          {/* Left Column: Brand Header & Compact Dark Login Card */}
          <View className="w-full md:w-[320px] lg:w-[350px] shrink-0 flex-col justify-between">
            {/* Top-Left Brand Mark */}
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg bg-white p-0.5 items-center justify-center overflow-hidden shadow-sm">
                <Image
                  source={mffLogo}
                  style={{ width: 22, height: 22, borderRadius: 4 }}
                  resizeMode="contain"
                  accessibilityLabel="Mati FoodFinder logo"
                />
              </View>
              <Text className="text-white text-sm font-bold tracking-tight">
                Mati FoodFinder
              </Text>
            </View>

            {/* Centered Auth Section */}
            <View className="flex-1 justify-center items-center py-6">
              <View className="w-full max-w-[320px]">
                <View className="mb-5 items-center">
                  <Text className="text-xl sm:text-2xl font-bold text-white tracking-tight text-center">
                    System Admin
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1 text-center leading-relaxed">
                    Sign in to access platform administration.
                  </Text>
                </View>

                <View className="bg-[#1B1C20] border border-white/10 rounded-xl p-5 shadow-xl">
                  {errorMsg && (
                    <View
                      accessibilityRole="alert"
                      className="bg-red-950/60 border border-red-500/35 rounded-lg p-3 mb-4 flex-row items-center gap-2"
                    >
                      <Ionicons name="alert-circle" size={15} color="#F87171" />
                      <Text className="text-red-200 text-[11px] font-semibold flex-1 leading-snug">
                        {errorMsg}
                      </Text>
                    </View>
                  )}

                  <View className="gap-3.5">
                    <View>
                      <Text className="text-[11px] font-semibold text-gray-300 mb-1 ml-0.5">
                        Email
                      </Text>
                      <View className="relative flex-row items-center">
                        <View className="absolute left-3 z-10">
                          <Ionicons name="mail-outline" size={15} color="#6B7280" />
                        </View>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="admin@example.com"
                          accessibilityLabel="Administrator email"
                          className="w-full bg-[#24262C] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#EA5410]"
                          placeholderTextColor="#6B7280"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                        />
                      </View>
                    </View>

                    <View>
                      <Text className="text-[11px] font-semibold text-gray-300 mb-1 ml-0.5">
                        Password
                      </Text>
                      <View className="relative flex-row items-center">
                        <View className="absolute left-3 z-10">
                          <Ionicons name="lock-closed-outline" size={15} color="#6B7280" />
                        </View>
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="••••••••••••"
                          accessibilityLabel="Administrator password"
                          secureTextEntry={!showPassword}
                          onSubmitEditing={handleAdminAuth}
                          className="w-full bg-[#24262C] border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-xs text-white focus:border-[#EA5410]"
                          placeholderTextColor="#6B7280"
                          autoComplete="password"
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                          onPress={() => setShowPassword(!showPassword)}
                          className="absolute right-3 z-10"
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={15}
                            color="#9CA3AF"
                          />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Log in to System Admin"
                      onPress={handleAdminAuth}
                      disabled={loading}
                      className="mt-1.5 bg-[#EA5410] rounded-lg py-2.5 items-center shadow-sm hover:bg-[#D04508] active:opacity-90 transition-colors"
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white font-bold text-xs tracking-wide">
                          Log In
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                <View className="items-center mt-4">
                  <Link href="/" asChild>
                    <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B1C20] border border-white/10 hover:bg-white/10 transition-colors">
                      <Ionicons name="arrow-back" size={12} color="#D1D5DB" />
                      <Text className="text-[11px] font-semibold text-gray-300">Back to Home</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>

            <View className="h-3 hidden md:flex" />
          </View>

          {/* Right Column: Wide Security Artwork Showcase */}
          <View className="flex-1 min-h-[340px] md:min-h-[460px] relative rounded-2xl overflow-hidden border border-white/10 bg-[#121316]">
            <Image
              source={adminBackdrop}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
              resizeMode="cover"
              accessibilityLabel="Mati FoodFinder security vault artwork"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
