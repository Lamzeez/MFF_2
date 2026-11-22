import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { MATI_BARANGAYS } from "../../../mock/barangays";
import { BarangayAutofillInput } from "../../../components/ui/BarangayAutofillInput";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";
import {
  PH_MOBILE_ERROR_MESSAGE,
  filterPhoneInput,
  isValidPhilippineMobile,
  sanitizePhoneNumber,
} from "../../../lib/phone";
import {
  ImageUploadDropzone,
  SelectedMerchantImageAsset,
} from "../../../components/merchant/ImageUploadDropzone";
import { uploadCourierDocument } from "../../../services/storage";
import { evaluateMerchantPassword } from "../../../services/merchant-registration";
import { TermsModal } from "../../../components/ui/TermsModal";

const mffLogo = require("../../../assets/logo.jpg");

function AnimatedRulePhrase({
  met,
  text,
  pendingColor,
}: {
  met: boolean;
  text: string;
  pendingColor: string;
}) {
  const progress = useRef(new Animated.Value(met ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: met ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [met, progress]);

  const color = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pendingColor, "#059669"],
  });

  return (
    <Animated.Text style={{ color, fontWeight: met ? "600" : "500" }}>
      {text}
    </Animated.Text>
  );
}

function LivePasswordSentence({
  password,
  evaluation,
  showErrorState,
}: {
  password: string;
  evaluation: ReturnType<typeof evaluateMerchantPassword>;
  showErrorState: boolean;
}) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const prevMetCount = useRef(evaluation.metCount);

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    if (evaluation.metCount > prevMetCount.current) {
      pulseScale.setValue(1);
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.025,
          duration: 120,
          useNativeDriver,
        }),
        Animated.spring(pulseScale, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver,
        }),
      ]).start();
    }
    prevMetCount.current = evaluation.metCount;
  }, [evaluation.metCount, pulseScale]);

  if (password.length > 0 && !evaluation.noEdgeWhitespace) {
    return (
      <View className="flex-row items-center gap-1 mt-1.5 ml-0.5">
        <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
        <Text className="text-[11px] font-medium text-red-600 flex-1">
          Password cannot start or end with spaces.
        </Text>
      </View>
    );
  }

  const pendingColor = showErrorState
    ? "#DC2626"
    : password.length > 0
      ? "#EA5410"
      : "#6B7280";

  return (
    <Animated.View
      style={{ transform: [{ scale: pulseScale }] }}
      className="flex-row items-start gap-1 mt-1.5 ml-0.5"
    >
      {evaluation.isValid ? (
        <Ionicons
          name="checkmark-circle"
          size={13}
          color="#059669"
          style={{ marginTop: 1 }}
        />
      ) : showErrorState ? (
        <Ionicons
          name="alert-circle-outline"
          size={12}
          color="#DC2626"
          style={{ marginTop: 2 }}
        />
      ) : null}
      <Text className="text-[11px] leading-4 flex-1">
        <AnimatedRulePhrase
          met={evaluation.isValid}
          text="Password must be "
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.minLength}
          text="12+ characters"
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.isValid}
          text=" with "
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.hasUppercase}
          text="uppercase"
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.isValid}
          text=", "
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.hasLowercase}
          text="lowercase"
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.isValid}
          text=", and "
          pendingColor={pendingColor}
        />
        <AnimatedRulePhrase
          met={evaluation.hasNumber}
          text="a number."
          pendingColor={pendingColor}
        />
      </Text>
    </Animated.View>
  );
}

