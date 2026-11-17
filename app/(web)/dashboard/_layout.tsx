import { useEffect, useRef, useState } from "react";
import { Link, Redirect, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, Platform, View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { fetchMerchantMembershipStatus } from "../../../services/merchant-registration";
import { isAdminNavItemActive } from "../../../lib/admin-report";
import StoreDashboardOverview from "./index";
import MenuManager from "./menu";
import StoreProfile from "./profile";
import BillingView from "./billing";

const MERCHANT_NAV_ITEMS = [
  {
    label: "Overview",
    href: "/(web)/dashboard",
    icon: "grid-outline" as const,
    activeIcon: "grid" as const,
  },
  {
    label: "Menu Manager",
    href: "/(web)/dashboard/menu",
    icon: "restaurant-outline" as const,
    activeIcon: "restaurant" as const,
  },
  {
    label: "Store Profile",
    href: "/(web)/dashboard/profile",
    icon: "storefront-outline" as const,
    activeIcon: "storefront" as const,
  },
  {
    label: "Billing & Plans",
    href: "/(web)/dashboard/billing",
    icon: "card-outline" as const,
    activeIcon: "card" as const,
  },
] as const;

export default function StoreAdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, identity, logoutToGuest } = useSession("merchant");
  const checkedUserIdRef = useRef<string | null>(null);
  const [approvalGate, setApprovalGate] = useState<
    "checking" | "approved" | "pending" | "rejected" | "suspended"
  >("checking");

  const overviewScrollRef = useRef<ScrollView>(null);
  const menuScrollRef = useRef<ScrollView>(null);
  const profileScrollRef = useRef<ScrollView>(null);
  const billingScrollRef = useRef<ScrollView>(null);

  const activeTab: "overview" | "menu" | "profile" | "billing" = pathname.includes("/dashboard/menu")
    ? "menu"
    : pathname.includes("/dashboard/profile")
      ? "profile"
      : pathname.includes("/dashboard/billing")
        ? "billing"
        : "overview";

  const scrollToTabTop = (tab: "overview" | "menu" | "profile" | "billing") => {
    const scrollRef =
      tab === "overview"
        ? overviewScrollRef
        : tab === "menu"
          ? menuScrollRef
          : tab === "profile"
            ? profileScrollRef
            : billingScrollRef;

    try {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    } catch {}

    if (Platform.OS === "web") {
      try {
        const node =
          (scrollRef.current as any)?.getScrollableNode?.() ||
          (scrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() ||
          (scrollRef.current as any);
        if (node && typeof node.scrollTop === "number") {
          node.scrollTop = 0;
        }
      } catch {}

      try {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }
      } catch {}
    }
  };

  useEffect(() => {
    scrollToTabTop(activeTab);
    const timer = setTimeout(() => {
      scrollToTabTop(activeTab);
    }, 20);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const hasMerchantRole = Boolean(identity?.roles.includes("merchant"));
  const identityId = identity?.id ?? null;

  useEffect(() => {
    let active = true;
    if (status !== "authenticated" || !identityId || !hasMerchantRole) {
      checkedUserIdRef.current = null;
      return;
    }

    // Only show blocking check spinner on initial user resolution, not on background refreshes.
    if (checkedUserIdRef.current !== identityId) {
      setApprovalGate("checking");
    }

    fetchMerchantMembershipStatus(identityId)
      .then((membership) => {
        if (!active) return;
        checkedUserIdRef.current = identityId;
        if (membership.isSuspended) {
          setApprovalGate("suspended");
        } else if (!membership.hasMembership || membership.approvalStatus === "rejected") {
          setApprovalGate("rejected");
        } else if (membership.approvalStatus === "pending") {
          setApprovalGate("pending");
        } else {
          setApprovalGate("approved");
        }
      })
      .catch(() => {
        if (active) {
          checkedUserIdRef.current = identityId;
          setApprovalGate("approved");
        }
      });

    return () => {
      active = false;
    };
  }, [status, identityId, hasMerchantRole]);

  if (
    status === "loading" ||
    (status === "authenticated" &&
      hasMerchantRole &&
      approvalGate === "checking" &&
      checkedUserIdRef.current !== identityId)
  ) {
    return (
      <View className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#EA5410" />
      </View>
    );
  }

  if (status !== "authenticated" || !identity || !hasMerchantRole || approvalGate === "rejected") {
    return <Redirect href="/(web)/auth/store-login" />;
  }

  if (approvalGate === "pending" || approvalGate === "suspended") {
    return <Redirect href="/(web)/auth/verification" />;
  }

  const handleSignOut = async () => {
    await logoutToGuest();
    router.replace("/");
  };

  return (
    <View className="flex-1 flex-row bg-[#F8FAFC] h-screen w-full">
      {/* Sidebar Navigation (Desktop) — Lively Light Theme matching System Admin scale & pill highlight */}
      <View className="w-56 bg-white border-r border-gray-200/90 h-full flex-col justify-between hidden md:flex shadow-2xs">
        <View>
          {/* Logo & Store Branding */}
          <View className="p-4 border-b border-gray-100 flex-row items-center gap-2.5">
            <View className="w-8 h-8 bg-[#EA5410]/10 rounded-xl items-center justify-center border border-[#EA5410]/20">
              <Ionicons name="storefront" size={16} color="#EA5410" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-gray-900 text-sm font-bold tracking-tight leading-tight">
                Mati FoodFinder
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Text className="text-gray-400 text-[11px] font-medium">Merchant Portal</Text>
              </View>
            </View>
          </View>

          {/* Navigation Links */}
          <ScrollView className="px-3 py-4">
            <View className="gap-1">
              {MERCHANT_NAV_ITEMS.map((item) => {
                const isActive = isAdminNavItemActive(pathname, item.href);
                const targetTab: "overview" | "menu" | "profile" | "billing" = item.href.includes("/dashboard/menu")
                  ? "menu"
                  : item.href.includes("/dashboard/profile")
                    ? "profile"
                    : item.href.includes("/dashboard/billing")
                      ? "billing"
                      : "overview";
                return (
                  <Link key={item.label} href={item.href as any} asChild>
                    <Pressable
                      onPress={() => scrollToTabTop(targetTab)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      className={`px-3 py-2.5 rounded-lg flex-row items-center gap-2.5 border transition-colors ${
                        isActive
                          ? "bg-orange-50/90 border-orange-200/90"
                          : "border-transparent hover:bg-gray-100/70 active:bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name={isActive ? item.activeIcon : item.icon}
                        size={15}
                        color={isActive ? "#EA5410" : "#6B7280"}
                      />
                      <Text
                        className={`text-xs ${
                          isActive ? "text-gray-900 font-semibold" : "text-gray-500 font-medium"
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
        <View className="p-3 border-t border-gray-100 bg-gray-50/60">
          <View className="flex-row items-center gap-2.5 mb-2 p-2 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            <View className="w-7 h-7 rounded-md bg-orange-50 border border-orange-100 items-center justify-center">
              <Ionicons name="person-outline" size={13} color="#EA5410" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[11px] font-bold text-gray-900" numberOfLines={1}>
                {identity?.profile.display_name || "Store Owner"}
              </Text>
              {identity?.email ? (
                <Text className="text-[10px] text-gray-400 font-medium" numberOfLines={1}>
                  {identity.email}
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={handleSignOut}
            className="px-3 py-2 rounded-lg hover:bg-red-50 flex-row items-center justify-center gap-1.5 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
          >
            <Ionicons name="log-out-outline" size={14} color="#DC2626" />
            <Text className="text-red-600 font-semibold text-xs">Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 min-w-0 h-screen overflow-hidden flex-col">
        {/* Mobile Header (Only visible on small screens) */}
        <View className="md:hidden bg-white z-20 border-b border-gray-200 shadow-2xs">
          <View className="px-4 py-2.5 flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg bg-[#EA5410]/10 items-center justify-center">
                <Ionicons name="storefront" size={14} color="#EA5410" />
              </View>
              <Text className="text-gray-900 font-bold text-sm">Mati FoodFinder</Text>
            </View>
            <Pressable onPress={handleSignOut} className="px-2.5 py-1 bg-gray-100 rounded-lg active:bg-gray-200">
              <Text className="text-gray-700 text-[11px] font-bold">Sign Out</Text>
            </Pressable>
          </View>

          {/* Mobile Sub-Navigation Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 6 }}
          >
            {MERCHANT_NAV_ITEMS.map((item) => {
              const isActive = isAdminNavItemActive(pathname, item.href);
              const targetTab: "overview" | "menu" | "profile" | "billing" = item.href.includes("/dashboard/menu")
                ? "menu"
                : item.href.includes("/dashboard/profile")
                  ? "profile"
                  : item.href.includes("/dashboard/billing")
                    ? "billing"
                    : "overview";
              return (
                <Link key={item.label} href={item.href as any} asChild>
                  <Pressable
                    onPress={() => scrollToTabTop(targetTab)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 border ${
                      isActive
                        ? "bg-orange-50 border-orange-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name={isActive ? item.activeIcon : item.icon}
                      size={13}
                      color={isActive ? "#EA5410" : "#6B7280"}
                    />
                    <Text
                      className={`text-[11px] ${
                        isActive ? "text-gray-900 font-semibold" : "text-gray-600 font-medium"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>
        </View>

        {/* Persistent 4-Tab Container — All 4 tabs load once on login and remain in memory without reloading */}
        <View className="flex-1 relative">
          <View style={{ display: activeTab === "overview" ? "flex" : "none", flex: 1 }}>
            <ScrollView
              ref={overviewScrollRef}
              contentContainerStyle={{ flexGrow: 1 }}
              className="flex-1"
            >
              <SafeAreaView className="flex-1" edges={["top"]}>
                <StoreDashboardOverview />
              </SafeAreaView>
            </ScrollView>
          </View>

          <View style={{ display: activeTab === "menu" ? "flex" : "none", flex: 1 }}>
            <ScrollView
              ref={menuScrollRef}
              contentContainerStyle={{ flexGrow: 1 }}
              className="flex-1"
            >
              <SafeAreaView className="flex-1" edges={["top"]}>
                <MenuManager />
              </SafeAreaView>
            </ScrollView>
          </View>

          <View style={{ display: activeTab === "profile" ? "flex" : "none", flex: 1 }}>
            <ScrollView
              ref={profileScrollRef}
              contentContainerStyle={{ flexGrow: 1 }}
              className="flex-1"
            >
              <SafeAreaView className="flex-1" edges={["top"]}>
                <StoreProfile />
              </SafeAreaView>
            </ScrollView>
          </View>

          <View style={{ display: activeTab === "billing" ? "flex" : "none", flex: 1 }}>
            <ScrollView
              ref={billingScrollRef}
              contentContainerStyle={{ flexGrow: 1 }}
              className="flex-1"
            >
              <SafeAreaView className="flex-1" edges={["top"]}>
                <BillingView />
              </SafeAreaView>
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}
