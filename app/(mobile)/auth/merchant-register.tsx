import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Redirect } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";

export default function MerchantRegisterScreen() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/(web)/auth/store-register" />;
  }

  const router = useRouter();
  const { signUp } = useSession();

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeOwnerName, setStoreOwnerName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePassword, setStorePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasUploadedDoc, setHasUploadedDoc] = useState(false);
  const [storeSubmittedVisible, setStoreSubmittedVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !storeName.trim() ||
      !storeAddress.trim() ||
      !storeOwnerName.trim() ||
      !storePhone.trim() ||
      !storeEmail.trim() ||
      !storePassword.trim()
    ) {
      Alert.alert("Missing Fields", "Please fill in all 6 required store and owner fields.");
      return;
    }

    if (storePassword.trim().length < 12) {
      Alert.alert("Password Too Short", "Please choose a strong password with at least 12 characters.");
      return;
    }

    if (!hasUploadedDoc) {
      Alert.alert(
        "Verification Document Required",
        "Please tap the upload box to attach a photo of your Store Front or Business Permit."
      );
      return;
    }

    setLoading(true);
    try {
      await signUp(storeOwnerName.trim(), storeEmail.trim(), storePassword, storePhone.trim());
      setStoreSubmittedVisible(true);
    } catch (err: any) {
      const msg = authMessage(err);
      Alert.alert("Registration Failed", err.message && !err.code ? err.message : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </Pressable>
        <View className="items-center">
          <Text className="text-base font-black text-gray-900">Partner with MFF</Text>
          <Text className="text-xs text-orange-600 font-bold">2-Month Free Introductory Trial</Text>
        </View>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION 1: STORE INFORMATION */}
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
            1. Store Information
          </Text>

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Store Name *</Text>
          <TextInput
            placeholder="e.g. Mama Letty's Karenderia"
            value={storeName}
            onChangeText={setStoreName}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Complete Address *</Text>
          <TextInput
            placeholder="Street, Barangay, Landmark (Mati City only)"
            value={storeAddress}
            onChangeText={setStoreAddress}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-4"
            placeholderTextColor="#9ca3af"
          />

          {/* SECTION 2: OWNER DETAILS */}
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 pt-2 border-t border-gray-100">
            2. Owner Details
          </Text>

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Full Name *</Text>
          <TextInput
            placeholder="Owner's Name"
            value={storeOwnerName}
            onChangeText={setStoreOwnerName}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Mobile Number (GCash) *</Text>
          <TextInput
            placeholder="09XX XXX XXXX"
            value={storePhone}
            onChangeText={setStorePhone}
            keyboardType="phone-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Email Address *</Text>
          <TextInput
            placeholder="store@example.com"
            value={storeEmail}
            onChangeText={setStoreEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Password (Min. 12 characters) *</Text>
          <View className="relative flex-row items-center mb-4">
            <TextInput
              placeholder="Create a secure password"
              value={storePassword}
              onChangeText={setStorePassword}
              secureTextEntry={!showPassword}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-3.5 pr-11 py-3 text-sm text-gray-900"
              placeholderTextColor="#9ca3af"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={10}
              className="absolute right-3.5 z-10"
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6b7280"
              />
            </Pressable>
          </View>

          {/* SECTION 3: VERIFICATION DOCUMENTS */}
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1 pt-2 border-t border-gray-100">
            3. Verification Documents
          </Text>
          <Text className="text-[11px] text-gray-500 mb-3">
            To ensure platform quality, please upload a clear photo of your Store Front or Business Permit.
          </Text>

          <Pressable
            onPress={() => {
              setHasUploadedDoc(true);
              Alert.alert("Document Attached 📸", "Store front / permit photo attached successfully.");
            }}
            className={`w-full p-4 rounded-2xl border-2 border-dashed items-center justify-center mb-5 ${
              hasUploadedDoc ? "bg-emerald-50 border-emerald-400" : "bg-gray-50 border-gray-300"
            }`}
          >
            <Text className="text-2xl mb-1">{hasUploadedDoc ? "✅" : "📸"}</Text>
            <Text className={`font-bold text-xs ${hasUploadedDoc ? "text-emerald-800" : "text-gray-700"}`}>
              {hasUploadedDoc ? "Document Attached (permit_mati.jpg)" : "Tap to Upload Store Document"}
            </Text>
            <Text className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</Text>
          </Pressable>

          {/* Promo Banner */}
          <View className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-5">
            <Text className="text-xs font-bold text-orange-900">
              🎉 2-Month Free Introductory Trial Included
            </Text>
            <Text className="text-[11px] text-orange-800 mt-1 leading-snug">
              No upfront fees. PayMongo auto-renewal at ₱499/month starts after 60 days. Cancel anytime.
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className="w-full py-3.5 bg-orange-500 rounded-xl items-center shadow-md mb-6"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">Submit Store Application</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUBMISSION CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={storeSubmittedVisible}
        onRequestClose={() => setStoreSubmittedVisible(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center p-5">
          <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl items-center text-center">
            <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">✉️</Text>
            </View>

            <Text className="text-xl font-black text-gray-900 text-center mb-2">
              Application & Account Created!
            </Text>

            <Text className="text-xs text-gray-600 text-center mb-5 leading-relaxed">
              We have sent a verification email to {storeEmail}. Please verify your email. Once approved by the Mati FoodFinder admin team, you will be able to sign in and open your live kitchen dashboard!
            </Text>

            <Pressable
              onPress={() => {
                setStoreSubmittedVisible(false);
                router.replace("/(mobile)/auth/merchant-login");
              }}
              className="w-full py-3 bg-orange-500 rounded-xl items-center mb-2.5"
            >
              <Text className="text-white font-bold text-xs">Proceed to Store Sign In</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setStoreSubmittedVisible(false);
                router.replace("/(mobile)/portal");
              }}
              className="w-full py-2.5 bg-gray-100 rounded-xl items-center"
            >
              <Text className="text-gray-700 font-bold text-xs">Return to Access Portal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
