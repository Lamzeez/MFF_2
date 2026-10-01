import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
  BackHandler,
} from "react-native";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  heightPercent?: number; // e.g. 0.88 for 88%
  children: (helpers: { handleDismiss: () => void }) => React.ReactNode;
}

export function BottomSheetModal({
  visible,
  onClose,
  heightPercent = 0.88,
  children,
}: BottomSheetModalProps) {
  const screenHeight = Dimensions.get("window").height;
  const sheetHeight = Math.round(screenHeight * heightPercent);

  // Animated values
  const slideAnim = useRef(new Animated.Value(sheetHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track internal mount status to allow smooth exit animations
  const [modalVisible, setModalVisible] = useState(visible);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalVisible(true);
      slideAnim.setValue(sheetHeight);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 26,
          stiffness: 260,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible && !isClosingRef.current) {
      // Parent forced close (e.g. programmatic close)
      isClosingRef.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: sheetHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
        isClosingRef.current = false;
      });
    }
  }, [visible, sheetHeight]);

  const handleDismiss = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: sheetHeight,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      isClosingRef.current = false;
      onClose();
    });
  };

  // Hardware back button support for Android
  useEffect(() => {
    if (!modalVisible) return;
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleDismiss();
      return true;
    });
    return () => backSub.remove();
  }, [modalVisible]);

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* 1. ANIMATED BACKDROP (Fade in/out, tap outside to dismiss) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close bottom sheet"
          />
        </Animated.View>

        {/* 2. ANIMATED BOTTOM SHEET CONTAINER (Slide up/down with native spring) */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {children({ handleDismiss })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
});
