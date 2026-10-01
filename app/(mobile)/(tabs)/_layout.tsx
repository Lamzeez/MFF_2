import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Platform, useWindowDimensions } from "react-native";
import { ENFORCE_STRICT_PLATFORM_GUARDS, isDesktopDevice } from "../../../lib/platform-policy";

export default function MobileTabsLayout() {
  const { width } = useWindowDimensions();
  if (ENFORCE_STRICT_PLATFORM_GUARDS && isDesktopDevice(width)) {
    return <Redirect href="/portal" />;
  }

  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();

  // Ensure ample bottom clearance so Android 3-button navigation doesn't overlap the tabs
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 8);
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#EA5410", // prototype --brand
        tabBarInactiveTintColor: "#98A2B3", // prototype --ink-3
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#E7EAEF",
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#101828",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#FEF1E8" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={21} 
                color={focused ? "#EA5410" : "#98A2B3"} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: "Feed",
          tabBarIcon: ({ focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#FEF1E8" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={21} 
                color={focused ? "#EA5410" : "#98A2B3"} 
              />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="map"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#FEF1E8" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "map" : "map-outline"} 
                size={21} 
                color={focused ? "#EA5410" : "#98A2B3"} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          href: isLoggedIn ? undefined : null,
          title: "Orders",
          tabBarIcon: ({ focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#FEF1E8" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "receipt" : "receipt-outline"} 
                size={21} 
                color={focused ? "#EA5410" : "#98A2B3"} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <View 
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? "#FEF1E8" : "transparent",
              }}
            >
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={21} 
                color={focused ? "#EA5410" : "#98A2B3"} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
