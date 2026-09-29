import React, { useState } from "react";
import { Slot, Link, usePathname } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SystemAdminGate from "./gate";

export default function SystemAdminLayout() {
  const pathname = usePathname();
  // Temporary frontend-only gate until Supabase Auth lands (see gate.tsx).
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  if (!isAdminUnlocked) {
    return <SystemAdminGate onUnlock={() => setIsAdminUnlocked(true)} />;
  }

  const navItems = [
    { label: "Dashboard", href: "/(web)/system-admin" },
    { label: "Store Approvals", href: "/(web)/system-admin/approvals" },
    { label: "User Management", href: "/(web)/system-admin/users" },
    { label: "Social Moderation", href: "/(web)/system-admin/moderation" },
    { label: "Platform Metrics", href: "/(web)/system-admin/metrics" },
  ];

  return (
    <View className="flex-1 flex-row bg-gray-50 h-screen w-full">
      {/* Sidebar Navigation */}
      <View className="w-64 bg-green-900 h-full flex-col shadow-xl z-20 hidden md:flex">
        <View className="p-6 border-b border-green-800 mb-6">
          <Text className="text-white text-2xl font-extrabold tracking-tight">MFF Admin</Text>
          <Text className="text-green-300 text-sm mt-1">System Portal</Text>
        </View>

        <ScrollView className="flex-1 px-4">
          <View className="gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.label} href={item.href as any} asChild>
                  <Pressable 
                    className={`px-4 py-3 rounded-xl flex-row items-center transition-colors ${
                      isActive ? "bg-green-800" : "hover:bg-green-800/50"
                    }`}
                  >
                    <Text className={`font-semibold ${isActive ? "text-white" : "text-green-100"}`}>
                      {item.label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-4 border-t border-green-800">
          <Pressable
            className="px-4 py-3 rounded-xl hover:bg-red-500/20 transition-colors"
            onPress={() => setIsAdminUnlocked(false)}
          >
            <Text className="text-red-300 font-semibold">Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 h-screen overflow-hidden">
        {/* Mobile Header (Only visible on small screens) */}
        <View className="md:hidden bg-green-900 px-6 py-4 flex-row justify-between items-center z-20 shadow-md">
          <Text className="text-white font-bold text-lg">MFF Admin</Text>
          <Link href="/(web)/portal" asChild>
            <Pressable><Text className="text-red-300">Exit</Text></Pressable>
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
