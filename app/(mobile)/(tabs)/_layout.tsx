import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function MobileTabsLayout() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="text-3xl font-bold text-gray-900 mb-4">MFF Mobile App</Text>
      <Text className="text-gray-500 mb-8 text-center max-w-sm">
        This route is specifically for the iOS and Android application.
        It contains the Food Feed, Map, Delivery queue, and the in-app Merchant Mode.
      </Text>
      <Link href="/(web)" className="text-emerald-600 font-bold">
        Wait, I'm on a web browser!
      </Link>
    </View>
  );
}
