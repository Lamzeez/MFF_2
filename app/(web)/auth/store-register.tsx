import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSession } from "../../../context/SessionContext";
import { authMessage } from "../../../services/auth";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { uploadStoreVerificationDocument } from "../../../services/storage";
import { filterPhoneInput, sanitizePhoneNumber } from "../../../lib/phone";
import { BarangayAutofillInput } from "../../../components/ui/BarangayAutofillInput";
import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  MAX_DOCUMENT_SIZE_BYTES,
  STORE_BARANGAY_OPTIONS,
  STORE_CUISINE_OPTIONS,
  STORE_OPERATING_TIME_OPTIONS,
  type StoreRegistrationFieldKey,
  buildOperatingHoursString,
  buildStoreDescription,
  clearMerchantRegistrationDraft,
  evaluateMerchantPassword,
  filterAddressInput,
  filterDescriptionInput,
  filterEmailInput,
  filterOtpInput,
  filterOwnerNameInput,
  filterStoreNameInput,
  getBarangayDefaultCoordinates,
  isWithinMatiBounds,
  loadDraftDocumentFile,
  loadMerchantRegistrationDraft,
  parseOperatingTimeMinutes,
  saveDraftDocumentFile,
  saveMerchantRegistrationDraft,
  submitMerchantStoreApplication,
  validateStoreRegistrationFieldErrors,
  validateVerificationDocumentFile,
} from "../../../services/merchant-registration";
import StoreMapPicker from "../../../components/auth/StoreMapPicker";
import { MATI_CITY_HALL_COORDS } from "../../../lib/geo-serviceability";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import { TermsModal } from "../../../components/ui/TermsModal";

const mffLogo = require("../../../assets/logo.jpg");

interface PickedDocument {
  blobOrUri: Blob | string;
  previewUri: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  isObjectUrl?: boolean;
}

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View className="flex-row items-center gap-1 mt-1 ml-0.5">
      <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
      <Text className="text-[11px] font-medium text-red-600 flex-1">{message}</Text>
    </View>
  );
}

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

