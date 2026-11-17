import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSession } from "../../../context/SessionContext";
import { fetchStoreById, fetchUserStoreId, updateStoreProfile } from "../../../services/catalog";
import { uploadStoreCoverPhoto, uploadStoreProfilePhoto } from "../../../services/storage";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import type { SelectedMerchantImageAsset } from "../../../components/merchant/ImageUploadDropzone";
import { filterPhoneInput, sanitizePhoneNumber } from "../../../lib/phone";
import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  STORE_BARANGAY_OPTIONS,
  STORE_OPERATING_TIME_OPTIONS,
  buildOperatingHoursString,
  filterDescriptionInput,
  filterStoreNameInput,
} from "../../../services/merchant-registration";
import {
  MAX_STORE_MEDIA_IMAGE_BYTES,
  type StoreProfileFieldErrors,
  resolveMerchantImageMimeType,
  validateMerchantImageFile,
  validateStoreProfileForm,
} from "../../../lib/merchant-validation";
import type { StoreSubscriptionTier } from "../../../types/restaurant";

function normalizeStoredTimeSlot(raw: string): string {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, " ");
  const parts = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/);
  if (!parts) return raw.trim();
  const padded = `${parts[1].padStart(2, "0")}:${parts[2]} ${parts[3]}`;
  return STORE_OPERATING_TIME_OPTIONS.includes(padded) ? padded : raw.trim();
}

