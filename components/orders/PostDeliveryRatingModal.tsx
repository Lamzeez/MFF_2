import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COURIER_COMPLIMENT_OPTIONS,
  CourierCompliment,
  submitOrderReview,
  OrderReview,
} from "../../services/reviews";

interface PostDeliveryRatingModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  riderId?: string | null;
  riderName?: string;
  onReviewSubmitted?: (review: OrderReview) => void;
}

export function PostDeliveryRatingModal({
  visible,
  onClose,
  orderId,
  orderNumber,
  storeId,
  storeName,
  riderId,
  riderName,
  onReviewSubmitted,
}: PostDeliveryRatingModalProps) {
  const [foodRating, setFoodRating] = useState<number>(5);
  const [riderRating, setRiderRating] = useState<number>(5);
  const [selectedCompliments, setSelectedCompliments] = useState<CourierCompliment[]>([
    "⚡ Fast Delivery",
  ]);
  const [reviewText, setReviewText] = useState<string>("");
  const [postToCommunity, setPostToCommunity] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleCompliment = (compliment: CourierCompliment) => {
    setSelectedCompliments((prev) =>
      prev.includes(compliment)
        ? prev.filter((c) => c !== compliment)
        : [...prev, compliment]
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const review = await submitOrderReview({
        orderId,
        storeId,
        storeName,
        riderId,
        foodRating,
        riderRating: riderName || riderId ? riderRating : null,
        reviewText,
        riderCompliments: selectedCompliments,
        postToCommunity,
      });

      if (onReviewSubmitted) {
        onReviewSubmitted(review);
      }
      onClose();
      Alert.alert(
        "Salamat Kaayo! ⭐",
        postToCommunity
          ? "Your review has been saved and shared to the Mati Foodie Community Feed!"
          : "Your review has been submitted successfully."
      );
    } catch (err: any) {
      console.error("[PostDeliveryRatingModal] Submission failed:", err);
      Alert.alert("Submission Failed", err?.message || "Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCourier = !!(riderName || riderId);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="w-full max-w-xl self-center bg-white rounded-t-3xl max-h-[90%] p-5 pb-8 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-lg font-black text-gray-900">
                  Rate Your Experience
                </Text>
                <Text className="text-base">⭐</Text>
              </View>
              <Text className="text-xs text-[#EA5410] font-bold">
                Order #{orderNumber} · Delivered
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
            {/* 1. Food Rating Section */}
            <View className="bg-orange-50/70 p-4 rounded-2xl border border-orange-100 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-7 h-7 rounded-full bg-[#EA5410] items-center justify-center">
                  <Ionicons name="restaurant" size={14} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase">
                    Food & Kitchen Quality
                  </Text>
                  <Text className="text-sm font-black text-gray-900" numberOfLines={1}>
                    {storeName}
                  </Text>
                </View>
              </View>

              {/* Star Selector */}
              <View className="flex-row justify-center items-center gap-3 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setFoodRating(star)}
                    className="p-1 active:scale-125"
                  >
                    <Ionicons
                      name={star <= foodRating ? "star" : "star-outline"}
                      size={32}
                      color={star <= foodRating ? "#EA5410" : "#d1d5db"}
                    />
                  </Pressable>
                ))}
              </View>
              <Text className="text-center text-[11px] font-bold text-orange-900">
                {foodRating === 5
                  ? "Lami kaayo! (Super Delicious)"
                  : foodRating === 4
                  ? "Very Good & Tasty"
                  : foodRating === 3
                  ? "Average Quality"
                  : foodRating === 2
                  ? "Below Expectations"
                  : "Poor Experience"}
              </Text>
            </View>

            {/* 2. Courier Rating Section (if delivery was fulfilled by a rider) */}
            {hasCourier && (
              <View className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-7 h-7 rounded-full bg-gray-900 items-center justify-center">
                    <Ionicons name="bicycle" size={14} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-500 uppercase">
                      Courier & Delivery Service
                    </Text>
                    <Text className="text-sm font-black text-gray-900" numberOfLines={1}>
                      {riderName || "Independent Mati Courier"}
                    </Text>
                  </View>
                </View>

                {/* Star Selector */}
                <View className="flex-row justify-center items-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setRiderRating(star)}
                      className="p-1 active:scale-125"
                    >
                      <Ionicons
                        name={star <= riderRating ? "star" : "star-outline"}
                        size={30}
                        color={star <= riderRating ? "#f59e0b" : "#d1d5db"}
                      />
                    </Pressable>
                  ))}
                </View>

                {/* Compliment Chips */}
                <Text className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-1.5">
                  Courier Compliments (Tap to toggle)
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {COURIER_COMPLIMENT_OPTIONS.map((tag) => {
                    const isSelected = selectedCompliments.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleCompliment(tag)}
                        className={`px-3 py-1.5 rounded-full border ${
                          isSelected
                            ? "bg-amber-100 border-amber-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-amber-900" : "text-gray-600"
                          }`}
                        >
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. Review Comments Text Input */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-700 mb-1.5">
                Comments & Food Notes (Optional)
              </Text>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share what you loved about the dish, portion size, or flavors..."
                placeholderTextColor="#9ca3af"
                multiline={true}
                numberOfLines={3}
                className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-xs text-gray-900 min-h-[70px]"
                textAlignVertical="top"
              />
            </View>

            {/* 4. 1-Tap Foodie Community Feed Toggle */}
            <View className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 mb-5">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1 mb-0.5">
                    <Ionicons name="sparkles" size={13} color="#059669" />
                    <Text className="text-xs font-black text-emerald-900">
                      Share to Mati Foodie Feed
                    </Text>
                  </View>
                  <Text className="text-[11px] text-emerald-700 leading-tight">
                    Post verified diner review to the community feed with 1 tap.
                  </Text>
                </View>
                <Switch
                  value={postToCommunity}
                  onValueChange={setPostToCommunity}
                  trackColor={{ false: "#d1d5db", true: "#059669" }}
                  thumbColor="#ffffff"
                />
              </View>

              {postToCommunity && (
                <View className="mt-2.5 pt-2 border-t border-emerald-200/60 flex-row items-center gap-1.5">
                  <View className="bg-emerald-200/80 px-2 py-0.5 rounded">
                    <Text className="text-[10px] font-black text-emerald-900">
                      Verified Order ✓
                    </Text>
                  </View>
                  <Text className="text-[10px] text-emerald-800 font-medium" numberOfLines={1}>
                    {storeName} · Rated {foodRating} ⭐
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Action */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl items-center shadow-md mb-3 flex-row justify-center gap-2 ${
                isSubmitting ? "bg-orange-400" : "bg-[#EA5410] active:bg-[#EA5410]/90"
              }`}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-black text-sm">
                    Submitting Review...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                  <Text className="text-white font-black text-sm">
                    Submit Order Rating
                  </Text>
                </>
              )}
            </Pressable>

            {/* Skip Option */}
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="py-2.5 items-center mb-2"
            >
              <Text className="text-xs font-bold text-gray-400">
                Skip & Rate Later
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
