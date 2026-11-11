import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../../../context/SessionContext";

/**
 * Legacy `/merchant` route consolidated into the responsive Store Admin Dashboard (`/(web)/dashboard`).
 */
export default function ConsolidatedMerchantRedirect() {
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
