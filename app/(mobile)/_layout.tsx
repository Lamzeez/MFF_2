import { Stack, Redirect } from "expo-router";
import { Platform } from "react-native";

export default function MobileGroupRootLayout() {
  // If someone attempts to access mobile-exclusive routes on a web browser, redirect them to the web portal
  if (Platform.OS === "web") {
    return <Redirect href="/(web)/portal" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="merchant/index" options={{ headerShown: false }} />
      <Stack.Screen name="rider/index" options={{ headerShown: false }} />
    </Stack>
  );
}
