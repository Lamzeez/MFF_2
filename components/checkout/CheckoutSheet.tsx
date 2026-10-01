import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FoodItem } from "../../types/restaurant";
import { BottomSheetModal } from "../ui/BottomSheetModal";

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  dish: FoodItem | null;
  barangays: readonly string[];
  onConfirmOrder: (orderPayload: {
    dish: FoodItem;
    qty: number;
    barangay: string;
    address: string;
    notes: string;
    fulfillment: "delivery" | "pickup";
    total: number;
  }) => void;
}

export function CheckoutSheet({
  visible,
  onClose,
  dish,
  barangays,
  onConfirmOrder,
}: CheckoutSheetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [qty, setQty] = useState(1);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [selectedBarangay, setSelectedBarangay] = useState("Central (Poblacion)");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  if (!dish) return null;

  const itemPrice = dish.price;
  const subtotal = itemPrice * qty;
  const deliveryFee = fulfillment === "delivery" ? 35 : 0;
  const total = subtotal + deliveryFee;

  const handleNextStep = () => {
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSubmit = (handleDismiss: () => void) => {
    if (fulfillment === "delivery" && !address.trim()) {
      Alert.alert("Address Required", "Please provide a street, landmark, or house description.");
      return;
    }

    onConfirmOrder({
      dish,
      qty,
      barangay: selectedBarangay,
      address: address.trim(),
      notes: notes.trim(),
      fulfillment,
      total,
    });

    setStep(1);
    handleDismiss();
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={handleClose} heightPercent={0.88}>
      {({ handleDismiss }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-white p-5 flex-col"
        >
          {/* Visual Drag Handle Pill */}
          <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

          {/* Header with Step Indicator & Close Button */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <View className="bg-orange-100 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                    Step {step} of 2
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 font-bold" numberOfLines={1}>
                  {dish.store}
                </Text>
              </View>
              <Text className="text-xl font-black text-gray-900 tracking-tight">
                {step === 1 ? "Review Order & Quantity" : "Delivery Address & COD"}
              </Text>
            </View>

            <Pressable
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close checkout sheet"
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 mt-3.5" showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              /* STEP 1: ITEM DETAILS, IMAGE, QUANTITY & FULFILLMENT MODE */
              <View>
                {/* Food Item Card with Photo */}
                <View className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl mb-4 flex-row items-center gap-3.5">
                  <Image
                    source={{
                      uri:
                        dish.imageUrl ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                    }}
                    className="w-20 h-20 rounded-2xl bg-gray-200"
                    resizeMode="cover"
                  />
                  <View className="flex-1 pr-1">
                    <Text className="text-sm font-black text-gray-900 leading-tight" numberOfLines={1}>
                      {dish.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-bold text-[#EA5410]">
                          {dish.category}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-gray-500">
                        ₱{dish.price.toFixed(2)} each
                      </Text>
                    </View>

                    {/* Quantity Stepper */}
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl p-1 gap-2.5 mt-2 self-start">
                      <Pressable
                        onPress={() => setQty(Math.max(1, qty - 1))}
                        className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center active:bg-gray-200"
                      >
                        <Ionicons name="remove" size={15} color="#374151" />
                      </Pressable>
                      <Text className="text-sm font-black text-gray-900 min-w-[18px] text-center">
                        {qty}
                      </Text>
                      <Pressable
                        onPress={() => setQty(qty + 1)}
                        className="w-7 h-7 rounded-lg bg-[#EA5410] items-center justify-center active:opacity-90"
                      >
                        <Ionicons name="add" size={15} color="white" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Fulfillment Method Selection */}
                <Text className="text-xs font-bold text-gray-700 mb-2">
                  Fulfillment Method *
                </Text>
                <View className="flex-row gap-2.5 mb-4">
                  <Pressable
                    onPress={() => setFulfillment("delivery")}
                    className={`flex-1 p-3.5 rounded-2xl border flex-row items-center gap-2.5 ${
                      fulfillment === "delivery"
                        ? "bg-orange-50/80 border-[#EA5410]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <View
                      className={`w-9 h-9 rounded-xl items-center justify-center ${
                        fulfillment === "delivery" ? "bg-orange-100" : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="bicycle"
                        size={20}
                        color={fulfillment === "delivery" ? "#EA5410" : "#6B7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-xs font-black ${
                          fulfillment === "delivery" ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        COD Delivery
                      </Text>
                      <Text className="text-[10px] text-gray-500">Mati Rider (₱35)</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setFulfillment("pickup")}
                    className={`flex-1 p-3.5 rounded-2xl border flex-row items-center gap-2.5 ${
                      fulfillment === "pickup"
                        ? "bg-orange-50/80 border-[#EA5410]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <View
                      className={`w-9 h-9 rounded-xl items-center justify-center ${
                        fulfillment === "pickup" ? "bg-orange-100" : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="bag-handle"
                        size={20}
                        color={fulfillment === "pickup" ? "#EA5410" : "#6B7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-xs font-black ${
                          fulfillment === "pickup" ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        Self-Pickup
                      </Text>
                      <Text className="text-[10px] text-gray-500">Pick up (Free)</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Price Breakdown */}
                <View className="bg-gray-50 border border-gray-200 p-4 rounded-2xl mb-5">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-gray-600 font-medium">
                      Subtotal ({qty} {qty > 1 ? "items" : "item"})
                    </Text>
                    <Text className="text-xs font-bold text-gray-900">₱{subtotal}.00</Text>
                  </View>
                  <View className="flex-row justify-between mb-2.5">
                    <Text className="text-xs text-gray-600 font-medium">Delivery Fee</Text>
                    <Text className="text-xs font-bold text-gray-900">
                      {deliveryFee === 0 ? "FREE" : `₱${deliveryFee}.00`}
                    </Text>
                  </View>
                  <View className="flex-row justify-between pt-2.5 border-t border-gray-200 items-center">
                    <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Estimated Total
                    </Text>
                    <Text className="text-xl font-black text-[#EA5410]">₱{total}.00</Text>
                  </View>
                </View>

                {/* Next Button */}
                <Pressable
                  onPress={handleNextStep}
                  className="bg-[#EA5410] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm active:opacity-95 mb-6"
                >
                  <Text className="text-white font-black text-sm">
                    Continue to Delivery Address
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </Pressable>
              </View>
            ) : (
              /* STEP 2: ADDRESS, BARANGAY & COD CONFIRMATION */
              <View>
                {/* Barangay Selection Chips */}
                <Text className="text-xs font-bold text-gray-700 mb-2">
                  Select Delivery Barangay *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 10 }}
                >
                  {barangays.map((brgy) => {
                    const isSelected = selectedBarangay === brgy;
                    return (
                      <Pressable
                        key={brgy}
                        onPress={() => setSelectedBarangay(brgy)}
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
                          {brgy}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Delivery Landmark / Street */}
                <Text className="text-xs font-bold text-gray-700 mb-1.5">
                  Street / Landmark Description *
                </Text>
                <TextInput
                  placeholder="e.g. Near Baywalk Pavilion, blue gate, Purok 3"
                  value={address}
                  onChangeText={setAddress}
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-3 text-sm text-gray-900 mb-3.5 font-medium"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Special Instructions */}
                <Text className="text-xs font-bold text-gray-700 mb-1.5">
                  Kitchen / Rider Instructions (Optional)
                </Text>
                <TextInput
                  placeholder="e.g. Extra spicy sauce, please call upon arrival"
                  value={notes}
                  onChangeText={setNotes}
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 mb-4 font-medium"
                  placeholderTextColor="#9CA3AF"
                />

                {/* COD Cash Reminder Box */}
                <View className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl mb-5 flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center">
                    <Ionicons name="cash-outline" size={22} color="#B45309" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-amber-900">
                      Cash on Delivery (COD)
                    </Text>
                    <Text className="text-[11px] text-amber-800 leading-snug mt-0.5">
                      Please prepare exact cash of ₱{total}.00 for the rider upon arrival.
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-2.5 mb-6">
                  <Pressable
                    onPress={handlePrevStep}
                    className="flex-1 py-3.5 bg-gray-100 rounded-2xl items-center justify-center active:bg-gray-200"
                  >
                    <Text className="text-xs font-bold text-gray-700">Back</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSubmit(handleDismiss)}
                    className="flex-[2] py-3.5 bg-[#EA5410] rounded-2xl flex-row items-center justify-center gap-1.5 shadow-sm active:opacity-95"
                  >
                    <Ionicons name="checkmark-circle" size={17} color="white" />
                    <Text className="text-white font-black text-xs">
                      Place COD Order (₱{total}) 🚀
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BottomSheetModal>
  );
}
