import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantProfile } from "../../types/restaurant";

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

  const handleSubmit = () => {
    onConfirmReservation({
      restaurantName: selectedResto,
      partySize,
      date,
      time,
      seatingPreference: seating,
      specialNotes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <View className="bg-teal-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-teal-800 uppercase tracking-wider">
                    Dine-in Booking
                  </Text>
                </View>
                <Text className="text-xs text-teal-800 font-bold">
                  🟢 {activeResto?.availableTables || 4} Tables Free
                </Text>
              </View>
              <Text className="text-lg font-black text-gray-900">{selectedResto}</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
            {/* Restaurant Selector Pills */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5">Select Restaurant *</Text>
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
                        ? "bg-teal-700 border-teal-700"
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
            <Text className="text-xs font-bold text-gray-700 mb-1.5">Party Size (Guests) *</Text>
            <View className="flex-row gap-2 mb-4">
              {[1, 2, 4, 6, 8].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => setPartySize(num)}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                    partySize === num
                      ? "bg-emerald-700 border-emerald-700"
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
            <Text className="text-xs font-bold text-gray-700 mb-1.5">Time Slot (Tonight) *</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTime(t)}
                  className={`px-3.5 py-2 rounded-xl border ${
                    time === t ? "bg-teal-700 border-teal-700" : "bg-gray-50 border-gray-200"
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
            <Text className="text-xs font-bold text-gray-700 mb-1.5">Seating Preference</Text>
            <View className="flex-row gap-2 mb-4">
              {["Bayside Sea Breeze", "Indoor AC", "Family Booth"].map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setSeating(opt)}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                    seating === opt
                      ? "bg-emerald-700 border-emerald-700"
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
            <Text className="text-xs font-bold text-gray-700 mb-1">
              Special Requests (Optional)
            </Text>
            <TextInput
              placeholder="e.g. High chair needed, celebrating anniversary"
              value={notes}
              onChangeText={setNotes}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mb-5"
              placeholderTextColor="#9ca3af"
            />

            {/* Submit Action */}
            <Pressable
              onPress={handleSubmit}
              className="bg-teal-700 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs mb-3"
            >
              <Ionicons name="calendar" size={17} color="white" />
              <Text className="text-white font-extrabold text-sm">
                Confirm Reservation ({partySize} Guests • {time})
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
