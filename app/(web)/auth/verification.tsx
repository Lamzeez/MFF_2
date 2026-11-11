import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import {
  fetchMerchantMembershipStatus,
  type MerchantMembershipSummary,
} from "../../../services/merchant-registration";

const mffLogo = require("../../../assets/logo.jpg");

export default function VerificationPending() {
  const router = useRouter();
  const { status, identity, logoutToGuest } = useSession("merchant");
  const [membership, setMembership] = useState<MerchantMembershipSummary | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    if (status !== "authenticated" || !identity?.id) return;
    setChecking(true);
    try {
      const next = await fetchMerchantMembershipStatus(identity.id);
      setMembership(next);
      if (next.hasMembership && next.approvalStatus === "approved") {
        router.replace("/(web)/dashboard");
      }
    } catch {
      // Keep status screen visible cleanly
    } finally {
      setChecking(false);
    }
  }, [status, identity?.id, router]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const handleSignOut = async () => {
    await logoutToGuest();
    router.replace("/");
  };

  const isRejected = membership?.approvalStatus === "rejected";

  return (
    <View className="flex-1 bg-[#F8FAFC] items-center justify-center px-5 py-8">
      <View className="w-full max-w-[400px]">
        <View className="flex-row items-center justify-center gap-2 mb-6">
          <View className="w-7 h-7 rounded-lg bg-white border border-gray-200 p-0.5 items-center justify-center overflow-hidden shadow-2xs">
            <Image
              source={mffLogo}
              style={{ width: 22, height: 22, borderRadius: 4 }}
              resizeMode="contain"
              accessibilityLabel="Mati FoodFinder logo"
            />
          </View>
          <Text className="text-gray-900 text-sm font-bold tracking-tight">Mati FoodFinder</Text>
        </View>

        <View className="bg-white border border-gray-200/90 rounded-2xl p-6 items-center shadow-sm">
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center mb-4 border ${
              isRejected
                ? "bg-red-50 border-red-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <Ionicons
              name={isRejected ? "close-circle-outline" : "hourglass-outline"}
              size={24}
              color={isRejected ? "#DC2626" : "#EA5410"}
            />
          </View>

          <Text className="text-lg font-bold text-gray-900 text-center mb-1.5">
            {isRejected ? "Application Not Approved" : "Application Under Review"}
          </Text>

          {membership?.storeName ? (
            <View className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 mb-3">
              <Text className="text-[11px] font-semibold text-[#EA5410]">
                {membership.storeName}
              </Text>
            </View>
          ) : null}

          <Text className="text-gray-500 text-xs text-center leading-relaxed mb-5">
            {isRejected
              ? "Your store application was declined during review. Please contact platform support for details before reapplying."
              : "Your store details and verification photo have been submitted. An administrator will review your application before opening your merchant dashboard."}
          </Text>

          <View className="w-full gap-2.5">
            {status === "authenticated" && !isRejected ? (
              <Pressable
                onPress={checkStatus}
                disabled={checking}
                className="w-full bg-[#EA5410] py-2.5 rounded-lg items-center flex-row justify-center gap-1.5 hover:bg-[#D04508] transition-colors"
              >
                {checking ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={14} color="white" />
                    <Text className="text-white font-bold text-xs">Check Approval Status</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Link href="/(web)/auth/store-login" asChild>
                <Pressable className="w-full bg-[#EA5410] py-2.5 rounded-lg items-center hover:bg-[#D04508] transition-colors">
                  <Text className="text-white font-bold text-xs">Go to Merchant Portal</Text>
                </Pressable>
              </Link>
            )}

            {status === "authenticated" ? (
              <Pressable
                onPress={handleSignOut}
                className="w-full bg-gray-100 border border-gray-200 py-2.5 rounded-lg items-center hover:bg-gray-200/70 transition-colors"
              >
                <Text className="text-gray-700 font-semibold text-xs">Sign Out & Back to Home</Text>
              </Pressable>
            ) : (
              <Link href="/" asChild>
                <Pressable className="w-full bg-gray-100 border border-gray-200 py-2.5 rounded-lg items-center hover:bg-gray-200/70 transition-colors">
                  <Text className="text-gray-700 font-semibold text-xs">Back to Home</Text>
                </Pressable>
              </Link>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
