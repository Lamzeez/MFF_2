import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../../../context/SessionContext";

/**
 * Legacy `/auth/merchant-login` route consolidated into the unified Store Admin login (`/(web)/auth/store-login`).
 */
export default function ConsolidatedMerchantLoginRedirect() {
  const { status, identity } = useSession("merchant");

  if (status === "loading") {
    return (
      <View className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#EA5410" />
      </View>
    );
  }

  if (status === "authenticated" && identity?.roles.includes("merchant")) {
    return <Redirect href="/(web)/dashboard" />;
  }

  return <Redirect href="/(web)/auth/store-login" />;
}
