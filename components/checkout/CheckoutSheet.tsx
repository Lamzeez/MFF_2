import React, { useState, useEffect, useMemo } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FoodItem } from "../../types/restaurant";
import { BottomSheetModal } from "../ui/BottomSheetModal";
import { useSession } from "../../context/SessionContext";
import { useCart, CartItem } from "../../context/CartContext";
import {
  validateVoucherCode,
  calculateVoucherDiscount,
  Voucher,
} from "../../services/vouchers";
import { checkCustomerCodEligibility } from "../../services/orders";

export interface CheckoutConfirmedPayload {
  dish?: FoodItem;
  items: {
    menuItemId?: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  qty: number;
  barangay: string;
  address: string;
  notes: string;
  fulfillment: "delivery" | "pickup";
  total: number;
  voucherCode?: string;
  voucherId?: string;
  discount?: number;
  storeName?: string;
  storeId?: string;
}

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  dish?: FoodItem | null;
  barangays: readonly string[];
  onConfirmOrder: (orderPayload: CheckoutConfirmedPayload) => void;
}

export function CheckoutSheet({
  visible,
  onClose,
  dish,
  barangays,
  onConfirmOrder,
}: CheckoutSheetProps) {
  const { identity } = useSession();
  const {
    items: cartItems,
    storeName: cartStoreName,
    storeId: cartStoreId,
    totalCount: cartTotalCount,
    foodSubtotal: cartFoodSubtotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<1 | 2>(1);
  const [singleDishQty, setSingleDishQty] = useState(1);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [selectedBarangay, setSelectedBarangay] = useState("Central (Poblacion)");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // COD Eligibility state
  const [codEligibility, setCodEligibility] = useState<{ eligible: boolean; strikes: number }>({
    eligible: true,
    strikes: 0,
  });

  useEffect(() => {
    if (visible && identity?.id) {
      checkCustomerCodEligibility(identity.id).then((res) => {
        setCodEligibility(res);
        if (!res.eligible) {
          setFulfillment("pickup");
        }
      });
      // Prepopulate saved default address & barangay from customer profile if available
      const prof = identity.profile as any;
      if (prof?.default_barangay) {
        setSelectedBarangay(prof.default_barangay);
      }
      if (prof?.delivery_address && !address) {
        setAddress(prof.delivery_address);
      }
    }
  }, [visible, identity?.id]);

  // Promo Code / Voucher state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);

  // Effective items in checkout (multi-item cart or single dish fallback)
  const effectiveItems = useMemo((): CartItem[] => {
    if (cartItems.length > 0) {
      return cartItems;
    }
    if (dish) {
      return [
        {
          id: `${dish.store || "Mati Restaurant"}-${dish.id}`,
          dishId: dish.id,
          menuItemId: dish.menuItemId,
          name: dish.name,
          price: dish.price,
          quantity: singleDishQty,
          imageUrl: dish.imageUrl,
          category: dish.category,
          storeName: dish.store || "Mati Restaurant",
          storeId: dish.storeId,
        },
      ];
    }
    return [];
  }, [cartItems, dish, singleDishQty]);

  const effectiveStoreName = cartStoreName || dish?.store || "Mati Restaurant";
  const effectiveTotalCount = cartItems.length > 0 ? cartTotalCount : (dish ? singleDishQty : 0);
  const foodSubtotal = cartItems.length > 0 ? cartFoodSubtotal : (dish ? dish.price * singleDishQty : 0);
  const deliveryFee = fulfillment === "delivery" ? 35 : 0;
  const discount = appliedVoucher
    ? calculateVoucherDiscount(appliedVoucher, foodSubtotal, deliveryFee)
    : 0;
  // Multi-item checkout formula: (Food Subtotal + Delivery Fee - Discount = Total)
  const total = Math.max(0, foodSubtotal + deliveryFee - discount);

  // Auto-remove voucher if basket subtotal drops below required min_spend
  useEffect(() => {
    if (appliedVoucher && foodSubtotal < appliedVoucher.minSpend) {
      setVoucherError(
        `Minimum spend of ₱${appliedVoucher.minSpend} required. Code ${appliedVoucher.code} removed.`
      );
      setAppliedVoucher(null);
      setVoucherSuccess(null);
    }
  }, [foodSubtotal, appliedVoucher]);

  // If user opens sheet and there are no items and no dish, reset
  if (!visible) return null;

  const handleApplyPromoCode = async (codeToUse?: string) => {
    const targetCode = (codeToUse || promoCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setVoucherError("Palihug pagsulod ug promo code.");
      return;
    }

    setIsValidatingVoucher(true);
    setVoucherError(null);
    setVoucherSuccess(null);

    try {
      const res = await validateVoucherCode(
        targetCode,
        foodSubtotal,
        deliveryFee,
        identity?.id
      );

      if (res.isValid && res.voucher) {
        setAppliedVoucher(res.voucher);
        setPromoCodeInput(res.voucher.code);
        if (res.voucher.discountType === "free_delivery") {
          setVoucherSuccess(`✓ ${res.voucher.code} applied! Libreng ₱35 delivery fee.`);
        } else if (res.voucher.discountType === "fixed") {
          setVoucherSuccess(`✓ ${res.voucher.code} applied! ₱${res.voucher.value} off.`);
        } else {
          setVoucherSuccess(`✓ ${res.voucher.code} applied! ${res.voucher.value}% off.`);
        }
      } else {
        setAppliedVoucher(null);
        setVoucherError(res.errorMessage || "Invalid promo code.");
      }
    } catch (err: any) {
      setAppliedVoucher(null);
      setVoucherError(err.message || "Could not validate voucher.");
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedVoucher(null);
    setPromoCodeInput("");
    setVoucherSuccess(null);
    setVoucherError(null);
  };

  const handleNextStep = () => {
    if (effectiveItems.length === 0) {
      Alert.alert("Empty Basket", "Please add at least one item to proceed.");
      return;
    }
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

    if (effectiveItems.length === 0) {
      Alert.alert("Empty Basket", "Please add at least one item to proceed.");
      return;
    }

    const payload: CheckoutConfirmedPayload = {
      dish: dish || undefined,
      items: effectiveItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.modifierSummary ? `${item.name} (${item.modifierSummary})` : item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      qty: effectiveTotalCount,
      barangay: selectedBarangay,
      address: address.trim(),
      notes: notes.trim(),
      fulfillment,
      total,
      voucherCode: appliedVoucher?.code,
      voucherId: appliedVoucher?.id,
      discount,
      storeName: effectiveStoreName,
      storeId: cartStoreId || dish?.storeId,
    };

    onConfirmOrder(payload);

    if (cartItems.length > 0) {
      clearCart();
    }

    setStep(1);
    setAppliedVoucher(null);
    setPromoCodeInput("");
    setVoucherSuccess(null);
    setVoucherError(null);
    handleDismiss();
  };

  const handleClose = () => {
    setStep(1);
    setAppliedVoucher(null);
    setPromoCodeInput("");
    setVoucherSuccess(null);
    setVoucherError(null);
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
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="bg-orange-100 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                    Step {step} of 2
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 font-bold" numberOfLines={1}>
                  {effectiveStoreName}
                </Text>
              </View>
              <Text className="text-xl font-black text-gray-900 tracking-tight">
                {step === 1 ? `Review Basket (${effectiveTotalCount} ${effectiveTotalCount === 1 ? "item" : "items"})` : "Delivery Address & COD"}
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
              /* STEP 1: BASKET ITEMS LIST, QUANTITIES & FULFILLMENT MODE */
              <View>
                {effectiveItems.length === 0 ? (
                  <View className="py-12 items-center justify-center">
                    <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
                    <Text className="text-sm font-bold text-gray-500 mt-2">
                      Your basket is currently empty.
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      Add delicious dishes from {effectiveStoreName} to proceed!
                    </Text>
                  </View>
                ) : (
                  <View className="mb-4 gap-2.5">
                    {effectiveItems.map((item) => (
                      <View
                        key={item.id}
                        className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex-row items-center gap-3"
                      >
                        <Image
                          source={{
                            uri:
                              item.imageUrl ||
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                          }}
                          className="w-16 h-16 rounded-xl bg-gray-200"
                          resizeMode="cover"
                        />
                        <View className="flex-1 pr-1">
                          <Text
                            className="text-xs font-black text-gray-900 leading-tight"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            {item.category ? (
                              <View className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                                <Text className="text-[9px] font-bold text-[#EA5410]">
                                  {item.category}
                                </Text>
                              </View>
                            ) : null}
                            <Text className="text-[11px] font-bold text-gray-500">
                              ₱{item.price.toFixed(2)} each
                            </Text>
                          </View>
                          {item.modifierSummary ? (
                            <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 self-start">
                              <Text className="text-[10px] font-black text-amber-800">
                                ⚙️ {item.modifierSummary}
                              </Text>
                            </View>
                          ) : null}
                          <Text className="text-xs font-black text-[#EA5410] mt-1">
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </View>

                        {/* Quantity Stepper & Removal */}
                        <View className="items-end gap-1.5">
                          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl p-1 gap-2">
                            <Pressable
                              onPress={() => {
                                if (cartItems.length > 0) {
                                  updateQuantity(item.id, item.quantity - 1);
                                } else {
                                  setSingleDishQty(Math.max(1, singleDishQty - 1));
                                }
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease quantity of ${item.name}`}
                              className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center active:bg-gray-200"
                            >
                              <Ionicons name="remove" size={13} color="#374151" />
                            </Pressable>
                            <Text className="text-xs font-black text-gray-900 min-w-[14px] text-center">
                              {item.quantity}
                            </Text>
                            <Pressable
                              onPress={() => {
                                if (cartItems.length > 0) {
                                  updateQuantity(item.id, item.quantity + 1);
                                } else {
                                  setSingleDishQty(singleDishQty + 1);
                                }
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`Increase quantity of ${item.name}`}
                              className="w-6 h-6 rounded-lg bg-[#EA5410] items-center justify-center active:opacity-90"
                            >
                              <Ionicons name="add" size={13} color="white" />
                            </Pressable>
                          </View>

                          {cartItems.length > 0 && (
                            <Pressable
                              onPress={() => removeItem(item.id)}
                              className="p-1 active:opacity-60"
                              accessibilityLabel={`Remove ${item.name}`}
                            >
                              <Ionicons name="trash-outline" size={14} color="#9CA3AF" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Fulfillment Method Selection */}
                <Text className="text-xs font-bold text-gray-700 mb-2">
                  Fulfillment Method *
                </Text>
                <View className="flex-row gap-2.5 mb-4">
                  <Pressable
                    onPress={() => {
                      if (!codEligibility.eligible) {
                        Alert.alert(
                          "COD Delivery Suspended",
                          `This account has ${codEligibility.strikes} unfulfilled delivery attempts. Cash on Delivery is disabled. Please select Self-Pickup.`
                        );
                        return;
                      }
                      setFulfillment("delivery");
                    }}
                    className={`flex-1 p-3.5 rounded-2xl border flex-row items-center gap-2.5 ${
                      !codEligibility.eligible
                        ? "bg-gray-100 border-gray-200 opacity-60"
                        : fulfillment === "delivery"
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

                {/* Promo Code Input & Instant Validation */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="pricetag" size={14} color="#EA5410" />
                      <Text className="text-xs font-bold text-gray-700">Promo Code / Voucher</Text>
                    </View>
                    {appliedVoucher && (
                      <Text className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        APPLIED
                      </Text>
                    )}
                  </View>

                  {/* One-Tap Suggestion Chips */}
                  {!appliedVoucher && (
                    <View className="flex-row flex-wrap gap-1.5 mb-2">
                      <Pressable
                        onPress={() => handleApplyPromoCode("MATIFIRST")}
                        className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                      >
                        <Text className="text-[11px] font-black text-[#EA5410]">🏷️ MATIFIRST</Text>
                        <Text className="text-[10px] font-bold text-gray-600">(Free Delivery)</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleApplyPromoCode("MATI50")}
                        className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1 active:bg-gray-200"
                      >
                        <Text className="text-[11px] font-black text-gray-800">🏷️ MATI50</Text>
                        <Text className="text-[10px] font-bold text-gray-600">(₱50 Off)</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Input and Action Button */}
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      placeholder="Enter promo code (e.g. MATIFIRST)"
                      value={promoCodeInput}
                      onChangeText={(text) => {
                        setPromoCodeInput(text.toUpperCase());
                        if (voucherError) setVoucherError(null);
                      }}
                      autoCapitalize="characters"
                      editable={!appliedVoucher && !isValidatingVoucher}
                      className={`flex-1 bg-gray-50 border rounded-2xl px-3.5 py-2.5 text-sm font-black tracking-wider ${
                        appliedVoucher
                          ? "border-emerald-300 bg-emerald-50/50 text-emerald-900"
                          : voucherError
                          ? "border-red-300 text-gray-900"
                          : "border-gray-200 text-gray-900"
                      }`}
                      placeholderTextColor="#9CA3AF"
                    />

                    {appliedVoucher ? (
                      <Pressable
                        onPress={handleRemovePromoCode}
                        className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-2xl flex-row items-center gap-1 active:bg-red-100"
                      >
                        <Ionicons name="close-circle" size={16} color="#DC2626" />
                        <Text className="text-xs font-bold text-red-600">Remove</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleApplyPromoCode()}
                        disabled={isValidatingVoucher || !promoCodeInput.trim()}
                        className={`px-4 py-2.5 rounded-2xl flex-row items-center justify-center min-w-[70px] ${
                          !promoCodeInput.trim() || isValidatingVoucher
                            ? "bg-gray-200"
                            : "bg-[#EA5410] active:opacity-90"
                        }`}
                      >
                        {isValidatingVoucher ? (
                          <ActivityIndicator size="small" color="#EA5410" />
                        ) : (
                          <Text
                            className={`text-xs font-black ${
                              !promoCodeInput.trim() ? "text-gray-400" : "text-white"
                            }`}
                          >
                            Apply
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </View>

                  {/* Instant Feedback Notice */}
                  {voucherSuccess && (
                    <View className="flex-row items-center gap-1.5 mt-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text className="text-xs font-bold text-emerald-800 flex-1">{voucherSuccess}</Text>
                    </View>
                  )}
                  {voucherError && (
                    <View className="flex-row items-center gap-1.5 mt-2 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                      <Ionicons name="alert-circle" size={15} color="#DC2626" />
                      <Text className="text-xs font-bold text-red-700 flex-1">{voucherError}</Text>
                    </View>
                  )}
                </View>

                {/* Multi-Item Checkout Summary: (Food Subtotal + Delivery Fee - Discount = Total) */}
                <View className="bg-gray-50 border border-gray-200 p-4 rounded-2xl mb-5">
                  <View className="bg-orange-50/70 border border-orange-200/60 rounded-lg px-2.5 py-1 mb-2.5 self-start">
                    <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                      Food Subtotal + Delivery Fee - Discount = Total
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-gray-600 font-medium">
                      Food Subtotal ({effectiveTotalCount} {effectiveTotalCount > 1 ? "items" : "item"})
                    </Text>
                    <Text className="text-xs font-bold text-gray-900">₱{foodSubtotal}.00</Text>
                  </View>
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-gray-600 font-medium">Delivery Fee</Text>
                    <Text className="text-xs font-bold text-gray-900">
                      {deliveryFee === 0 ? "FREE" : `₱${deliveryFee}.00`}
                    </Text>
                  </View>
                  {discount > 0 && (
                    <View className="flex-row justify-between mb-2 bg-emerald-50/80 px-2 py-1.5 rounded-xl border border-emerald-200 items-center">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="gift-outline" size={14} color="#059669" />
                        <Text className="text-xs font-black text-emerald-800">
                          Discount ({appliedVoucher?.code})
                        </Text>
                      </View>
                      <Text className="text-xs font-black text-emerald-700">-₱{discount}.00</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between pt-2.5 border-t border-gray-200 items-center">
                    <View>
                      <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Estimated Total
                      </Text>
                      <Text className="text-[10px] text-gray-400 font-medium">
                        (₱{foodSubtotal} + ₱{deliveryFee}{discount > 0 ? ` - ₱${discount}` : ""})
                      </Text>
                    </View>
                    <Text className="text-xl font-black text-[#EA5410]">₱{total}.00</Text>
                  </View>
                </View>

                {/* Next Button */}
                <Pressable
                  onPress={handleNextStep}
                  disabled={effectiveItems.length === 0}
                  className={`py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm mb-6 ${
                    effectiveItems.length === 0 ? "bg-gray-300" : "bg-[#EA5410] active:opacity-95"
                  }`}
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

                {/* COD Cash Reminder Box or Suspended Notice */}
                {!codEligibility.eligible && fulfillment === "delivery" ? (
                  <View className="bg-rose-50 border border-rose-300 p-3.5 rounded-2xl mb-5 flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center">
                      <Ionicons name="alert-circle" size={24} color="#e11d48" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-rose-900">
                        COD Delivery Suspended
                      </Text>
                      <Text className="text-[11px] text-rose-800 leading-snug mt-0.5">
                        This account has {codEligibility.strikes} unfulfilled delivery attempts. COD is disabled. Please tap Back and select Self-Pickup.
                      </Text>
                    </View>
                  </View>
                ) : (
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
                        {appliedVoucher ? ` (${appliedVoucher.code} applied: saved ₱${discount}.00!)` : ""}
                      </Text>
                    </View>
                  </View>
                )}

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
                    disabled={!codEligibility.eligible && fulfillment === "delivery"}
                    className={`flex-[2] py-3.5 rounded-2xl flex-row items-center justify-center gap-1.5 shadow-sm ${
                      !codEligibility.eligible && fulfillment === "delivery"
                        ? "bg-gray-300 opacity-60"
                        : "bg-[#EA5410] active:opacity-95"
                    }`}
                  >
                    <Ionicons name="checkmark-circle" size={17} color="white" />
                    <Text className="text-white font-black text-xs">
                      {fulfillment === "pickup"
                        ? `Place Pickup Order (₱${total}) 🛍️`
                        : `Place COD Order (₱${total}) 🚀`}
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
