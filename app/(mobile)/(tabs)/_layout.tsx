import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Platform } from "react-native";

export default function MobileTabsLayout() {
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();

  // Ensure ample bottom clearance so Android 3-button navigation doesn't overlap the tabs
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 8);
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#047857", // emerald-700
        tabBarInactiveTintColor: "#374151", // gray-700 (high-contrast, clearly visible)
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1.5,
          borderTopColor: "#e5e7eb",
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#ecfdf5" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "restaurant" : "restaurant-outline"} 
                size={22} 
                color={focused ? "#047857" : "#374151"} 
              />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#ecfdf5" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "map" : "map-outline"} 
                size={22} 
                color={focused ? "#047857" : "#374151"} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          // Completely hidden if user is not yet logged in as a registered user
          href: isLoggedIn ? "/(mobile)/(tabs)/orders" : null,
          tabBarIcon: ({ color, focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#ecfdf5" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "receipt" : "receipt-outline"} 
                size={22} 
                color={focused ? "#047857" : "#374151"} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#ecfdf5" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={22} 
                color={focused ? "#047857" : "#374151"} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
