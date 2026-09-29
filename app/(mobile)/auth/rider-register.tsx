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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MATI_BARANGAYS } from "../../../mock/barangays";

export default function RiderRegisterScreen() {
  const router = useRouter();

  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderMotorcycle, setRiderMotorcycle] = useState("");
  const [riderPlate, setRiderPlate] = useState("");
  const [riderLicense, setRiderLicense] = useState("");
  const [riderBarangay, setRiderBarangay] = useState("Central (Poblacion)");
  const [riderNewPin, setRiderNewPin] = useState("");
  const [riderCodAgreed, setRiderCodAgreed] = useState(true);

  const handleRegister = () => {
    if (!riderName.trim() || !riderPhone.trim() || !riderMotorcycle.trim() || !riderNewPin.trim()) {
      Alert.alert("Missing Fields", "Please fill in your Name, Phone, Motorcycle Model, and 4-Digit PIN.");
      return;
    }
    if (!riderCodAgreed) {
      Alert.alert("Agreement Required", "Please agree to the Cash-on-Delivery remittance protocol.");
      return;
    }

    Alert.alert(
      "Rider Application Approved! 🏍️",
      `Welcome ${riderName}! You have been registered as Independent Courier #M-403 in Mati City.`,
      [{ text: "Open Rider Mode", onPress: () => router.replace("/(mobile)/rider") }]
    );
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
          <Text className="text-base font-black text-gray-900">Apply as Delivery Rider</Text>
          <Text className="text-xs text-sky-700 font-bold">Earn ₱65 - ₱120 per trip</Text>
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
          <Text className="text-xs font-bold text-gray-700 mb-1.5">Full Legal Name *</Text>
          <TextInput
            placeholder="e.g. Roberto D. Tan"
            value={riderName}
            onChangeText={setRiderName}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Mobile Phone (Active for Dispatch) *</Text>
          <TextInput
            placeholder="e.g. 0917 987 6543"
            value={riderPhone}
            onChangeText={setRiderPhone}
            keyboardType="phone-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Motorcycle Make, Model & Color *</Text>
          <TextInput
            placeholder="e.g. Honda Wave 110 - Black"
            value={riderMotorcycle}
            onChangeText={setRiderMotorcycle}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Plate Number / MV File No. *</Text>
          <TextInput
            placeholder="e.g. 1102-DA"
            value={riderPlate}
            onChangeText={setRiderPlate}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Driver's License Number *</Text>
          <TextInput
            placeholder="e.g. L02-19-123456"
            value={riderLicense}
            onChangeText={setRiderLicense}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3.5"
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Barangay of Residence *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
            {MATI_BARANGAYS.map((brgy) => (
              <Pressable
                key={brgy}
                onPress={() => setRiderBarangay(brgy)}
                className={`mr-2 px-3.5 py-2 rounded-xl border ${
                  riderBarangay === brgy
                    ? "bg-sky-600 border-sky-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    riderBarangay === brgy ? "text-white" : "text-gray-700"
                  }`}
                >
                  {brgy}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-xs font-bold text-gray-700 mb-1.5">Create 4-Digit Shift Login PIN *</Text>
          <TextInput
            placeholder="••••"
            value={riderNewPin}
            onChangeText={setRiderNewPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-4"
            placeholderTextColor="#9ca3af"
          />

          {/* COD Remittance Checkbox */}
          <Pressable
            onPress={() => setRiderCodAgreed(!riderCodAgreed)}
            className="flex-row items-center gap-2.5 bg-sky-50 p-3.5 rounded-xl border border-sky-200 mb-5"
          >
            <Ionicons
              name={riderCodAgreed ? "checkbox" : "square-outline"}
              size={20}
              color={riderCodAgreed ? "#0284c7" : "#6b7280"}
            />
            <Text className="text-[11px] text-sky-950 font-medium flex-1 leading-tight">
              I agree to collect and remit Cash on Delivery (COD) order payments accurately to Mati FoodFinder partner restaurants.
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRegister}
            className="w-full py-3.5 bg-sky-600 rounded-xl items-center shadow-md mb-6"
          >
            <Text className="text-white font-bold text-sm">Submit Rider Application</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
