import React from "react";
import { View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface TargetSubscriptionTier {
  id: string;
  name: string;
  pricePhp: number;
  features?: readonly string[];
}

export interface SubscriptionConfirmModalProps {
  visible: boolean;
  currentTierName?: string;
  targetTier: TargetSubscriptionTier | null;
  isConnecting?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function SubscriptionConfirmModal({
  visible,
  currentTierName = "Basic Plan",
  targetTier,
  isConnecting = false,
  onConfirm,
  onCancel,
}: SubscriptionConfirmModalProps) {
  if (!visible || !targetTier) return null;

  const isUpgrade = targetTier.pricePhp > 99;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Backdrop click to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          disabled={isConnecting}
          accessibilityRole="button"
          accessibilityLabel="Cancel subscription change"
        />

        {/* Modal Card */}
        <View style={styles.card}>
          {/* Header Icon */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isUpgrade ? "#FFF7ED" : "#EFF6FF" },
            ]}
          >
            <Ionicons
              name={isUpgrade ? "rocket-outline" : "swap-horizontal-outline"}
              size={26}
              color={isUpgrade ? "#EA5410" : "#2563EB"}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isUpgrade
              ? `Upgrade to ${targetTier.name} Plan?`
              : `Switch to ${targetTier.name} Plan?`}
          </Text>

          {/* Light-Red Warning Notice */}
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#DC2626" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              <Text style={styles.warningBold}>Important Notice: </Text>
              Your active {currentTierName} will be replaced immediately, and you will be charged{" "}
              <Text style={styles.warningBold}>₱{targetTier.pricePhp}.00</Text> for the new 30-day billing cycle.
            </Text>
          </View>

          {/* Action Button Row */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
              disabled={isConnecting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
                isConnecting && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isConnecting}
              accessibilityRole="button"
              accessibilityLabel={`Proceed to Pay ₱${targetTier.pricePhp}`}
            >
              {isConnecting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Connecting...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>
                  Proceed to Pay (₱{targetTier.pricePhp})
                </Text>
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
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 14,
  },
  warningBox: {
    width: "100%",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
  },
  warningIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  warningText: {
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 18,
    flex: 1,
  },
  warningBold: {
    fontWeight: "700",
    color: "#7F1D1D",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 42,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  confirmButton: {
    flex: 1.5,
    height: 42,
    backgroundColor: "#EA5410",
    borderRadius: 12,
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
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
