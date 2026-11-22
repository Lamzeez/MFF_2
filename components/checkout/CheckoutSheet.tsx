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
import { BarangayAutofillInput } from "../ui/BarangayAutofillInput";
import { MATI_BARANGAYS } from "../../mock/barangays";
import { useSession } from "../../context/SessionContext";
import { useCart, CartItem } from "../../context/CartContext";
import {
  validateVoucherCode,
  calculateVoucherDiscount,
  Voucher,
} from "../../services/vouchers";
import { checkCustomerCodEligibility } from "../../services/orders";
import { getSavedAddresses, SavedAddress } from "../../lib/saved-addresses";

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
  const [selectedBarangay, setSelectedBarangay] = useState("Central (City Proper/Poblacion)");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Pillar 2: 1-Tap Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const addrs = getSavedAddresses();
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
      if (defaultAddr && !address) {
        setSelectedBarangay(defaultAddr.barangay);
        setAddress(defaultAddr.landmarkDescription);
        setActiveAddressId(defaultAddr.id);
      }
    }
  }, [visible]);

  const handleSelectSavedAddressChip = (addr: SavedAddress) => {
    setActiveAddressId(addr.id);
    setSelectedBarangay(addr.barangay);
    setAddress(addr.landmarkDescription);
  };

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
          <View className="flex-row justify-between items-center pb-2.5 border-b border-gray-100">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <View className="bg-orange-100 px-2 py-0.2 rounded-full">
                  <Text className="text-[9px] font-black text-[#EA5410] uppercase tracking-wider">
                    Step {step} of 2
                  </Text>
                </View>
                <Text className="text-[11px] text-gray-500 font-bold" numberOfLines={1}>
                  {effectiveStoreName}
                </Text>
              </View>
              <Text className="text-base font-black text-gray-900 tracking-tight">
                {step === 1 ? `Review Basket (${effectiveTotalCount} ${effectiveTotalCount === 1 ? "item" : "items"})` : "Delivery Address & COD"}
              </Text>
            </View>

            <Pressable
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close checkout sheet"
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={17} color="#374151" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 mt-2.5" showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              /* STEP 1: BASKET ITEMS LIST, QUANTITIES & FULFILLMENT MODE */
              <View>
                {effectiveItems.length === 0 ? (
                  <View className="py-10 items-center justify-center">
                    <Ionicons name="cart-outline" size={40} color="#D1D5DB" />
                    <Text className="text-xs font-bold text-gray-500 mt-2">
                      Your basket is currently empty.
                    </Text>
                    <Text className="text-[11px] text-gray-400 mt-0.5">
                      Add delicious dishes from {effectiveStoreName} to proceed!
                    </Text>
                  </View>
                ) : (
                  <View className="mb-3 gap-2">
                    {effectiveItems.map((item) => (
                      <View
                        key={item.id}
                        className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl flex-row items-center gap-2.5"
                      >
                        <Image
                          source={{
                            uri:
                              item.imageUrl ||
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
                          }}
                          className="w-13 h-13 rounded-lg bg-gray-200"
                          style={{ width: 52, height: 52 }}
                          resizeMode="cover"
                        />
                        <View className="flex-1 pr-1">
                          <Text
                            className="text-xs font-black text-gray-900 leading-tight"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <View className="flex-row items-center gap-1 mt-0.5">
                            {item.category ? (
                              <View className="bg-orange-50 border border-orange-200 px-1 py-0.2 rounded">
                                <Text className="text-[8px] font-bold text-[#EA5410]">
                                  {item.category}
                                </Text>
                              </View>
                            ) : null}
                            <Text className="text-[10px] font-bold text-gray-500">
                              ₱{item.price.toFixed(2)} each
                            </Text>
                          </View>
                          {item.modifierSummary ? (
                            <View className="bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5 self-start">
                              <Text className="text-[9px] font-black text-amber-800">
                                ⚙️ {item.modifierSummary}
                              </Text>
                            </View>
                          ) : null}
                          <Text className="text-xs font-black text-[#EA5410] mt-0.5">
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </View>

                        {/* Quantity Stepper & Removal */}
                        <View className="items-end gap-1">
                          <View className="flex-row items-center bg-white border border-gray-200 rounded-lg p-0.5 gap-1.5">
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
                              className="w-5 h-5 rounded bg-gray-100 items-center justify-center active:bg-gray-200"
                            >
                              <Ionicons name="remove" size={11} color="#374151" />
                            </Pressable>
                            <Text className="text-xs font-black text-gray-900 min-w-[12px] text-center">
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
                              className="w-5 h-5 rounded bg-[#EA5410] items-center justify-center active:opacity-90"
                            >
                              <Ionicons name="add" size={11} color="white" />
                            </Pressable>
                          </View>

                          {cartItems.length > 0 && (
                            <Pressable
                              onPress={() => removeItem(item.id)}
                              className="p-0.5 active:opacity-60"
                              accessibilityLabel={`Remove ${item.name}`}
                            >
                              <Ionicons name="trash-outline" size={13} color="#9CA3AF" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Fulfillment Method Selection */}
                <Text className="text-xs font-bold text-gray-700 mb-1.5">
                  Fulfillment Method *
                </Text>
                <View className="flex-row gap-2 mb-3">
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
                    className={`flex-1 p-2.5 rounded-xl border flex-row items-center gap-2 ${
                      !codEligibility.eligible
                        ? "bg-gray-100 border-gray-200 opacity-60"
                        : fulfillment === "delivery"
                        ? "bg-orange-50/80 border-[#EA5410]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <View
                      className={`w-7 h-7 rounded-lg items-center justify-center ${
                        fulfillment === "delivery" ? "bg-orange-100" : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="bicycle"
                        size={16}
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
                      <Text className="text-[9px] text-gray-500">Mati Rider (₱35)</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setFulfillment("pickup")}
                    className={`flex-1 p-2.5 rounded-xl border flex-row items-center gap-2 ${
                      fulfillment === "pickup"
                        ? "bg-orange-50/80 border-[#EA5410]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <View
                      className={`w-7 h-7 rounded-lg items-center justify-center ${
                        fulfillment === "pickup" ? "bg-orange-100" : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="bag-handle"
                        size={16}
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
                      <Text className="text-[9px] text-gray-500">Pick up (Free)</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Promo Code Input & Instant Validation */}
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="pricetag" size={12} color="#EA5410" />
                      <Text className="text-[11px] font-bold text-gray-700">Promo Code / Voucher</Text>
                    </View>
                    {appliedVoucher && (
                      <Text className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                        APPLIED
                      </Text>
                    )}
                  </View>

                  {/* One-Tap Suggestion Chips */}
                  {!appliedVoucher && (
                    <View className="flex-row flex-wrap gap-1 mb-1.5">
                      <Pressable
                        onPress={() => handleApplyPromoCode("MATIFIRST")}
                        className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md flex-row items-center gap-1 active:bg-orange-100"
                      >
                        <Text className="text-[10px] font-black text-[#EA5410]">🏷️ MATIFIRST</Text>
                        <Text className="text-[9px] font-bold text-gray-600">(Free Delivery)</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleApplyPromoCode("MATI50")}
                        className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md flex-row items-center gap-1 active:bg-gray-200"
                      >
                        <Text className="text-[10px] font-black text-gray-800">🏷️ MATI50</Text>
                        <Text className="text-[9px] font-bold text-gray-600">(₱50 Off)</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Input and Action Button */}
                  <View className="flex-row items-center gap-1.5">
                    <TextInput
                      placeholder="Enter promo code (e.g. MATIFIRST)"
                      value={promoCodeInput}
                      onChangeText={(text) => {
                        setPromoCodeInput(text.toUpperCase());
                        if (voucherError) setVoucherError(null);
                      }}
                      autoCapitalize="characters"
                      editable={!appliedVoucher && !isValidatingVoucher}
                      className={`flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-xs font-black tracking-wider ${
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
                        className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex-row items-center gap-1 active:bg-red-100"
                      >
                        <Ionicons name="close-circle" size={14} color="#DC2626" />
                        <Text className="text-xs font-bold text-red-600">Remove</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleApplyPromoCode()}
                        disabled={isValidatingVoucher || !promoCodeInput.trim()}
                        className={`px-3 py-2 rounded-xl flex-row items-center justify-center min-w-[60px] ${
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
                    <View className="flex-row items-center gap-1 mt-1.5 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                      <Text className="text-[11px] font-bold text-emerald-800 flex-1">{voucherSuccess}</Text>
                    </View>
                  )}
                  {voucherError && (
                    <View className="flex-row items-center gap-1 mt-1.5 bg-red-50 border border-red-200 p-2 rounded-lg">
                      <Ionicons name="alert-circle" size={13} color="#DC2626" />
                      <Text className="text-[11px] font-bold text-red-700 flex-1">{voucherError}</Text>
                    </View>
                  )}
                </View>

                {/* Multi-Item Checkout Summary: (Food Subtotal + Delivery Fee - Discount = Total) */}
                <View className="bg-gray-50 border border-gray-200 p-3 rounded-xl mb-4">
                  <View className="bg-orange-50/70 border border-orange-200/60 rounded px-2 py-0.5 mb-2 self-start">
                    <Text className="text-[9px] font-black text-[#EA5410] uppercase tracking-wider">
                      Food Subtotal + Delivery Fee - Discount = Total
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-600 font-medium">
                      Food Subtotal ({effectiveTotalCount} {effectiveTotalCount > 1 ? "items" : "item"})
                    </Text>
                    <Text className="text-xs font-bold text-gray-900">₱{foodSubtotal}.00</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-600 font-medium">Delivery Fee</Text>
                    <Text className="text-xs font-bold text-gray-900">
                      {deliveryFee === 0 ? "FREE" : `₱${deliveryFee}.00`}
                    </Text>
                  </View>
                  {discount > 0 && (
                    <View className="flex-row justify-between mb-1 bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200 items-center">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="gift-outline" size={12} color="#059669" />
                        <Text className="text-[11px] font-black text-emerald-800">
                          Discount ({appliedVoucher?.code})
                        </Text>
                      </View>
                      <Text className="text-xs font-black text-emerald-700">-₱{discount}.00</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between pt-2 border-t border-gray-200 items-center">
                    <View>
                      <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Estimated Total
                      </Text>
                      <Text className="text-[9px] text-gray-400 font-medium">
                        (₱{foodSubtotal} + ₱{deliveryFee}{discount > 0 ? ` - ₱${discount}` : ""})
                      </Text>
                    </View>
                    <Text className="text-lg font-black text-[#EA5410]">₱{total}.00</Text>
                  </View>
                </View>

                {/* Next Button */}
                <Pressable
                  onPress={handleNextStep}
                  disabled={effectiveItems.length === 0}
                  className={`py-3 rounded-xl flex-row items-center justify-center gap-2 shadow-xs mb-5 ${
                    effectiveItems.length === 0 ? "bg-gray-300" : "bg-[#EA5410] active:opacity-95"
                  }`}
                >
                  <Text className="text-white font-black text-xs">
                    Continue to Delivery Address
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="white" />
                </Pressable>
              </View>
            ) : (
              /* STEP 2: ADDRESS, BARANGAY & COD CONFIRMATION */
              <View>
                {/* Pillar 2: 1-Tap Saved Mati Delivery Addresses Chips */}
                {savedAddresses.length > 0 && (
                  <View className="mb-3">
                    <View className="flex-row items-center gap-1 mb-1.5">
                      <Ionicons name="location" size={13} color="#EA5410" />
                      <Text className="text-xs font-bold text-gray-700">1-Tap Saved Mati Address</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                      <View className="flex-row items-center gap-1.5">
                        {savedAddresses.map((addr) => {
                          const isSelected = activeAddressId === addr.id || address === addr.landmarkDescription;
                          return (
                            <Pressable
                              key={addr.id}
                              onPress={() => handleSelectSavedAddressChip(addr)}
                              className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${
                                isSelected
                                  ? "bg-orange-50 border-[#EA5410]"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <Ionicons
                                name={
                                  addr.icon === "home"
                                    ? "home"
                                    : addr.icon === "briefcase"
                                    ? "briefcase"
                                    : addr.icon === "water"
                                    ? "water"
                                    : "location"
                                }
                                size={12}
                                color={isSelected ? "#EA5410" : "#6B7280"}
                              />
                              <Text
                                className={`text-[11px] font-black ${
                                  isSelected ? "text-[#EA5410]" : "text-gray-800"
                                }`}
                              >
                                {addr.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Delivery Barangay Autofill Input */}
                <BarangayAutofillInput
                  value={selectedBarangay}
                  onSelectBarangay={setSelectedBarangay}
                  label="Delivery Barangay *"
                  placeholder="Type to search official Mati barangay..."
                  containerClassName="mb-2.5"
                />

                {/* Delivery Landmark / Street */}
                <Text className="text-xs font-bold text-gray-700 mb-1">
                  Street / Landmark Description *
                </Text>
                <TextInput
                  placeholder="e.g. Near Baywalk Pavilion, blue gate, Purok 3"
                  value={address}
                  onChangeText={setAddress}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-2.5 font-medium"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Special Instructions */}
                <Text className="text-xs font-bold text-gray-700 mb-1">
                  Kitchen / Rider Instructions (Optional)
                </Text>
                <TextInput
                  placeholder="e.g. Extra spicy sauce, please call upon arrival"
                  value={notes}
                  onChangeText={setNotes}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-3 font-medium"
                  placeholderTextColor="#9CA3AF"
                />

                {/* COD Cash Reminder Box or Suspended Notice */}
                {!codEligibility.eligible && fulfillment === "delivery" ? (
                  <View className="bg-rose-50 border border-rose-300 p-3 rounded-xl mb-4 flex-row items-center gap-2.5">
                    <View className="w-8 h-8 rounded-lg bg-rose-100 items-center justify-center">
                      <Ionicons name="alert-circle" size={20} color="#e11d48" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-rose-900">
                        COD Delivery Suspended
                      </Text>
                      <Text className="text-[10px] text-rose-800 leading-snug mt-0.5">
                        This account has {codEligibility.strikes} unfulfilled delivery attempts. COD is disabled. Please tap Back and select Self-Pickup.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 flex-row items-center gap-2.5">
                    <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
                      <Ionicons name="cash-outline" size={18} color="#B45309" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-amber-900">
                        Cash on Delivery (COD)
                      </Text>
                      <Text className="text-[10px] text-amber-800 leading-snug mt-0.5">
                        Please prepare exact cash of ₱{total}.00 for the rider upon arrival.
                        {appliedVoucher ? ` (${appliedVoucher.code} applied: saved ₱${discount}.00!)` : ""}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-2 mb-5">
                  <Pressable
                    onPress={handlePrevStep}
                    className="flex-1 py-3 bg-gray-100 rounded-xl items-center justify-center active:bg-gray-200"
                  >
                    <Text className="text-xs font-bold text-gray-700">Back</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSubmit(handleDismiss)}
                    disabled={!codEligibility.eligible && fulfillment === "delivery"}
                    className={`flex-[2] py-3 rounded-xl flex-row items-center justify-center gap-1.5 shadow-xs ${
                      !codEligibility.eligible && fulfillment === "delivery"
                        ? "bg-gray-300 opacity-60"
                        : "bg-[#EA5410] active:opacity-95"
                    }`}
                  >
                    <Ionicons name="checkmark-circle" size={15} color="white" />
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
