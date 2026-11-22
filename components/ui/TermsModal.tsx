import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RoleTermsDefinition, getTermsForRole } from "../../lib/terms-and-conditions";

interface TermsModalProps {
  visible: boolean;
  role: "customer" | "merchant" | "rider";
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  closeButtonLabel?: string;
}

export function TermsModal({
  visible,
  role,
  onClose,
  onAccept,
  showAcceptButton = false,
  closeButtonLabel,
}: TermsModalProps) {
  const { width, height } = useWindowDimensions();
  const terms = getTermsForRole(role);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.backdrop}>
        {/* Backdrop overlay that dismisses modal on outside click */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close terms modal"
        />

        {/* Floating Modal Content Card */}
        <View
          style={[
            styles.cardContainer,
            {
              maxHeight: height * 0.85,
              maxWidth: Math.min(width - 32, 600),
            },
          ]}
        >
          {/* Header */}
          <View
            className={`px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 flex-row items-center bg-white ${
              role === "merchant" ? "justify-center relative" : "justify-between"
            }`}
          >
            <View className={role === "merchant" ? "items-center px-8" : "flex-1 pr-3"}>
              {role !== "merchant" && (
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-6 h-6 rounded-md bg-[#EA5410]/10 items-center justify-center">
                    <Ionicons name="document-text" size={14} color="#EA5410" />
                  </View>
                  <Text className="text-xs font-bold text-[#EA5410] uppercase tracking-wider">
                    Terms & Conditions
                  </Text>
                </View>
              )}
              <Text
                className={`text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight ${
                  role === "merchant" ? "text-center" : ""
                }`}
              >
                {terms.roleName.includes("Agreement") || terms.roleName.includes("Conditions")
                  ? terms.roleName
                  : `${terms.roleName} Agreement`}
              </Text>
              {role !== "merchant" && (
                <Text className="text-[11px] text-gray-400 font-medium mt-0.5">
                  Version {terms.version} • {terms.lastUpdated}
                </Text>
              )}
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className={`w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer transition-colors ${
                role === "merchant" ? "absolute right-4 top-4" : ""
              }`}
            >
              <Ionicons name="close" size={18} color="#4B5563" />
            </Pressable>
          </View>

          {/* Scrollable Terms Content */}
          <ScrollView
            className="px-5 sm:px-6 py-4"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Quick Summary Pill / Callout */}
            {Boolean(terms.summary) && (
              <View className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-3.5 sm:p-4 mb-4">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Ionicons name="information-circle" size={16} color="#EA5410" />
                  <Text className="text-xs font-bold text-orange-950">Overview</Text>
                </View>
                <Text className="text-[11px] sm:text-xs text-orange-900/90 leading-relaxed">
                  {terms.summary}
                </Text>
              </View>
            )}

            {/* Sections */}
            <View className={role === "merchant" ? "gap-6 py-2" : "gap-4"}>
              {terms.sections.map((section) => (
                <View
                  key={section.id}
                  className={
                    role === "merchant"
                      ? "items-center px-1"
                      : "p-4 bg-white border border-gray-100 rounded-2xl shadow-2xs"
                  }
                >
                  <Text
                    className={`font-bold mb-1.5 ${
                      role === "merchant"
                        ? "text-sm sm:text-base text-[#EA5410] text-center"
                        : "text-xs sm:text-sm text-gray-900"
                    }`}
                  >
                    {section.title}
                  </Text>
                  <Text
                    className={`text-[12px] sm:text-xs text-gray-600 leading-relaxed ${
                      role === "merchant" ? "text-center max-w-lg" : ""
                    } ${
                      section.highlights && section.highlights.length > 0 ? "mb-2.5" : "mb-0"
                    }`}
                  >
                    {section.content}
                  </Text>

                  {section.highlights && section.highlights.length > 0 && (
                    <View className="bg-gray-50/90 rounded-xl p-2.5 gap-1.5 border border-gray-100">
                      {section.highlights.map((h, idx) => (
                        <View key={idx} className="flex-row items-start gap-1.5">
                          <Ionicons
                            name="checkmark-circle"
                            size={13}
                            color="#059669"
                            style={{ marginTop: 2 }}
                          />
                          <Text className="text-[11px] text-gray-700 flex-1 leading-snug font-medium">
                            {h}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Footer Notice */}
            {role !== "merchant" && (
              <View className="mt-5 pt-3 border-t border-gray-100 items-center">
                <Text className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Governed by the laws of the Republic of the Philippines and the City Government of Mati, Davao Oriental.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Modal Actions Footer */}
          <View className="p-4 sm:p-5 border-t border-gray-100 bg-white flex-row gap-3">
            <Pressable
              onPress={onClose}
              className={`py-3 px-4 rounded-xl items-center justify-center cursor-pointer transition-colors ${
                role === "merchant"
                  ? "w-full bg-[#EA5410] hover:bg-[#D04508] active:bg-[#B83C06] shadow-sm"
                  : showAcceptButton
                  ? "flex-1 border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
                  : "w-full border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  role === "merchant" ? "text-white" : "text-gray-700"
                }`}
              >
                {closeButtonLabel || (showAcceptButton ? "Decline" : "Close")}
              </Text>
            </Pressable>

            {showAcceptButton && (
              <Pressable
                onPress={() => {
                  onAccept?.();
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#EA5410] hover:bg-[#D04508] active:bg-[#B83B06] items-center justify-center cursor-pointer shadow-sm transition-colors"
              >
                <Text className="text-xs font-bold text-white tracking-wide">
                  I Agree
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 9999,
  },
  cardContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.25)",
      },
    }),
  },
});
