import "react-native-reanimated";
import { Slot } from "expo-router";
import { View } from "react-native";
import "../global.css";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <View className="flex-1 bg-white">
        <Slot />
      </View>
    </AuthProvider>
  );
}
