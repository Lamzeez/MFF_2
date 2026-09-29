import { Stack, Redirect } from "expo-router";
import { Platform } from "react-native";

export default function MobileGroupRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="portal" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="merchant/index" options={{ headerShown: false }} />
      <Stack.Screen name="rider/index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/customer-register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/merchant-login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/merchant-register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/rider-login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/rider-register" options={{ headerShown: false }} />
    </Stack>
  );
}
