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
import { FoodItem } from "../../types/restaurant";

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

  const handleSubmit = () => {
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

    // Reset local step
    setStep(1);
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
          {/* Header with Step Indicator */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                    Step {step} of 2
                  </Text>
                </View>
                <Text className="text-xs text-emerald-800 font-bold">{dish.store}</Text>
              </View>
              <Text className="text-lg font-black text-gray-900">
                {step === 1 ? "Review Order & Size" : "Delivery & COD Details"}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              /* STEP 1: ITEM OPTIONS & FULFILLMENT MODE */
              <View>
                {/* Item Card */}
                <View className="bg-gray-50 border border-gray-200 p-4 rounded-2xl mb-4">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-black text-gray-900">{dish.name}</Text>
                      <Text className="text-xs font-bold text-gray-500">₱{dish.price}.00 each</Text>
                      <Text className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        Category: {dish.category}
                      </Text>
                    </View>

                    {/* Quantity Stepper */}
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl p-1 gap-3">
                      <Pressable
                        onPress={() => setQty(Math.max(1, qty - 1))}
                        className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                      >
                        <Ionicons name="remove" size={16} color="#374151" />
                      </Pressable>
                      <Text className="text-sm font-black text-gray-900 min-w-[16px] text-center">
                        {qty}
                      </Text>
                      <Pressable
                        onPress={() => setQty(qty + 1)}
                        className="w-7 h-7 rounded-lg bg-emerald-700 items-center justify-center"
                      >
                        <Ionicons name="add" size={16} color="white" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Fulfillment Mode Toggle */}
                <Text className="text-xs font-bold text-gray-700 mb-2">Fulfillment Method *</Text>
                <View className="flex-row gap-2.5 mb-5">
                  <Pressable
                    onPress={() => setFulfillment("delivery")}
                    className={`flex-1 p-3 rounded-2xl border flex-row items-center justify-center gap-2 ${
                      fulfillment === "delivery"
                        ? "bg-emerald-50 border-emerald-700"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="bicycle"
                      size={18}
                      color={fulfillment === "delivery" ? "#047857" : "#6b7280"}
                    />
                    <View>
                      <Text
                        className={`text-xs font-black ${
                          fulfillment === "delivery" ? "text-emerald-900" : "text-gray-700"
                        }`}
                      >
                        COD Delivery
                      </Text>
                      <Text className="text-[10px] text-gray-500">Local Mati Rider (₱35)</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setFulfillment("pickup")}
                    className={`flex-1 p-3 rounded-2xl border flex-row items-center justify-center gap-2 ${
                      fulfillment === "pickup"
                        ? "bg-emerald-50 border-emerald-700"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="bag-handle"
                      size={18}
                      color={fulfillment === "pickup" ? "#047857" : "#6b7280"}
                    />
                    <View>
                      <Text
                        className={`text-xs font-black ${
                          fulfillment === "pickup" ? "text-emerald-900" : "text-gray-700"
                        }`}
                      >
                        Self-Pickup
                      </Text>
                      <Text className="text-[10px] text-gray-500">Pick up at store (Free)</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Price Breakdown */}
                <View className="bg-gray-50 border border-gray-200 p-4 rounded-2xl mb-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-600">Subtotal ({qty} items)</Text>
                    <Text className="text-xs font-bold text-gray-900">₱{subtotal}.00</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs text-gray-600">Delivery Fee</Text>
                    <Text className="text-xs font-bold text-gray-900">₱{deliveryFee}.00</Text>
                  </View>
                  <View className="flex-row justify-between pt-2 border-t border-gray-200 items-center">
                    <Text className="text-xs font-black text-gray-900 uppercase">Estimated Total</Text>
                    <Text className="text-base font-black text-emerald-800">₱{total}.00</Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleNextStep}
                  className="bg-emerald-700 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs"
                >
                  <Text className="text-white font-extrabold text-sm">
                    Continue to Delivery Address
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </Pressable>
              </View>
            ) : (
              /* STEP 2: ADDRESS, BARANGAY & COD CONFIRMATION */
              <View>
                {/* Barangay Selection Chips */}
                <Text className="text-xs font-bold text-gray-700 mb-1.5">
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
                            ? "bg-emerald-700 border-emerald-700"
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

                {/* Delivery Landmark */}
                <Text className="text-xs font-bold text-gray-700 mb-1">
                  Street / Landmark Description *
                </Text>
                <TextInput
                  placeholder="e.g. Near Baywalk Pavilion, blue gate, Purok 3"
                  value={address}
                  onChangeText={setAddress}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-3"
                  placeholderTextColor="#9ca3af"
                />

                {/* Special Instructions */}
                <Text className="text-xs font-bold text-gray-700 mb-1">
                  Kitchen / Rider Instructions (Optional)
                </Text>
                <TextInput
                  placeholder="e.g. Extra spicy sauce, call upon arrival"
                  value={notes}
                  onChangeText={setNotes}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mb-4"
                  placeholderTextColor="#9ca3af"
                />

                {/* COD Cash Reminder Alert */}
                <View className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl mb-5 flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center">
                    <Ionicons name="cash" size={20} color="#b45309" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-extrabold text-amber-900">
                      Cash on Delivery (COD)
                    </Text>
                    <Text className="text-[11px] text-amber-800 leading-snug">
                      Please prepare exact cash of <strong>₱{total}.00</strong> for the rider upon
                      arrival.
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-2.5">
                  <Pressable
                    onPress={handlePrevStep}
                    className="flex-1 py-3.5 bg-gray-100 rounded-xl items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-gray-700">Back</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSubmit}
                    className="flex-[2] py-3.5 bg-emerald-700 rounded-xl flex-row items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Ionicons name="checkmark-circle" size={17} color="white" />
                    <Text className="text-white font-extrabold text-xs">
                      Place COD Order (₱{total}) 🚀
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
