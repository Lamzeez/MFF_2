import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { fetchStoreById, updateStoreProfile, fetchUserStoreId } from "../../../services/catalog";

const DEFAULT_STORE_ID = "11111111-1111-1111-1111-111111111111";

export default function StoreProfile() {
  const { identity } = useSession();
  const [storeId, setStoreId] = useState<string>(DEFAULT_STORE_ID);

  const [storeName, setStoreName] = useState("Mama Letty's Karenderia");
  const [description, setDescription] = useState(
    "Serving authentic home-cooked Filipino meals, seafood, and Mati specialties in the heart of Poblacion."
  );
  const [openTime, setOpenTime] = useState("07:00 AM");
  const [closeTime, setCloseTime] = useState("08:00 PM");
  const [phone, setPhone] = useState("+63 917 234 5678");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
      }
      setLoading(false);
    });
  }, [storeId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateStoreProfile(storeId, {
      name: storeName,
      description,
      public_phone: phone,
    });
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert(`Failed to save: ${res.error || "Unknown error"}`);
    }
  };

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-4xl self-center">
      {/* Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            STORE SETTINGS
          </Text>
        </View>
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Store Profile & Operating Hours</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Update how your Karenderia or Restaurant appears to customers across Mati City.
        </Text>
      </View>

      <ScrollView
        className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden"
        contentContainerStyle={{ padding: 32 }}
      >
        {/* Banner/Logo Uploads */}
        <View className="flex-row items-center gap-6 mb-8 pb-8 border-b border-gray-100">
          <View className="w-24 h-24 bg-[#EA5410]/10 rounded-2xl items-center justify-center border-2 border-dashed border-[#EA5410]/30">
            <Ionicons name="storefront" size={36} color="#EA5410" />
          </View>
          <View>
            <Pressable
              onPress={() => alert("Upload Logo: In production, uploads cover image to Supabase Storage.")}
              className="px-5 py-2.5 bg-[#111827] rounded-xl hover:bg-black transition-colors mb-2 self-start flex-row items-center gap-2"
            >
              <Ionicons name="cloud-upload-outline" size={16} color="white" />
              <Text className="text-white font-bold text-xs">Upload Store Cover Photo</Text>
            </Pressable>
            <Text className="text-gray-400 text-xs">Recommended: 1200x600 PNG or JPEG, up to 5MB</Text>
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

        {saved && (
          <View className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={18} color="#047857" />
            <Text className="text-emerald-800 text-xs font-bold">Store profile updated successfully on Supabase!</Text>
          </View>
        )}

        <View className="mt-8 pt-6 border-t border-gray-100 flex-row justify-end">
          <Pressable
            disabled={saving || loading}
            onPress={handleSave}
            className="px-8 py-3.5 bg-[#EA5410] rounded-2xl hover:bg-[#D04508] transition-colors shadow-sm flex-row items-center gap-2"
          >
            {saving && <ActivityIndicator size="small" color="white" />}
            <Text className="text-white font-extrabold text-sm">
              {saving ? "Saving..." : "Save Store Changes"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
