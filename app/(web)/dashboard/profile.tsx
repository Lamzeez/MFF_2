import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { fetchStoreById, updateStoreProfile, fetchUserStoreId } from "../../../services/catalog";
import { uploadStoreCoverPhoto } from "../../../services/storage";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

const DEFAULT_STORE_ID = "11111111-1111-1111-1111-111111111111";

export default function StoreProfile() {
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string>(DEFAULT_STORE_ID);

  const [storeName, setStoreName] = useState("Mama Letty's Karenderia");
  const [description, setDescription] = useState(
    "Serving authentic home-cooked Filipino meals, seafood, and Mati specialties in the heart of Poblacion."
  );
  const [openTime, setOpenTime] = useState("07:00 AM");
  const [closeTime, setCloseTime] = useState("08:00 PM");
  const [phone, setPhone] = useState("+63 917 234 5678");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  useEffect(() => {
    if (identity?.id) {
      fetchUserStoreId(identity.id).then((id) => {
        if (id) setStoreId(id);
      });
    }
  }, [identity?.id]);

  useEffect(() => {
    fetchStoreById(storeId).then((store) => {
      if (store) {
        setStoreName(store.name);
        setDescription(store.description);
        if (store.phone) setPhone(store.phone);
        if (store.cover_image_url) {
          setCoverImageUrl(store.cover_image_url);
        } else if (store.imageUrl) {
          setCoverImageUrl(store.imageUrl);
        }
        const hoursStr = store.operating_hours || store.hours;
        if (hoursStr) {
          const match = hoursStr.match(/^([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))\s*-\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))/i);
          if (match) {
            setOpenTime(match[1]);
            setCloseTime(match[2]);
          }
        }
      }
      setLoading(false);
    });
  }, [storeId]);

  const handleUploadCoverPhoto = () => {
    if (typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const res = await uploadStoreCoverPhoto(file, storeId, {
            mimeType: file.type || "image/jpeg",
          });
          if (res.publicUrl) {
            setCoverImageUrl(res.publicUrl);
            setBanner({
              type: "success",
              message: "Store cover photo uploaded successfully to Supabase Storage!",
            });
          } else {
            setBanner({
              type: "error",
              message: `Failed to upload cover photo: ${res.error || "Unknown error"}`,
            });
          }
        } catch (err: any) {
          setBanner({
            type: "error",
            message: `Failed to upload photo: ${err?.message || "Unknown error"}`,
          });
        } finally {
          setUploading(false);
        }
      };
      input.click();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const operating_hours = `${openTime} - ${closeTime} Daily`;
    const res = await updateStoreProfile(storeId, {
      name: storeName,
      description,
      public_phone: phone,
      operating_hours,
      cover_image_url: coverImageUrl || undefined,
    });
    setSaving(false);
    if (res.success) {
      setBanner({
        type: "success",
        message: "Store profile & operating hours updated successfully on Supabase!",
      });
    } else {
      setBanner({
        type: "error",
        message: `Failed to save: ${res.error || "Unknown error"}`,
      });
    }
  };

  return (
    <View className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-4xl self-center">
      {/* Header */}
      <View className="mb-6 sm:mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            STORE SETTINGS
          </Text>
        </View>
        <Text className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Store Profile & Operating Hours</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Update how your Karenderia or Restaurant appears to customers across Mati City.
        </Text>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      <ScrollView
        className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden"
      >
        <View className="p-5 sm:p-7 lg:p-8">
        {/* Banner/Logo Uploads */}
        <View className="flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-100">
          {coverImageUrl ? (
            <Image
              source={{ uri: coverImageUrl }}
              className="w-24 h-24 rounded-2xl border border-gray-200 shrink-0"
              resizeMode="cover"
            />
          ) : (
            <View className="w-24 h-24 bg-[#EA5410]/10 rounded-2xl items-center justify-center border-2 border-dashed border-[#EA5410]/30 shrink-0">
              <Ionicons name="storefront" size={36} color="#EA5410" />
            </View>
          )}
          <View className="flex-1">
            <Pressable
              disabled={uploading}
              onPress={handleUploadCoverPhoto}
              className="px-5 py-2.5 bg-[#111827] rounded-xl hover:bg-black transition-colors mb-2 self-start flex-row items-center gap-2"
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color="white" />
              )}
              <Text className="text-white font-bold text-xs">
                {uploading ? "Uploading to Storage..." : "Upload Store Cover Photo"}
              </Text>
            </Pressable>
            <Text className="text-gray-400 text-xs">Recommended: 1200x600 PNG, WEBP or JPEG, up to 10MB</Text>
          </View>
        </View>

        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-xs text-gray-400 mt-2">Loading store profile from Supabase...</Text>
          </View>
        ) : (
          /* Form Fields */
          <View className="gap-5">
            <View>
              <Text className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-2">Store Name</Text>
              <TextInput
                value={storeName}
                onChangeText={setStoreName}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white"
              />
            </View>

            <View>
              <Text className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-2">Short Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white h-24"
                textAlignVertical="top"
              />
            </View>

            <View className="flex-col md:flex-row gap-5">
              <View className="flex-1">
                <Text className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-2">Opening Time</Text>
                <TextInput
                  value={openTime}
                  onChangeText={setOpenTime}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white"
                />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-2">Closing Time</Text>
                <TextInput
                  value={closeTime}
                  onChangeText={setCloseTime}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white"
                />
              </View>
            </View>

            <View>
              <Text className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-2">Official Contact Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:border-[#EA5410] focus:bg-white"
              />
            </View>
          </View>
        )}

        <View className="mt-8 pt-6 border-t border-gray-100 flex-row justify-end">
          <Pressable
            disabled={saving || loading}
            onPress={handleSave}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#EA5410] rounded-2xl hover:bg-[#D04508] transition-colors shadow-sm flex-row items-center justify-center gap-2"
          >
            {saving && <ActivityIndicator size="small" color="white" />}
            <Text className="text-white font-extrabold text-sm">
              {saving ? "Saving..." : "Save Store Changes"}
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}
