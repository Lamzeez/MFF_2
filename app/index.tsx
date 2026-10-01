import { Redirect } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { isMobileDevice } from "../lib/platform-policy";

export default function Index() {
  const { width } = useWindowDimensions();

  // If on native mobile device (iOS/Android) or mobile-emulation view (< 768px in F12)
  if (Platform.OS !== "web" || isMobileDevice(width)) {
    return <Redirect href="/(mobile)/(tabs)" />;
  }

  // Desktop web browser workstation (width >= 768px)
  return <Redirect href="/portal" />;
}
