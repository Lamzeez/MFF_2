import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface EmailAlreadyRegisteredModalProps {
  visible: boolean;
  email?: string;
  title?: string;
  message?: string;
  signInLabel?: string;
  cancelLabel?: string;
  onSignIn: () => void;
  onCancel: () => void;
}

export function EmailAlreadyRegisteredModal({
  visible,
  email,
  title = "Email Already Registered",
  message,
  signInLabel = "Sign In Instead",
  cancelLabel = "Cancel",
  onSignIn,
  onCancel,
}: EmailAlreadyRegisteredModalProps) {
  if (!visible) return null;

  const defaultMessage = email
    ? `An account with ${email} is already registered in Mati FoodFinder. Would you like to sign in instead?`
    : "An account with this email address is already registered in Mati FoodFinder. Would you like to sign in instead?";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Dimmed backdrop - click outside to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal"
        />

        {/* Centered floating dialog card */}
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLabel={title}
        >
          {/* Warning / Account Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name="person-circle-outline" size={32} color="#EA5410" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message || defaultMessage}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel={signInLabel}
            >
              <Ionicons name="log-in-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmButtonText}>{signInLabel}</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  confirmButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EA5410",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA5410",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
