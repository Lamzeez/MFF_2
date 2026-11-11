import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Redirect } from "expo-router";
import LandingPage from "../../components/portal/LandingPage";
import { useSession } from "../../context/SessionContext";
import { isExclusiveCustomerIdentity } from "../../services/auth";

/**
 * Backwards-compatible portal route.
 * Canonical web landing URL is '/'; authenticated customers are always redirected to '/discover'.
 */
export default function PortalRoute() {
  const { status, identity } = useSession("customer");

  if (Platform.OS === "web") {
    return <Redirect href="/" />;
  }

  if (status === "loading") {
    return (
      <View className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#EA5410" />
      </View>
    );
  }

  if (status === "authenticated" && isExclusiveCustomerIdentity(identity)) {
    return <Redirect href="/(mobile)/(tabs)/discover" />;
  }

  return <LandingPage />;
}
