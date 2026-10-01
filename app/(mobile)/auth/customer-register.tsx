import React from "react";
import { useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import { AccountScreen } from "../../../components/auth/AccountScreen";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";

export default function CustomerRegisterScreen() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/portal" />;
  }
  return <AccountScreen initialMode="register" />;
}
