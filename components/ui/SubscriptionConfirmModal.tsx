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
        {/* Backdrop dismiss */}
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
              size={28}
              color={isUpgrade ? "#EA5410" : "#2563EB"}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isUpgrade
              ? `Upgrade to ${targetTier.name} Plan?`
              : `Switch to ${targetTier.name} Plan?`}
          </Text>

          {/* Subtitle / Plan comparison badge */}
          <View style={styles.comparisonContainer}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeLabel}>CURRENT</Text>
              <Text style={styles.planBadgeValue}>{currentTierName}</Text>
            </View>

            <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />

            <View style={[styles.planBadge, styles.planBadgeActive]}>
              <Text style={styles.planBadgeActiveLabel}>NEW PLAN</Text>
              <Text style={styles.planBadgeActiveValue}>
                {targetTier.name} (₱{targetTier.pricePhp}/mo)
              </Text>
            </View>
          </View>

          {/* Explanatory Message */}
          <Text style={styles.description}>
            You will be redirected to PayMongo to complete your payment of{" "}
            <Text style={styles.boldText}>₱{targetTier.pricePhp}.00</Text>. Your new store limits
            and 30-day billing cycle will activate immediately upon payment.
          </Text>

          {/* Key perks unlocked */}
          {targetTier.features && targetTier.features.length > 0 && (
            <View style={styles.perksContainer}>
              <Text style={styles.perksTitle}>Plan Perks:</Text>
              {targetTier.features.slice(0, 3).map((feat, idx) => (
                <View key={idx} style={styles.perkRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.perkText}>{feat}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Secure gateway note */}
          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark" size={13} color="#2563EB" />
            <Text style={styles.securityText}>
              Supported: GCash, Maya, QR Ph (MariBank/Banks), and Cards
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
              accessibilityLabel="Cancel and keep current plan"
            >
              <Text style={styles.cancelButtonText}>Keep Current</Text>
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
              accessibilityLabel={`Proceed to pay ₱${targetTier.pricePhp}`}
            >
              {isConnecting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Connecting...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>
                  Proceed (₱{targetTier.pricePhp})
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
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    width: "100%",
  },
  planBadge: {
    alignItems: "center",
    flex: 1,
  },
  planBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  planBadgeValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textAlign: "center",
  },
  planBadgeActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  planBadgeActiveLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  planBadgeActiveValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E40AF",
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "700",
    color: "#111827",
  },
  perksContainer: {
    width: "100%",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 5,
    marginBottom: 12,
  },
  perksTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  perkText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "500",
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 18,
  },
  securityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
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
    flex: 1.3,
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
