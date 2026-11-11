import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { callPhoneNumber } from "../../lib/phone";
import {
  COURIER_QUICK_MESSAGES,
  CUSTOMER_QUICK_MESSAGES,
  sendQuickDispatchMessage,
  QuickDispatchMessage,
} from "../../services/quick-dispatch";

interface QuickDispatchModalProps {
  visible: boolean;
  onClose: () => void;
  role: "rider" | "customer";
  orderId: string;
  orderNumber?: string;
  recipientId?: string | null;
  recipientName: string;
  recipientPhone?: string | null;
  currentUserId: string;
  currentUserName: string;
  onMessageSent?: (msg: QuickDispatchMessage) => void;
}

export function QuickDispatchModal({
  visible,
  onClose,
  role,
  orderId,
  orderNumber,
  recipientId,
  recipientName,
  recipientPhone,
  currentUserId,
  currentUserName,
  onMessageSent,
}: QuickDispatchModalProps) {
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  const messagesList =
    role === "rider" ? COURIER_QUICK_MESSAGES : CUSTOMER_QUICK_MESSAGES;

  const handleSelectMessage = async (messageText: string) => {
    try {
      setSendingMessage(messageText);
      const sentMsg = await sendQuickDispatchMessage({
        orderId,
        orderNumber,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: role,
        recipientId,
        message: messageText,
      });

      if (onMessageSent) {
        onMessageSent(sentMsg);
      }

      Alert.alert(
        "Update Sent! 🚀",
        `Sent to ${recipientName}:\n\n"${messageText}"`
      );
      onClose();
    } catch (err: any) {
      console.warn("[QuickDispatchModal] Send error:", err);
      Alert.alert("Dispatch Error", "Could not send quick update at this moment.");
    } finally {
      setSendingMessage(null);
    }
  };

  const handleCall = () => {
    callPhoneNumber(recipientPhone, recipientName);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="w-full max-w-xl self-center bg-white rounded-t-3xl p-5 max-h-[90%]">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View className="flex-row items-center gap-2.5">
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  role === "rider" ? "bg-orange-100" : "bg-emerald-100"
                }`}
              >
                <Ionicons
                  name={role === "rider" ? "bicycle" : "chatbubble-ellipses"}
                  size={18}
                  color={role === "rider" ? "#EA5410" : "#059669"}
                />
              </View>
              <View>
                <Text className="text-base font-black text-gray-900 uppercase">
                  {role === "rider" ? "Quick Message to Customer" : "Quick Message to Courier"}
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium">
                  {recipientName} • 1-Tap Updates (No typing needed)
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {/* Direct Phone Call Card */}
            <View className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800 flex-row justify-between items-center shadow-xs">
              <View className="flex-1 mr-3">
                <Text className="text-orange-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                  Direct Cellular Call
                </Text>
                <Text className="text-white font-extrabold text-sm" numberOfLines={1}>
                  Call {recipientName}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {recipientPhone || "Contact via unli-call promo"}
                </Text>
              </View>
              <Pressable
                onPress={handleCall}
                className="bg-emerald-500 active:bg-emerald-600 px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 shadow-sm"
              >
                <Ionicons name="call" size={16} color="white" />
                <Text className="text-white font-black text-xs">Dial Now</Text>
              </Pressable>
            </View>

            {/* Quick Dispatch Messages Title */}
            <View className="mb-2.5">
              <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Select 1-Tap Message:
              </Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                Tap any pre-defined message to send instantly to {recipientName}.
              </Text>
            </View>

            {/* Pre-defined Messages List */}
            <View className="gap-2.5 mb-4">
              {messagesList.map((msgText, idx) => {
                const isSelected = sendingMessage === msgText;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleSelectMessage(msgText)}
                    disabled={Boolean(sendingMessage)}
                    className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                      isSelected
                        ? "bg-orange-50 border-orange-400"
                        : "bg-gray-50 border-gray-200 active:bg-gray-100"
                    }`}
                  >
                    <Text className="text-xs font-bold text-gray-800 flex-1 pr-2 leading-snug">
                      {msgText}
                    </Text>
                    {isSelected ? (
                      <ActivityIndicator size="small" color="#EA5410" />
                    ) : (
                      <View className="w-7 h-7 rounded-full bg-white border border-gray-200 items-center justify-center">
                        <Ionicons name="paper-plane" size={13} color="#EA5410" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Safety Protocol Banner */}
            <View className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4 flex-row items-start gap-2">
              <Ionicons name="shield-checkmark" size={16} color="#2563eb" />
              <Text className="text-[11px] text-blue-900 leading-tight flex-1">
                <Text className="font-bold">Mati Dispatch Safety:</Text> Pre-defined messages allow riders to communicate with 1 tap without typing on mobile keyboards while on the road.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="w-full py-3 bg-gray-100 rounded-xl items-center mb-4 active:bg-gray-200"
            >
              <Text className="text-gray-600 font-bold text-xs uppercase tracking-wider">
                Close
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
