import { Redirect } from "expo-router";

export default function MobileIndexRedirect() {
  return <Redirect href="/(mobile)/(tabs)" />;
}
