import React, { useEffect } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ActionSuccessModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttonLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  autoCloseMs?: number;
  onClose: () => void;
}

export function ActionSuccessModal({
  visible,
  title,
  message,
  buttonLabel = "Continue",
  icon = "checkmark-circle",
  iconColor = "#059669",
  iconBgColor = "#ECFDF5",
  autoCloseMs,
  onClose,
}: ActionSuccessModalProps) {
  useEffect(() => {
    if (!visible || !autoCloseMs) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Grayed-out background; click outside to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        />

        {/* Centered floating card */}
        <View style={styles.card}>
          <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
            <Ionicons name={icon} size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text style={styles.actionButtonText}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 10000,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  actionButton: {
    width: "100%",
    paddingVertical: 11,
    backgroundColor: "#EA5410",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
