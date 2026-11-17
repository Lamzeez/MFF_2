import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Platform,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import { AccountForm } from "../../../components/auth/AccountForm";
import { authMessage } from "../../../services/auth";
import { fetchUserVisitSummary, UserVisitSummary } from "../../../services/visits";
import { fetchCustomerOrders } from "../../../services/orders";
import { fetchCustomerReservations } from "../../../services/reservations";
import { useRouter } from "expo-router";
import {
  getCustomerProfile,
  saveCustomerProfile,
  CustomerProfileData,
  DEFAULT_COVER_PHOTO,
  DEFAULT_AVATAR,
} from "../../../lib/customer-profile";
import { NotificationsSheet } from "../../../components/notifications/NotificationsSheet";
import {
  fetchNotifications,
  markAllNotificationsRead,
  NotificationRow,
  AppNotification,
} from "../../../services/notifications";
import {
  PH_MOBILE_ERROR_MESSAGE,
  filterPhoneInput,
  isValidPhilippineMobile,
  sanitizePhoneNumber,
} from "../../../lib/phone";
import {
  getSavedAddresses,
  saveAddress,
  removeSavedAddress,
  setDefaultAddress,
  SavedAddress,
} from "../../../lib/saved-addresses";

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
  const { updateProfile, identity } = useSession();
  const router = useRouter();

  const [personalizationEnabled, setPersonalizationEnabled] = useState(
    identity?.profile?.personalization_consent ?? true
  );

  useEffect(() => {
    if (typeof identity?.profile?.personalization_consent === "boolean") {
      setPersonalizationEnabled(identity.profile.personalization_consent);
    }
  }, [identity?.profile?.personalization_consent]);

  // Customer Profile Personalization (Facebook-Style Profile Picture, Cover & Bio)
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileData>({
    avatarUrl: null,
    coverPhotoUrl: DEFAULT_COVER_PHOTO,
    bio: "Mati foodie exploring the best seaside grills and authentic karenderias 🌊🍲",
    favoriteDish: "Classic Pork Humba",
    badgeTitle: "Mati Food Explorer 🌟",
  });
  const [editBio, setEditBio] = useState("");
  const [editFavoriteDish, setEditFavoriteDish] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Profile Notifications Sheet State
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [profileNotifications, setProfileNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    getCustomerProfile(user?.id).then((p) => {
      setCustomerProfile(p);
      setEditBio(p.bio);
      setEditFavoriteDish(p.favoriteDish);
    });
  }, [user?.id]);

  const loadProfileNotifications = async () => {
    if (isLoggedIn) {
      try {
        const notifs = await fetchNotifications();
        setProfileNotifications(notifs);
      } catch (err) {
        console.warn("Could not load profile notifications:", err);
      }
    }
  };

  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [activeReservationsCount, setActiveReservationsCount] = useState(0);

  const loadActiveCounts = async () => {
    if (isLoggedIn) {
      try {
        const [orders, reservations] = await Promise.all([
          fetchCustomerOrders(),
          fetchCustomerReservations(),
        ]);
        const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
        const activeRes = reservations.filter((r) => r.status === "pending" || r.status === "confirmed");
        setActiveOrdersCount(activeOrders.length);
        setActiveReservationsCount(activeRes.length);
      } catch (e) {
        console.warn("Could not load active counts:", e);
      }
    }
  };

  useEffect(() => {
    loadProfileNotifications();
    loadActiveCounts();
  }, [isLoggedIn]);

  const profileUnreadCount = profileNotifications.filter((n) => !n.is_read).length;

  const displayNotifications: AppNotification[] = profileNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isRead: n.is_read,
    type: (n.type as any) || "system",
  }));

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead();
      setProfileNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn("Failed to mark all read:", err);
    }
  };

  const handlePickAvatar = async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In Required", "Please sign in or create an account to customize your profile picture.");
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please grant access to your photo library to choose a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setIsUploadingPhoto(true);
        const updated = await saveCustomerProfile(user?.id, { avatarUrl: uri });
        setCustomerProfile(updated);
        setIsUploadingPhoto(false);
        Alert.alert("Profile Picture Updated! 📸", "Your personalized avatar is now active across Mati FoodFinder!");
      }
    } catch (err: any) {
      setIsUploadingPhoto(false);
      Alert.alert("Photo Error", err?.message || "Could not select photo.");
    }
  };

  const handlePickCover = async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In Required", "Please sign in or create an account to customize your cover photo.");
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please grant access to your photo library to choose a cover photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setIsUploadingPhoto(true);
        const updated = await saveCustomerProfile(user?.id, { coverPhotoUrl: uri });
        setCustomerProfile(updated);
        setIsUploadingPhoto(false);
        Alert.alert("Cover Photo Updated! 🌊", "Your profile cover photo has been saved!");
      }
    } catch (err: any) {
      setIsUploadingPhoto(false);
      Alert.alert("Cover Photo Error", err?.message || "Could not select cover photo.");
    }
  };

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(filterPhoneInput(user.phone || ""));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    const cleanPhone = sanitizePhoneNumber(editPhone);
    if (cleanPhone && !isValidPhilippineMobile(cleanPhone)) {
      setProfileMsg({ text: PH_MOBILE_ERROR_MESSAGE, error: true });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await Promise.all([
        updateProfile({ display_name: editName, contact_phone: cleanPhone }),
        saveCustomerProfile(user?.id, {
          bio: editBio.trim() || customerProfile.bio,
          favoriteDish: editFavoriteDish.trim() || customerProfile.favoriteDish,
        }),
      ]);
      setCustomerProfile((prev) => ({
        ...prev,
        bio: editBio.trim() || prev.bio,
        favoriteDish: editFavoriteDish.trim() || prev.favoriteDish,
      }));
      setProfileMsg({ text: "Profile updated successfully!", error: false });
      setEditingProfile(false);
    } catch (e) {
      setProfileMsg({ text: authMessage(e), error: true });
    } finally {
      setSavingProfile(false);
    }
  };

  // Customer Delivery Preferences & Saved Addresses with Mati Landmarks (Pillar 2)
  const matiBarangays = ["Central (Poblacion)", "Dahican", "Sainz", "Matiao", "Badas", "Mayo"];
  const [defaultBarangay, setDefaultBarangay] = useState("Central (Poblacion)");
  const [savedAddress, setSavedAddress] = useState("Near Baywalk Pavilion, Blue Gate");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<string | null>(null);

  const [addressList, setAddressList] = useState<SavedAddress[]>([]);
  const [showAddCustomAddress, setShowAddCustomAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [newAddressBarangay, setNewAddressBarangay] = useState("Central (Poblacion)");
  const [newAddressLandmark, setNewAddressLandmark] = useState("");

  useEffect(() => {
    setAddressList(getSavedAddresses());
  }, []);

  const handleSelectDefaultSavedAddress = async (addr: SavedAddress) => {
    const updated = setDefaultAddress(addr.id);
    setAddressList(updated);
    setDefaultBarangay(addr.barangay);
    setSavedAddress(addr.landmarkDescription);
    try {
      await updateProfile({
        default_barangay: addr.barangay,
        delivery_address: addr.landmarkDescription,
      });
      setAddressMsg(`Default address set to "${addr.label}"!`);
      setTimeout(() => setAddressMsg(null), 3000);
    } catch (e) {
      console.warn("Could not sync default address to profile:", e);
    }
  };

  const handleAddCustomAddress = () => {
    if (!newAddressLabel.trim()) {
      Alert.alert("Missing Location", "Please enter a location (e.g. Home, Office).");
      return;
    }
    if (!newAddressLandmark.trim()) {
      Alert.alert("Missing Landmark", "Please describe the street or nearby landmark.");
      return;
    }

    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: newAddressLabel.trim(),
      icon: "location",
      barangay: newAddressBarangay,
      landmarkDescription: newAddressLandmark.trim(),
      isDefault: false,
    };

    const updated = saveAddress(newAddr);
    setAddressList(updated);
    setNewAddressLabel("");
    setNewAddressLandmark("");
    setShowAddCustomAddress(false);
    Alert.alert("Address Saved", `"${newAddr.label}" has been added to your saved delivery addresses.`);
  };

  const handleRemoveAddress = (id: string) => {
    Alert.alert("Remove Address?", "Are you sure you want to remove this saved delivery location?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const updated = removeSavedAddress(id);
          setAddressList(updated);
        },
      },
    ]);
  };

  useEffect(() => {
    if (identity?.profile) {
      const prof = identity.profile as any;
      if (prof.default_barangay) setDefaultBarangay(prof.default_barangay);
      if (prof.delivery_address) setSavedAddress(prof.delivery_address);
    }
  }, [identity?.profile]);

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    setAddressMsg(null);
    try {
      await updateProfile({
        default_barangay: defaultBarangay,
        delivery_address: savedAddress.trim(),
      });
      setAddressMsg("Default address saved to account!");
      setTimeout(() => setAddressMsg(null), 3500);
    } catch (e) {
      Alert.alert("Address Save Error", authMessage(e));
    } finally {
      setSavingAddress(false);
    }
  };

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await logoutToGuest();
      if (Platform.OS === "web") {
        router.replace("/");
      }
    } catch (error) {
      setSignOutError(authMessage(error));
    } finally {
      setSigningOut(false);
    }
  };

  const handleTogglePersonalizationAttempt = async (forcedVal?: boolean) => {
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
    const nextVal = typeof forcedVal === "boolean" ? forcedVal : !personalizationEnabled;
    setPersonalizationEnabled(nextVal);
    try {
      await updateProfile({ personalization_consent: nextVal });
    } catch {
      setPersonalizationEnabled(!nextVal);
    }
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
      <View className="px-3.5 sm:px-4 pt-2 pb-2.5 bg-white border-b border-gray-100 shadow-xs">
        <View className="w-full max-w-2xl self-center flex-row justify-between items-center">
          <View className="flex-1 pr-2">
            <Text className="text-[10px] font-extrabold text-[#EA5410] uppercase tracking-wider">
              CUSTOMER ACCOUNT
            </Text>
            <Text className="text-base font-black text-gray-900 tracking-tight" numberOfLines={1}>
              Profile & Settings
            </Text>
          </View>
          {!isLoggedIn ? (
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-login")}
              className="bg-[#EA5410]/10 border border-[#EA5410]/20 px-2.5 py-1 rounded-full flex-row items-center gap-1 shrink-0"
            >
              <Ionicons name="log-in-outline" size={13} color="#EA5410" />
              <Text className="text-[11px] font-bold text-[#EA5410]">Sign In</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-3.5 sm:px-4 pt-3.5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-2xl self-center">
        {/* GUEST MEMBER PRIVILEGES SHOWCASE (Scaled from rounded-3xl p-5 to rounded-2xl p-3.5) */}
        {!isLoggedIn && (
          <View className="bg-white rounded-2xl border border-orange-200/90 p-3.5 shadow-xs mb-3.5">
            {/* Tag & Badge */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-orange-100 px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
                <Ionicons name="sparkles" size={11} color="#EA5410" />
                <Text className="text-[9px] font-black text-[#EA5410] uppercase tracking-wider">
                  MEMBER PRIVILEGES 🌟
                </Text>
              </View>
              <Text className="text-[10px] font-bold text-gray-400">100% Free Account</Text>
            </View>

            <Text className="text-base font-black text-gray-900 tracking-tight mb-1 leading-snug">
              Unlock the Full Mati Foodie Experience
            </Text>
            <Text className="text-[11px] text-gray-500 leading-snug mb-3">
              Browsing Mati restaurants is free, but registering unlocks live delivery tracking, dine-in reservations, and community review privileges:
            </Text>

            {/* Privileges List */}
            <View className="gap-2 mb-3.5">
              {REGISTERED_MEMBER_PERKS.map((perk) => (
                <View
                  key={perk.title}
                  className="flex-row items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/90 border border-gray-100"
                >
                  <View
                    style={{ backgroundColor: perk.bgColor }}
                    className="w-8 h-8 rounded-lg items-center justify-center shrink-0 mt-0.5"
                  >
                    <Ionicons name={perk.icon} size={16} color={perk.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold text-gray-900 mb-0.5">
                      {perk.title}
                    </Text>
                    <Text className="text-[10px] text-gray-500 leading-snug">
                      {perk.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Register CTA */}
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-register")}
              className="w-full py-2.5 bg-[#EA5410] rounded-xl items-center shadow-xs flex-row justify-center gap-1.5 active:opacity-90 mb-2"
            >
              <Ionicons name="person-add-outline" size={14} color="white" />
              <Text className="text-white font-extrabold text-xs">
                Create Free Account in 30 Seconds
              </Text>
            </Pressable>

            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-[10px] text-gray-500">Already have an account?</Text>
              <Pressable onPress={() => router.push("/(mobile)/auth/customer-login")}>
                <Text className="text-[10px] font-black text-[#EA5410]">Sign In to Your Account</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 1. CUSTOMER IDENTITY & FACEBOOK-STYLE PERSONALIZED COVER & AVATAR */}
        <View className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs mb-3.5">
          {/* Cover Photo Banner */}
          <View className="h-32 w-full bg-gray-200 relative overflow-hidden">
            <Image
              source={{ uri: customerProfile.coverPhotoUrl || DEFAULT_COVER_PHOTO }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/25" />

            {/* Change Cover Photo Button */}
            {isLoggedIn && (
              <Pressable
                onPress={handlePickCover}
                className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-white/20 active:bg-black/80"
              >
                <Ionicons name="camera" size={12} color="white" />
                <Text className="text-[10px] font-bold text-white">Edit Cover</Text>
              </Pressable>
            )}
          </View>

          {/* Overlapping Avatar & Header Row */}
          <View className="px-3.5 pb-3.5 pt-0">
            <View className="flex-row items-end justify-between -mt-10 mb-2">
              {/* Circular Avatar with Guaranteed Dimensions */}
              <View className="relative">
                <View
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                  className="border-4 border-white bg-orange-100 overflow-hidden shadow-md items-center justify-center"
                >
                  <Image
                    source={{
                      uri:
                        customerProfile.avatarUrl ||
                        DEFAULT_AVATAR,
                    }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                {isLoggedIn && (
                  <Pressable
                    onPress={handlePickAvatar}
                    accessibilityRole="button"
                    accessibilityLabel="Change profile picture"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#EA5410] border-2 border-white items-center justify-center shadow-xs active:bg-orange-700"
                  >
                    <Ionicons name="camera" size={13} color="white" />
                  </Pressable>
                )}
              </View>

              {/* Edit Profile Action */}
              <View className="flex-row items-center gap-1.5 mb-1">
                {isLoggedIn ? (
                  <Pressable
                    onPress={() => setEditingProfile(true)}
                    className="bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full flex-row items-center gap-1 active:bg-gray-200"
                  >
                    <Ionicons name="create-outline" size={13} color="#374151" />
                    <Text className="text-[11px] font-bold text-gray-700">Edit Profile</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Name & Role Tag */}
            <View className="mb-2">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-black text-gray-900">
                  {isLoggedIn ? user?.name : "Guest Customer"}
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 flex-row items-center gap-1">
                  <Ionicons name="restaurant" size={10} color="#EA5410" />
                  <Text className="text-[9px] font-black text-[#EA5410] uppercase tracking-wide">
                    {isLoggedIn ? "MFF Foodie Member" : "Guest Mode"}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 font-medium mt-0.5">
                {isLoggedIn ? user?.email : "Sign in to customize your profile, leave reviews, and track orders."}
              </Text>
            </View>

            {/* Bio & Mati Food Identity */}
            {isLoggedIn && (
              <View className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 mb-2.5">
                <Text className="text-xs text-gray-700 leading-snug font-medium mb-2">
                  "{customerProfile.bio}"
                </Text>
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  <View className="bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                    <Ionicons name="heart" size={10} color="#EA5410" />
                    <Text className="text-[10px] font-bold text-[#EA5410]">
                      Favorite: {customerProfile.favoriteDish}
                    </Text>
                  </View>
                  <View className="bg-gray-100 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                    <Ionicons name="location" size={10} color="#4B5563" />
                    <Text className="text-[10px] font-semibold text-gray-700">
                      Mati City Local
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Edit Profile Form when expanded */}
            {isLoggedIn && !recovering && editingProfile && (
              <View className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 mb-2.5">
                <Text className="text-xs font-bold text-gray-800 mb-1">Display Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-2.5"
                  placeholder="Your Full Name"
                />

                <Text className="text-xs font-bold text-gray-800 mb-1">Contact Phone</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={(text) => setEditPhone(filterPhoneInput(text))}
                  maxLength={13}
                  keyboardType="phone-pad"
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-2.5"
                  placeholder="0912 345 6789"
                />

                <Text className="text-xs font-bold text-gray-800 mb-1">Bio (Shown in Community Food Feed)</Text>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  numberOfLines={2}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-2.5"
                  placeholder="Tell fellow foodies about your cravings in Mati..."
                />

                <Text className="text-xs font-bold text-gray-800 mb-1">Favorite Mati Dish</Text>
                <TextInput
                  value={editFavoriteDish}
                  onChangeText={setEditFavoriteDish}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-3"
                  placeholder="e.g. Classic Pork Humba, Seafood Kinilaw, Chicken Inasal"
                />

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex-1 py-2.5 bg-[#EA5410] rounded-xl items-center shadow-xs"
                  >
                    <Text className="text-white text-xs font-extrabold">
                      {savingProfile ? "Saving Profile..." : "Save Profile"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingProfile(false);
                      setProfileMsg(null);
                    }}
                    className="px-3.5 py-2.5 bg-gray-200 rounded-xl items-center"
                  >
                    <Text className="text-gray-700 text-xs font-bold">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {profileMsg && (
              <Text
                className={`text-xs ${
                  profileMsg.error ? "text-red-700" : "text-emerald-700"
                } mb-1.5`}
              >
                {profileMsg.text}
              </Text>
            )}

            {/* Quick Actions / Shortcuts */}
            {isLoggedIn && !recovering ? (
              <View className="flex-row items-center gap-2 pt-2 border-t border-gray-100">
                <Pressable
                  onPress={() => setShowNotificationsSheet(true)}
                  className="flex-1 py-2 bg-orange-50 border border-orange-200 rounded-xl flex-row items-center justify-center gap-1.5 active:bg-orange-100"
                >
                  <Ionicons name="notifications" size={13} color="#EA5410" />
                  <Text className="text-[11px] font-bold text-[#EA5410]">
                    Notifications {profileUnreadCount > 0 ? `(${profileUnreadCount})` : ""}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSignOut}
                  disabled={signingOut}
                  className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl flex-row items-center justify-center gap-1 active:bg-gray-200"
                >
                  <Ionicons name="log-out-outline" size={13} color="#6B7280" />
                  <Text className="text-[11px] font-bold text-gray-700">
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </Text>
                </Pressable>
              </View>
            ) : !isLoggedIn ? (
              <AccountForm />
            ) : null}
          </View>
        </View>

        {!!signOutError && (
          <Text accessibilityRole="alert" className="text-red-700 mb-3 px-1">
            {signOutError}
          </Text>
        )}

        {/* 2. PERSONALIZATION FEATURE MODE SETTINGS (Scaled from rounded-3xl p-5 to rounded-2xl p-3.5) */}
        {isLoggedIn && (
          <View className="bg-white rounded-2xl border border-gray-200/80 p-3.5 shadow-xs mb-3.5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <View
                  className={`w-8 h-8 rounded-xl items-center justify-center ${
                    personalizationEnabled ? "bg-[#EA5410]/10" : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name={personalizationEnabled ? "sparkles" : "sparkles-outline"}
                    size={16}
                    color={personalizationEnabled ? "#EA5410" : "#6b7280"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-gray-900">Personalization Mode</Text>
                  <Text className="text-[10px] text-gray-500">
                    In-store QR scanning & recommendations
                  </Text>
                </View>
              </View>

              {/* Toggle Switch */}
              <Pressable onPress={() => handleTogglePersonalizationAttempt()} hitSlop={8}>
                <Switch
                  trackColor={{ false: "#d1d5db", true: "#EA5410" }}
                  thumbColor={personalizationEnabled ? "#ffffff" : "#f3f4f6"}
                  ios_backgroundColor="#d1d5db"
                  onValueChange={(val) => handleTogglePersonalizationAttempt(val)}
                  value={personalizationEnabled}
                />
              </Pressable>
            </View>

            <View className="mt-2 pt-2.5 border-t border-gray-100">
              {personalizationEnabled ? (
                <>
                  <Text className="text-xs text-gray-600 leading-snug mb-2.5">
                    Your in-store QR code check-ins at Mati restaurants are recorded to personalize
                    your home food feed with your #1 Most Visited spots.
                  </Text>

                  {/* Visit Stats Summary */}
                  <View className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 flex-row flex-wrap justify-between items-center gap-2">
                    <View>
                      <Text className="text-[9px] uppercase font-extrabold text-gray-400">
                        Total Check-ins
                      </Text>
                      <Text className="text-sm font-black text-gray-900 mt-0.5">
                        {displayTotalScans} In-Store Scans
                      </Text>
                    </View>
                    <View className="sm:items-end">
                      <Text className="text-[9px] uppercase font-extrabold text-gray-400">
                        #1 Most Visited Spot
                      </Text>
                      <Text className="text-xs font-black text-[#EA5410] mt-0.5">
                        {displayTopStoreName}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-xs text-gray-500 leading-snug mb-2.5">
                    Personalization is paused. In-store QR scans and custom recommendations are disabled.
                  </Text>

                  <Pressable
                    onPress={() => handleTogglePersonalizationAttempt(true)}
                    className="py-2.5 bg-[#EA5410] rounded-xl items-center shadow-xs active:opacity-90"
                  >
                    <Text className="text-white font-black text-xs">
                      Turn On Personalization
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

        {/* 3. PILLAR 2: SAVED DELIVERY ADDRESSES WITH MATI LANDMARKS (REGISTERED USERS ONLY) */}
        {isLoggedIn && (
          <View className="bg-white rounded-2xl border border-gray-200/80 p-3.5 shadow-xs mb-3.5">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg bg-[#EA5410]/10 items-center justify-center">
                  <Ionicons name="location" size={15} color="#EA5410" />
                </View>
                <View>
                  <Text className="text-xs font-black text-gray-900">Saved Delivery Addresses</Text>
                  <Text className="text-[10px] text-gray-500">Mati Landmarks & 1-Tap Checkout</Text>
                </View>
              </View>

              <Pressable
                onPress={() => setShowAddCustomAddress(true)}
                className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
              >
                <Ionicons name="add" size={13} color="#EA5410" />
                <Text className="text-[10px] font-bold text-[#EA5410]">New Delivery Address</Text>
              </Pressable>
            </View>

            <Text className="text-[11px] text-gray-500 mb-3 leading-snug">
              Save your frequent Mati delivery spots to skip entering streets & landmarks during checkout.
            </Text>

            {/* List of Saved Addresses */}
            <View className="gap-2 mb-3">
              {addressList.map((addr) => (
                <View
                  key={addr.id}
                  className={`p-2.5 rounded-xl border flex-row items-center justify-between gap-2 ${
                    addr.isDefault
                      ? "bg-orange-50/70 border-[#EA5410]"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    <View
                      className={`w-7 h-7 rounded-lg items-center justify-center shrink-0 ${
                        addr.isDefault ? "bg-[#EA5410]" : "bg-gray-200"
                      }`}
                    >
                      <Ionicons
                        name={
                          addr.icon === "home"
                            ? "home"
                            : addr.icon === "briefcase"
                            ? "briefcase"
                            : addr.icon === "water"
                            ? "water"
                            : "location"
                        }
                        size={13}
                        color={addr.isDefault ? "white" : "#4B5563"}
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-xs font-black text-gray-900">{addr.label}</Text>
                        {addr.isDefault && (
                          <View className="bg-[#EA5410] px-1 py-0.2 rounded">
                            <Text className="text-[8px] font-black text-white uppercase">DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px] text-gray-500 font-semibold" numberOfLines={1}>
                        Brgy. {addr.barangay}
                      </Text>
                      <Text className="text-[10px] text-gray-600" numberOfLines={1}>
                        📍 {addr.landmarkDescription}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-1 shrink-0">
                    {!addr.isDefault && (
                      <Pressable
                        onPress={() => handleSelectDefaultSavedAddress(addr)}
                        className="px-2 py-1 bg-white border border-gray-300 rounded-lg active:bg-gray-100"
                      >
                        <Text className="text-[9px] font-bold text-gray-700">Set Default</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => handleRemoveAddress(addr.id)}
                      className="w-6 h-6 rounded-md items-center justify-center bg-gray-100 active:bg-gray-200"
                    >
                      <Ionicons name="trash-outline" size={12} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            {addressMsg && (
              <View className="flex-row items-center gap-1.5 mb-2 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                <Text className="text-[11px] font-bold text-emerald-800">{addressMsg}</Text>
              </View>
            )}

            <View className="flex-row items-center gap-1.5 bg-orange-50/60 p-2 rounded-lg border border-orange-100">
              <Ionicons name="cash-outline" size={13} color="#EA5410" />
              <Text className="text-[10px] text-gray-600">
                Payment: <Text className="font-black text-[#EA5410]">Cash on Delivery (COD)</Text> across Mati City
              </Text>
            </View>
          </View>
        )}

        {/* 4. ORDERS & BOOKINGS SHORTCUTS */}
        {isLoggedIn && (
          <View className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-2xs mb-3.5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[11px] font-black text-gray-900 uppercase tracking-wider">
                Quick Customer Shortcuts
              </Text>
              {(activeOrdersCount > 0 || activeReservationsCount > 0) && (
                <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#EA5410]" />
                  <Text className="text-[10px] font-black text-[#EA5410]">
                    {activeOrdersCount + activeReservationsCount} Active
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-2">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(mobile)/(tabs)/orders",
                    params: { tab: "deliveries", from: "profile" },
                  })
                }
                className="flex-row justify-between items-center p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 active:bg-orange-50/50"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-7 h-7 rounded-lg bg-orange-100 items-center justify-center">
                    <Ionicons name="bicycle" size={15} color="#EA5410" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-800">Active Deliveries</Text>
                    <Text className="text-[10px] text-gray-500">Live courier tracking & COD</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className={`px-2 py-0.5 rounded-full ${activeOrdersCount > 0 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Text className={`text-[10px] font-black ${activeOrdersCount > 0 ? "text-white" : "text-gray-600"}`}>
                      {activeOrdersCount} Active
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                </View>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(mobile)/(tabs)/orders",
                    params: { tab: "reservations", from: "profile" },
                  })
                }
                className="flex-row justify-between items-center p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 active:bg-orange-50/50"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-7 h-7 rounded-lg bg-blue-50 items-center justify-center">
                    <Ionicons name="calendar-outline" size={15} color="#0284C7" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-800">Table Bookings</Text>
                    <Text className="text-[10px] text-gray-500">Dine-in table reservations</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className={`px-2 py-0.5 rounded-full ${activeReservationsCount > 0 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Text className={`text-[10px] font-black ${activeReservationsCount > 0 ? "text-white" : "text-gray-600"}`}>
                      {activeReservationsCount} Booked
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* 5. ABOUT MFF (Scaled down) */}
        <View className="bg-white rounded-2xl border border-gray-200/80 p-3.5 shadow-xs mb-4">
          <Text className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-2">
            About Mati FoodFinder
          </Text>
          <View className="gap-1.5">
            <View className="flex-row justify-between items-center py-1 border-b border-gray-100">
              <Text className="text-[11px] text-gray-600">Coverage</Text>
              <Text className="text-[11px] font-bold text-[#EA5410]">Mati City Exclusive</Text>
            </View>
            <View className="flex-row justify-between items-center py-1 border-b border-gray-100">
              <Text className="text-[11px] text-gray-600">Payment Protocol</Text>
              <Text className="text-[11px] font-bold text-gray-800">Cash on Delivery (COD)</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-[11px] text-gray-600">App Version</Text>
              <Text className="text-[11px] font-mono text-gray-500">v1.0.0 (Expo SDK 57)</Text>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Floating New Delivery Address Modal */}
      <Modal
        visible={showAddCustomAddress}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCustomAddress(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-xl border border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="location" size={16} color="#EA5410" />
                <Text className="text-sm font-black text-gray-900">
                  New Delivery Address
                </Text>
              </View>
              <Pressable
                onPress={() => setShowAddCustomAddress(false)}
                className="w-7 h-7 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <Ionicons name="close" size={16} color="#4B5563" />
              </Pressable>
            </View>

            {/* Location Input */}
            <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Location
            </Text>
            <TextInput
              value={newAddressLabel}
              onChangeText={setNewAddressLabel}
              autoFocus={true}
              placeholder="e.g. Home, Office, Beach"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-2.5 font-medium"
              placeholderTextColor="#9ca3af"
            />

            {/* Barangay Selector */}
            <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Barangay
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2.5"
              contentContainerStyle={{ gap: 6 }}
            >
              {matiBarangays.map((b) => {
                const isSelected = newAddressBarangay === b;
                return (
                  <Pressable
                    key={b}
                    onPress={() => setNewAddressBarangay(b)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? "bg-[#EA5410] border-[#EA5410] shadow-2xs"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        isSelected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {b}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Street / Landmark Input */}
            <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Street / Landmark
            </Text>
            <TextInput
              value={newAddressLandmark}
              onChangeText={setNewAddressLandmark}
              placeholder="e.g. Purok 4, near Menzi Beach Park"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-4 font-medium"
              placeholderTextColor="#9ca3af"
            />

            {/* Action Buttons */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowAddCustomAddress(false)}
                className="flex-1 py-2.5 bg-gray-100 border border-gray-200 rounded-xl items-center active:bg-gray-200"
              >
                <Text className="text-gray-700 text-xs font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCustomAddress}
                className="flex-1 py-2.5 bg-[#EA5410] rounded-xl items-center shadow-xs active:opacity-90"
              >
                <Text className="text-white text-xs font-black">Save Address</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Bottom Sheet */}
      <NotificationsSheet
        visible={showNotificationsSheet}
        onClose={() => setShowNotificationsSheet(false)}
        notifications={displayNotifications}
        onSelectNotification={(notif) => {
          setShowNotificationsSheet(false);
          if (notif.type === "order" || notif.type === "reservation") {
            router.push("/(mobile)/(tabs)/orders");
          }
        }}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />
    </SafeAreaView>
  );
}
