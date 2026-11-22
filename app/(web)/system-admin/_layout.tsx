import React, { useState } from "react";
import { Slot, Link, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SystemAdminGate from "../../../components/admin/SystemAdminGate";
import { useSession } from "../../../context/SessionContext";
import { hasAdminApplicationRole } from "../../../services/auth";
import { isAdminNavItemActive } from "../../../lib/admin-report";
import { canAccessSystemAdmin } from "../../../lib/platform-policy";
import { LogoutConfirmModal } from "../../../components/ui/LogoutConfirmModal";
import { ActionSuccessModal } from "../../../components/ui/ActionSuccessModal";

const ADMIN_NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/(web)/system-admin",
    icon: "grid-outline" as const,
    activeIcon: "grid" as const,
  },
  {
    label: "Store Approvals",
    href: "/(web)/system-admin/approvals",
    icon: "checkmark-done-circle-outline" as const,
    activeIcon: "checkmark-done-circle" as const,
  },
  {
    label: "Users",
    href: "/(web)/system-admin/users",
    icon: "people-outline" as const,
    activeIcon: "people" as const,
  },
  {
    label: "Moderation",
    href: "/(web)/system-admin/moderation",
    icon: "shield-outline" as const,
    activeIcon: "shield" as const,
  },
  {
    label: "Analytics",
    href: "/(web)/system-admin/metrics",
    icon: "bar-chart-outline" as const,
    activeIcon: "bar-chart" as const,
  },
] as const;

