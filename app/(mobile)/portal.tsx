import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function MobileWelcomePortal() {
  const router = useRouter();
  const [partnerMode, setPartnerMode] = useState<"merchant" | "rider">("merchant");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#063B2A" }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F4F6F4" }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================================
            1. CINEMATIC HERO SECTION (Deep Brand Emerald #064E3B)
           ========================================================================= */}
        <View
          style={{
            backgroundColor: "#064E3B",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 28,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          {/* Top Brand Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            {/* Logo + Title Group */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#ffffff",
                  padding: 2,
                  borderWidth: 2,
                  borderColor: "#10B981",
                  overflow: "hidden",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Image
                  source={require("../../assets/logo.jpg")}
                  style={{ width: 40, height: 40, borderRadius: 10 }}
                  resizeMode="cover"
                />
              </View>

              <View style={{ marginLeft: 12 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: "#ffffff",
                    letterSpacing: -0.3,
                  }}
                >
                  Mati FoodFinder
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  <Ionicons name="location-sharp" size={12} color="#34D399" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#A7F3D0",
                      marginLeft: 3,
                      letterSpacing: 0.5,
                    }}
                  >
                    MATI CITY · DAVAO ORIENTAL
                  </Text>
                </View>
              </View>
            </View>

            {/* Version Badge */}
            <View
              style={{
                backgroundColor: "rgba(2, 44, 34, 0.7)",
                borderWidth: 1,
                borderColor: "rgba(16, 185, 129, 0.4)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "800",
                  color: "#6EE7B7",
                }}
              >
                v1.0 Mobile
              </Text>
            </View>
          </View>

          {/* Eyebrow Tag */}
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: "rgba(2, 44, 34, 0.7)",
              borderWidth: 1,
              borderColor: "rgba(245, 158, 11, 0.35)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 99,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: "800",
                color: "#FCD34D",
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              🌴 Local Karenderia & Coastal Dining
            </Text>
          </View>

          {/* Headline */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: "900",
              color: "#ffffff",
              lineHeight: 32,
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Taste the Authentic{"\n"}Soul of Mati City.
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 12.5,
              color: "#D1FAE5",
              lineHeight: 18,
              marginBottom: 16,
              fontWeight: "500",
            }}
          >
            From steaming bowls of native sabaw in Central to morning tuna catches along Pujada Bay and chill Dahican surf eats.
          </Text>

          {/* Specialty Food Badges */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 99,
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 5 }}>🍲</Text>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#ffffff" }}>
                Classic Humba{" "}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#FCD34D" }}>
                ★ 4.8
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 99,
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 5 }}>🐟</Text>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#ffffff" }}>
                Pujada Bay Tuna{" "}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#FCD34D" }}>
                ★ 4.9
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 99,
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 5 }}>🍢</Text>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#ffffff" }}>
                Subangan BBQ{" "}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#FCD34D" }}>
                ★ 4.9
              </Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View style={{ gap: 10 }}>
            {/* Primary Orange Action */}
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)")}
              style={{
                backgroundColor: "#EA5410",
                borderRadius: 16,
                height: 52,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 18,
                shadowColor: "#EA5410",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="restaurant" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "900",
                  color: "#ffffff",
                  letterSpacing: 0.2,
                }}
              >
                Explore Menus & Dine as Guest
              </Text>
              <Ionicons name="arrow-forward" size={17} color="#ffffff" style={{ marginLeft: 6 }} />
            </Pressable>

            {/* Secondary Foodie Account Action */}
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-register")}
              style={{
                backgroundColor: "rgba(2, 44, 34, 0.65)",
                borderWidth: 1.5,
                borderColor: "rgba(52, 211, 153, 0.4)",
                borderRadius: 16,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 16,
              }}
            >
              <Ionicons name="person-circle-outline" size={18} color="#A7F3D0" style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: "800",
                  color: "#D1FAE5",
                }}
              >
                Sign In or Register Foodie Account
              </Text>
            </Pressable>
          </View>
        </View>

        {/* =========================================================================
            2. "BUILT FOR LOCAL DINERS" — SPACIOUS & SUBSTANTIAL CARDS
           ========================================================================= */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          {/* Section Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "900",
                  color: "#047857",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Designed for Mati City
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: "#17191D",
                  marginTop: 1,
                }}
              >
                Built for Local Diners
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#E7F7F0",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "800",
                  color: "#0E9F6E",
                }}
              >
                100% Local
              </Text>
            </View>
          </View>

          {/* Card 1: Daily Live Menus */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E7EAEF",
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#101828",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                backgroundColor: "#FEF1E8",
                borderWidth: 1,
                borderColor: "#FCE0CE",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 28 }}>🍲</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "900",
                    color: "#17191D",
                  }}
                >
                  Daily Live Menus
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#EA5410",
                  }}
                >
                  Fresh Sabaw
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  lineHeight: 17,
                }}
              >
                Karenderias post what's freshly cooked each morning. See what’s on the counter before visiting.
              </Text>
            </View>
          </View>

          {/* Card 2: Cash on Delivery */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E7EAEF",
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#101828",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                backgroundColor: "#E7F7F0",
                borderWidth: 1,
                borderColor: "#A7F3D0",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 28 }}>🛵</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "900",
                    color: "#17191D",
                  }}
                >
                  Cash on Delivery
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#0E9F6E",
                  }}
                >
                  Safe & Simple
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  lineHeight: 17,
                }}
              >
                Pay in cash when your food arrives. Verify your delivery rider with a secure handoff PIN.
              </Text>
            </View>
          </View>

          {/* Card 3: Dining Table Bookings */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E7EAEF",
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#101828",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                backgroundColor: "#F1EBFE",
                borderWidth: 1,
                borderColor: "#DDD6FE",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 28 }}>📅</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "900",
                    color: "#17191D",
                  }}
                >
                  Book Dining Tables
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#7C3AED",
                  }}
                >
                  Skip Waiting
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  lineHeight: 17,
                }}
              >
                Reserve seaside tables at Baywalk or Dahican with live seat counts and instant confirmation.
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            3. PARTNER PORTAL (Clean Segment for Store Owners & Riders)
           ========================================================================= */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "900",
                  color: "#047857",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Business & Logistics
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: "#17191D",
                  marginTop: 1,
                }}
              >
                Partner With Us
              </Text>
            </View>

            {/* Toggle Pill */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#E5E7EB",
                borderRadius: 99,
                padding: 3,
              }}
            >
              <Pressable
                onPress={() => setPartnerMode("merchant")}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 99,
                  backgroundColor: partnerMode === "merchant" ? "#047857" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: partnerMode === "merchant" ? "#ffffff" : "#4B5563",
                  }}
                >
                  Store Owner
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPartnerMode("rider")}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 99,
                  backgroundColor: partnerMode === "rider" ? "#0284C7" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: partnerMode === "rider" ? "#ffffff" : "#4B5563",
                  }}
                >
                  Rider
                </Text>
              </Pressable>
            </View>
          </View>

          {/* STORE MERCHANT CARD */}
          {partnerMode === "merchant" && (
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: "#E7EAEF",
                shadowColor: "#101828",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    backgroundColor: "#FED7AA",
                    borderWidth: 1,
                    borderColor: "#FDBA74",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>🍳</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#17191D" }}>
                      Store Merchant
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#ECFDF5",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#A7F3D0",
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#065F46" }}>
                        KITCHEN
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: "#4B5563", lineHeight: 17 }}>
                    Manage live orders, update daily menu trays, and confirm table bookings.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F0F2F5" }}>
                <Pressable
                  onPress={() => router.push("/(mobile)/auth/merchant-login")}
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: "#047857",
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="key" size={13} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#ffffff" }}>Kitchen Login</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(mobile)/auth/merchant-register")}
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: "#ffffff",
                    borderWidth: 1.5,
                    borderColor: "#047857",
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="storefront" size={13} color="#047857" style={{ marginRight: 5 }} />
                  <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#047857" }}>Register Store</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* DELIVERY RIDER CARD */}
          {partnerMode === "rider" && (
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: "#E7EAEF",
                shadowColor: "#101828",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    backgroundColor: "#BAE6FD",
                    borderWidth: 1,
                    borderColor: "#7DD3FC",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>🛵</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#17191D" }}>
                      Mati Courier Dispatch
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#F0F9FF",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#BAE6FD",
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0369A1" }}>
                        DISPATCH
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: "#4B5563", lineHeight: 17 }}>
                    Accept local deliveries across Mati City, view drop-off routes, and track daily earnings.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F0F2F5" }}>
                <Pressable
                  onPress={() => router.push("/(mobile)/auth/rider-login")}
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: "#0284C7",
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="bicycle" size={14} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#ffffff" }}>Rider Login</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(mobile)/auth/rider-register")}
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: "#ffffff",
                    borderWidth: 1.5,
                    borderColor: "#0284C7",
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person-add" size={13} color="#0284C7" style={{ marginRight: 5 }} />
                  <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#0284C7" }}>Apply as Rider</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* =========================================================================
            4. FOOTER (Mati Pride)
           ========================================================================= */}
        <View style={{ marginTop: 32, paddingHorizontal: 24, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Image
              source={require("../../assets/logo.jpg")}
              style={{ width: 18, height: 18, borderRadius: 5 }}
              resizeMode="cover"
            />
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#17191D" }}>
              Mati FoodFinder
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: "#98A2B3", textAlign: "center", fontWeight: "500" }}>
            Supporting Local Karenderias & Diners across Mati City, Davao Oriental
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
