import React, { useState } from "react";
import { Slot, Link, usePathname, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SystemAdminGate from "./gate";
import { useSession } from "../../../context/SessionContext";
import { canAccessSystemAdmin } from "../../../lib/platform-policy";

export default function SystemAdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { identity, logoutToGuest } = useSession();
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const { width } = useWindowDimensions();

  // Strict Device Restriction: System Admin is ONLY accessible on computer workstations
  if (!canAccessSystemAdmin(width)) {
    return (
      <SafeAreaView className="flex-1 bg-[#0B0F17] items-center justify-center p-6">
        <View className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-3xl p-8 items-center text-center shadow-2xl">
          <View className="w-16 h-16 bg-[#EA5410]/20 rounded-2xl items-center justify-center mb-5 border border-[#EA5410]/30">
            <Ionicons name="desktop-outline" size={32} color="#EA5410" />
          </View>
          <Text className="text-white text-xl font-black text-center mb-2">
            Desktop Workstation Required
          </Text>
          <Text className="text-gray-400 text-sm text-center leading-relaxed mb-6">
            The Mati FoodFinder System Admin Console is strictly restricted to desktop computer workstations. Mobile access is blocked to protect platform security and system operations.
          </Text>
          <Pressable
            onPress={() => router.replace("/portal")}
            className="w-full bg-[#EA5410] py-3.5 rounded-2xl items-center active:opacity-90"
          >
            <Text className="text-white font-bold text-sm">Return to Public Portal</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdminUnlocked) {
    return <SystemAdminGate onUnlock={() => setIsAdminUnlocked(true)} />;
  }

  const navItems = [
    { label: "Dashboard", href: "/(web)/system-admin", icon: "grid-outline" as const },
    { label: "Store Approvals", href: "/(web)/system-admin/approvals", icon: "checkmark-done-circle-outline" as const },
    { label: "User Management", href: "/(web)/system-admin/users", icon: "people-outline" as const },
    { label: "Social Moderation", href: "/(web)/system-admin/moderation", icon: "shield-outline" as const },
    { label: "Platform Metrics", href: "/(web)/system-admin/metrics", icon: "bar-chart-outline" as const },
  ];

  const handleSignOut = async () => {
    setIsAdminUnlocked(false);
    await logoutToGuest();
    router.replace("/portal");
  };

  return (
    <View className="flex-1 flex-row bg-[#F8FAFC] h-screen w-full">
      {/* Sidebar Navigation (Executive Dark Charcoal #0B0F17) */}
      <View className="w-72 bg-[#0B0F17] h-full flex-col justify-between hidden md:flex border-r border-gray-900 shadow-xl z-20">
        <View>
          {/* Header */}
          <View className="p-6 border-b border-gray-800/80 flex-row items-center gap-3">
            <View className="w-11 h-11 bg-[#EA5410] rounded-2xl items-center justify-center shadow-sm">
              <Ionicons name="shield-checkmark" size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-black tracking-tight leading-tight">MFF Admin</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Superadmin</Text>
              </View>
            </View>
          </View>

          {/* Nav Items */}
          <ScrollView className="px-4 py-5">
            <Text className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
              PLATFORM CONTROLS
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
                          : "hover:bg-gray-900/60 active:bg-gray-800"
                      }`}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={isActive ? "white" : "#9CA3AF"}
                      />
                      <Text
                        className={`text-xs font-extrabold ${
                          isActive ? "text-white" : "text-gray-300"
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

        {/* Footer Admin Info */}
        <View className="p-4 border-t border-gray-800/80 bg-[#070A0F]">
          <View className="flex-row items-center gap-3 mb-3 p-2.5 rounded-xl bg-[#111827] border border-gray-800">
            <View className="w-8 h-8 rounded-lg bg-orange-500/20 items-center justify-center">
              <Ionicons name="key" size={14} color="#EA5410" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-white" numberOfLines={1}>
                {identity?.profile.display_name || "Platform Admin"}
              </Text>
              <Text className="text-[10px] text-gray-400 font-medium" numberOfLines={1}>
                {identity?.email || "admin@mati-foodfinder.com"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleSignOut}
            className="px-4 py-2.5 rounded-xl hover:bg-red-500/10 flex-row items-center justify-center gap-2 border border-transparent hover:border-red-500/20 transition-colors"
          >
            <Ionicons name="log-out-outline" size={16} color="#F87171" />
            <Text className="text-red-400 font-bold text-xs">Lock & Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 h-screen overflow-hidden flex-col">
        {/* Mobile Header (Only visible on small screens) */}
        <View className="md:hidden bg-[#0B0F17] px-5 py-3.5 flex-row justify-between items-center z-20 shadow-md">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-lg bg-[#EA5410] items-center justify-center">
              <Ionicons name="shield-checkmark" size={16} color="white" />
            </View>
            <Text className="text-white font-black text-base">MFF Admin</Text>
          </View>
          <Pressable onPress={handleSignOut} className="px-3 py-1.5 bg-gray-900 rounded-lg">
            <Text className="text-red-400 text-xs font-bold">Lock</Text>
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