export default function StoreProfile() {
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [barangay, setBarangay] = useState<string>(STORE_BARANGAY_OPTIONS[0]);
  const [addressText, setAddressText] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [tableCapacity, setTableCapacity] = useState<number>(8);
  const [reservationsEnabled, setReservationsEnabled] = useState<boolean>(true);
  const [subscriptionTier, setSubscriptionTier] = useState<StoreSubscriptionTier>("basic");
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isTemporarilyOffline, setIsTemporarilyOffline] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [barangayPickerVisible, setBarangayPickerVisible] = useState(false);
  const [isOpen24Hours, setIsOpen24Hours] = useState(false);
  const [openTime, setOpenTime] = useState(DEFAULT_OPEN_TIME);
  const [closeTime, setCloseTime] = useState(DEFAULT_CLOSE_TIME);
  const [timePickerTarget, setTimePickerTarget] = useState<"open" | "close" | null>(null);
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StoreProfileFieldErrors & { addressText?: string }>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  useEffect(() => {
    let active = true;
    if (!identity?.id) {
      setLoading(false);
      return;
    }

    fetchUserStoreId(identity.id)
      .then((id) => {
        if (!active) return;
        if (id) {
          setStoreId(id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [identity?.id]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    setLoading(true);

    fetchStoreById(storeId)
      .then((store) => {
        if (!active) return;
        if (store) {
          setStoreName(filterStoreNameInput(store.name));
          setDescription(filterDescriptionInput(store.description));
          if (store.phone) setPhone(filterPhoneInput(store.phone));
          if (store.logo_url || store.logoUrl) {
            setLogoUrl(store.logo_url || store.logoUrl || null);
          }
          if (store.cover_image_url) {
            setCoverImageUrl(store.cover_image_url);
          } else if (store.imageUrl) {
            setCoverImageUrl(store.imageUrl);
          }

          if (store.barangay && STORE_BARANGAY_OPTIONS.includes(store.barangay as any)) {
            setBarangay(store.barangay);
          }
          if (store.address) {
            setAddressText(store.address);
          }
          setDeliveryEnabled(Boolean(store.deliveryEnabled));
          if (typeof (store as any).table_capacity === "number") {
            setTableCapacity((store as any).table_capacity);
          } else if (typeof store.tableCapacity === "number") {
            setTableCapacity(store.tableCapacity);
          }
          if (typeof (store as any).reservations_enabled === "boolean") {
            setReservationsEnabled((store as any).reservations_enabled);
          } else if (typeof store.reservationsEnabled === "boolean") {
            setReservationsEnabled(store.reservationsEnabled);
          }
          if (store.subscription_tier) {
            setSubscriptionTier((store.subscription_tier || "basic") as StoreSubscriptionTier);
          }
          setIsStoreOpen(Boolean(store.isOpen));
          setIsTemporarilyOffline(Boolean(store.isTemporarilyOffline));
          setIsGracePeriod(Boolean(store.isGracePeriod));

          const hoursStr = (store.operating_hours || store.hours || "").trim();
          if (/open\s*24\s*hours/i.test(hoursStr)) {
            setIsOpen24Hours(true);
          } else if (hoursStr) {
            setIsOpen24Hours(false);
            const match = hoursStr.match(
              /^([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))\s*[-–]\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))/i
            );
            if (match) {
              setOpenTime(normalizeStoredTimeSlot(match[1]));
              setCloseTime(normalizeStoredTimeSlot(match[2]));
            }
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId]);

  const handleUploadAsset = async (
    target: "logo" | "cover",
    asset: SelectedMerchantImageAsset
  ) => {
    if (!storeId) return;
    const isLogo = target === "logo";
    setFieldErrors((prev) => ({
      ...prev,
      [target]: undefined,
    }));

    if (isLogo) setUploadingLogo(true);
    else setUploadingCover(true);

    try {
      const uploader = isLogo ? uploadStoreProfilePhoto : uploadStoreCoverPhoto;
      const res = await uploader(asset.blobOrUri, storeId, {
        mimeType: asset.mimeType || "image/jpeg",
      });
      if (res.publicUrl) {
        if (isLogo) setLogoUrl(res.publicUrl);
        else setCoverImageUrl(res.publicUrl);
        setBanner({
          type: "success",
          message: isLogo
            ? "Store profile photo uploaded. Click Save Store Changes to apply."
            : "Store cover photo uploaded. Click Save Store Changes to apply.",
        });
      } else {
        const msg = `Failed to upload ${isLogo ? "profile" : "cover"} photo: ${res.error || "Unknown error"}`;
        setFieldErrors((prev) => ({ ...prev, [target]: msg }));
        setBanner({ type: "error", message: msg });
      }
    } catch (err: any) {
      const msg = `Failed to upload ${isLogo ? "profile" : "cover"} photo: ${err?.message || "Unknown error"}`;
      setFieldErrors((prev) => ({ ...prev, [target]: msg }));
      setBanner({ type: "error", message: msg });
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingCover(false);
      if (
        asset.isObjectUrl &&
        asset.previewUri &&
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
        URL.revokeObjectURL(asset.previewUri);
      }
    }
  };

  const coverDropRef = useRef<View | null>(null);
  const logoDropRef = useRef<View | null>(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const pickImageForTarget = async (target: "logo" | "cover") => {
    if (loading || !storeId) return;
    if (target === "logo" && uploadingLogo) return;
    if (target === "cover" && uploadingCover) return;

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement | null)?.files?.[0];
        if (!file) return;
        const mimeType = resolveMerchantImageMimeType({
          mimeType: file.type,
          fileName: file.name,
        });
        const validationError = validateMerchantImageFile(
          { mimeType, fileName: file.name, sizeBytes: file.size },
          MAX_STORE_MEDIA_IMAGE_BYTES
        );
        if (validationError) {
          setFieldErrors((prev) => ({ ...prev, [target]: validationError }));
          setBanner({ type: "error", message: validationError });
          return;
        }
        const previewUri = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
        void handleUploadAsset(target, {
          blobOrUri: file,
          previewUri,
          fileName: file.name,
          mimeType: mimeType || "image/jpeg",
          sizeBytes: file.size,
          isObjectUrl: Boolean(previewUri),
        });
      };
      input.click();
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setBanner({
          type: "error",
          message: "Allow photo library access to select an image.",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const picked = result.assets[0];
      const mimeType = resolveMerchantImageMimeType({
        mimeType: picked.mimeType,
        fileName: picked.fileName,
      });
      const validationError = validateMerchantImageFile(
        {
          mimeType: mimeType || "image/jpeg",
          fileName: picked.fileName,
          sizeBytes: typeof picked.fileSize === "number" ? picked.fileSize : undefined,
        },
        MAX_STORE_MEDIA_IMAGE_BYTES
      );
      if (validationError) {
        setFieldErrors((prev) => ({ ...prev, [target]: validationError }));
        setBanner({ type: "error", message: validationError });
        return;
      }
      void handleUploadAsset(target, {
        blobOrUri: picked.uri,
        previewUri: picked.uri,
        fileName: picked.fileName || `${target}.jpg`,
        mimeType: mimeType || "image/jpeg",
        sizeBytes: typeof picked.fileSize === "number" ? picked.fileSize : undefined,
      });
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || "Failed to pick image.",
      });
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const coverNode = coverDropRef.current as unknown as HTMLElement | null;
    const logoNode = logoDropRef.current as unknown as HTMLElement | null;

    const setupDrop = (
      node: HTMLElement | null,
      target: "cover" | "logo",
      setDragging: (v: boolean) => void
    ) => {
      if (!node || typeof node.addEventListener !== "function") return () => {};

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        setDragging(true);
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
      };

      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const mimeType = resolveMerchantImageMimeType({
          mimeType: file.type,
          fileName: file.name,
        });
        const err = validateMerchantImageFile(
          { mimeType, fileName: file.name, sizeBytes: file.size },
          MAX_STORE_MEDIA_IMAGE_BYTES
        );
        if (err) {
          setFieldErrors((prev) => ({ ...prev, [target]: err }));
          setBanner({ type: "error", message: err });
          return;
        }
        const previewUri = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
        void handleUploadAsset(target, {
          blobOrUri: file,
          previewUri,
          fileName: file.name,
          mimeType: mimeType || "image/jpeg",
          sizeBytes: file.size,
          isObjectUrl: Boolean(previewUri),
        });
      };

      node.addEventListener("dragover", handleDragOver);
      node.addEventListener("dragleave", handleDragLeave);
      node.addEventListener("drop", handleDrop);

      return () => {
        node.removeEventListener("dragover", handleDragOver);
        node.removeEventListener("dragleave", handleDragLeave);
        node.removeEventListener("drop", handleDrop);
      };
    };

    const cleanupCover = setupDrop(coverNode, "cover", setIsDraggingCover);
    const cleanupLogo = setupDrop(logoNode, "logo", setIsDraggingLogo);

    return () => {
      cleanupCover();
      cleanupLogo();
    };
  }, [storeId, uploadingCover, uploadingLogo]);

  const handleSave = async () => {
    if (!storeId) return;
    setBanner(null);

    const errors = validateStoreProfileForm({
      storeName,
      description,
      isOpen24Hours,
      openTime,
      closeTime,
      phone,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setBanner({
        type: "error",
        message: "Please fix the highlighted store profile fields before saving.",
      });
      return;
    }

    setFieldErrors({});
    setSaving(true);
    const cleanPhone = sanitizePhoneNumber(phone);
    const operating_hours = buildOperatingHoursString({
      isOpen24Hours,
      openTime,
      closeTime,
    });

    const res = await updateStoreProfile(storeId, {
      name: filterStoreNameInput(storeName).trim(),
      description: filterDescriptionInput(description).trim(),
      public_phone: cleanPhone,
      address_text: addressText.trim() || undefined,
      barangay,
      delivery_enabled: subscriptionTier === "basic" ? false : deliveryEnabled,
      operating_hours,
      logo_url: logoUrl || undefined,
      cover_image_url: coverImageUrl || undefined,
      table_capacity: tableCapacity,
      reservations_enabled: reservationsEnabled,
    });
    setSaving(false);

    if (res.success) {
      setBanner({
        type: "success",
        message: "Store profile, table capacity, and operating hours saved.",
      });
    } else {
      setBanner({
        type: "error",
        message: `Failed to save: ${res.error || "Unknown error"}`,
      });
    }
  };

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-4xl self-center">
      {/* Header */}
      <View className="mb-5">
        <Text className="text-[10px] font-bold text-[#EA5410] uppercase tracking-wider mb-0.5">
          Store Settings
        </Text>
        <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
          Store Profile & Operating Hours
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          Update how your restaurant appears to customers across Mati City.
        </Text>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden mb-6">
        <View className="p-5">
          {/* Live Customer Storefront Preview Card (with Interactive Banner & Avatar Upload/Edit/Remove) */}
          <View className="mb-6 rounded-2xl overflow-hidden border border-gray-200/90 shadow-2xs bg-white">
            {/* Cover Photo Banner */}
            <View
              ref={coverDropRef}
              className={`relative w-full h-36 sm:h-44 bg-gray-100 ${
                isDraggingCover ? "border-2 border-dashed border-[#EA5410]" : ""
              }`}
            >
              <Image
                source={
                  coverImageUrl
                    ? { uri: coverImageUrl }
                    : require("../../../assets/merchant-bg.jpg")
                }
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/30" />

              {/* Status and verified badges at top-right */}
              <View className="absolute top-3 right-3 flex-row items-center gap-1.5">
                <View
                  className={`px-2.5 py-1 rounded-full border shadow-2xs flex-row items-center gap-1 ${
                    isTemporarilyOffline
                      ? "bg-rose-500/90 border-rose-400"
                      : isGracePeriod
                        ? "bg-amber-500/90 border-amber-400"
                        : isStoreOpen
                          ? "bg-emerald-500/90 border-emerald-400"
                          : "bg-gray-800/90 border-gray-700"
                  }`}
                >
                  <View
                    className={`w-1.5 h-1.5 rounded-full ${
                      isStoreOpen && !isTemporarilyOffline ? "bg-white" : "bg-gray-400"
                    }`}
                  />
                  <Text className="text-[10px] font-bold text-white">
                    {isTemporarilyOffline
                      ? "Temporarily Offline"
                      : isGracePeriod
                        ? "Grace Period"
                        : isStoreOpen ? "Store is Open" : "Store is Closed"}
                  </Text>
                </View>
                {subscriptionTier === "commercial" && (
                  <View className="bg-amber-500/90 border border-amber-400 px-2 py-1 rounded-full flex-row items-center gap-1">
                    <Ionicons name="shield-checkmark" size={11} color="white" />
                    <Text className="text-[10px] font-bold text-white">Verified</Text>
                  </View>
                )}
              </View>

              {/* Drag indicator overlay on banner */}
              {isDraggingCover && (
                <View className="absolute inset-0 bg-black/60 items-center justify-center">
                  <Ionicons name="cloud-upload" size={24} color="#EA5410" />
                  <Text className="text-white text-xs font-bold mt-1">Drop image to update cover photo</Text>
                </View>
              )}

              {/* Cover Photo Action Buttons: Edit / Change Cover & Remove */}
              <View className="absolute bottom-3 right-3 flex-row items-center gap-2">
                <Pressable
                  onPress={() => pickImageForTarget("cover")}
                  disabled={uploadingCover || loading || !storeId}
                  className="bg-black/65 hover:bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/25 flex-row items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  accessibilityLabel="Store Cover Photo (Banner)"
                >
                  {uploadingCover ? (
                    <ActivityIndicator size="small" color="#EA5410" />
                  ) : (
                    <Ionicons name="camera" size={13} color="white" />
                  )}
                  <Text className="text-xs font-semibold text-white">
                    {uploadingCover ? "Uploading..." : coverImageUrl ? "Change Cover" : "Upload Cover"}
                  </Text>
                </Pressable>

                {coverImageUrl && !uploadingCover ? (
                  <Pressable
                    onPress={() => setCoverImageUrl(null)}
                    disabled={loading || !storeId}
                    className="bg-black/65 hover:bg-rose-600/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/25 flex-row items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Ionicons name="trash-outline" size={13} color="#fca5a5" />
                    <Text className="text-xs font-semibold text-rose-200">Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Profile Info Header on solid white card */}
            <View className="px-5 pt-0 pb-5">
              <View className="flex-row items-start gap-4">
                {/* Profile Photo (Avatar) */}
                <View className="-mt-10 sm:-mt-12 shrink-0 items-center">
                  <View
                    ref={logoDropRef}
                    className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white p-1 border-2 border-white shadow-md overflow-hidden bg-gray-100"
                  >
                    <Image
                      source={
                        logoUrl
                          ? { uri: logoUrl }
                          : require("../../../assets/logo.jpg")
                      }
                      className="w-full h-full rounded-xl bg-gray-100"
                      resizeMode="cover"
                    />

                    {uploadingLogo ? (
                      <View className="absolute inset-0 bg-black/60 items-center justify-center">
                        <ActivityIndicator size="small" color="#EA5410" />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => pickImageForTarget("logo")}
                        disabled={uploadingLogo || loading || !storeId}
                        className="absolute bottom-1 right-1 bg-[#EA5410] hover:bg-[#c9450a] w-6 h-6 rounded-full border-2 border-white shadow items-center justify-center active:scale-90 transition-transform"
                        accessibilityLabel="Store Profile Photo (Logo)"
                      >
                        <Ionicons name="camera" size={12} color="white" />
                      </Pressable>
                    )}
                  </View>

                  {/* Profile Photo Action Buttons: Edit / Remove */}
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Pressable
                      onPress={() => pickImageForTarget("logo")}
                      disabled={uploadingLogo || loading || !storeId}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 flex-row items-center gap-1 active:scale-95"
                    >
                      <Ionicons name="camera-outline" size={10} color="#374151" />
                      <Text className="text-[10px] font-semibold text-gray-700">
                        {logoUrl ? "Edit" : "Upload"}
                      </Text>
                    </Pressable>
                    {logoUrl && !uploadingLogo ? (
                      <Pressable
                        onPress={() => setLogoUrl(null)}
                        disabled={loading || !storeId}
                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 flex-row items-center gap-1 active:scale-95"
                      >
                        <Ionicons name="trash-outline" size={10} color="#e11d48" />
                        <Text className="text-[10px] font-semibold text-rose-600">Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* Store Name & Location (CRISP, HIGH CONTRAST ON SOLID WHITE BACKGROUND) */}
                <View className="flex-1 min-w-0 pt-2 sm:pt-3">
                  <Text
                    className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight"
                    numberOfLines={1}
                  >
                    {storeName || "Your Storefront Name"}
                  </Text>
                  <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="location-sharp" size={13} color="#EA5410" />
                      <Text className="text-gray-700 text-xs font-semibold">
                        {barangay}, Mati City
                      </Text>
                    </View>
                    {addressText ? (
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-gray-300">•</Text>
                        <Text className="text-gray-500 text-xs truncate" numberOfLines={1}>
                          {addressText}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-[11px] text-gray-400 italic mt-2">
                    Live Storefront Preview — This is how your store branding and location appear to diners in Mati City.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {loading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator size="small" color="#EA5410" />
              <Text className="text-[11px] text-gray-400 mt-2">Loading store profile...</Text>
            </View>
          ) : (
            <View className="gap-4">
              <View>
                <Text className="font-semibold text-[11px] text-gray-700 mb-1">Store Name *</Text>
                <TextInput
                  value={storeName}
                  onChangeText={(text) => {
                    setStoreName(filterStoreNameInput(text));
                    setFieldErrors((prev) => ({ ...prev, storeName: undefined }));
                  }}
                  maxLength={120}
                  placeholder="e.g. Baywalk Grilled Seafood"
                  placeholderTextColor="#9CA3AF"
                  className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 outline-none ${
                    fieldErrors.storeName
                      ? "bg-rose-50/40 border-rose-400"
                      : "bg-gray-50 border-gray-200 focus:border-[#EA5410] focus:bg-white"
                  }`}
                />
                {fieldErrors.storeName ? (
                  <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                    {fieldErrors.storeName}
                  </Text>
                ) : null}
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-semibold text-[11px] text-gray-700">
                    Short Description *
                  </Text>
                  <Text className="text-[10px] text-gray-400 tabular-nums">
                    {description.length}/500
                  </Text>
                </View>
                <TextInput
                  value={description}
                  onChangeText={(text) => {
                    setDescription(filterDescriptionInput(text));
                    setFieldErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  placeholder="Tell customers what dishes or specialties your store is known for..."
                  placeholderTextColor="#9CA3AF"
                  className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 h-20 outline-none ${
                    fieldErrors.description
                      ? "bg-rose-50/40 border-rose-400"
                      : "bg-gray-50 border-gray-200 focus:border-[#EA5410] focus:bg-white"
                  }`}
                  textAlignVertical="top"
                />
                {fieldErrors.description ? (
                  <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                    {fieldErrors.description}
                  </Text>
                ) : null}
              </View>

              {/* Barangay Selector */}
              <View>
                <Text className="font-semibold text-[11px] text-gray-700 mb-1">
                  Mati City Barangay *
                </Text>
                <Pressable
                  onPress={() => setBarangayPickerVisible(true)}
                  className="w-full border border-gray-200 bg-gray-50 hover:border-[#EA5410] rounded-lg px-3 py-2 flex-row items-center justify-between cursor-pointer"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location-outline" size={14} color="#EA5410" />
                    <Text className="text-xs font-semibold text-gray-900">{barangay}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </Pressable>
              </View>

              {/* Street Address / Landmark */}
              <View>
                <Text className="font-semibold text-[11px] text-gray-700 mb-1">
                  Street Address / Landmark
                </Text>
                <TextInput
                  value={addressText}
                  onChangeText={(text) => setAddressText(text.slice(0, 200))}
                  maxLength={200}
                  placeholder="e.g. Rizal Extension, near Subangan Museum Grounds"
                  placeholderTextColor="#9CA3AF"
                  className="w-full border bg-gray-50 border-gray-200 focus:border-[#EA5410] focus:bg-white rounded-lg px-3 py-2 text-xs text-gray-900 outline-none"
                />
              </View>

              {/* Operating Hours (Curated Time Slots + Open 24 Hours) */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="font-semibold text-[11px] text-gray-700">
                    Operating Hours *
                  </Text>
                  <Pressable
                    onPress={() => {
                      setIsOpen24Hours((prev) => !prev);
                      setFieldErrors((prev) => ({ ...prev, operatingHours: undefined }));
                    }}
                    className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1.5 cursor-pointer ${
                      isOpen24Hours
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name={isOpen24Hours ? "checkbox" : "square-outline"}
                      size={13}
                      color={isOpen24Hours ? "#059669" : "#6B7280"}
                    />
                    <Text
                      className={`text-[11px] font-semibold ${
                        isOpen24Hours ? "text-emerald-700" : "text-gray-600"
                      }`}
                    >
                      Open 24 Hours
                    </Text>
                  </Pressable>
                </View>

                {isOpen24Hours ? (
                  <View className="bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-2 flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={14} color="#059669" />
                    <Text className="text-xs font-semibold text-emerald-800">
                      Open 24 Hours Daily
                    </Text>
                  </View>
                ) : (
                  <View className="flex-col md:flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Opening Time
                      </Text>
                      <Pressable
                        onPress={() => setTimePickerTarget("open")}
                        className={`w-full border rounded-lg px-3 py-2 flex-row items-center justify-between cursor-pointer ${
                          fieldErrors.operatingHours
                            ? "bg-rose-50/40 border-rose-400"
                            : "bg-gray-50 border-gray-200 hover:border-[#EA5410]"
                        }`}
                      >
                        <Text className="text-xs font-semibold text-gray-900">{openTime}</Text>
                        <Ionicons name="chevron-down" size={14} color="#6B7280" />
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Closing Time
                      </Text>
                      <Pressable
                        onPress={() => setTimePickerTarget("close")}
                        className={`w-full border rounded-lg px-3 py-2 flex-row items-center justify-between cursor-pointer ${
                          fieldErrors.operatingHours
                            ? "bg-rose-50/40 border-rose-400"
                            : "bg-gray-50 border-gray-200 hover:border-[#EA5410]"
                        }`}
                      >
                        <Text className="text-xs font-semibold text-gray-900">{closeTime}</Text>
                        <Ionicons name="chevron-down" size={14} color="#6B7280" />
                      </Pressable>
                    </View>
                  </View>
                )}

                {fieldErrors.operatingHours ? (
                  <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                    {fieldErrors.operatingHours}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="font-semibold text-[11px] text-gray-700 mb-1">
                  Official Contact Phone *
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(filterPhoneInput(text));
                    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  maxLength={13}
                  keyboardType="phone-pad"
                  placeholder="0912 345 6789"
                  placeholderTextColor="#9CA3AF"
                  className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 outline-none ${
                    fieldErrors.phone
                      ? "bg-rose-50/40 border-rose-400"
                      : "bg-gray-50 border-gray-200 focus:border-[#EA5410] focus:bg-white"
                  }`}
                />
                {fieldErrors.phone ? (
                  <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                    {fieldErrors.phone}
                  </Text>
                ) : null}
              </View>

              {/* Delivery Configuration Card (Gated by Subscription Tier) */}
              {subscriptionTier === "basic" ? (
                <View className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex-col gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-md bg-amber-100 border border-amber-300 items-center justify-center">
                        <Ionicons name="lock-closed" size={13} color="#D97706" />
                      </View>
                      <Text className="text-xs font-bold text-amber-900">
                        Customer Delivery Integration
                      </Text>
                    </View>
                    <View className="bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      <Text className="text-[10px] font-bold text-amber-800">Basic Plan</Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-amber-800 leading-relaxed">
                    Delivery dispatch to Mati riders is locked on the Basic plan. Dine-in table reservations remain active. Upgrade to Standard (₱299/mo) to unlock delivery orders with automated rider dispatch.
                  </Text>
                  <Link href="/(web)/dashboard/billing" asChild>
                    <Pressable className="self-start mt-1 px-3 py-1.5 rounded-lg bg-[#EA5410] hover:bg-[#D04508] flex-row items-center gap-1.5 cursor-pointer">
                      <Ionicons name="arrow-up-circle-outline" size={13} color="white" />
                      <Text className="text-white font-bold text-[11px]">Upgrade to Standard (₱299/mo)</Text>
                    </Pressable>
                  </Link>
                </View>
              ) : (
                <View className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex-col gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-md bg-emerald-100 border border-emerald-300 items-center justify-center">
                        <Ionicons name="bicycle" size={13} color="#059669" />
                      </View>
                      <Text className="text-xs font-bold text-gray-900">
                        Customer Delivery Orders
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setDeliveryEnabled((prev) => !prev)}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: deliveryEnabled }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                        deliveryEnabled ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          deliveryEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </Pressable>
                  </View>
                  <Text className="text-[11px] text-gray-600 leading-relaxed">
                    {deliveryEnabled
                      ? "Delivery is ACTIVE. Diners across Mati City can place food delivery orders dispatched to independent riders."
                      : "Delivery is PAUSED. Diners can only place dine-in table reservations."}
                  </Text>
                </View>
              )}

              {/* Dine-In Table Reservations & Seating Capacity Card */}
              <View className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex-col gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 items-center justify-center">
                      <Ionicons name="calendar" size={14} color="#2563EB" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-gray-900">
                        Dine-In Table Bookings
                      </Text>
                      <Text className="text-[10px] text-gray-500">
                        {reservationsEnabled ? "Accepting customer table reservations" : "Table bookings paused (walk-ins only)"}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setReservationsEnabled((prev) => !prev)}
                    accessibilityRole="switch"
                    accessibilityLabel="Toggle table reservations"
                    accessibilityState={{ checked: reservationsEnabled }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      reservationsEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        reservationsEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </Pressable>
                </View>

                {/* Table Capacity Stepper */}
                <View className="pt-2.5 border-t border-gray-200/80 flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-semibold text-gray-800">
                      Dining Table Capacity
                    </Text>
                    <Text className="text-[11px] text-gray-500 leading-snug">
                      Total physical customer dining tables in your restaurant. Used to compute live table occupancy and prevent diner overbooking.
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 self-start sm:self-auto shadow-2xs">
                    <Pressable
                      onPress={() => setTableCapacity((prev) => Math.max(1, prev - 1))}
                      disabled={tableCapacity <= 1}
                      className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40"
                    >
                      <Ionicons name="remove" size={13} color="#374151" />
                    </Pressable>

                    <Text className="text-xs font-bold text-gray-900 w-16 text-center tabular-nums">
                      {tableCapacity} {tableCapacity === 1 ? "Table" : "Tables"}
                    </Text>

                    <Pressable
                      onPress={() => setTableCapacity((prev) => Math.min(50, prev + 1))}
                      disabled={tableCapacity >= 50}
                      className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40"
                    >
                      <Ionicons name="add" size={13} color="#374151" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View className="mt-6 pt-4 border-t border-gray-100 flex-row justify-end">
            <Pressable
              disabled={saving || loading || uploadingLogo || uploadingCover || !storeId}
              onPress={handleSave}
              className="w-full sm:w-auto h-9 px-5 bg-[#EA5410] rounded-lg hover:bg-[#D04508] transition-colors shadow-2xs flex-row items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving && <ActivityIndicator size="small" color="white" />}
              <Text className="text-white font-bold text-xs">
                {saving ? "Saving..." : "Save Store Changes"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Mati City Barangay Picker Modal */}
      <Modal
        visible={barangayPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBarangayPickerVisible(false)}
      >
        <Pressable
          onPress={() => setBarangayPickerVisible(false)}
          className="flex-1 bg-black/50 justify-center items-center p-4 cursor-pointer"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl overflow-hidden max-h-[80%] cursor-default"
          >
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="location-sharp" size={14} color="#EA5410" />
                <Text className="text-xs font-bold text-gray-900">
                  Select Mati City Barangay
                </Text>
              </View>
              <Pressable
                onPress={() => setBarangayPickerVisible(false)}
                className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center cursor-pointer"
              >
                <Ionicons name="close" size={14} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-2">
              {STORE_BARANGAY_OPTIONS.map((bgName) => {
                const selected = bgName === barangay;
                return (
                  <Pressable
                    key={bgName}
                    onPress={() => {
                      setBarangay(bgName);
                      setBarangayPickerVisible(false);
                    }}
                    className={`px-3 py-2.5 rounded-lg mb-1 flex-row items-center justify-between cursor-pointer ${
                      selected ? "bg-orange-50 border border-orange-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        selected ? "font-bold text-[#EA5410]" : "font-medium text-gray-700"
                      }`}
                    >
                      {bgName}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color="#EA5410" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Operating Time Slot Picker Modal */}
      <Modal
        visible={timePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <Pressable
          onPress={() => setTimePickerTarget(null)}
          className="flex-1 bg-black/50 justify-center items-center p-4 cursor-pointer"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-xs border border-gray-200 shadow-2xl overflow-hidden max-h-[75%] cursor-default"
          >
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-gray-900">
                Select {timePickerTarget === "open" ? "Opening Time" : "Closing Time"}
              </Text>
              <Pressable
                onPress={() => setTimePickerTarget(null)}
                className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center cursor-pointer"
              >
                <Ionicons name="close" size={14} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-2">
              {STORE_OPERATING_TIME_OPTIONS.map((slot) => {
                const selected =
                  timePickerTarget === "open" ? slot === openTime : slot === closeTime;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => {
                      if (timePickerTarget === "open") setOpenTime(slot);
                      else if (timePickerTarget === "close") setCloseTime(slot);
                      setFieldErrors((prev) => ({ ...prev, operatingHours: undefined }));
                      setTimePickerTarget(null);
                    }}
                    className={`px-3 py-2 rounded-lg mb-1 flex-row items-center justify-between cursor-pointer ${
                      selected ? "bg-orange-50 border border-orange-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        selected ? "font-bold text-[#EA5410]" : "font-medium text-gray-700"
                      }`}
                    >
                      {slot}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color="#EA5410" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
