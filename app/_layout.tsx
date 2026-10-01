import "react-native-reanimated";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { Slot } from "expo-router";
import { View, LogBox } from "react-native";
import "../global.css";
import "../lib/crypto-polyfill";
import { AuthProvider } from "../context/AuthContext";

// Disable Reanimated strict mode warning (recommended by Reanimated docs for NativeWind / UI animation libraries)
try {
  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false,
  });
} catch {
  // Graceful fallback for older versions
}

// Suppress known non-breaking development warning banners from blocking the screen
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <AuthProvider>
      <View className="flex-1 bg-white">
        <Slot />
      </View>
    </AuthProvider>
  );
}
