import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantProfile } from "../../types/restaurant";
import { BottomSheetModal } from "../ui/BottomSheetModal";

interface ReservationSheetProps {
  visible: boolean;
  onClose: () => void;
  initialRestaurant: string;
  restaurants: Record<string, RestaurantProfile>;
  onConfirmReservation: (reservationData: {
    restaurantName: string;
    partySize: number;
    date: string;
    time: string;
    seatingPreference: string;
    specialNotes: string;
  }) => void;
}

export function ReservationSheet({
  visible,
  onClose,
  initialRestaurant,
  restaurants,
  onConfirmReservation,
}: ReservationSheetProps) {
  const [selectedResto, setSelectedResto] = useState(initialRestaurant);
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("Tonight");
  const [time, setTime] = useState("7:30 PM");
  const [seating, setSeating] = useState("Bayside Sea Breeze");
  const [notes, setNotes] = useState("");

  const activeResto = restaurants[selectedResto] || Object.values(restaurants)[0];

  const handleSubmit = (handleDismiss: () => void) => {
    onConfirmReservation({
      restaurantName: selectedResto,
      partySize,
      date,
      time,
      seatingPreference: seating,
      specialNotes: notes.trim(),
    });
    handleDismiss();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.88}>
      {({ handleDismiss }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-white p-5 flex-col"
        >
          {/* Visual Drag Handle Pill */}
          <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="bg-orange-100 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                    Dine-in Booking
                  </Text>
                </View>
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <Text className="text-[10px] text-emerald-800 font-bold">
                    {activeResto?.availableTables || 4} Tables Open
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-black text-gray-900 tracking-tight" numberOfLines={1}>
                {selectedResto}
              </Text>
            </View>

            <Pressable
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close reservation sheet"
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 mt-3.5" showsVerticalScrollIndicator={false}>
            {/* Restaurant Selector Pills */}
            <Text className="text-xs font-bold text-gray-700 mb-2">Select Restaurant *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingRight: 10 }}
            >
              {Object.keys(restaurants).map((resto) => {
                const isSelected = selectedResto === resto;
                return (
                  <Pressable
                    key={resto}
                    onPress={() => setSelectedResto(resto)}
                    className={`mr-2 px-3.5 py-2 rounded-xl border ${
                      isSelected
                        ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {resto}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Tap 1: Party Size Selector */}
            <Text className="text-xs font-bold text-gray-700 mb-2">Party Size (Guests) *</Text>
            <View className="flex-row gap-2 mb-4">
              {[1, 2, 4, 6, 8].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => setPartySize(num)}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                    partySize === num
                      ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      partySize === num ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {num === 8 ? "8+" : `${num} pax`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Tap 2: Time Slot Pills */}
            <Text className="text-xs font-bold text-gray-700 mb-2">Time Slot (Tonight) *</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTime(t)}
                  className={`px-3.5 py-2 rounded-xl border ${
                    time === t
                      ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${time === t ? "text-white" : "text-gray-700"}`}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Tap 3: Seating Preference */}
            <Text className="text-xs font-bold text-gray-700 mb-2">Seating Preference</Text>
            <View className="flex-row gap-2 mb-4">
              {["Bayside Sea Breeze", "Indoor AC", "Family Booth"].map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setSeating(opt)}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                    seating === opt
                      ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold text-center ${
                      seating === opt ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Special Instructions */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5">
              Special Requests (Optional)
            </Text>
            <TextInput
              placeholder="e.g. High chair needed, celebrating anniversary"
              value={notes}
              onChangeText={setNotes}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 mb-5 font-medium"
              placeholderTextColor="#9CA3AF"
            />

            {/* Submit Action */}
            <Pressable
              onPress={() => handleSubmit(handleDismiss)}
              className="bg-[#EA5410] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm active:opacity-95 mb-6"
            >
              <Ionicons name="calendar" size={17} color="white" />
              <Text className="text-white font-black text-sm">
                Confirm Reservation ({partySize} Guests · {time})
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BottomSheetModal>
  );
}