export default function StoreRegister() {
  const router = useRouter();
  const { signUp, verifyCode, resendConfirmation, retrySession } = useSession("merchant");

  // Store details
  const [storeName, setStoreName] = useState("");
  const [categories, setCategories] = useState<string[]>([STORE_CUISINE_OPTIONS[0]]);
  const [description, setDescription] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [openTime, setOpenTime] = useState(DEFAULT_OPEN_TIME);
  const [closeTime, setCloseTime] = useState(DEFAULT_CLOSE_TIME);
  const [isOpen24Hours, setIsOpen24Hours] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"open" | "close" | null>(null);

  // Location & map pinpoint
  const [barangay, setBarangay] = useState<string>(STORE_BARANGAY_OPTIONS[0]);
  const [addressText, setAddressText] = useState("");
  const [latitude, setLatitude] = useState<number>(MATI_CITY_HALL_COORDS.latitude);
  const [longitude, setLongitude] = useState<number>(MATI_CITY_HALL_COORDS.longitude);

  // Owner credentials
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification document
  const [documentAsset, setDocumentAsset] = useState<PickedDocument | null>(null);

  // Validation state
  const [touched, setTouched] = useState<Partial<Record<StoreRegistrationFieldKey, boolean>>>({});
  const [submittedAttempt, setSubmittedAttempt] = useState(false);

  // Flow & feedback
  const scrollViewRef = useRef<ScrollView>(null);
  const dropZoneRef = useRef<View>(null);
  const dragDepthRef = useRef(0);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpCooldownUntil, setOtpCooldownUntil] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [banner, setBanner] = useState<BannerMessage | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const hasDraftContent = Boolean(
    storeName ||
      description ||
      storePhone ||
      addressText ||
      ownerName ||
      ownerPhone ||
      email ||
      documentAsset ||
      categories.length !== 1 ||
      categories[0] !== STORE_CUISINE_OPTIONS[0] ||
      barangay !== STORE_BARANGAY_OPTIONS[0] ||
      openTime !== DEFAULT_OPEN_TIME ||
      closeTime !== DEFAULT_CLOSE_TIME ||
      isOpen24Hours
  );

  useEffect(() => {
    let active = true;
    const hydrateDraft = async () => {
      const saved = loadMerchantRegistrationDraft();
      if (saved && active) {
        const hasMeaningfulDraft = Boolean(
          saved.storeName ||
            saved.description ||
            saved.storePhone ||
            saved.addressText ||
            saved.ownerName ||
            saved.ownerPhone ||
            saved.email ||
            saved.step === "otp"
        );
        setStoreName(saved.storeName);
        setCategories(saved.categories);
        setDescription(saved.description);
        setStorePhone(saved.storePhone);
        setOpenTime(saved.openTime);
        setCloseTime(saved.closeTime);
        setIsOpen24Hours(saved.isOpen24Hours);
        setBarangay(saved.barangay);
        setAddressText(saved.addressText);
        setLatitude(saved.latitude);
        setLongitude(saved.longitude);
        setOwnerName(saved.ownerName);
        setOwnerPhone(saved.ownerPhone);
        setEmail(saved.email);
        setStep(saved.step);
        setOtpCooldownUntil(saved.otpCooldownUntil);
        if (saved.otpCooldownUntil > Date.now()) {
          setResendCooldown(Math.ceil((saved.otpCooldownUntil - Date.now()) / 1000));
        }
        if (hasMeaningfulDraft) {
          setHasRestoredDraft(true);
        }
      }

      const savedDoc = await loadDraftDocumentFile();
      if (savedDoc && active) {
        const previewUri =
          Platform.OS === "web" && typeof URL !== "undefined"
            ? URL.createObjectURL(savedDoc.blob)
            : "";
        setDocumentAsset({
          blobOrUri: savedDoc.blob,
          previewUri,
          fileName: savedDoc.fileName,
          mimeType: savedDoc.mimeType,
          sizeBytes: savedDoc.sizeBytes,
          isObjectUrl: Boolean(previewUri),
        });
        setHasRestoredDraft(true);
      }

      if (active) {
        setDraftHydrated(true);
      }
    };

    void hydrateDraft();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    if (!hasDraftContent && step === "form") {
      clearMerchantRegistrationDraft();
      return;
    }
    saveMerchantRegistrationDraft({
      storeName,
      categories,
      description,
      storePhone,
      openTime,
      closeTime,
      isOpen24Hours,
      barangay,
      addressText,
      latitude,
      longitude,
      ownerName,
      ownerPhone,
      email,
      step,
      otpCooldownUntil,
    });
  }, [
    draftHydrated,
    hasDraftContent,
    storeName,
    categories,
    description,
    storePhone,
    openTime,
    closeTime,
    isOpen24Hours,
    barangay,
    addressText,
    latitude,
    longitude,
    ownerName,
    ownerPhone,
    email,
    step,
    otpCooldownUntil,
  ]);

  useEffect(() => {
    if (otpCooldownUntil <= Date.now()) {
      setResendCooldown(0);
      return;
    }
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((otpCooldownUntil - Date.now()) / 1000));
      setResendCooldown(remaining);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [otpCooldownUntil]);

  useEffect(() => {
    return () => {
      if (
        Platform.OS === "web" &&
        documentAsset?.isObjectUrl &&
        typeof URL !== "undefined"
      ) {
        URL.revokeObjectURL(documentAsset.previewUri);
      }
    };
  }, [documentAsset]);

  const operatingHours = useMemo(
    () => buildOperatingHoursString({ isOpen24Hours, openTime, closeTime }),
    [isOpen24Hours, openTime, closeTime]
  );

  const passwordEval = useMemo(() => evaluateMerchantPassword(password), [password]);
  const mapInMatiBounds = useMemo(
    () => isWithinMatiBounds(latitude, longitude),
    [latitude, longitude]
  );

  const fieldErrors = useMemo(
    () =>
      validateStoreRegistrationFieldErrors({
        storeName,
        categories,
        description,
        storePhone,
        openTime,
        closeTime,
        isOpen24Hours,
        operatingHours,
        barangay,
        addressText,
        latitude,
        longitude,
        ownerName,
        ownerPhone,
        email,
        password,
        confirmPassword,
        hasDocument: Boolean(documentAsset),
      }),
    [
      storeName,
      categories,
      description,
      storePhone,
      openTime,
      closeTime,
      isOpen24Hours,
      operatingHours,
      barangay,
      addressText,
      latitude,
      longitude,
      ownerName,
      ownerPhone,
      email,
      password,
      confirmPassword,
      documentAsset,
    ]
  );

  const isFormValid = useMemo(() => {
    return Object.keys(fieldErrors).length === 0;
  }, [fieldErrors]);

  const canSubmit = !loading && termsAgreed && isFormValid;

  const markTouched = (field: StoreRegistrationFieldKey) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const getVisibleError = (field: StoreRegistrationFieldKey): string | undefined => {
    if (!submittedAttempt && !touched[field]) return undefined;
    return fieldErrors[field];
  };

  const handleToggleCategory = (item: string) => {
    setBanner(null);
    markTouched("categories");
    setCategories((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleSelectBarangay = (nextBarangay: string) => {
    setBanner(null);
    markTouched("barangay");
    markTouched("location");
    setBarangay(nextBarangay);
    const preset = getBarangayDefaultCoordinates(nextBarangay);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
  };

  const handleMapPinChange = useCallback((nextLat: number, nextLng: number) => {
    setBanner(null);
    setTouched((prev) => ({ ...prev, location: true }));
    setLatitude(nextLat);
    setLongitude(nextLng);
  }, []);

  const handleMapError = useCallback((message: string) => {
    setBanner({ type: "error", message });
  }, []);

  const handleClearMapError = useCallback(() => {
    setBanner(null);
  }, []);

  const processSelectedWebFile = useCallback((file: File) => {
    setBanner(null);
    setTouched((prev) => (prev.document ? prev : { ...prev, document: true }));

    const fileErr = validateVerificationDocumentFile({
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (fileErr) {
      setBanner({ type: "error", message: fileErr });
      return;
    }

    const previewUri =
      typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
    setDocumentAsset({
      blobOrUri: file,
      previewUri,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      isObjectUrl: Boolean(previewUri),
    });
    void saveDraftDocumentFile({
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || step !== "form") return;
    const node = dropZoneRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current += 1;
      setIsDraggingDoc(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      setIsDraggingDoc(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDraggingDoc(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setIsDraggingDoc(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        processSelectedWebFile(file);
      }
    };

    node.addEventListener("dragenter", handleDragEnter);
    node.addEventListener("dragover", handleDragOver);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("drop", handleDrop);

    return () => {
      node.removeEventListener("dragenter", handleDragEnter);
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
      dragDepthRef.current = 0;
      setIsDraggingDoc(false);
    };
  }, [step, processSelectedWebFile]);

  const handlePickDocument = async () => {
    setBanner(null);
    markTouched("document");

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement | null;
        const file = target?.files?.[0];
        if (file) {
          processSelectedWebFile(file);
        }
      };
      input.click();
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setBanner({
          type: "error",
          message: "Allow photo library access to upload your storefront or permit photo.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const picked = result.assets[0];
      const nativeMime = picked.mimeType || "image/jpeg";
      const fileErr = validateVerificationDocumentFile({
        mimeType: nativeMime,
        sizeBytes: typeof picked.fileSize === "number" ? picked.fileSize : undefined,
      });
      if (fileErr) {
        setBanner({ type: "error", message: fileErr });
        return;
      }

      if (typeof picked.fileSize === "number" && picked.fileSize > MAX_DOCUMENT_SIZE_BYTES) {
        setBanner({
          type: "error",
          message: "Upload an image up to 5MB in size (JPEG, PNG, or WebP).",
        });
        return;
      }

      setDocumentAsset({
        blobOrUri: picked.uri,
        previewUri: picked.uri,
        fileName: picked.fileName || "store-verification.jpg",
        mimeType: nativeMime,
        sizeBytes: picked.fileSize,
      });
    } catch {
      setBanner({
        type: "error",
        message: "Could not open your photo library. Please try again.",
      });
    }
  };

  const handleClearDraft = () => {
    clearMerchantRegistrationDraft();
    setStoreName("");
    setCategories([STORE_CUISINE_OPTIONS[0]]);
    setDescription("");
    setStorePhone("");
    setOpenTime(DEFAULT_OPEN_TIME);
    setCloseTime(DEFAULT_CLOSE_TIME);
    setIsOpen24Hours(false);
    setBarangay(STORE_BARANGAY_OPTIONS[0]);
    const preset = getBarangayDefaultCoordinates(STORE_BARANGAY_OPTIONS[0]);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setOwnerName("");
    setOwnerPhone("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDocumentAsset(null);
    setTouched({});
    setSubmittedAttempt(false);
    setStep("form");
    setOtpCode("");
    setOtpCooldownUntil(0);
    setResendCooldown(0);
    setHasRestoredDraft(false);
    setBanner({
      type: "success",
      message: "Cleared saved registration draft.",
    });
    scrollToTop();
  };

  const finalizeStoreSubmission = async (userId: string) => {
    if (!documentAsset) {
      throw new Error("Upload a storefront or business permit photo to continue.");
    }

    const uploadRes = await uploadStoreVerificationDocument(
      documentAsset.blobOrUri,
      userId,
      { mimeType: documentAsset.mimeType }
    );

    if (!uploadRes.publicUrl) {
      throw new Error(
        uploadRes.error || "Could not upload verification photo. Please retry."
      );
    }

    const combinedDescription = buildStoreDescription(categories, description);

    await submitMerchantStoreApplication({
      name: storeName,
      categories,
      addressText,
      barangay,
      publicPhone: storePhone,
      description: combinedDescription,
      operatingHours,
      deliveryEnabled: false,
      latitude,
      longitude,
      verificationDocumentUrl: uploadRes.publicUrl,
    });

    clearMerchantRegistrationDraft();
    setHasRestoredDraft(false);
    await retrySession();
    router.replace("/(web)/auth/verification");
  };

  const handleSubmitForm = async () => {
    setBanner(null);
    setSubmittedAttempt(true);

    const orderedErrorKeys: StoreRegistrationFieldKey[] = [
      "storeName",
      "storePhone",
      "categories",
      "description",
      "operatingHours",
      "barangay",
      "addressText",
      "location",
      "ownerName",
      "ownerPhone",
      "email",
      "password",
      "confirmPassword",
      "document",
    ];
    const firstKey = orderedErrorKeys.find((k) => Boolean(fieldErrors[k]));
    if (firstKey && fieldErrors[firstKey]) {
      setBanner({ type: "error", message: fieldErrors[firstKey]! });
      scrollToTop();
      return;
    }

    if (!termsAgreed) {
      setBanner({
        type: "error",
        message: "Please review and agree to the Store Merchant Terms & Conditions before submitting.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOwnerPhone = sanitizePhoneNumber(ownerPhone);

    setLoading(true);
    try {
      const client = getSupabaseClient("merchant");
      const {
        data: { user: existingUser },
      } = await client.auth.getUser();

      if (
        existingUser?.email?.toLowerCase() === normalizedEmail &&
        existingUser.email_confirmed_at
      ) {
        await finalizeStoreSubmission(existingUser.id);
        return;
      }

      const signUpResult = await signUp(
        ownerName.trim(),
        normalizedEmail,
        password,
        normalizedOwnerPhone
      );

      if (signUpResult?.isExistingUser) {
        setBanner({
          type: "error",
          message:
            "An account with this email is already registered in Mati FoodFinder. Use a different email address, or sign in via Merchant Log In if you already have a store account.",
        });
        scrollToTop();
        return;
      }

      const {
        data: { user: nextUser },
      } = await client.auth.getUser();

      if (nextUser && nextUser.email_confirmed_at) {
        await finalizeStoreSubmission(nextUser.id);
        return;
      }

      setOtpCode("");
      setOtpCooldownUntil(Date.now() + 60_000);
      setStep("otp");
      setBanner({
        type: "success",
        message: `We sent a 6-digit confirmation code to ${normalizedEmail}. Enter it below to finish submitting your store.`,
      });
      scrollToTop();
    } catch (err: unknown) {
      const msg = authMessage(err);
      const errMessage =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "";
      const hasCode = typeof err === "object" && err !== null && "code" in err;
      setBanner({
        type: "error",
        message: errMessage && !hasCode ? errMessage : msg,
      });
      scrollToTop();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSubmit = async () => {
    if (otpCode.length !== 6) {
      setBanner({ type: "error", message: "Enter the 6-digit numeric confirmation code." });
      scrollToTop();
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setBanner(null);
    setLoading(true);
    try {
      const client = getSupabaseClient("merchant");
      const {
        data: { user: existingUser },
      } = await client.auth.getUser();

      let userId =
        existingUser?.email?.toLowerCase() === normalizedEmail &&
        existingUser.email_confirmed_at
          ? existingUser.id
          : undefined;

      if (!userId) {
        await verifyCode(normalizedEmail, otpCode, "signup");
        const {
          data: { user: verifiedUser },
        } = await client.auth.getUser();
        if (!verifiedUser) {
          throw new Error("Verification succeeded, please try submitting again.");
        }
        userId = verifiedUser.id;
      }

      await finalizeStoreSubmission(userId);
    } catch (err: unknown) {
      const msg = authMessage(err);
      const errMessage =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "";
      const hasCode = typeof err === "object" && err !== null && "code" in err;
      setBanner({
        type: "error",
        message: errMessage && !hasCode ? errMessage : msg,
      });
      scrollToTop();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setBanner(null);
    setResending(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await resendConfirmation(normalizedEmail);
      setOtpCooldownUntil(Date.now() + 60_000);
      setBanner({
        type: "success",
        message: `Sent a fresh 6-digit code to ${normalizedEmail}.`,
      });
    } catch (err: unknown) {
      setBanner({ type: "error", message: authMessage(err) });
      scrollToTop();
    } finally {
      setResending(false);
    }
  };

  const handleSelectTimeSlot = (slot: string) => {
    markTouched("operatingHours");
    if (timePickerTarget === "open") {
      setOpenTime(slot);
      const nextOpenMins = parseOperatingTimeMinutes(slot);
      const currCloseMins = parseOperatingTimeMinutes(closeTime);
      if (nextOpenMins !== null && (currCloseMins === null || currCloseMins <= nextOpenMins)) {
        const nextValidClose = STORE_OPERATING_TIME_OPTIONS.find((candidate) => {
          const mins = parseOperatingTimeMinutes(candidate);
          return mins !== null && mins > nextOpenMins;
        });
        if (nextValidClose) setCloseTime(nextValidClose);
      }
    } else if (timePickerTarget === "close") {
      setCloseTime(slot);
    }
    setTimePickerTarget(null);
  };

  const openMinutes = parseOperatingTimeMinutes(openTime);

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="w-full max-w-[920px] self-center px-5 sm:px-6 lg:px-8 py-6">
          {/* Top Navigation Strip: Back to Home Top-Left & Branding Top-Right */}
          <View className="flex-row flex-wrap items-center justify-between gap-3 mb-6">
            <Link href="/" asChild>
              <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs">
                <Ionicons name="arrow-back" size={12} color="#374151" />
                <Text className="text-[11px] font-semibold text-gray-700">Back to Home</Text>
              </Pressable>
            </Link>

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

          {/* Header */}
          <View className="mb-5">
            <Text className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {step === "otp" ? "Verify Owner Email" : "Register Your Store"}
            </Text>
            <Text className="text-gray-500 text-xs mt-1 leading-relaxed">
              {step === "otp"
                ? "Confirm your email to complete your merchant application."
                : "Provide accurate store details, pinpoint your location in Mati City, and upload verification."}
            </Text>
          </View>

          {hasRestoredDraft && step === "form" && (
            <View className="flex-row flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 mb-4">
              <View className="flex-row items-center gap-2 flex-1 min-w-[200px]">
                <Ionicons name="document-text-outline" size={15} color="#B45309" />
                <Text className="text-[11px] font-medium text-amber-900 flex-1">
                  Saved registration draft restored. Re-enter your password for security before submitting.
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={handleClearDraft}
                  className="flex-row items-center gap-1 px-2.5 py-1 rounded-md bg-red-50/80 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors cursor-pointer shadow-2xs"
                  accessibilityRole="button"
                  accessibilityLabel="Clear Draft Form"
                >
                  <Ionicons name="trash-outline" size={12} color="#DC2626" />
                  <Text className="text-[11px] font-bold text-red-700">
                    Clear Draft
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setHasRestoredDraft(false)}
                  className="p-1 rounded hover:bg-amber-100 cursor-pointer"
                  accessibilityLabel="Dismiss draft notification"
                >
                  <Ionicons name="close" size={14} color="#92400E" />
                </Pressable>
              </View>
            </View>
          )}

          <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

          {step === "otp" ? (
            <View className="bg-white border border-gray-200/90 rounded-2xl p-6 max-w-[460px] self-center w-full mt-2 shadow-sm">
              <View className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center self-center mb-3">
                <Ionicons name="mail-open-outline" size={24} color="#EA5410" />
              </View>

              <Text className="text-base font-bold text-gray-900 text-center">
                Enter 6-Digit Confirmation Code
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1 mb-5 leading-relaxed">
                Sent to{" "}
                <Text className="text-gray-900 font-semibold">
                  {email.trim().toLowerCase()}
                </Text>
              </Text>

              <View className="relative mb-5">
                <View className="flex-row justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otpCode[index] || "";
                    const isCurrent = otpCode.length === index;
                    return (
                      <View
                        key={index}
                        className={`flex-1 max-w-[48px] h-14 rounded-2xl border-2 items-center justify-center ${
                          isCurrent
                            ? "border-[#EA5410] bg-white shadow-2xs"
                            : digit
                              ? "border-gray-400 bg-white"
                              : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <Text className="text-2xl font-black text-gray-900">{digit}</Text>
                      </View>
                    );
                  })}
                </View>
                <TextInput
                  accessibilityLabel="6-Digit Confirmation Code"
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(filterOtpInput(text))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus={true}
                  editable={!loading}
                  onSubmitEditing={handleVerifyOtpAndSubmit}
                  className="absolute inset-0 opacity-0 text-transparent"
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verify and Submit Store Application"
                onPress={handleVerifyOtpAndSubmit}
                disabled={loading || otpCode.length !== 6}
                className={`w-full py-3 rounded-xl items-center transition-colors ${
                  loading || otpCode.length !== 6
                    ? "bg-orange-300"
                    : "bg-[#EA5410] hover:bg-[#D04508]"
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-bold text-xs tracking-wide">
                    Verify & Submit Store Application
                  </Text>
                )}
              </Pressable>

              <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
                {resendCooldown > 0 ? (
                  <Text className="text-[11px] font-medium text-gray-400">
                    Resend code in <Text className="font-bold text-gray-600">{resendCooldown}s</Text>
                  </Text>
                ) : (
                  <Pressable onPress={handleResendOtp} disabled={resending || loading}>
                    <Text className="text-[11px] font-semibold text-[#EA5410] hover:underline">
                      {resending ? "Sending code..." : "Didn't get the code? Resend"}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setBanner(null);
                    setStep("form");
                    scrollToTop();
                  }}
                  disabled={loading}
                >
                  <Text className="text-[11px] font-semibold text-gray-500 hover:text-gray-800">
                    Edit details
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="gap-5 pb-6">
              {/* Section 1: Store Information */}
              <View className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
                <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-md bg-orange-100 items-center justify-center">
                      <Ionicons name="storefront-outline" size={13} color="#EA5410" />
                    </View>
                    <Text className="text-sm font-bold text-gray-900">1. Store Information</Text>
                  </View>
                  {hasDraftContent && (
                    <Pressable
                      onPress={handleClearDraft}
                      className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50/80 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors cursor-pointer"
                      accessibilityRole="button"
                      accessibilityLabel="Clear Draft Form"
                    >
                      <Ionicons name="trash-outline" size={12} color="#DC2626" />
                      <Text className="text-[11px] font-bold text-red-700">Clear Draft</Text>
                    </Pressable>
                  )}
                </View>

                <View className="gap-3.5">
                  <View className="flex-col md:flex-row gap-3.5">
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Store Name *
                      </Text>
                      <TextInput
                        value={storeName}
                        onChangeText={(text) => setStoreName(filterStoreNameInput(text))}
                        onBlur={() => markTouched("storeName")}
                        maxLength={120}
                        placeholder="e.g. Baywalk Native Kitchen"
                        className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                          getVisibleError("storeName") ? "border-red-400" : "border-gray-200"
                        }`}
                        placeholderTextColor="#9CA3AF"
                      />
                      <FieldErrorText message={getVisibleError("storeName")} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Store Contact Phone *
                      </Text>
                      <TextInput
                        value={storePhone}
                        onChangeText={(text) => setStorePhone(filterPhoneInput(text))}
                        onBlur={() => markTouched("storePhone")}
                        maxLength={13}
                        placeholder="0912 345 6789"
                        keyboardType="phone-pad"
                        inputMode="tel"
                        className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                          getVisibleError("storePhone") ? "border-red-400" : "border-gray-200"
                        }`}
                        placeholderTextColor="#9CA3AF"
                      />
                      <FieldErrorText message={getVisibleError("storePhone")} />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center justify-between mb-1.5 ml-0.5">
                      <Text className="text-[11px] font-semibold text-gray-700">
                        Choose Store Categories *
                      </Text>
                      <Text className="text-[10px] font-medium text-gray-400">
                        Select all that apply
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {STORE_CUISINE_OPTIONS.map((item) => {
                        const selected = categories.includes(item);
                        return (
                          <Pressable
                            key={item}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            onPress={() => handleToggleCategory(item)}
                            className={`px-3 py-1.5 rounded-lg border flex-row items-center gap-1.5 transition-colors ${
                              selected
                                ? "bg-orange-50 border-[#EA5410]"
                                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            <Ionicons
                              name={selected ? "checkmark-circle" : "add-circle-outline"}
                              size={13}
                              color={selected ? "#EA5410" : "#6B7280"}
                            />
                            <Text
                              className={`text-[11px] font-semibold ${
                                selected ? "text-[#EA5410]" : "text-gray-700"
                              }`}
                            >
                              {item}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <FieldErrorText message={getVisibleError("categories")} />
                  </View>

                  <View>
                    <View className="flex-row items-center justify-between mb-1 ml-0.5">
                      <Text className="text-[11px] font-semibold text-gray-700">
                        Store Description & Specialty
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        {description.length}/500
                      </Text>
                    </View>
                    <TextInput
                      value={description}
                      onChangeText={(text) => setDescription(filterDescriptionInput(text))}
                      onBlur={() => markTouched("description")}
                      maxLength={500}
                      placeholder="Signature dishes, dining setup, or service notes"
                      multiline
                      numberOfLines={2}
                      className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                        getVisibleError("description") ? "border-red-400" : "border-gray-200"
                      }`}
                      placeholderTextColor="#9CA3AF"
                      style={{ minHeight: 58, textAlignVertical: "top" }}
                    />
                    <FieldErrorText message={getVisibleError("description")} />
                  </View>

                  {/* Structured Operating Hours Selector */}
                  <View className="bg-gray-50/70 border border-gray-200/90 rounded-xl p-3.5 gap-3">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-[11px] font-semibold text-gray-800">
                          Operating Hours *
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[11px] font-semibold text-gray-700">Open 24 Hours</Text>
                        <Switch
                          value={isOpen24Hours}
                          onValueChange={(next) => {
                            markTouched("operatingHours");
                            setIsOpen24Hours(next);
                          }}
                          trackColor={{ false: "#D1D5DB", true: "#FB923C" }}
                          thumbColor={isOpen24Hours ? "#EA5410" : "#F9FAFB"}
                        />
                      </View>
                    </View>

                    {!isOpen24Hours ? (
                      <View className="flex-col md:flex-row gap-3">
                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                            Opening Time *
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Select opening time"
                            onPress={() => setTimePickerTarget("open")}
                            className={`w-full bg-white border rounded-lg px-3 py-2.5 flex-row items-center justify-between ${
                              getVisibleError("operatingHours") ? "border-red-400" : "border-gray-200"
                            }`}
                          >
                            <View className="flex-row items-center gap-2">
                              <Ionicons name="time-outline" size={14} color="#EA5410" />
                              <Text className="text-xs font-semibold text-gray-900">{openTime}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#6B7280" />
                          </Pressable>
                        </View>

                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                            Closing Time *
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Select closing time"
                            onPress={() => setTimePickerTarget("close")}
                            className={`w-full bg-white border rounded-lg px-3 py-2.5 flex-row items-center justify-between ${
                              getVisibleError("operatingHours") ? "border-red-400" : "border-gray-200"
                            }`}
                          >
                            <View className="flex-row items-center gap-2">
                              <Ionicons name="time-outline" size={14} color="#EA5410" />
                              <Text className="text-xs font-semibold text-gray-900">{closeTime}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#6B7280" />
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                        <Ionicons name="time" size={14} color="#059669" />
                        <Text className="text-[11px] font-semibold text-emerald-800">
                          Your store schedule will display as Open 24 Hours.
                        </Text>
                      </View>
                    )}

                    <FieldErrorText message={getVisibleError("operatingHours")} />
                  </View>
                </View>
              </View>

              {/* Section 2: Address */}
              <View className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
                <View className="flex-row items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <View className="w-6 h-6 rounded-md bg-orange-100 items-center justify-center">
                    <Ionicons name="map-outline" size={13} color="#EA5410" />
                  </View>
                  <Text className="text-sm font-bold text-gray-900">
                    2. Address
                  </Text>
                </View>

                <View className="gap-3.5">
                  <BarangayAutofillInput
                    value={barangay}
                    onSelectBarangay={handleSelectBarangay}
                    label="Barangay (Mati City) *"
                    placeholder="Type to search official Mati barangay..."
                    error={getVisibleError("barangay")}
                    containerClassName="mb-1"
                  />

                  <View>
                    <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                      Complete Street Address & Landmark *
                    </Text>
                    <TextInput
                      value={addressText}
                      onChangeText={(text) => setAddressText(filterAddressInput(text))}
                      onBlur={() => markTouched("addressText")}
                      maxLength={250}
                      placeholder="e.g. Magsaysay St, across Public Market, Mati City"
                      className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                        getVisibleError("addressText") ? "border-red-400" : "border-gray-200"
                      }`}
                      placeholderTextColor="#9CA3AF"
                    />
                    <FieldErrorText message={getVisibleError("addressText")} />
                  </View>

                  <View>
                    <View className="flex-row flex-wrap items-center justify-between gap-2 mb-1.5 ml-0.5">
                      <Text className="text-[11px] font-semibold text-gray-700">
                        Pin Exact Store Location on Map (Mati City) *
                      </Text>
                      {!mapInMatiBounds && (
                        <View className="px-2 py-0.5 rounded-full bg-red-50">
                          <Text className="text-[10px] font-semibold text-red-700">
                            Outside Mati City bounds
                          </Text>
                        </View>
                      )}
                    </View>
                    <StoreMapPicker
                      latitude={latitude}
                      longitude={longitude}
                      onChange={handleMapPinChange}
                      onError={handleMapError}
                      onClearError={handleClearMapError}
                    />
                    <FieldErrorText message={getVisibleError("location")} />
                  </View>
                </View>
              </View>

              {/* Section 3: Personal Information */}
              <View className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
                <View className="flex-row items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <View className="w-6 h-6 rounded-md bg-orange-100 items-center justify-center">
                    <Ionicons name="person-outline" size={13} color="#EA5410" />
                  </View>
                  <Text className="text-sm font-bold text-gray-900">
                    3. Personal Information
                  </Text>
                </View>

                <View className="gap-3.5">
                  <View className="flex-col md:flex-row gap-3.5">
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Full Name *
                      </Text>
                      <TextInput
                        value={ownerName}
                        onChangeText={(text) => setOwnerName(filterOwnerNameInput(text))}
                        onBlur={() => markTouched("ownerName")}
                        maxLength={100}
                        placeholder="Full name"
                        className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                          getVisibleError("ownerName") ? "border-red-400" : "border-gray-200"
                        }`}
                        placeholderTextColor="#9CA3AF"
                      />
                      <FieldErrorText message={getVisibleError("ownerName")} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Mobile Number *
                      </Text>
                      <TextInput
                        value={ownerPhone}
                        onChangeText={(text) => setOwnerPhone(filterPhoneInput(text))}
                        onBlur={() => markTouched("ownerPhone")}
                        maxLength={13}
                        placeholder="0912 345 6789"
                        keyboardType="phone-pad"
                        inputMode="tel"
                        className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                          getVisibleError("ownerPhone") ? "border-red-400" : "border-gray-200"
                        }`}
                        placeholderTextColor="#9CA3AF"
                      />
                      <FieldErrorText message={getVisibleError("ownerPhone")} />
                    </View>
                  </View>

                  <View>
                    <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                      Email Address *
                    </Text>
                    <TextInput
                      value={email}
                      onChangeText={(text) => setEmail(filterEmailInput(text))}
                      onBlur={() => markTouched("email")}
                      maxLength={254}
                      placeholder="owner@example.com"
                      keyboardType="email-address"
                      inputMode="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                        getVisibleError("email") ? "border-red-400" : "border-gray-200"
                      }`}
                      placeholderTextColor="#9CA3AF"
                    />
                    <FieldErrorText message={getVisibleError("email")} />
                  </View>

                  <View className="flex-col md:flex-row gap-3.5">
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Password *
                      </Text>
                      <View className="relative flex-row items-center">
                        <TextInput
                          value={password}
                          onChangeText={(text) => setPassword(text.slice(0, 128))}
                          onBlur={() => markTouched("password")}
                          maxLength={128}
                          placeholder="Create a secure password"
                          secureTextEntry={!showPassword}
                          className={`w-full bg-gray-50 border rounded-lg pl-3 pr-10 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                            getVisibleError("password") ? "border-red-400" : "border-gray-200"
                          }`}
                          placeholderTextColor="#9CA3AF"
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                          onPress={() => setShowPassword(!showPassword)}
                          className="absolute right-3 z-10"
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={15}
                            color="#6B7280"
                          />
                        </Pressable>
                      </View>
                      <LivePasswordSentence
                        password={password}
                        evaluation={passwordEval}
                        showErrorState={Boolean(getVisibleError("password"))}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-gray-700 mb-1 ml-0.5">
                        Confirm Password *
                      </Text>
                      <View className="relative flex-row items-center">
                        <TextInput
                          value={confirmPassword}
                          onChangeText={(text) => setConfirmPassword(text.slice(0, 128))}
                          onBlur={() => markTouched("confirmPassword")}
                          maxLength={128}
                          placeholder="Re-enter your password"
                          secureTextEntry={!showConfirmPassword}
                          className={`w-full bg-gray-50 border rounded-lg pl-3 pr-10 py-2.5 text-xs text-gray-900 focus:border-[#EA5410] focus:bg-white ${
                            getVisibleError("confirmPassword") ||
                            (confirmPassword.length > 0 && confirmPassword !== password)
                              ? "border-red-400"
                              : "border-gray-200"
                          }`}
                          placeholderTextColor="#9CA3AF"
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                          }
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 z-10"
                        >
                          <Ionicons
                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                            size={15}
                            color="#6B7280"
                          />
                        </Pressable>
                      </View>
                      {confirmPassword.length > 0 && confirmPassword === password ? (
                        <View className="flex-row items-center gap-1 mt-1.5 ml-0.5">
                          <Ionicons name="checkmark-circle" size={13} color="#059669" />
                          <Text className="text-[11px] font-semibold text-emerald-700 flex-1">
                            Passwords match.
                          </Text>
                        </View>
                      ) : confirmPassword.length > 0 && confirmPassword !== password ? (
                        <View className="flex-row items-center gap-1 mt-1.5 ml-0.5">
                          <Ionicons
                            name="alert-circle-outline"
                            size={12}
                            color={submittedAttempt || touched.confirmPassword ? "#DC2626" : "#EA5410"}
                          />
                          <Text
                            className={`text-[11px] font-medium flex-1 ${
                              submittedAttempt || touched.confirmPassword
                                ? "text-red-600"
                                : "text-[#EA5410]"
                            }`}
                          >
                            Passwords do not match.
                          </Text>
                        </View>
                      ) : (
                        <FieldErrorText message={getVisibleError("confirmPassword")} />
                      )}
                    </View>
                  </View>

                  <View>
                    <Text className="text-[11px] font-semibold text-gray-700 mb-1.5 ml-0.5">
                      Storefront Photo or Business Permit *
                    </Text>
                    <Pressable
                      ref={dropZoneRef}
                      accessibilityRole="button"
                      accessibilityLabel="Upload storefront photo or business permit"
                      onPress={handlePickDocument}
                      className={`w-full rounded-xl border-2 border-dashed p-5 items-center justify-center transition-colors ${
                        isDraggingDoc
                          ? "bg-orange-50/70 border-[#EA5410]"
                          : documentAsset
                            ? "bg-emerald-50 border-emerald-300"
                            : getVisibleError("document")
                              ? "bg-red-50/40 border-red-400"
                              : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {documentAsset ? (
                        <View className="w-full flex-row items-center gap-3">
                          {documentAsset.previewUri ? (
                            <Image
                              source={{ uri: documentAsset.previewUri }}
                              className="w-12 h-12 rounded-lg border border-gray-200"
                              resizeMode="cover"
                            />
                          ) : null}
                          <View className="flex-1 min-w-0">
                            <Text className="text-xs font-semibold text-emerald-800" numberOfLines={1}>
                              {documentAsset.fileName}
                            </Text>
                            <Text className="text-[11px] text-gray-500 mt-0.5">
                              {isDraggingDoc
                                ? "Drop photo to replace document"
                                : "Click or drag & drop a file to replace photo"}
                            </Text>
                          </View>
                          <Ionicons name="checkmark-circle" size={18} color="#059669" />
                        </View>
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={24}
                            color="#EA5410"
                          />
                          <Text className="text-gray-700 font-semibold text-xs mt-1.5 text-center">
                            {isDraggingDoc
                              ? "Drop your Storefront or Permit Photo here"
                              : "Click to upload or drag & drop your Storefront or Permit Photo"}
                          </Text>
                          <Text className="text-gray-400 text-[10px] mt-0.5">
                            JPEG, PNG, or WebP up to 5MB
                          </Text>
                        </>
                      )}
                    </Pressable>
                    <FieldErrorText message={getVisibleError("document")} />
                  </View>
                </View>
              </View>

              {/* Checkbox Agreement */}
              <View className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
                <View className="flex-row items-center justify-center gap-2.5">
                  <Pressable
                    onPress={() => setTermsAgreed(!termsAgreed)}
                    className="cursor-pointer"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: termsAgreed }}
                  >
                    <Ionicons
                      name={termsAgreed ? "checkbox" : "square-outline"}
                      size={20}
                      color={termsAgreed ? "#EA5410" : "#6B7280"}
                    />
                  </Pressable>
                  <Text className="text-xs sm:text-[13px] text-gray-800 text-center">
                    <Text
                      onPress={() => setTermsAgreed(!termsAgreed)}
                      className="cursor-pointer"
                    >
                      I have read and agree to the{" "}
                    </Text>
                    <Text
                      onPress={() => setShowTermsModal(true)}
                      className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Privacy Policy
                    </Text>
                    <Text
                      onPress={() => setTermsAgreed(!termsAgreed)}
                      className="cursor-pointer"
                    >
                      {" "}and{" "}
                    </Text>
                    <Text
                      onPress={() => setShowTermsModal(true)}
                      className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Terms & Conditions
                    </Text>
                    <Text
                      onPress={() => setTermsAgreed(!termsAgreed)}
                      className="cursor-pointer"
                    >
                      .
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Submit Action */}
              <View className="gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Submit Store Application"
                  onPress={handleSubmitForm}
                  disabled={!canSubmit}
                  className={`w-full py-3 rounded-xl items-center shadow-sm transition-colors ${
                    !canSubmit
                      ? "bg-gray-300 cursor-not-allowed opacity-60"
                      : "bg-[#EA5410] hover:bg-[#D04508] active:opacity-90 cursor-pointer"
                  }`}
                  style={{ opacity: !canSubmit ? 0.6 : 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-bold text-xs tracking-wide">
                      Submit Store Application
                    </Text>
                  )}
                </Pressable>

                <View className="flex-row flex-wrap justify-center gap-1">
                  <Text className="text-xs text-gray-500">Already have a merchant account?</Text>
                  <Link href="/(web)/auth/store-login" asChild>
                    <Pressable>
                      <Text className="text-xs text-[#EA5410] font-semibold hover:underline">
                        Log In
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Curated 30-Min Time Slot Dropdown Modal */}
      <Modal
        visible={timePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <Pressable
          onPress={() => setTimePickerTarget(null)}
          className="flex-1 bg-black/40 justify-center items-center p-4"
        >
          <Pressable
            onPress={() => {}}
            className="w-full max-w-xs bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl max-h-[70%]"
          >
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-gray-900">
                {timePickerTarget === "open" ? "Select Opening Time" : "Select Closing Time"}
              </Text>
              <Pressable onPress={() => setTimePickerTarget(null)}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-2" showsVerticalScrollIndicator={false}>
              {STORE_OPERATING_TIME_OPTIONS.map((slot) => {
                const isSelected =
                  (timePickerTarget === "open" && slot === openTime) ||
                  (timePickerTarget === "close" && slot === closeTime);
                const slotMins = parseOperatingTimeMinutes(slot);
                const isEarlierOrEqual =
                  timePickerTarget === "close" &&
                  openMinutes !== null &&
                  slotMins !== null &&
                  slotMins <= openMinutes;

                return (
                  <Pressable
                    key={slot}
                    disabled={isEarlierOrEqual}
                    onPress={() => handleSelectTimeSlot(slot)}
                    className={`px-3.5 py-2.5 rounded-xl flex-row items-center justify-between mb-1 ${
                      isSelected
                        ? "bg-orange-50 border border-[#EA5410]"
                        : isEarlierOrEqual
                          ? "opacity-40"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? "text-[#EA5410]" : "text-gray-800"
                      }`}
                    >
                      {slot}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={15} color="#EA5410" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Store Merchant Terms & Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        role="merchant"
        showAcceptButton={false}
        closeButtonLabel="I Understand"
        onClose={() => setShowTermsModal(false)}
      />
    </View>
  );
}
