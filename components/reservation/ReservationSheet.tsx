import React, { useState, useMemo, useEffect } from "react";
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
import {
  generateUpcomingReservationDates,
  generateAvailableTimeSlots,
  parseOperatingWindow,
} from "../../lib/reservation-dates";

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
  // 14-day (2 weeks) advance reservation horizon
  const dateOptions = useMemo(() => generateUpcomingReservationDates(14), []);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => dateOptions[0]?.iso || "");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  // Dropdown expansion states for scrollable date and time lists
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  useEffect(() => {
    if (initialRestaurant) {
      setSelectedResto(initialRestaurant);
    }
  }, [initialRestaurant]);

  const activeResto = restaurants[selectedResto] || Object.values(restaurants)[0];
  const selectedDateOption = dateOptions.find((d) => d.iso === selectedDateIso) || dateOptions[0];
  const multipleRestos = Object.keys(restaurants).length > 1;

  // Compute Today's ISO date string
  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const isToday = selectedDateIso === todayIso;

  // Operating window and dynamic time slots based on store hours and selected date
  const operatingWindow = useMemo(() => {
    return parseOperatingWindow(activeResto?.hours);
  }, [activeResto?.hours]);

  const availableTimeSlots = useMemo(() => {
    return generateAvailableTimeSlots(activeResto?.hours, isToday, new Date(), 15);
  }, [activeResto?.hours, isToday]);

  // Synchronize time selection when date or operating hours change
  useEffect(() => {
    if (availableTimeSlots.length > 0) {
      if (!time || !availableTimeSlots.includes(time)) {
        setTime(availableTimeSlots[0]);
      }
    } else {
      setTime("");
    }
  }, [availableTimeSlots, time]);

  const displayDate = useMemo(() => {
    if (!selectedDateOption) return "";
    if (selectedDateOption.label === "Today" || selectedDateOption.label === "Tomorrow") {
      return `${selectedDateOption.label} (${selectedDateOption.dayNum})`;
    }
    return selectedDateOption.label;
  }, [selectedDateOption]);

  const handleSubmit = (handleDismiss: () => void) => {
    if (!time) return;

    onConfirmReservation({
      restaurantName: selectedResto,
      partySize,
      date: selectedDateOption.iso,
      time,
      seatingPreference: "Standard Dining",
      specialNotes: notes.trim(),
    });
    handleDismiss();
  };

  const hasAvailableTimes = availableTimeSlots.length > 0;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.84}>
      {({ handleDismiss }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-white p-4 flex-col"
        >
          {/* Visual Drag Handle */}
          <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-2" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-2.5 border-b border-gray-100">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] font-bold text-[#EA5410] uppercase tracking-wider">
                Table Reservation
              </Text>
              <Text className="text-base font-black text-gray-900" numberOfLines={1}>
                {selectedResto}
              </Text>
              <Text className="text-[10px] text-gray-500 font-medium">
                Operating Hours: {operatingWindow.formattedHours}
              </Text>
            </View>

            <Pressable
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close reservation sheet"
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={18} color="#374151" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 mt-2.5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Optional Restaurant Selector (Only when browsing multiple) */}
            {multipleRestos && (
              <View className="mb-3">
                <Text className="text-xs font-bold text-gray-700 mb-1">Select Restaurant</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {Object.keys(restaurants).map((resto) => {
                    const isSelected = selectedResto === resto;
                    return (
                      <Pressable
                        key={resto}
                        onPress={() => setSelectedResto(resto)}
                        className={`px-3 py-1.5 rounded-xl border ${
                          isSelected
                            ? "bg-[#EA5410] border-[#EA5410]"
                            : "bg-gray-50 border-gray-200"
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
              </View>
            )}

            {/* 1. Party Size (Guests) - Simple & Clean Stepper */}
            <View className="flex-row items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl mb-3">
              <View>
                <Text className="text-xs font-bold text-gray-800">Party Size (Guests)</Text>
                <Text className="text-[11px] text-gray-500">
                  {partySize} {partySize === 1 ? "person" : "people"}
                </Text>
              </View>

              <View className="flex-row items-center bg-white border border-gray-200 rounded-lg p-0.5">
                <Pressable
                  onPress={() => setPartySize(Math.max(1, partySize - 1))}
                  disabled={partySize <= 1}
                  accessibilityLabel="Decrease guest count"
                  className={`w-7 h-7 rounded items-center justify-center ${
                    partySize <= 1 ? "opacity-30" : "active:bg-gray-100"
                  }`}
                >
                  <Ionicons name="remove" size={16} color="#374151" />
                </Pressable>

                <TextInput
                  value={String(partySize)}
                  onChangeText={(val) => {
                    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
                    if (!isNaN(num)) setPartySize(Math.min(25, Math.max(1, num)));
                    else if (val === "") setPartySize(1);
                  }}
                  keyboardType="number-pad"
                  className="w-10 text-center text-sm font-bold text-gray-900"
                  maxLength={2}
                />

                <Pressable
                  onPress={() => setPartySize(Math.min(25, partySize + 1))}
                  disabled={partySize >= 25}
                  accessibilityLabel="Increase guest count"
                  className={`w-7 h-7 rounded items-center justify-center bg-[#EA5410] ${
                    partySize >= 25 ? "opacity-30" : "active:opacity-90"
                  }`}
                >
                  <Ionicons name="add" size={16} color="white" />
                </Pressable>
              </View>
            </View>

            {/* 2. Date Input Field with Scrollable Dropdown List (2-week advance horizon) */}
            <View className="mb-3">
              <Text className="text-xs font-bold text-gray-700 mb-1">Reservation Date</Text>
              <Pressable
                onPress={() => {
                  setShowDateDropdown(!showDateDropdown);
                  if (showTimeDropdown) setShowTimeDropdown(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Select reservation date"
                className={`flex-row items-center justify-between p-3 bg-gray-50 border rounded-xl ${
                  showDateDropdown ? "border-[#EA5410] bg-orange-50/20" : "border-gray-200"
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="calendar-outline" size={16} color="#EA5410" />
                  <Text className="text-xs font-bold text-gray-900">{displayDate}</Text>
                </View>
                <Ionicons
                  name={showDateDropdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6B7280"
                />
              </Pressable>

              {/* Scrollable Date Selection List */}
              {showDateDropdown && (
                <View className="mt-1 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                  <ScrollView
                    nestedScrollEnabled
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {dateOptions.map((opt) => {
                      const isSelected = selectedDateIso === opt.iso;
                      const optLabel =
                        opt.label === "Today" || opt.label === "Tomorrow"
                          ? `${opt.label} (${opt.dayNum})`
                          : opt.label;

                      return (
                        <Pressable
                          key={opt.iso}
                          onPress={() => {
                            setSelectedDateIso(opt.iso);
                            setShowDateDropdown(false);
                          }}
                          className={`flex-row items-center justify-between px-3 py-2.5 border-b border-gray-100 ${
                            isSelected ? "bg-orange-50" : "active:bg-gray-50"
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? "font-bold text-[#EA5410]" : "text-gray-800"
                            }`}
                          >
                            {optLabel}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={16} color="#EA5410" />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 3. Time Input Field with Dynamic Operating Hours & Relationship to Date */}
            <View className="mb-3">
              <Text className="text-xs font-bold text-gray-700 mb-1">
                Dining Time {isToday ? "(Remaining Slots Today)" : "(Between Store Hours)"}
              </Text>
              <Pressable
                onPress={() => {
                  if (!hasAvailableTimes) return;
                  setShowTimeDropdown(!showTimeDropdown);
                  if (showDateDropdown) setShowDateDropdown(false);
                }}
                disabled={!hasAvailableTimes}
                accessibilityRole="button"
                accessibilityLabel="Select dining time"
                className={`flex-row items-center justify-between p-3 border rounded-xl ${
                  !hasAvailableTimes
                    ? "bg-gray-100 border-gray-200 opacity-70"
                    : showTimeDropdown
                    ? "border-[#EA5410] bg-orange-50/20"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={hasAvailableTimes ? "#EA5410" : "#9CA3AF"}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      hasAvailableTimes ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {hasAvailableTimes ? time : "No booking slots available today"}
                  </Text>
                </View>
                {hasAvailableTimes && (
                  <Ionicons
                    name={showTimeDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6B7280"
                  />
                )}
              </Pressable>

              {/* Notice if same-day bookings are closed */}
              {!hasAvailableTimes && isToday && (
                <View className="mt-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <Text className="text-[11px] text-amber-800">
                    Same-day reservations for today are closed (store closing soon or closed). Please select tomorrow or an upcoming date.
                  </Text>
                </View>
              )}

              {/* Scrollable Time Selection List */}
              {showTimeDropdown && hasAvailableTimes && (
                <View className="mt-1 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                  <ScrollView
                    nestedScrollEnabled
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {availableTimeSlots.map((t) => {
                      const isSelected = time === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => {
                            setTime(t);
                            setShowTimeDropdown(false);
                          }}
                          className={`flex-row items-center justify-between px-3 py-2.5 border-b border-gray-100 ${
                            isSelected ? "bg-orange-50" : "active:bg-gray-50"
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? "font-bold text-[#EA5410]" : "text-gray-800"
                            }`}
                          >
                            {t}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={16} color="#EA5410" />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 4. Special Requests (Optional) */}
            <View className="mb-3">
              <Text className="text-xs font-bold text-gray-700 mb-1">
                Special Requests (Optional)
              </Text>
              <TextInput
                placeholder="e.g. High chair needed, celebrating birthday..."
                value={notes}
                onChangeText={setNotes}
                maxLength={120}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 5. MFF Table Holding & No-Show Countermeasure Policy */}
            <View className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 mb-4 flex-row items-start gap-2.5">
              <Ionicons name="shield-checkmark" size={16} color="#D97706" style={{ marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-amber-950">
                  MFF Table Holding & No-Show Policy
                </Text>
                <Text className="text-[10px] text-amber-900 leading-tight mt-0.5">
                  Reserved tables are held for 15 minutes past your booking time. Unattended reservations are marked as No-Show by the store. Accumulating 2 strikes will automatically restrict COD and table booking privileges.
                </Text>
              </View>
            </View>

            {/* 6. Confirm Booking CTA */}
            <Pressable
              onPress={() => handleSubmit(handleDismiss)}
              disabled={!hasAvailableTimes}
              className={`py-3 rounded-xl flex-row items-center justify-center gap-2 shadow-sm mb-4 ${
                hasAvailableTimes
                  ? "bg-[#EA5410] active:opacity-95"
                  : "bg-gray-300 opacity-60"
              }`}
            >
              <Ionicons name="calendar" size={16} color="white" />
              <View className="items-center">
                <Text className="text-white font-black text-xs">
                  {hasAvailableTimes ? "Confirm Table Reservation" : "Select Another Date"}
                </Text>
                {hasAvailableTimes && (
                  <Text className="text-white/80 text-[10px] font-semibold">
                    {partySize} {partySize === 1 ? "Guest" : "Guests"} · {displayDate} at {time}
                  </Text>
                )}
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BottomSheetModal>
  );
}
