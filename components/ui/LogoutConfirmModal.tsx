import React from "react";
import { View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface LogoutConfirmModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isSigningOut?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function LogoutConfirmModal({
  visible,
  title = "Log Out",
  message = "Are you sure you want to sign out of your account?",
  confirmLabel = "Log Out",
  cancelLabel = "Cancel",
  isSigningOut = false,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Grayed-out background; click outside to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          disabled={isSigningOut}
          accessibilityRole="button"
          accessibilityLabel="Cancel and close modal"
        />

        {/* Centered floating card */}
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Ionicons name="log-out-outline" size={28} color="#EA5410" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
              disabled={isSigningOut}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
                isSigningOut && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isSigningOut}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFEDD5",
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
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: "#EA5410",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
