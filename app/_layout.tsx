import "../lib/setup-animations";
import { Slot } from "expo-router";
import { View, LogBox } from "react-native";
import "../global.css";
import "../lib/crypto-polyfill";
import { AuthProvider } from "../context/AuthContext";
import { OfflineBanner } from "../components/ui/OfflineBanner";

// Suppress known non-breaking development warning banners from blocking the screen
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <AuthProvider>
      <View className="flex-1 bg-white">
        <OfflineBanner />
        <Slot />
      </View>
    </AuthProvider>
  );
}
