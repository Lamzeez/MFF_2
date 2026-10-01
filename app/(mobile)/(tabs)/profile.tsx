import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import { AccountForm } from "../../../components/auth/AccountForm";
import { authMessage } from "../../../services/auth";
import { fetchUserVisitSummary, UserVisitSummary } from "../../../services/visits";
import { useRouter } from "expo-router";

interface RegisteredPerk {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  title: string;
  description: string;
}

const REGISTERED_MEMBER_PERKS: RegisteredPerk[] = [
  {
    icon: "bicycle",
    color: "#EA5410",
    bgColor: "#FFF7ED",
    title: "Live Order Tracking & Dedicated Orders Tab",
    description: "Track your courier in real time from kitchen to your door with secure 4-digit PIN verification.",
  },
  {
    icon: "calendar",
    color: "#0284C7",
    bgColor: "#F0F9FF",
    title: "Dine-in Table Reservations",
    description: "Reserve tables ahead of time at top Mati spots like Baywalk & Dahican and skip lines.",
  },
  {
    icon: "chatbubbles",
    color: "#059669",
    bgColor: "#ECFDF5",
    title: "Community Food Reviews & Photos",
    description: "Share your food reviews, rate local karenderias, and connect with fellow Mati foodies.",
  },
  {
    icon: "sparkles",
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    title: "QR Check-in & Smart Recommendations",
    description: "Scan restaurant QR stands to unlock customized daily dish recommendations and your #1 visited spots.",
  },
  {
    icon: "location",
    color: "#D97706",
    bgColor: "#FFFBEB",
    title: "Saved Delivery Addresses & Fast Checkout",
    description: "Save your favorite Mati barangay and delivery landmarks so you never have to re-enter them.",
  },
];

