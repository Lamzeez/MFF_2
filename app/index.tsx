import { Redirect } from "expo-router";
import { Platform } from "react-native";

export default function Index() {
  // Direct entry points to mobile portal so web preview and mobile app both load the mobile UI
  return <Redirect href="/(mobile)/portal" />;
}