export default function RiderRegisterScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { signUp } = useSession("rider");

  const [riderName, setRiderName] = useState("");
  const [riderEmail, setRiderEmail] = useState("");
  const [riderPassword, setRiderPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [riderPhone, setRiderPhone] = useState("");
  const [riderMotorcycle, setRiderMotorcycle] = useState("");
  const [riderPlate, setRiderPlate] = useState("");
  const [riderLicense, setRiderLicense] = useState("");
  const [riderLicenseExpiry, setRiderLicenseExpiry] = useState("");
  const [riderBarangay, setRiderBarangay] = useState("Central (City Proper/Poblacion)");
  const [riderCodAgreed, setRiderCodAgreed] = useState(false);
  const [licenseAsset, setLicenseAsset] = useState<SelectedMerchantImageAsset | null>(null);
  const [vehicleAsset, setVehicleAsset] = useState<SelectedMerchantImageAsset | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const passwordEval = useMemo(() => evaluateMerchantPassword(riderPassword), [riderPassword]);

  useEffect(() => {
    if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
      router.replace("/portal");
    }
  }, [width, router]);

  const handleRegister = async () => {
    // 1. Required field checks
    if (
      !riderName.trim() ||
      !riderEmail.trim() ||
      !riderPassword.trim() ||
      !confirmPassword.trim() ||
      !riderPhone.trim() ||
      !riderMotorcycle.trim() ||
      !riderPlate.trim() ||
      !riderLicense.trim() ||
      !riderLicenseExpiry.trim()
    ) {
      Alert.alert("Missing Fields", "Please fill in all courier information fields.");
      return;
    }

    // 2. Full Name validation (letters, spaces, dots, hyphens only, min 3 chars)
    const cleanName = riderName.trim();
    if (cleanName.length < 3 || !/^[a-zA-Z\s.-]+$/.test(cleanName)) {
      Alert.alert("Invalid Name", "Please enter your full legal name using letters only.");
      return;
    }

    // 3. Mobile phone validation
    if (!isValidPhilippineMobile(riderPhone)) {
      Alert.alert("Invalid Mobile Number", PH_MOBILE_ERROR_MESSAGE);
      return;
    }

    // 4. Email format validation
    const cleanEmail = riderEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // 5. Plate Number validation (min 4 alphanumeric/hyphen characters)
    const cleanPlate = riderPlate.trim().toUpperCase();
    if (cleanPlate.length < 4 || !/^[A-Z0-9-\s]+$/.test(cleanPlate)) {
      Alert.alert("Invalid Plate Number", "Please enter a valid motorcycle plate or MV File number.");
      return;
    }

    // 6. Driver's License Number validation (Philippine LTO format: e.g. L02-19-123456 or alphanumeric 10-13 chars)
    const cleanLicense = riderLicense.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,3}-\d{2}-\d{6}$/.test(cleanLicense) && !/^[A-Z0-9-]{8,15}$/.test(cleanLicense)) {
      Alert.alert(
        "Invalid Driver's License",
        "Driver's license must follow the Philippine LTO format (e.g. L02-19-123456)."
      );
      return;
    }

    // 7. License Expiration Date validation (YYYY-MM-DD, must be future date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(riderLicenseExpiry.trim())) {
      Alert.alert("Invalid Expiry Date", "License expiration date must be formatted as YYYY-MM-DD.");
      return;
    }

    const expiryDate = new Date(riderLicenseExpiry.trim());
    if (isNaN(expiryDate.getTime())) {
      Alert.alert("Invalid Expiry Date", "Please enter a valid calendar date.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate <= today) {
      Alert.alert(
        "Expired Driver's License",
        "Your driver's license must be currently valid and not expired to register as a courier."
      );
      return;
    }

    // 8. Password criteria & minimum length check
    if (!passwordEval.isValid) {
      setTouchedPassword(true);
      if (!passwordEval.minLength) {
        Alert.alert("Password Too Short", "Please choose a strong password with at least 12 characters.");
      } else if (!passwordEval.hasUppercase || !passwordEval.hasLowercase || !passwordEval.hasNumber) {
        Alert.alert(
          "Weak Password",
          "Your password must contain at least one uppercase letter, one lowercase letter, and one number."
        );
      } else {
        Alert.alert("Invalid Password", "Please meet all password requirements.");
      }
      return;
    }

    // 9. Password confirmation check
    if (riderPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please verify your password.");
      return;
    }

    // 10. Required Courier Verification Documents
    if (!licenseAsset || !vehicleAsset) {
      Alert.alert(
        "Documents Required",
        "Please upload clear photos of your Driver's License and Vehicle Registration (OR/CR) for Super Admin verification."
      );
      return;
    }

    // 11. COD Remittance Agreement check
    if (!riderCodAgreed) {
      Alert.alert("Agreement Required", "Please agree to the Cash-on-Delivery remittance protocol.");
      return;
    }

    setLoading(true);
    setUploadingDocs(true);
    try {
      const applicantId = `app_${Date.now()}_${cleanPlate.replace(/[^A-Z0-9]/g, "")}`;
      const [licenseRes, vehicleRes] = await Promise.all([
        uploadCourierDocument(licenseAsset.blobOrUri, "license", applicantId, {
          mimeType: licenseAsset.mimeType,
        }),
        uploadCourierDocument(vehicleAsset.blobOrUri, "vehicle_or_cr", applicantId, {
          mimeType: vehicleAsset.mimeType,
        }),
      ]);

      if (licenseRes.error || vehicleRes.error) {
        Alert.alert(
          "Document Upload Warning",
          licenseRes.error || vehicleRes.error || "Could not upload courier verification documents. Please check file format."
        );
        return;
      }

      await signUp(cleanName, cleanEmail, riderPassword, sanitizePhoneNumber(riderPhone), {
        license_document_url: licenseRes.publicUrl,
        vehicle_document_url: vehicleRes.publicUrl,
        motorcycle_info: `${riderMotorcycle.trim()} (${cleanPlate})`,
        barangay: riderBarangay,
        license_number: cleanLicense,
        license_expiry: riderLicenseExpiry.trim(),
      });
      Alert.alert(
        "Application Submitted! 🏍️",
        `Thank you ${cleanName}! We have sent a verification email to ${cleanEmail}. Once approved by the Mati FoodFinder admin team, your rider account will be active!`,
        [{ text: "Go to Rider Login", onPress: () => router.replace("/(mobile)/auth/rider-login") }]
      );
    } catch (err: any) {
      const msg = authMessage(err);
      Alert.alert("Registration Failed", err.message && !err.code ? err.message : msg);
    } finally {
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
        >
          {/* Main Responsive Canvas matching Store Admin Layout */}
          <View className="w-full max-w-[920px] self-center px-4 sm:px-6 lg:px-8 py-5">
            {/* Top Navigation Strip: Back to Home on Left, Logo & Branding on Right */}
            <View className="flex-row flex-wrap items-center justify-between gap-3 mb-5">
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
              >
                <Ionicons name="arrow-back" size={13} color="#374151" />
                <Text className="text-[11px] font-semibold text-gray-700">Back to Home</Text>
              </Pressable>

              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg bg-white border border-gray-200 p-0.5 items-center justify-center overflow-hidden shadow-2xs">
                  <Image
                    source={mffLogo}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                    resizeMode="contain"
                    accessibilityLabel="Mati FoodFinder logo"
                  />
                </View>
                <Text className="text-gray-900 text-sm font-bold tracking-tight">
                  Mati FoodFinder
                </Text>
              </View>
            </View>

            {/* Header Block */}
            <View className="mb-5">
              <Text className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Courier Application
              </Text>
              <Text className="text-gray-500 text-xs mt-1 leading-relaxed">
                Provide accurate courier details, vehicle credentials, and verification documents to deliver in Mati City.
              </Text>
            </View>

            {/* CARD 1: PERSONAL INFORMATION */}
            <View className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 mb-5 shadow-2xs">
              <View className="flex-row items-center gap-2 mb-4 pb-2.5 border-b border-gray-100">
                <View className="w-7 h-7 rounded-lg bg-orange-50 items-center justify-center">
                  <Ionicons name="person-outline" size={15} color="#EA5410" />
                </View>
                <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Personal Information
                </Text>
              </View>

              <View className="gap-3.5">
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">Full Legal Name *</Text>
                  <TextInput
                    placeholder="e.g. Juan D. Dela Cruz"
                    value={riderName}
                    onChangeText={(text) => setRiderName(text.replace(/[^a-zA-Z\s.-]/g, ""))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View className="flex-col sm:flex-row gap-3.5">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                      Mobile Number (Active for Dispatch) *
                    </Text>
                    <TextInput
                      placeholder="0912 345 6789"
                      value={riderPhone}
                      onChangeText={(text) => setRiderPhone(filterPhoneInput(text))}
                      maxLength={13}
                      keyboardType="phone-pad"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                      Email Address (Account Sign-In) *
                    </Text>
                    <TextInput
                      placeholder="courier@email.com"
                      value={riderEmail}
                      onChangeText={(text) => setRiderEmail(text.trim().toLowerCase())}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <BarangayAutofillInput
                  value={riderBarangay}
                  onSelectBarangay={setRiderBarangay}
                  label="Barangay of Residence in Mati City *"
                  placeholder="Type to search official Mati barangay..."
                  containerClassName="mb-1"
                />
              </View>
            </View>

            {/* CARD 2: MOTORCYCLE & VEHICLE CREDENTIALS */}
            <View className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 mb-5 shadow-2xs">
              <View className="flex-row items-center gap-2 mb-4 pb-2.5 border-b border-gray-100">
                <View className="w-7 h-7 rounded-lg bg-orange-50 items-center justify-center">
                  <Ionicons name="bicycle-outline" size={15} color="#EA5410" />
                </View>
                <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Vehicle & Driver Credentials
                </Text>
              </View>

              <View className="gap-3.5">
                <View className="flex-col sm:flex-row gap-3.5">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                      Motorcycle Make & Model *
                    </Text>
                    <TextInput
                      placeholder="e.g. Honda Click 125i, Yamaha Mio, Suzuki Smash"
                      value={riderMotorcycle}
                      onChangeText={(text) => setRiderMotorcycle(text.replace(/[^a-zA-Z0-9\s/.-]/g, ""))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                      Plate Number / MV File No. *
                    </Text>
                    <TextInput
                      placeholder="e.g. 123-ABC or MV File No."
                      value={riderPlate}
                      onChangeText={(text) => setRiderPlate(text.toUpperCase().replace(/[^A-Z0-9-\s]/g, ""))}
                      maxLength={12}
                      autoCapitalize="characters"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View className="flex-col sm:flex-row gap-3.5">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                      Driver's License Number *
                    </Text>
                    <TextInput
                      placeholder="L02-19-123456"
                      value={riderLicense}
                      onChangeText={(text) => setRiderLicense(text.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                      maxLength={13}
                      autoCapitalize="characters"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                      Driver's License Expiry Date *
                    </Text>
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      value={riderLicenseExpiry}
                      onChangeText={(text) => setRiderLicenseExpiry(text.replace(/[^0-9-]/g, ""))}
                      maxLength={10}
                      keyboardType="numbers-and-punctuation"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* CARD 3: VERIFICATION DOCUMENTS */}
            <View className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 mb-5 shadow-2xs">
              <View className="flex-row items-center gap-2 mb-4 pb-2.5 border-b border-gray-100">
                <View className="w-7 h-7 rounded-lg bg-orange-50 items-center justify-center">
                  <Ionicons name="document-text-outline" size={15} color="#EA5410" />
                </View>
                <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Verification Documents
                </Text>
              </View>

              <View className="gap-3.5">
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                    Driver's License Photo (Front) *
                  </Text>
                  <ImageUploadDropzone
                    title="Upload Driver's License"
                    subtitle="Drag & drop or tap to select license (PNG, JPG up to 5MB)"
                    previewUrl={licenseAsset?.previewUri || null}
                    variant="compact"
                    disabled={loading || uploadingDocs}
                    uploading={uploadingDocs}
                    onSelectAsset={(asset) => setLicenseAsset(asset)}
                    onRemoveAsset={() => setLicenseAsset(null)}
                    onValidationError={(msg) => Alert.alert("License Photo Notice", msg)}
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                    Vehicle Registration (OR / CR) *
                  </Text>
                  <ImageUploadDropzone
                    title="Upload Vehicle Registration (OR/CR)"
                    subtitle="Drag & drop or tap to select OR/CR (PNG, JPG up to 5MB)"
                    previewUrl={vehicleAsset?.previewUri || null}
                    variant="compact"
                    disabled={loading || uploadingDocs}
                    uploading={uploadingDocs}
                    onSelectAsset={(asset) => setVehicleAsset(asset)}
                    onRemoveAsset={() => setVehicleAsset(null)}
                    onValidationError={(msg) => Alert.alert("Vehicle Document Notice", msg)}
                  />
                </View>
              </View>
            </View>

            {/* CARD 4: ACCOUNT SECURITY */}
            <View className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 mb-5 shadow-2xs">
              <View className="flex-row items-center gap-2 mb-4 pb-2.5 border-b border-gray-100">
                <View className="w-7 h-7 rounded-lg bg-orange-50 items-center justify-center">
                  <Ionicons name="lock-closed-outline" size={15} color="#EA5410" />
                </View>
                <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Account Security
                </Text>
              </View>

              <View className="flex-col sm:flex-row gap-3.5">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                    Password (12+ characters) *
                  </Text>
                  <View className="relative flex-row items-center">
                    <TextInput
                      placeholder="••••••••••••"
                      value={riderPassword}
                      onChangeText={setRiderPassword}
                      onBlur={() => setTouchedPassword(true)}
                      secureTextEntry={!showPassword}
                      className={`w-full bg-gray-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-900 focus:bg-white ${
                        touchedPassword && !passwordEval.isValid ? "border-red-300" : "border-gray-200 focus:border-[#EA5410]"
                      }`}
                      placeholderTextColor="#9ca3af"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={10}
                      className="absolute right-3 z-10 cursor-pointer"
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={17}
                        color="#6b7280"
                      />
                    </Pressable>
                  </View>
                  <LivePasswordSentence
                    password={riderPassword}
                    evaluation={passwordEval}
                    showErrorState={touchedPassword && !passwordEval.isValid}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-700 mb-1 ml-0.5">
                    Confirm Password *
                  </Text>
                  <View className="relative flex-row items-center">
                    <TextInput
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      className={`w-full bg-gray-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-900 focus:bg-white ${
                        confirmPassword.length > 0 && confirmPassword !== riderPassword
                          ? "border-red-300"
                          : "border-gray-200 focus:border-[#EA5410]"
                      }`}
                      placeholderTextColor="#9ca3af"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={10}
                      className="absolute right-3 z-10 cursor-pointer"
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={17}
                        color="#6b7280"
                      />
                    </Pressable>
                  </View>
                  {confirmPassword.length > 0 && confirmPassword !== riderPassword && (
                    <View className="flex-row items-center gap-1 mt-1.5 ml-0.5">
                      <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
                      <Text className="text-[11px] font-medium text-red-600 flex-1">
                        Passwords do not match.
                      </Text>
                    </View>
                  )}
                  {confirmPassword.length > 0 && confirmPassword === riderPassword && (
                    <View className="flex-row items-center gap-1 mt-1.5 ml-0.5">
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text className="text-[11px] font-medium text-emerald-700 flex-1">
                        Passwords match.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* CARD 5: COD PROTOCOL AGREEMENT */}
            <View className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 mb-5 shadow-2xs">
              <Pressable
                onPress={() => setRiderCodAgreed(!riderCodAgreed)}
                className="flex-row items-start gap-3 cursor-pointer"
              >
                <View className="mt-0.5">
                  <Ionicons
                    name={riderCodAgreed ? "checkbox" : "square-outline"}
                    size={20}
                    color={riderCodAgreed ? "#EA5410" : "#9CA3AF"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-900 mb-0.5">
                    Cash-on-Delivery (COD) Remittance Protocol
                  </Text>
                  <Text className="text-[11px] text-gray-600 leading-relaxed">
                    I agree to collect customer payments and remit food totals accurately to Mati FoodFinder partner restaurants upon delivery completion.
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowTermsModal(true);
                    }}
                    className="mt-1.5"
                  >
                    <Text className="text-[11px] font-bold text-[#EA5410] underline cursor-pointer">
                      Review Full Courier Partner Terms & Conditions →
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </View>

            {/* SUBMIT BUTTON */}
            <Pressable
              onPress={handleRegister}
              disabled={loading || !riderCodAgreed}
              className={`w-full py-3.5 rounded-xl items-center shadow-md mb-4 transition-colors ${
                loading || !riderCodAgreed
                  ? "bg-gray-300 cursor-not-allowed opacity-60"
                  : "bg-[#EA5410] hover:bg-[#D04508] active:bg-[#B83B06] cursor-pointer"
              }`}
              style={{ opacity: loading || !riderCodAgreed ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-sm tracking-wide">
                  Submit Courier Application
                </Text>
              )}
            </Pressable>

            {/* LINK TO SIGN IN */}
            <View className="flex-row items-center justify-center gap-1.5 pb-6">
              <Text className="text-xs text-gray-500">Already an approved courier?</Text>
              <Link href="/(mobile)/auth/rider-login" asChild>
                <Pressable className="cursor-pointer">
                  <Text className="text-xs font-bold text-[#EA5410] hover:underline">
                    Sign in to Rider Portal →
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Courier Partner Terms & Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        role="rider"
        showAcceptButton={true}
        onAccept={() => setRiderCodAgreed(true)}
        onClose={() => setShowTermsModal(false)}
      />
    </SafeAreaView>
  );
}