export default function MobileCustomerProfileScreen() {
  const { isLoggedIn, user, recovering, logoutToGuest } = useAuth();
  const { updateProfile } = useSession();
  const router = useRouter();

  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const togglePersonalization = (enable?: boolean) =>
    setPersonalizationEnabled((p) => (typeof enable === "boolean" ? enable : !p));

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ display_name: editName, contact_phone: editPhone });
      setProfileMsg({ text: "Profile updated successfully!", error: false });
      setEditingProfile(false);
    } catch (e) {
      setProfileMsg({ text: authMessage(e), error: true });
    } finally {
      setSavingProfile(false);
    }
  };

  // Customer Delivery Preferences (Mati City)
  const matiBarangays = ["Central (Poblacion)", "Dahican", "Sainz", "Matiao", "Badas", "Mayo"];
  const [defaultBarangay, setDefaultBarangay] = useState("Central (Poblacion)");
  const [savedAddress, setSavedAddress] = useState("Near Baywalk Pavilion, Blue Gate");

  // Discreet Switch Role Section (Tricky/subtle so regular users won't misclick it)
  const [showAdvancedSession, setShowAdvancedSession] = useState(false);

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await logoutToGuest();
    } catch (error) {
      setSignOutError(authMessage(error));
    } finally {
      setSigningOut(false);
    }
  };

  const handleTogglePersonalizationAttempt = () => {
    if (!isLoggedIn) {
      Alert.alert(
        "Registered Users Only 🔒",
        "Guests cannot enable Personalization feature mode. Because guest mode is anonymous, personal in-store visit history and customized recommendations cannot be saved.\n\nPlease sign in or register to enable Personalization.",
        [
          { text: "Continue as Guest", style: "cancel" },
          { text: "Sign In as Registered", onPress: () => router.push("/(mobile)/auth/customer-login") },
        ]
      );
      return;
    }
    togglePersonalization();
  };

  const handleSwitchRoleConfirm = () => {
    Alert.alert(
      "Switch User Role?",
      "Are you sure you want to leave Customer Mode and return to the Mati FoodFinder access portal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Return to Portal",
          style: "destructive",
          onPress: () => router.replace("/(mobile)/portal"),
        },
      ]
    );
  };

  const [liveVisitSummary, setLiveVisitSummary] = useState<UserVisitSummary | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserVisitSummary()
        .then((data) => setLiveVisitSummary(data))
        .catch((err) => console.warn("Failed to load visit summary:", err));
    }
  }, [isLoggedIn]);

  const displayTotalScans =
    liveVisitSummary !== null ? liveVisitSummary.totalVisits : 0;

  const displayTopStoreName =
    liveVisitSummary !== null
      ? (liveVisitSummary.mostVisitedStore ? liveVisitSummary.mostVisitedStore.name : "None yet")
      : "Mama Letty's Karenderia";

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 flex-row justify-between items-center shadow-xs">
        <View>
          <Text className="text-[11px] font-extrabold text-[#EA5410] uppercase tracking-wider">
            CUSTOMER ACCOUNT
          </Text>
          <Text className="text-xl font-black text-gray-900 tracking-tight">
            Profile & Settings
          </Text>
        </View>
        {!isLoggedIn ? (
          <Pressable
            onPress={() => router.push("/(mobile)/auth/customer-login")}
            className="bg-[#EA5410]/10 border border-[#EA5410]/20 px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5"
          >
            <Ionicons name="log-in-outline" size={15} color="#EA5410" />
            <Text className="text-xs font-bold text-[#EA5410]">Sign In</Text>
          </Pressable>
        ) : (
          <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-emerald-600" />
            <Text className="text-xs font-bold text-emerald-800">Online</Text>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* GUEST MEMBER PRIVILEGES SHOWCASE (Visible exclusively to Guest Users) */}
        {!isLoggedIn && (
          <View className="bg-white rounded-3xl border border-orange-200/90 p-5 shadow-sm mb-5">
            {/* Tag & Badge */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-orange-100 px-3 py-1 rounded-full flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={13} color="#EA5410" />
                <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                  MEMBER PRIVILEGES 🌟
                </Text>
              </View>
              <Text className="text-[11px] font-bold text-gray-400">100% Free Account</Text>
            </View>

            <Text className="text-xl font-black text-gray-900 tracking-tight mb-1.5 leading-snug">
              Unlock the Full Mati Foodie Experience
            </Text>
            <Text className="text-xs text-gray-500 leading-relaxed mb-4">
              Browsing Mati restaurants is free, but registering unlocks live delivery tracking, dine-in reservations, and community review privileges:
            </Text>

            {/* Privileges List */}
            <View className="gap-2.5 mb-5">
              {REGISTERED_MEMBER_PERKS.map((perk) => (
                <View
                  key={perk.title}
                  className="flex-row items-start gap-3 p-3 rounded-2xl bg-gray-50/90 border border-gray-100"
                >
                  <View
                    style={{ backgroundColor: perk.bgColor }}
                    className="w-10 h-10 rounded-xl items-center justify-center shrink-0 mt-0.5"
                  >
                    <Ionicons name={perk.icon} size={20} color={perk.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-900 mb-0.5">
                      {perk.title}
                    </Text>
                    <Text className="text-[11px] text-gray-500 leading-snug">
                      {perk.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Register CTA */}
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-register")}
              className="w-full py-3.5 bg-[#EA5410] rounded-2xl items-center shadow-sm flex-row justify-center gap-2 active:opacity-90 mb-2.5"
            >
              <Ionicons name="person-add-outline" size={16} color="white" />
              <Text className="text-white font-extrabold text-xs">
                Create Free Account in 30 Seconds
              </Text>
            </Pressable>

            <View className="flex-row items-center justify-center gap-1.5">
              <Text className="text-[11px] text-gray-500">Already have an account?</Text>
              <Pressable onPress={() => router.push("/(mobile)/auth/customer-login")}>
                <Text className="text-[11px] font-black text-[#EA5410]">Sign In to Your Account</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 1. CUSTOMER IDENTITY & ACCOUNT CARD */}
        <View className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm mb-5">
          <View className="flex-row items-center gap-4 mb-4">
            <View
              className={`w-14 h-14 rounded-2xl items-center justify-center ${
                isLoggedIn ? "bg-[#111827]" : "bg-orange-100"
              }`}
            >
              <Ionicons
                name={isLoggedIn ? "person" : "person-outline"}
                size={26}
                color={isLoggedIn ? "white" : "#EA5410"}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-lg font-black text-gray-900">
                  {isLoggedIn ? user?.name : "Guest Customer"}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-md ${
                    isLoggedIn ? "bg-emerald-100" : "bg-orange-100"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      isLoggedIn ? "text-emerald-800" : "text-[#EA5410]"
                    } uppercase`}
                  >
                    {isLoggedIn ? "Registered" : "Guest Mode"}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 leading-snug">
                {isLoggedIn
                  ? user?.email
                  : "Sign in to save your favorite dishes, track COD orders, and scan restaurant QR stands."}
              </Text>
            </View>
          </View>

          {isLoggedIn && !recovering ? (
            <View className="gap-2.5">
              {editingProfile ? (
                <View className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 mb-2">
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">Display Name</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 mb-3"
                    placeholder="Your Full Name"
                  />
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">Contact Phone</Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 mb-3.5"
                    placeholder="0917XXXXXXX"
                  />
                  <View className="flex-row gap-2.5">
                    <Pressable
                      onPress={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex-1 py-3 bg-[#EA5410] rounded-xl items-center shadow-sm"
                    >
                      <Text className="text-white text-xs font-extrabold">
                        {savingProfile ? "Saving..." : "Save Changes"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setEditingProfile(false);
                        setProfileMsg(null);
                      }}
                      className="px-4 py-3 bg-gray-200 rounded-xl items-center"
                    >
                      <Text className="text-gray-700 text-xs font-bold">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditingProfile(true)}
                  className="w-full py-2.5 bg-[#EA5410]/10 rounded-2xl items-center border border-[#EA5410]/20 mb-1 flex-row justify-center gap-2"
                >
                  <Ionicons name="create-outline" size={15} color="#EA5410" />
                  <Text className="text-xs font-bold text-[#EA5410]">Edit Name & Phone Number</Text>
                </Pressable>
              )}

              {profileMsg && (
                <Text
                  className={`text-xs ${
                    profileMsg.error ? "text-red-700" : "text-emerald-700"
                  } mb-1`}
                >
                  {profileMsg.text}
                </Text>
              )}

              <Pressable
                onPress={handleSignOut}
                disabled={signingOut}
                className="w-full py-3 bg-gray-100 rounded-2xl items-center border border-gray-200/80 flex-row justify-center gap-2"
              >
                <Ionicons name="log-out-outline" size={16} color="#6b7280" />
                <Text className="text-xs font-bold text-gray-700">
                  {signingOut ? "Signing out..." : "Log Out to Guest Mode"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <AccountForm />
          )}
        </View>

        {!!signOutError && (
          <Text accessibilityRole="alert" className="text-red-700 mb-3 px-1">
            {signOutError}
          </Text>
        )}

        {/* 2. PERSONALIZATION FEATURE MODE SETTINGS (REGISTERED USERS ONLY) */}
        {isLoggedIn && (
          <View className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View
                  className={`w-10 h-10 rounded-2xl items-center justify-center ${
                    personalizationEnabled ? "bg-[#EA5410]/10" : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name={personalizationEnabled ? "sparkles" : "sparkles-outline"}
                    size={18}
                    color={personalizationEnabled ? "#EA5410" : "#6b7280"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-gray-900">Personalization Mode</Text>
                  <Text className="text-[11px] text-gray-500">
                    In-store QR scanning & favorite recommendations
                  </Text>
                </View>
              </View>

              {/* Toggle Switch */}
              <Pressable onPress={handleTogglePersonalizationAttempt} hitSlop={10}>
                <Switch
                  trackColor={{ false: "#d1d5db", true: "#EA5410" }}
                  thumbColor={personalizationEnabled ? "#ffffff" : "#f3f4f6"}
                  ios_backgroundColor="#d1d5db"
                  onValueChange={handleTogglePersonalizationAttempt}
                  value={personalizationEnabled}
                />
              </Pressable>
            </View>

            <View className="mt-2.5 pt-3.5 border-t border-gray-100">
              {personalizationEnabled ? (
                <>
                  <View className="flex-row items-center gap-2 mb-2.5 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                    <Ionicons name="checkmark-circle" size={15} color="#047857" />
                    <Text className="text-[11px] font-bold text-emerald-800">
                      Personalization Active • Restaurant QR Scanning Enabled
                    </Text>
                  </View>

                  <Text className="text-xs text-gray-600 leading-relaxed mb-3.5">
                    Your in-store QR code check-ins at Mati restaurants are recorded to personalize
                    your home food feed with your #1 Most Visited spots and custom dish
                    recommendations.
                  </Text>

                  {/* Visit Stats Summary */}
                  <View className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex-row justify-between items-center">
                    <View>
                      <Text className="text-[10px] uppercase font-extrabold text-gray-400">
                        Total Check-ins
                      </Text>
                      <Text className="text-base font-black text-gray-900 mt-0.5">
                        {displayTotalScans} In-Store Scans
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] uppercase font-extrabold text-gray-400">
                        #1 Most Visited
                      </Text>
                      <Text className="text-xs font-black text-[#EA5410] mt-0.5">
                        {displayTopStoreName}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-2 mb-2.5 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200">
                    <Ionicons name="pause-circle" size={15} color="#d97706" />
                    <Text className="text-[11px] font-bold text-amber-800">
                      Personalization Paused • In-Store QR Scans Disabled
                    </Text>
                  </View>

                  <Text className="text-xs text-gray-600 leading-relaxed mb-3.5">
                    Personalization is paused. You cannot scan restaurant stand QR codes, and your
                    feed will display generic trending items.
                  </Text>

                  <Pressable
                    onPress={() => togglePersonalization(true)}
                    className="py-3 bg-[#EA5410] rounded-2xl items-center shadow-sm"
                  >
                    <Text className="text-white font-extrabold text-xs">
                      Turn On Personalization
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

        {/* 3. MATI CITY DELIVERY PREFERENCES (REGISTERED USERS ONLY) */}
        {isLoggedIn && (
          <View className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm mb-5">
            <View className="flex-row items-center gap-2.5 mb-2">
              <View className="w-8 h-8 rounded-xl bg-[#EA5410]/10 items-center justify-center">
                <Ionicons name="location-outline" size={18} color="#EA5410" />
              </View>
              <Text className="text-sm font-black text-gray-900">Delivery Address in Mati</Text>
            </View>
            <Text className="text-xs text-gray-500 mb-3.5 leading-snug">
              Set your default Mati City barangay and delivery landmarks for faster checkout.
            </Text>

            <Text className="text-[11px] font-bold text-gray-700 mb-2">Default Barangay</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
              {matiBarangays.map((brgy) => (
                <Pressable
                  key={brgy}
                  onPress={() => setDefaultBarangay(brgy)}
                  className={`mr-2 px-3.5 py-2 rounded-xl border ${
                    defaultBarangay === brgy
                      ? "bg-[#EA5410] border-[#EA5410]"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      defaultBarangay === brgy ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {brgy}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text className="text-[11px] font-bold text-gray-700 mb-1.5">House / Landmark</Text>
            <TextInput
              value={savedAddress}
              onChangeText={setSavedAddress}
              placeholder="e.g. Near Baywalk Pavilion, blue gate"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 mb-3"
              placeholderTextColor="#9ca3af"
            />
            <View className="flex-row items-center gap-2 bg-orange-50/60 p-2.5 rounded-xl border border-orange-100">
              <Ionicons name="cash-outline" size={15} color="#EA5410" />
              <Text className="text-[11px] text-gray-600">
                Payment Method: <Text className="font-black text-[#EA5410]">Cash on Delivery (COD)</Text>
              </Text>
            </View>
          </View>
        )}

        {/* 4. ORDERS & BOOKINGS SHORTCUTS (Logged in users only) */}
        {isLoggedIn && (
          <View className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm mb-5">
            <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
              Quick Customer Shortcuts
            </Text>
            <View className="gap-2.5">
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/orders")}
                className="flex-row justify-between items-center p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100"
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-lg">🛵</Text>
                  <Text className="text-xs font-bold text-gray-800">Active COD Deliveries</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </Pressable>

              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/orders")}
                className="flex-row justify-between items-center p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100"
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-lg">📅</Text>
                  <Text className="text-xs font-bold text-gray-800">Dining Table Bookings</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </Pressable>
            </View>
          </View>
        )}

        {/* 5. ABOUT MFF */}
        <View className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm mb-6">
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
            About Mati FoodFinder
          </Text>
          <View className="gap-2.5">
            <View className="flex-row justify-between items-center py-1.5 border-b border-gray-100">
              <Text className="text-xs text-gray-600">Coverage</Text>
              <Text className="text-xs font-bold text-[#EA5410]">Mati City Exclusive</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5 border-b border-gray-100">
              <Text className="text-xs text-gray-600">Payment Protocol</Text>
              <Text className="text-xs font-bold text-gray-800">Cash on Delivery (COD)</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">App Version</Text>
              <Text className="text-xs font-mono text-gray-500">v1.0.0 (Expo SDK 57)</Text>
            </View>
          </View>
        </View>

        {/* 6. DISCREET ROLE SWITCHER / PORTAL ACCESS */}
        <View className="items-center mb-6">
          <Pressable
            onPress={() => setShowAdvancedSession(!showAdvancedSession)}
            className="py-2.5 px-4 flex-row items-center gap-2 opacity-60"
          >
            <Ionicons
              name={showAdvancedSession ? "chevron-down" : "ellipsis-horizontal"}
              size={14}
              color="#6b7280"
            />
            <Text className="text-[11px] font-semibold text-gray-500">
              Session Management & Role Portal
            </Text>
          </Pressable>

          {showAdvancedSession && (
            <View className="w-full mt-3 p-5 bg-gray-100 rounded-3xl border border-gray-200 items-center">
              <Text className="text-[11px] text-gray-500 text-center mb-3.5 leading-snug">
                Switching roles will exit Customer Mode and return to the main Mati FoodFinder
                access portal.
              </Text>
              <Pressable
                onPress={handleSwitchRoleConfirm}
                className="py-3 px-6 bg-[#111827] rounded-2xl flex-row items-center gap-2 shadow-sm"
              >
                <Ionicons name="swap-horizontal" size={15} color="white" />
                <Text className="text-white font-extrabold text-xs">Switch User Role (Return to Portal)</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
