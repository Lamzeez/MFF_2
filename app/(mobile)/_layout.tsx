import { Stack, Redirect, usePathname } from "expo-router";
import { useWindowDimensions } from "react-native";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../lib/platform-policy";

export default function MobileGroupRootLayout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  // Guard: In strict production mode, block desktop browsers from mobile-only screens.
  // In development, developers can test mobile screens freely via F12 responsive mode.
  if (
    ENFORCE_STRICT_PLATFORM_GUARDS &&
    isDesktopDevice(width) &&
    pathname &&
    pathname !== "/portal" &&
    !pathname.endsWith("/portal") &&
    pathname !== "/"
  ) {
    return <Redirect href="/portal" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="portal" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="merchant/index" options={{ headerShown: false }} />
      <Stack.Screen name="rider/index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/customer-register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/customer-login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/merchant-login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/merchant-register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/rider-login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/rider-register" options={{ headerShown: false }} />
    </Stack>
  );
}
