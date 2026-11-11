import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Redirect } from "expo-router";
import LandingPage from "../components/portal/LandingPage";
import { useSession } from "../context/SessionContext";
import { isExclusiveCustomerIdentity } from "../services/auth";

function hasBrowserSessionHint(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && /^sb-.*-auth-token/i.test(key)) {
        const raw = window.localStorage.getItem(key);
        if (raw && raw.includes("access_token")) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export default function Index() {
  const { status, identity } = useSession("customer");

  // Native mobile app launches directly into customer restaurant discovery.
  if (Platform.OS !== "web") {
    return <Redirect href="/(mobile)/(tabs)/discover" />;
  }

  // Authenticated exclusive customers cannot linger on the guest Landing Page
  // and are routed straight into customer discovery; partner/admin sessions stay isolated.
  if (status === "authenticated" && isExclusiveCustomerIdentity(identity)) {
    return <Redirect href="/(mobile)/(tabs)/discover" />;
  }

  // Wait for session verification only if browser storage actually holds an active token.
  // Signed-out visitors render LandingPage immediately with zero loading-spinner delay.
  if (status === "loading" && hasBrowserSessionHint()) {
    return (
      <View className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#EA5410" />
      </View>
    );
  }

  // Signed-out visitors see the public Mati FoodFinder Landing Page directly at '/'.
  return <LandingPage />;
}
