import { Slot, Link, usePathname } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StoreAdminLayout() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/(web)/dashboard" },
    { label: "Menu Manager", href: "/(web)/dashboard/menu" },
    { label: "Store Profile", href: "/(web)/dashboard/profile" },
    { label: "Billing & Subscriptions", href: "/(web)/dashboard/billing" },
  ];

  return (
    <View className="flex-1 flex-row bg-gray-50 h-screen w-full">
      {/* Sidebar Navigation */}
      <View className="w-64 bg-white border-r border-gray-200 h-full flex-col hidden md:flex">
        <View className="p-6 border-b border-gray-100 mb-6">
          <Text className="text-gray-900 text-2xl font-extrabold tracking-tight">MFF Merchant</Text>
          <Text className="text-orange-500 text-sm mt-1 font-bold">Karenderia Portal</Text>
        </View>

        <ScrollView className="flex-1 px-4">
          <View className="gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.label} href={item.href as any} asChild>
                  <Pressable 
                    className={`px-4 py-3 rounded-xl flex-row items-center transition-colors ${
                      isActive ? "bg-orange-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Text className={`font-semibold ${isActive ? "text-orange-600" : "text-gray-600"}`}>
                      {item.label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-4 border-t border-gray-100">
          <Link href="/(web)/portal" asChild>
            <Pressable className="px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors">
              <Text className="text-gray-600 font-semibold">Sign Out</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 h-screen overflow-hidden">
        {/* Mobile Header */}
        <View className="md:hidden bg-white px-6 py-4 flex-row justify-between items-center z-20 border-b border-gray-200">
          <Text className="text-gray-900 font-bold text-lg">MFF Merchant</Text>
          <Link href="/(web)/portal" asChild>
            <Pressable><Text className="text-gray-500">Exit</Text></Pressable>
          </Link>
        </View>

        {/* Dynamic Route Content */}
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
          <SafeAreaView className="flex-1" edges={['top']}>
            <Slot />
          </SafeAreaView>
        </ScrollView>
      </View>
    </View>
  );
}
