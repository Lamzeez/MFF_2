import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type BannerType = "success" | "error" | "info" | "warning";

export interface BannerMessage {
  type: BannerType;
  message: string;
}

interface NotificationBannerProps {
  banner: BannerMessage | null;
  onDismiss?: () => void;
  autoHideDuration?: number;
}

/**
 * Replaces disruptive raw browser `alert()` popups with styled, non-blocking inline banners.
 * Standardizes status feedback across Web Dashboard and System Admin views.
 */
export function NotificationBanner({
  banner,
  onDismiss,
  autoHideDuration = 5000,
}: NotificationBannerProps) {
  useEffect(() => {
    if (!banner || !onDismiss || !autoHideDuration) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDuration);
    return () => clearTimeout(timer);
  }, [banner, onDismiss, autoHideDuration]);

  if (!banner) return null;

  const isSuccess = banner.type === "success";
  const isError = banner.type === "error";
  const isWarning = banner.type === "warning";

  const bgClass = isSuccess
    ? "bg-emerald-50 border-emerald-200"
    : isError
    ? "bg-rose-50 border-rose-200"
    : isWarning
    ? "bg-amber-50 border-amber-200"
    : "bg-blue-50 border-blue-200";

  const textClass = isSuccess
    ? "text-emerald-800"
    : isError
    ? "text-rose-800"
    : isWarning
    ? "text-amber-800"
    : "text-blue-800";

  const iconName = isSuccess
    ? "checkmark-circle"
    : isError
    ? "alert-circle"
    : isWarning
    ? "warning"
    : "information-circle";

  const iconColor = isSuccess
    ? "#059669"
    : isError
    ? "#e11d48"
    : isWarning
    ? "#d97706"
    : "#2563eb";

  return (
    <View
      className={`flex-row items-center justify-between p-3.5 mb-5 rounded-2xl border shadow-xs transition-all ${bgClass}`}
    >
      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
        <Ionicons name={iconName} size={18} color={iconColor} />
        <Text className={`text-xs font-bold leading-relaxed flex-1 ${textClass}`}>
          {banner.message}
        </Text>
      </View>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          className="p-1 rounded-lg hover:bg-black/5 active:opacity-70"
        >
          <Ionicons name="close" size={16} color={iconColor} />
        </Pressable>
      )}
    </View>
  );
}
