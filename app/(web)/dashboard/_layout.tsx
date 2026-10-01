import { Slot, Link, usePathname, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";

export default function StoreAdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { identity, logoutToGuest } = useSession();

  const navItems = [
    { label: "Overview", href: "/(web)/dashboard", icon: "grid-outline" as const },
    { label: "Menu Manager", href: "/(web)/dashboard/menu", icon: "restaurant-outline" as const },
    { label: "Store Profile", href: "/(web)/dashboard/profile", icon: "storefront-outline" as const },
    { label: "Billing & Plans", href: "/(web)/dashboard/billing", icon: "card-outline" as const },
  ];

  const handleSignOut = async () => {
    await logoutToGuest();
    router.replace("/portal");
  };

  return (
    <View className="flex-1 flex-row bg-[#F8FAFC] h-screen w-full">
      {/* Sidebar Navigation (Desktop) */}
      <View className="w-72 bg-white border-r border-gray-200/90 h-full flex-col justify-between hidden md:flex shadow-xs">
        <View>
          {/* Logo & Store Branding */}
          <View className="p-6 border-b border-gray-100 flex-row items-center gap-3">
            <View className="w-11 h-11 bg-[#EA5410]/10 rounded-2xl items-center justify-center border border-[#EA5410]/20">
              <Ionicons name="storefront" size={22} color="#EA5410" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 text-lg font-black tracking-tight leading-tight">MFF Merchant</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-[#EA5410] text-[11px] font-extrabold uppercase tracking-wider">Mati City</Text>
              </View>
            </View>
          </View>

          {/* Navigation Links */}
          <ScrollView className="px-4 py-5">
            <Text className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
              KITCHEN OPERATIONS
            </Text>
            <View className="gap-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.label} href={item.href as any} asChild>
                    <Pressable
                      className={`px-4 py-3 rounded-2xl flex-row items-center gap-3 transition-colors ${
                        isActive
                          ? "bg-[#EA5410] shadow-sm"
                          : "hover:bg-gray-100/80 active:bg-gray-200"
                      }`}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={isActive ? "white" : "#4B5563"}
                      />
                      <Text
                        className={`text-xs font-extrabold ${
                          isActive ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Footer Account Card */}
        <View className="p-4 border-t border-gray-100 bg-gray-50/50">
          <View className="flex-row items-center gap-3 mb-3 p-2 rounded-xl bg-white border border-gray-200/80 shadow-2xs">
            <View className="w-9 h-9 rounded-xl bg-[#111827] items-center justify-center">
              <Ionicons name="person" size={16} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                {identity?.profile.display_name || "Store Admin"}
              </Text>
              <Text className="text-[10px] text-gray-400 font-medium" numberOfLines={1}>
                {identity?.email || "merchant@mati-foodfinder.com"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleSignOut}
            className="px-4 py-2.5 rounded-xl hover:bg-red-50 flex-row items-center justify-center gap-2 border border-transparent hover:border-red-100 transition-colors"
          >
            <Ionicons name="log-out-outline" size={16} color="#DC2626" />
            <Text className="text-red-600 font-bold text-xs">Sign Out to Portal</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 h-screen overflow-hidden flex-col">
        {/* Mobile Header (Only visible on small screens) */}
        <View className="md:hidden bg-white px-5 py-3.5 flex-row justify-between items-center z-20 border-b border-gray-200 shadow-xs">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-lg bg-[#EA5410]/10 items-center justify-center">
              <Ionicons name="storefront" size={16} color="#EA5410" />
            </View>
            <Text className="text-gray-900 font-black text-base">MFF Merchant</Text>
          </View>
          <Pressable onPress={handleSignOut} className="px-3 py-1.5 bg-gray-100 rounded-lg">
            <Text className="text-gray-600 text-xs font-bold">Sign Out</Text>
          </Pressable>
        </View>

        {/* Dynamic Route Content */}
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
          <SafeAreaView className="flex-1" edges={["top"]}>
            <Slot />
          </SafeAreaView>
        </ScrollView>
      </View>
    </View>
  );
}