export default function SystemAdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, identity, logoutToGuest } = useSession("admin");
  const { width } = useWindowDimensions();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState<boolean>(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState<boolean>(false);
  const [signingOut, setSigningOut] = useState<boolean>(false);

  const handleConfirmSignOut = () => {
    setShowLogoutConfirm(false);
    setShowLogoutSuccess(true);
  };

  const handleLogoutSuccessClose = async () => {
    setShowLogoutSuccess(false);
    setSigningOut(true);
    try {
      await logoutToGuest();
    } finally {
      setSigningOut(false);
      router.replace("/");
    }
  };

  // System Admin console is restricted to desktop viewports.
  if (!canAccessSystemAdmin(width)) {
    return (
      <SafeAreaView className="flex-1 bg-[#0B0F17] items-center justify-center p-5">
        <View className="max-w-sm w-full bg-[#111827] border border-gray-800 rounded-2xl p-6 items-center text-center shadow-2xl">
          <View className="w-12 h-12 bg-[#EA5410]/20 rounded-xl items-center justify-center mb-4 border border-[#EA5410]/30">
            <Ionicons name="desktop-outline" size={24} color="#EA5410" />
          </View>
          <Text className="text-white text-lg font-bold text-center mb-1.5">
            Desktop Required
          </Text>
          <Text className="text-gray-400 text-xs text-center leading-relaxed mb-5">
            The admin console is available on desktop browsers only.
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            className="w-full bg-[#EA5410] py-2.5 rounded-xl items-center active:opacity-90"
          >
            <Text className="text-white font-bold text-xs">Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "loading") {
    return (
      <View className="flex-1 bg-[#141413] items-center justify-center p-6">
        <ActivityIndicator size="large" color="#EA5410" />
      </View>
    );
  }

  const isAdminUnlocked =
    status === "authenticated" && !!identity && hasAdminApplicationRole(identity.roles);

  if (!isAdminUnlocked) {
    return (
      <SystemAdminGate
        onLoginSuccess={() => {
          setShowLoginSuccess(true);
        }}
      />
    );
  }

  return (
    <View className="flex-1 flex-row bg-[#F8FAFC] h-screen w-full">
      {/* Sidebar Navigation */}
      <View className="w-56 lg:w-60 bg-[#0B0F17] h-full flex-col justify-between hidden md:flex border-r border-gray-900 shadow-xl z-20">
        <View>
          {/* Header */}
          <View className="p-4 border-b border-gray-800/80 flex-row items-center gap-2.5">
            <View className="w-8 h-8 bg-[#EA5410] rounded-xl items-center justify-center shadow-sm">
              <Ionicons name="shield-checkmark" size={16} color="white" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-white text-sm font-bold tracking-tight leading-tight">
                Mati FoodFinder
              </Text>
              <Text className="text-gray-400 text-[11px] font-medium mt-0.5">
                Administrator
              </Text>
            </View>
          </View>

          {/* Nav Items */}
          <ScrollView className="px-3 py-4">
            <View className="gap-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = isAdminNavItemActive(pathname, item.href);
                return (
                  <Link key={item.label} href={item.href as any} asChild>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      className={`px-3 py-2.5 rounded-lg flex-row items-center gap-2.5 border transition-colors ${
                        isActive
                          ? "bg-[#1B2230] border-white/10"
                          : "border-transparent hover:bg-white/[0.04] active:bg-white/[0.08]"
                      }`}
                    >
                      <Ionicons
                        name={isActive ? item.activeIcon : item.icon}
                        size={15}
                        color={isActive ? "#FB923C" : "#6B7280"}
                      />
                      <Text
                        className={`text-xs ${
                          isActive ? "text-white font-semibold" : "text-gray-400 font-medium"
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
        <View className="p-3 border-t border-gray-800/80 bg-[#070A0F]">
          <View className="flex-row items-center gap-2.5 mb-2 p-2 rounded-lg bg-[#111827] border border-gray-800">
            <View className="w-7 h-7 rounded-md bg-orange-500/20 items-center justify-center">
              <Ionicons name="person-outline" size={13} color="#EA5410" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[11px] font-bold text-white" numberOfLines={1}>
                {identity?.profile.display_name || "Administrator"}
              </Text>
              {identity?.email ? (
                <Text className="text-[10px] text-gray-400 font-medium" numberOfLines={1}>
                  {identity.email}
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={() => setShowLogoutConfirm(true)}
            className="px-3 py-2 rounded-lg hover:bg-red-500/10 flex-row items-center justify-center gap-1.5 border border-transparent hover:border-red-500/20 transition-colors"
          >
            <Ionicons name="log-out-outline" size={14} color="#F87171" />
            <Text className="text-red-400 font-semibold text-xs">Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 min-w-0 h-screen overflow-hidden flex-col">
        {/* Compact Header */}
        <View className="md:hidden bg-[#0B0F17] px-4 py-2.5 flex-row justify-between items-center z-20 shadow-md">
          <View className="flex-row items-center gap-2">
            <View className="w-7 h-7 rounded-lg bg-[#EA5410] items-center justify-center">
              <Ionicons name="shield-checkmark" size={14} color="white" />
            </View>
            <Text className="text-white font-bold text-sm">Admin</Text>
          </View>
          <Pressable onPress={() => setShowLogoutConfirm(true)} className="px-2.5 py-1 bg-gray-900 rounded-lg">
            <Text className="text-red-400 text-[11px] font-bold">Sign Out</Text>
          </Pressable>
        </View>

        {/* Dynamic Route Content */}
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
          <SafeAreaView className="flex-1" edges={["top"]}>
            <Slot />
          </SafeAreaView>
        </ScrollView>
      </View>

      {/* Admin Logout Confirmation Modal */}
      <LogoutConfirmModal
        visible={showLogoutConfirm}
        isSigningOut={signingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmSignOut}
      />

      {/* Admin Logout Success Modal */}
      <ActionSuccessModal
        visible={showLogoutSuccess}
        title="Signed Out"
        message="You have safely signed out of System Administration."
        buttonLabel="Continue"
        autoCloseMs={1500}
        onClose={handleLogoutSuccessClose}
      />

      {/* Admin Login Success Modal */}
      <ActionSuccessModal
        visible={showLoginSuccess}
        title="Admin Access Verified"
        message="Welcome to Mati FoodFinder System Administration."
        buttonLabel="Open Console"
        autoCloseMs={1500}
        onClose={() => setShowLoginSuccess(false)}
      />
    </View>
  );
}
