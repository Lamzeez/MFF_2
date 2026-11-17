import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { fetchMerchantMembershipStatus } from "../../../services/merchant-registration";

const merchantBackdrop = require("../../../assets/merchant-bg.jpg");
const mffLogo = require("../../../assets/logo.jpg");

export default function StoreLogin() {
  const router = useRouter();
  const { status, identity, signIn, logoutToGuest } = useSession("merchant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectHref, setRedirectHref] = useState<
    "/(web)/dashboard" | "/(web)/auth/verification" | null
  >(null);

  useEffect(() => {
    let active = true;
    if (status !== "authenticated" || !identity?.roles.includes("merchant")) {
      setRedirectHref(null);
      return;
    }

    fetchMerchantMembershipStatus(identity.id)
      .then((membership) => {
        if (!active) return;
        if (!membership.hasMembership) {
          setRedirectHref(null);
          return;
        }
        if (membership.isSuspended) {
          void logoutToGuest();
          setErrorMessage(
            "This store is currently suspended due to policy review. Contact platform support."
          );
          setRedirectHref(null);
        } else if (membership.approvalStatus === "pending") {
          setRedirectHref("/(web)/auth/verification");
        } else if (membership.approvalStatus === "rejected") {
          void logoutToGuest();
          setErrorMessage("Your store application was declined. Contact support for assistance.");
          setRedirectHref(null);
        } else {
          setRedirectHref("/(web)/dashboard");
        }
      })
      .catch(() => {
        if (active) setRedirectHref(null);
      });

    return () => {
      active = false;
    };
  }, [status, identity?.id, identity?.roles, logoutToGuest]);

  if (redirectHref) {
    return <Redirect href={redirectHref} />;
  }

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Enter your merchant email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      const client = getSupabaseClient("merchant");
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Authentication failed.");

      const membership = await fetchMerchantMembershipStatus(user.id);
      if (!membership.hasMembership) {
        await logoutToGuest();
        setErrorMessage("This account does not have an active store merchant role.");
        return;
      }

      if (membership.isSuspended) {
        await logoutToGuest();
        setErrorMessage(
          "This store is currently suspended due to policy review. Contact platform support."
        );
        return;
      }

      if (membership.approvalStatus === "pending") {
        router.replace("/(web)/auth/verification");
        return;
      }

      if (membership.approvalStatus === "rejected") {
        await logoutToGuest();
        setErrorMessage("Your store application was declined. Contact support for assistance.");
        return;
      }

      router.replace("/(web)/dashboard");
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
      setErrorMessage(errMessage && !hasCode ? errMessage : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 w-full max-w-[1160px] self-center px-5 sm:px-6 lg:px-8 py-5 md:py-6 flex-col md:flex-row gap-6 lg:gap-10 items-stretch">
          {/* Left Column: Top-Left Back + Compact Light Login Card */}
          <View className="w-full md:w-[320px] lg:w-[350px] shrink-0 flex-col justify-between">
            {/* Top-Left Back to Home + Brand Mark */}
            <View className="flex-row items-center justify-between gap-2">
              <Link href="/" asChild>
                <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs">
                  <Ionicons name="arrow-back" size={12} color="#374151" />
                  <Text className="text-[11px] font-semibold text-gray-700">Back to Home</Text>
                </Pressable>
              </Link>

              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg bg-white border border-gray-200 p-0.5 items-center justify-center overflow-hidden shadow-2xs">
                  <Image
                    source={mffLogo}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                    resizeMode="contain"
                    accessibilityLabel="Mati FoodFinder logo"
                  />
                </View>
                <Text className="text-gray-900 text-xs font-bold tracking-tight">
                  Mati FoodFinder
                </Text>
              </View>
            </View>

            {/* Centered Auth Section */}
            <View className="flex-1 justify-center items-center py-6">
              <View className="w-full max-w-[320px]">
                <View className="mb-5 items-center">
                  <Text className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight text-center">
                    Merchant Portal
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1 text-center leading-relaxed">
                    Sign in to manage your kitchen menu, orders, and reservations.
                  </Text>
                </View>

                <View className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm">
                  {errorMessage ? (
                    <View
                      accessibilityRole="alert"
                      className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex-row items-center gap-2"
                    >
                      <Ionicons name="alert-circle" size={15} color="#DC2626" />
                      <Text className="text-red-700 text-[11px] font-semibold flex-1 leading-snug">
                        {errorMessage}
                      </Text>
                    </View>
                  ) : null}

                  <View className="gap-3.5">
                    <View>
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Email
                      </Text>
                      <View className="relative flex-row items-center">
                        <View className="absolute left-3 z-10">
                          <Ionicons name="mail-outline" size={15} color="#9CA3AF" />
                        </View>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="merchant@example.com"
                          accessibilityLabel="Store merchant email"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                        />
                      </View>
                    </View>

                    <View>
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Password
                      </Text>
                      <View className="relative flex-row items-center">
                        <View className="absolute left-3 z-10">
                          <Ionicons name="lock-closed-outline" size={15} color="#9CA3AF" />
                        </View>
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="••••••••••••"
                          accessibilityLabel="Store merchant password"
                          secureTextEntry={!showPassword}
                          onSubmitEditing={handleSignIn}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-10 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                          placeholderTextColor="#9CA3AF"
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
                            color="#6B7280"
                          />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Log in to Merchant Portal"
                      onPress={handleSignIn}
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

                  <View className="flex-row flex-wrap justify-center mt-4 pt-3.5 border-t border-gray-100 gap-1">
                    <Text className="text-[11px] text-gray-500">New partner store?</Text>
                    <Link href="/(web)/auth/store-register" asChild>
                      <Pressable>
                        <Text className="text-[11px] text-[#EA5410] font-semibold hover:underline">
                          Register store
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                </View>
              </View>
            </View>

            <View className="h-3 hidden md:flex" />
          </View>

          {/* Right Column: Lively Mati Karenderia Showcase */}
          <View className="flex-1 min-h-[340px] md:min-h-[460px] relative rounded-2xl overflow-hidden border border-gray-200/80 bg-orange-50 shadow-md">
            <Image
              source={merchantBackdrop}
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
              accessibilityLabel="Lively Mati City karenderia kitchen and dining showcase"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
