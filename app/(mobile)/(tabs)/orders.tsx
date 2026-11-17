import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import {
  createOrder,
  fetchCustomerOrders,
  subscribeToOrders,
  updateOrderStatus,
  LiveOrder,
} from "../../../services/orders";
import {
  fetchCustomerReservations,
  subscribeToCustomerReservations,
  updateReservationStatus,
  CustomerReservation,
} from "../../../services/reservations";
import { callPhoneNumber } from "../../../lib/phone";
import { QuickDispatchModal } from "../../../components/orders/QuickDispatchModal";
import {
  subscribeToQuickDispatch,
  QuickDispatchMessage,
} from "../../../services/quick-dispatch";
import {
  sendSystemNotification,
  getOrderStatusNotificationCopy,
} from "../../../services/device-notifications";
import { PostDeliveryRatingModal } from "../../../components/orders/PostDeliveryRatingModal";
import { fetchOrderReview, OrderReview } from "../../../services/reviews";
import { getOrderStatusTheme, getReservationStatusTheme } from "../../../lib/status-tokens";
import { formatReservationDate } from "../../../lib/reservation-dates";
import MatiInteractiveMap, { MapMarker } from "../../../components/map/MatiInteractiveMap";
import { resolveMatiCoordinates } from "../../../lib/mati-routing";
import { calculateHaversineDistanceKm } from "../../../lib/geo-serviceability";

export default function MobileOrdersScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; from?: string }>();

  const [activeTab, setActiveTab] = useState<"deliveries" | "reservations">("deliveries");

  useEffect(() => {
    if (params.tab === "reservations") {
      setActiveTab("reservations");
    } else if (params.tab === "deliveries") {
      setActiveTab("deliveries");
    }
  }, [params.tab]);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [liveReservations, setLiveReservations] = useState<CustomerReservation[]>([]);
  const [activeMessageOrder, setActiveMessageOrder] = useState<LiveOrder | null>(null);
  const [showQuickMessageModal, setShowQuickMessageModal] = useState(false);
  const [latestMessages, setLatestMessages] = useState<Record<string, QuickDispatchMessage>>({});
  const [selectedRatingOrder, setSelectedRatingOrder] = useState<LiveOrder | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [orderReviews, setOrderReviews] = useState<Record<string, OrderReview>>({});
  const autoPromptedOrdersRef = React.useRef<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousStatusesRef = React.useRef<Record<string, string>>({});

  const loadLiveOrders = async () => {
    try {
      const data = await fetchCustomerOrders();
      // Detect order lifecycle state transitions and dispatch in-system notifications
      data.forEach((order) => {
        const prevStatus = previousStatusesRef.current[order.id];
        if (prevStatus && prevStatus !== order.status) {
          const copy = getOrderStatusNotificationCopy(
            order.status,
            order.storeName,
            order.handshakePin,
            order.orderNumber
          );
          if (copy) {
            sendSystemNotification(copy.title, copy.body, {
              orderId: order.id,
              screen: "orders",
              status: order.status,
            });
          }
        }
        previousStatusesRef.current[order.id] = order.status;
      });
      setLiveOrders(data);

      // Fetch reviews for delivered orders and prompt unrated order
      const deliveredOrders = data.filter((o) => o.status === "delivered");
      for (const d of deliveredOrders) {
        fetchOrderReview(d.id).then((rev) => {
          if (rev) {
            setOrderReviews((prev) => ({ ...prev, [d.id]: rev }));
          } else if (!autoPromptedOrdersRef.current.has(d.id)) {
            autoPromptedOrdersRef.current.add(d.id);
            setSelectedRatingOrder(d);
            setShowRatingModal(true);
          }
        });
      }
    } catch (err) {
      console.error("Error fetching live orders:", err);
    }
  };

  const loadLiveReservations = async () => {
    try {
      const data = await fetchCustomerReservations();
      setLiveReservations(data);
    } catch (err) {
      console.error("Error fetching live reservations:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadLiveOrders(), loadLiveReservations()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadLiveOrders();
      loadLiveReservations();
      const unsubOrders = subscribeToOrders(null, loadLiveOrders);
      const unsubReservations = user?.id
        ? subscribeToCustomerReservations(user.id, loadLiveReservations)
        : () => {};
      return () => {
        unsubOrders();
        unsubReservations();
      };
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const activeDelivs = liveOrders.filter(
      (o) => o.status !== "delivered" && o.status !== "cancelled" && o.riderId
    );
    activeDelivs.forEach((order) => {
      const unsub = subscribeToQuickDispatch(order.id, (msg) => {
        setLatestMessages((prev) => ({ ...prev, [order.id]: msg }));
      });
      unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [liveOrders]);

  // Pillar 1: 1-Tap "Order Again" (Re-order previous completed meal)
  const handleReorder = (order: LiveOrder) => {
    const itemsSummary = order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
    Alert.alert(
      "Re-order Your Meal? 🛵",
      `Repeat your previous order from ${order.storeName}?\n\n• Items: ${itemsSummary}\n• Total: ₱${order.total.toFixed(2)} (Cash on Delivery)\n• Destination: ${order.deliveryAddress}, Brgy. ${order.barangay}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Place Order",
          onPress: async () => {
            try {
              const newOrder = await createOrder({
                storeId: order.storeId || "11111111-1111-1111-1111-111111111111",
                items: order.items.map((i: any) => ({
                  menuItemId: i.menuItemId,
                  name: i.name,
                  price: i.price,
                  quantity: i.quantity,
                })),
                fulfillmentType: order.fulfillmentType || "delivery",
                paymentMethod: "cod",
                deliveryAddress: order.deliveryAddress,
                barangay: order.barangay,
                notes: order.notes,
              });
              await loadLiveOrders();
              Alert.alert(
                "Re-order Placed! 🛵",
                `Order #${newOrder.orderNumber} is confirmed! The kitchen has received your order. Handshake PIN: ${newOrder.handshakePin}.`
              );
            } catch (err: any) {
              Alert.alert("Re-order Failed", err?.message || "Could not place re-order.");
            }
          },
        },
      ]
    );
  };

  const displayOrders = liveOrders;
  const displayReservations = liveReservations;

  // Orders screen is strictly for registered customers. Guest users are redirected to Home.
  if (!isLoggedIn) {
    return <Redirect href="/(mobile)/(tabs)/discover" />;
  }

  // Render individual Order Card for Virtualized FlatList
  const renderOrderItem = ({ item: order }: { item: LiveOrder }) => {
    const restaurantTitle = (order as any).restaurantName || (order as any).storeName || "Mati Kitchen";
    const isStep1 = ["placed", "accepted", "confirmed", "preparing", "prepped", "ready_for_pickup", "out_for_delivery", "on_the_way", "delivered"].includes(order.status);
    const isStep2 = ["accepted", "preparing", "prepped", "ready_for_pickup", "out_for_delivery", "on_the_way", "delivered"].includes(order.status);
    const isStep3 = ["out_for_delivery", "on_the_way", "delivered"].includes(order.status);
    const isStep4 = order.status === "delivered";

    const orderTheme = getOrderStatusTheme(order.status);
    const statusLabel = orderTheme.label;

    return (
      <View className="w-full max-w-3xl self-center px-3.5 sm:px-4">
      <View className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-xs mb-3.5">
        {/* Order Header */}
        <View className="flex-row justify-between items-start border-b border-gray-100 pb-2.5 mb-2.5">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-1.5 mb-0.5 flex-wrap">
              <Text className="font-black text-gray-900 text-sm">
                {order.orderNumber}
              </Text>
              <View className="bg-orange-100 px-1.5 py-0.5 rounded-md">
                <Text className="text-[9px] font-black text-[#EA5410] uppercase">
                  COD
                </Text>
              </View>
              <View className={`${orderTheme.badgeBg} px-1.5 py-0.5 rounded-md`}>
                <Text className={`text-[9px] font-black uppercase ${orderTheme.badgeText}`}>
                  {orderTheme.label}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-xs text-gray-600 font-semibold">
                {restaurantTitle}
              </Text>
              {order.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(order.storePhone, restaurantTitle)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restaurantTitle}`}
                  className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 active:bg-orange-100"
                >
                  <Ionicons name="call" size={9} color="#EA5410" />
                  <Text className="text-[9px] font-bold text-[#EA5410]">Call Store</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View className="items-end">
            <Text className="font-black text-[#EA5410] text-base">
              ₱{order.total.toFixed(2)}
            </Text>
            {order.discount && order.discount > 0 ? (
              <Text className="text-[9px] text-emerald-600 font-bold">
                Saved ₱{order.discount.toFixed(2)}
              </Text>
            ) : null}
            <Text className="text-[9px] text-gray-400 font-medium">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View className="gap-1 mb-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
          {order.items.map((item: any, idx: number) => (
            <View key={idx} className="flex-row justify-between items-center">
              <Text className="text-[11px] text-gray-800 font-medium">
                {item.quantity}x {item.name}
              </Text>
              <Text className="text-[11px] text-gray-500 font-semibold">
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          {order.discount && order.discount > 0 ? (
            <View className="flex-row justify-between items-center bg-emerald-50/90 px-2 py-1 rounded-lg border border-emerald-200 mt-0.5">
              <View className="flex-row items-center gap-1">
                <Ionicons name="pricetag" size={10} color="#059669" />
                <Text className="text-[10px] font-black text-emerald-800">
                  Voucher Discount {order.voucherCode ? `(${order.voucherCode})` : ""}
                </Text>
              </View>
              <Text className="text-[10px] font-black text-emerald-700">
                -₱{order.discount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1 pt-1.5 mt-0.5 border-t border-gray-200/60">
            <Ionicons name="location-sharp" size={11} color="#EA5410" />
            <Text className="text-[10px] text-gray-500 flex-1" numberOfLines={1}>
              {order.deliveryAddress}, Brgy. {order.barangay}
            </Text>
          </View>
        </View>

        {/* Delivery Progress Bar & Handshake PIN OR Cancellation Alert */}
        {order.status === "cancelled" ? (
          <View className="bg-rose-50 rounded-xl p-3 border border-rose-200 mb-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="alert-circle" size={15} color="#be123c" />
              <Text className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                {order.notes?.toLowerCase().includes("no-show")
                  ? "⚠️ Delivery Cancelled — Customer No-Show"
                  : "⚠️ Delivery Cancelled"}
              </Text>
            </View>
            <Text className="text-[11px] text-rose-700 leading-snug">
              {order.notes?.toLowerCase().includes("no-show")
                ? "The courier arrived at your delivery address but was unable to reach you. Verified courier GPS coordinates were logged at your drop-off location. Repeated customer no-shows will suspend COD ordering privileges."
                : (order.notes || "This delivery order has been cancelled.")}
            </Text>
          </View>
        ) : (
          <>
            {/* Delivery Progress Bar (Pillar 4: Scaled Visual Stepper) */}
            <View className="bg-orange-50/40 rounded-xl p-3 border border-orange-100 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-[#EA5410]" />
                  <Text className="text-xs font-black text-gray-900">
                    Status: {statusLabel}
                  </Text>
                </View>
                <Text className="text-[11px] font-bold text-[#EA5410]">
                  {order.status === "delivered" ? "Delivered ✓" : "~10-15 mins away"}
                </Text>
              </View>

              {/* 4-Step Visual Stepper */}
              <View className="flex-row items-center justify-between px-1">
                {/* Step 1: Placed */}
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep1 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="receipt-outline" size={12} color={isStep1 ? "white" : "#6B7280"} />
                  </View>
                  <Text className={`text-[8px] mt-0.5 font-bold ${isStep1 ? "text-gray-900" : "text-gray-400"}`}>Placed</Text>
                </View>

                <View className={`flex-1 h-0.5 mx-1 ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`} />

                {/* Step 2: Preparing */}
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="restaurant-outline" size={12} color={isStep2 ? "white" : "#6B7280"} />
                  </View>
                  <Text className={`text-[8px] mt-0.5 font-bold ${isStep2 ? "text-gray-900" : "text-gray-400"}`}>Preparing</Text>
                </View>

                <View className={`flex-1 h-0.5 mx-1 ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`} />

                {/* Step 3: On The Way */}
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="bicycle" size={12} color={isStep3 ? "white" : "#6B7280"} />
                  </View>
                  <Text className={`text-[8px] mt-0.5 font-bold ${isStep3 ? "text-[#EA5410]" : "text-gray-400"}`}>On The Way</Text>
                </View>

                <View className={`flex-1 h-0.5 mx-1 ${isStep4 ? "bg-emerald-600" : "bg-gray-200"}`} />

                {/* Step 4: Delivered */}
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep4 ? "bg-emerald-600" : "bg-gray-200"}`}>
                    <Ionicons name="home-outline" size={12} color={isStep4 ? "white" : "#6B7280"} />
                  </View>
                  <Text className={`text-[8px] mt-0.5 font-bold ${isStep4 ? "text-emerald-700" : "text-gray-400"}`}>Delivered</Text>
                </View>
              </View>
            </View>

            {/* Live Courier Tracking Map during Out for Delivery */}
            {(order.status === "out_for_delivery" || (order.status as string) === "on_the_way") && (
              <View className="mb-4 rounded-2xl overflow-hidden border border-orange-200 bg-orange-50/40 shadow-xs">
                <View className="bg-gray-900 px-3.5 py-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="bicycle" size={15} color="#EA5410" />
                    <Text className="text-[11px] font-black text-white uppercase tracking-wider">
                      Live Courier Delivery Tracking
                    </Text>
                  </View>
                  <View className="bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/40">
                    <Text className="text-[10px] font-bold text-orange-300">
                      Mati City Road
                    </Text>
                  </View>
                </View>

                {(() => {
                  const storeCoords = resolveMatiCoordinates(order.storeAddress || order.storeName);
                  const custCoords = resolveMatiCoordinates(order.barangay || order.deliveryAddress);
                  const markers: MapMarker[] = [
                    {
                      id: "store",
                      latitude: storeCoords.latitude,
                      longitude: storeCoords.longitude,
                      title: restaurantTitle,
                      subtitle: "Restaurant Kitchen",
                      type: "store",
                    },
                    {
                      id: "customer",
                      latitude: custCoords.latitude,
                      longitude: custCoords.longitude,
                      title: "Your Delivery Location",
                      subtitle: `${order.deliveryAddress}, Brgy. ${order.barangay}`,
                      type: "customer",
                    },
                  ];

                  const courierCoords = order.courierLatitude && order.courierLongitude
                    ? {
                        latitude: order.courierLatitude,
                        longitude: order.courierLongitude,
                        heading: order.courierHeading ?? 0,
                      }
                    : undefined;

                  const distToCustomer = courierCoords
                    ? calculateHaversineDistanceKm(
                        courierCoords.latitude,
                        courierCoords.longitude,
                        custCoords.latitude,
                        custCoords.longitude
                      )
                    : null;

                  const isNearby = distToCustomer !== null && distToCustomer < 0.5;

                  return (
                    <>
                      <MatiInteractiveMap
                        markers={markers}
                        liveRider={courierCoords}
                        showLandmarks={true}
                        interactive={true}
                        height={200}
                      />

                      {isNearby ? (
                        <View className="bg-amber-100 border-t border-amber-300 p-2.5 flex-row items-center gap-2">
                          <Ionicons name="flash" size={16} color="#B45309" />
                          <View className="flex-1">
                            <Text className="text-xs font-black text-amber-950">
                              🛵 Courier is nearby (&lt;500m)!
                            </Text>
                            <Text className="text-[10px] text-amber-900 font-medium">
                              Please prepare exact COD cash (₱{order.total.toFixed(2)}) and your 4-digit PIN ({order.handshakePin}).
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View className="bg-white px-3 py-1.5 border-t border-gray-200 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5">
                            <View className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <Text className="text-[10px] font-bold text-gray-700">
                              {courierCoords ? "Courier beacon active" : "Courier en route to store/dropoff"}
                            </Text>
                          </View>
                          {distToCustomer !== null && (
                            <Text className="text-[10px] font-bold text-orange-600">
                              ~{distToCustomer.toFixed(1)} km away
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            )}

            {/* Verified Proof of Delivery Photo (if captured) */}
            {order.status === "delivered" && order.podImageUrl ? (
              <View className="bg-gray-50 border border-gray-200 p-3 rounded-2xl mb-3.5 flex-row items-center gap-3">
                <Image
                  source={{ uri: order.podImageUrl }}
                  className="w-14 h-14 rounded-xl bg-gray-200"
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Ionicons name="camera" size={13} color="#047857" />
                    <Text className="text-xs font-black text-gray-900">
                      Proof of Delivery (POD) Verified 📸
                    </Text>
                  </View>
                  <Text className="text-[10px] text-gray-500 leading-snug">
                    Photo captured by courier upon arrival in Mati City.
                  </Text>
                  {order.podTimestamp && (
                    <Text className="text-[9px] text-gray-400 font-mono mt-0.5">
                      {new Date(order.podTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Delivery Completion & Rating or PIN Card */}
            {order.status === "delivered" ? (
              <View className="mb-3">
                {/* Pillar 1: 1-Tap "Order Again" Action */}
                <Pressable
                  onPress={() => handleReorder(order)}
                  className="w-full py-2.5 px-3 bg-[#EA5410] rounded-xl flex-row items-center justify-center gap-1.5 mb-2 shadow-xs active:opacity-90"
                >
                  <Ionicons name="repeat" size={14} color="white" />
                  <Text className="text-white text-xs font-black">Order Again (1-Tap Re-order)</Text>
                </Pressable>

                {orderReviews[order.id] ? (
                  <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex-row items-center justify-between shadow-xs">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                      <View className="flex-1">
                        <Text className="text-xs font-black text-emerald-950">
                          Rated {orderReviews[order.id].foodRating} ⭐ for Food
                          {orderReviews[order.id].riderRating
                            ? ` · ${orderReviews[order.id].riderRating} ⭐ for Courier`
                            : ""}
                        </Text>
                        <Text className="text-[10px] text-emerald-700">
                          Thank you! Your feedback helps Mati City diners.
                        </Text>
                      </View>
                    </View>
                    {orderReviews[order.id].postedToCommunity && (
                      <View className="bg-emerald-200 px-2 py-0.5 rounded-full">
                        <Text className="text-[8px] font-black text-emerald-900 uppercase">
                          Foodie Feed ✓
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setSelectedRatingOrder(order);
                      setShowRatingModal(true);
                    }}
                    className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex-row items-center justify-between active:bg-amber-100"
                  >
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <Ionicons name="star" size={15} color="#D97706" />
                      <View className="flex-1">
                        <Text className="text-xs font-black text-amber-950">Rate Food & Courier</Text>
                        <Text className="text-[10px] text-amber-800">
                          Help neighbors discover great food in Mati!
                        </Text>
                      </View>
                    </View>
                    <View className="bg-amber-600 px-2.5 py-1 rounded-lg">
                      <Text className="text-[11px] font-black text-white">Rate ⭐</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            ) : (
              <View className="bg-[#EA5410]/5 p-3 rounded-xl border border-[#EA5410]/20 mb-3 flex-row items-center justify-between">
                <View className="flex-1 pr-2.5">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Ionicons name="shield-checkmark" size={12} color="#EA5410" />
                    <Text className="text-[9px] font-black text-[#EA5410] uppercase tracking-wider">
                      DELIVERY HANDSHAKE PIN
                    </Text>
                  </View>
                  <Text className="text-[10px] text-gray-600 leading-snug">
                    Tell this 4-digit code to the rider upon arrival for safe COD handoff
                  </Text>
                </View>
                <View className="bg-[#111827] px-3 py-1.5 rounded-lg shadow-xs">
                  <Text className="text-sm font-black text-white font-mono tracking-widest">
                    {order.handshakePin || "4821"}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Latest Quick Dispatch Message Banner */}
        {latestMessages[order.id] && (
          <View className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-2xl mb-3 flex-row items-start gap-2.5 shadow-xs">
            <View className="w-7 h-7 rounded-full bg-emerald-100 items-center justify-center">
              <Ionicons
                name={
                  latestMessages[order.id].senderRole === "rider"
                    ? "bicycle"
                    : "chatbubble-ellipses"
                }
                size={14}
                color="#059669"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-0.5">
                <Text className="text-[10px] font-black uppercase text-emerald-800">
                  {latestMessages[order.id].senderRole === "rider"
                    ? `Courier Update (${latestMessages[order.id].senderName})`
                    : "Your Message"}
                </Text>
                <Text className="text-[10px] text-emerald-600 font-medium">
                  {latestMessages[order.id].timestamp}
                </Text>
              </View>
              <Text className="text-xs font-extrabold text-emerald-950">
                "{latestMessages[order.id].message}"
              </Text>
            </View>
          </View>
        )}

        {/* Courier Re-broadcast / Re-assignment Banner */}
        {order.isRebroadcast && order.status === "ready_for_pickup" && (
          <View className="bg-amber-50 border border-amber-300 p-3 rounded-2xl mb-3 flex-row items-center gap-2.5 shadow-xs">
            <View className="w-7 h-7 rounded-full bg-amber-100 items-center justify-center">
              <Ionicons name="megaphone-outline" size={14} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-black text-amber-900">
                Courier Re-assignment in Progress 📢
              </Text>
              <Text className="text-[10px] text-amber-800 leading-snug">
                The restaurant re-broadcasted your order to dispatch a faster courier nearby.
              </Text>
            </View>
          </View>
        )}

        {/* Rider Info Card */}
        <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
          <View className="flex-row items-center gap-2.5 flex-1 mr-2">
            <View className={`w-8 h-8 rounded-full items-center justify-center ${order.riderName ? "bg-[#111827]" : "bg-orange-100"}`}>
              <Ionicons name={order.riderName ? "bicycle" : "time-outline"} size={16} color={order.riderName ? "white" : "#EA5410"} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900">
                {order.riderName
                  ? `${order.riderName} (Courier)`
                  : order.status === "cancelled"
                  ? "Order Cancelled"
                  : order.isRebroadcast
                  ? "Re-broadcasting Courier 📢"
                  : order.status === "ready_for_pickup"
                  ? "Broadcasting to Couriers..."
                  : "Awaiting Courier Dispatch"}
              </Text>
              <Text className="text-[10px] text-gray-500">
                {order.riderName
                  ? (order.riderPhone ? `Contact: ${order.riderPhone}` : "Mati City Independent Courier")
                  : order.status === "cancelled"
                  ? "No courier assigned"
                  : order.isRebroadcast
                  ? "Looking for a closer Mati courier"
                  : order.status === "ready_for_pickup"
                  ? "Looking for nearby Mati riders"
                  : "Assigned upon kitchen completion"}
              </Text>
            </View>
          </View>
          {order.riderName && order.status !== "cancelled" ? (
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={() => {
                  setActiveMessageOrder(order);
                  setShowQuickMessageModal(true);
                }}
                className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full flex-row items-center gap-1 active:bg-emerald-100"
              >
                <Ionicons name="chatbubble-ellipses" size={12} color="#059669" />
                <Text className="text-[10px] font-bold text-emerald-800">Message</Text>
              </Pressable>
              <Pressable
                onPress={() => callPhoneNumber(order.riderPhone, order.riderName)}
                className="w-8 h-8 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-full items-center justify-center active:bg-[#EA5410]/20"
              >
                <Ionicons name="call" size={14} color="#EA5410" />
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Allow customer cancellation while order is placed/pending kitchen acceptance */}
        {order.status === "placed" && (
          <View className="mt-2.5 pt-2 border-t border-gray-100 flex-row items-center justify-between">
            <Text className="text-[10px] text-gray-500 font-medium">Order awaiting kitchen acceptance</Text>
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Cancel Order?",
                  `Are you sure you want to cancel Order #${order.orderNumber}?`,
                  [
                    { text: "Keep Order", style: "cancel" },
                    {
                      text: "Cancel Order",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await updateOrderStatus(order.id, "cancelled");
                          loadLiveOrders();
                          Alert.alert("Order Cancelled", `Order #${order.orderNumber} has been cancelled.`);
                        } catch (err: any) {
                          Alert.alert("Cancellation Error", err.message || "Failed to cancel order");
                        }
                      },
                    },
                  ]
                );
              }}
              className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg active:bg-gray-200"
            >
              <Text className="text-[10px] font-bold text-gray-600">Cancel Order</Text>
            </Pressable>
          </View>
        )}
      </View>
      </View>
    );
  };

  // Render individual Reservation Card for Virtualized FlatList
  const renderReservationItem = ({ item: res }: { item: CustomerReservation }) => {
    const restoName = res.storeName || "Mati Restaurant";
    const bookingRef = res.reservation_number || `#${(res.id || "").slice(0, 8).toUpperCase()}`;
    const resDate = formatReservationDate(res.reservation_date);
    const resTime = res.reservation_time;
    const partySize = res.party_size;
    const specialNotes = res.special_notes;
    const isConfirmed = res.status === "confirmed";
    const isPending = res.status === "pending";
    const isDeclined = res.status === "declined";
    const isCancelled = res.status === "cancelled";

    const resTheme = getReservationStatusTheme(res.status);

    return (
      <View className="w-full max-w-3xl self-center px-3.5 sm:px-4">
      <View
        className={`bg-white rounded-2xl p-3.5 border mb-3 shadow-xs ${
          isConfirmed
            ? "border-emerald-300"
            : isPending
            ? "border-amber-300"
            : isDeclined
            ? "border-rose-300"
            : "border-gray-200"
        }`}
      >
        <View className="flex-row justify-between items-start mb-2.5 gap-2">
          <View className="flex-1 pr-2 min-w-0">
            <Text className="text-sm font-black text-gray-900">{restoName}</Text>
            <Text className="text-[10px] text-gray-400 font-medium">Booking {bookingRef}</Text>
          </View>
          <View
            className={`px-2.5 py-0.5 rounded-full shrink-0 ${resTheme.badgeBg} border ${resTheme.borderColor}`}
          >
            <Text
              className={`text-[9px] font-black uppercase ${resTheme.badgeText}`}
            >
              {resTheme.label}
            </Text>
          </View>
        </View>

        <View className="bg-gray-50 p-2.5 rounded-xl mb-2.5 border border-gray-100 flex-row flex-wrap justify-between gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color="#EA5410" />
            <Text className="text-[11px] font-bold text-gray-800">{resDate}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={14} color="#EA5410" />
            <Text className="text-[11px] font-bold text-gray-800">{resTime}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="people-outline" size={14} color="#EA5410" />
            <Text className="text-[11px] font-bold text-gray-800">{partySize} Guests</Text>
          </View>
        </View>

        {specialNotes ? (
          <View className="bg-gray-50/70 p-2 rounded-lg mb-2.5 border border-gray-100">
            <Text className="text-[10px] text-gray-500 italic">"{specialNotes}"</Text>
          </View>
        ) : null}

        {isPending ? (
          <View className="pt-2 border-t border-gray-100 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-[10px] text-gray-500 font-medium flex-1 min-w-[140px]">Awaiting confirmation...</Text>
            <View className="flex-row items-center gap-1.5">
              {res.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(res.storePhone, restoName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restoName}`}
                  className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                >
                  <Ionicons name="call" size={11} color="#EA5410" />
                  <Text className="text-[11px] font-bold text-[#EA5410]">Call</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={async () => {
                  try {
                    await updateReservationStatus(res.id, "cancelled");
                    loadLiveReservations();
                    Alert.alert("Reservation Cancelled", "Your booking request has been cancelled.");
                  } catch (err: any) {
                    Alert.alert("Error", err.message);
                  }
                }}
                className="py-1 px-2.5 bg-gray-100 rounded-lg"
              >
                <Text className="text-[11px] font-bold text-gray-600">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : isConfirmed ? (
          <View className="pt-2 border-t border-gray-100 flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-row items-center gap-1 flex-1 min-w-[140px] pr-1">
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text className="text-[11px] font-bold text-emerald-800">Seating Ready Upon Arrival</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {res.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(res.storePhone, restoName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restoName}`}
                  className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                >
                  <Ionicons name="call" size={11} color="#EA5410" />
                  <Text className="text-[11px] font-bold text-[#EA5410]">Call</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: "/(mobile)/(tabs)/map",
                    params: { storeName: restoName, storeId: res.store_id },
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`View directions to ${restoName}`}
                className="py-1 px-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex-row items-center gap-1 active:bg-emerald-100"
              >
                <Ionicons name="navigate-outline" size={11} color="#065f46" />
                <Text className="text-[11px] font-bold text-emerald-800">Directions</Text>
              </Pressable>
            </View>
          </View>
        ) : res.status === "completed" ? (
          <View className="pt-2 border-t border-gray-100 flex-row items-center gap-1.5">
            <Ionicons name="restaurant" size={14} color="#0284c7" />
            <Text className="text-[11px] font-bold text-sky-800">
              Dining Completed ✓ Thank you for dining with us!
            </Text>
          </View>
        ) : res.status === "no_show" ? (
          <View className="pt-2 border-t border-gray-100 flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={15} color="#e11d48" />
            <Text className="text-xs font-bold text-rose-800">
              Table Released (No-Show) • Grace period elapsed
            </Text>
          </View>
        ) : isDeclined ? (
          <View className="pt-2.5 border-t border-gray-100 gap-2">
            <View className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Ionicons name="close-circle" size={14} color="#e11d48" />
                <Text className="text-xs font-bold text-rose-800">
                  Booking Unavailable
                </Text>
              </View>
              <Text className="text-xs text-rose-700 leading-relaxed">
                {res.store_notes?.trim()
                  ? `Message from store: "${res.store_notes.trim()}"`
                  : "The restaurant could not accommodate this date, time, or party size."}
              </Text>
            </View>
            <View className="flex-row items-center justify-end gap-2">
              {res.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(res.storePhone, restoName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restoName}`}
                  className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                >
                  <Ionicons name="call" size={12} color="#EA5410" />
                  <Text className="text-xs font-bold text-[#EA5410]">Call Store</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* Top Header */}
      <View className="px-3.5 sm:px-4 pt-2 pb-2.5 bg-white border-b border-gray-100 shadow-xs">
        <View className="w-full max-w-3xl self-center">
        <View className="flex-row justify-between items-center mb-2 gap-2">
          <View className="flex-row items-center gap-2 flex-1 min-w-0">
            {params.from === "profile" && (
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/profile")}
                accessibilityRole="button"
                accessibilityLabel="Back to Profile"
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-1"
              >
                <Ionicons name="arrow-back" size={16} color="#1F2937" />
              </Pressable>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-extrabold text-[#EA5410] uppercase tracking-wider">
                MATI ORDERS & BOOKINGS
              </Text>
              <Text className="text-base font-black text-gray-900 tracking-tight" numberOfLines={1}>
                Your Orders & Bookings
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)/discover")}
            className="bg-[#EA5410]/10 border border-[#EA5410]/20 px-2.5 py-1 rounded-full flex-row items-center gap-1 shrink-0"
          >
            <Ionicons name="add-circle-outline" size={13} color="#EA5410" />
            <Text className="text-[11px] font-bold text-[#EA5410]">New Order</Text>
          </Pressable>
        </View>

        {/* View Switcher Segmented Control */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl gap-1">
          <Pressable
            onPress={() => setActiveTab("deliveries")}
            className={`flex-1 py-1.5 rounded-lg items-center flex-row justify-center gap-1.5 ${
              activeTab === "deliveries" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="bicycle"
              size={14}
              color={activeTab === "deliveries" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "deliveries" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              COD Deliveries
            </Text>
            <View
              className={`px-1.5 py-0.2 rounded-full ${
                activeTab === "deliveries" ? "bg-[#EA5410]/10" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-[9px] font-black ${
                  activeTab === "deliveries" ? "text-[#EA5410]" : "text-gray-600"
                }`}
              >
                {displayOrders.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("reservations")}
            className={`flex-1 py-1.5 rounded-lg items-center flex-row justify-center gap-1.5 ${
              activeTab === "reservations" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={activeTab === "reservations" ? "#EA5410" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "reservations" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Table Bookings
            </Text>
            <View
              className={`px-1.5 py-0.2 rounded-full ${
                activeTab === "reservations" ? "bg-[#EA5410]/10" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-[9px] font-black ${
                  activeTab === "reservations" ? "text-[#EA5410]" : "text-gray-600"
                }`}
              >
                {liveReservations.length}
              </Text>
            </View>
          </Pressable>
        </View>
        </View>
      </View>

      {/* Virtualized Lists */}
      {activeTab === "deliveries" ? (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          ListHeaderComponent={
            <View className="w-full max-w-3xl self-center px-4 sm:px-5 pt-4 pb-2">
              <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                ACTIVE DELIVERIES ({displayOrders.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="w-full max-w-3xl self-center px-4 sm:px-5">
            <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center my-6 shadow-sm">
              <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                <Ionicons name="fast-food-outline" size={32} color="#EA5410" />
              </View>
              <Text className="text-base font-black text-gray-900 mt-1">No active orders right now</Text>
              <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                Browse Mati City restaurants and order freshly cooked food with Cash on Delivery.
              </Text>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/discover")}
                className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Browse Restaurants & Menus</Text>
              </Pressable>
            </View>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#EA5410"]}
              tintColor="#EA5410"
            />
          }
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={displayReservations}
          keyExtractor={(item) => item.id}
          renderItem={renderReservationItem}
          ListHeaderComponent={
            <View className="w-full max-w-3xl self-center px-4 sm:px-5 pt-4 pb-2">
              <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                TABLE BOOKINGS ({displayReservations.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="w-full max-w-3xl self-center px-4 sm:px-5">
            <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center my-6 shadow-sm">
              <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                <Ionicons name="calendar-outline" size={32} color="#EA5410" />
              </View>
              <Text className="text-base font-black text-gray-900 mt-1">No table bookings yet</Text>
              <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                Skip waiting in line by reserving dining tables at popular Mati restaurants.
              </Text>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/discover")}
                className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Reserve a Table</Text>
              </Pressable>
            </View>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#EA5410"]}
              tintColor="#EA5410"
            />
          }
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeMessageOrder && (
        <QuickDispatchModal
          visible={showQuickMessageModal}
          onClose={() => {
            setShowQuickMessageModal(false);
            setActiveMessageOrder(null);
          }}
          role="customer"
          orderId={activeMessageOrder.id}
          orderNumber={activeMessageOrder.orderNumber}
          recipientId={activeMessageOrder.riderId}
          recipientName={activeMessageOrder.riderName || "Courier"}
          recipientPhone={activeMessageOrder.riderPhone}
          currentUserId={user?.id || ""}
          currentUserName={user?.name || "Customer"}
          onMessageSent={(msg) => {
            setLatestMessages((prev) => ({ ...prev, [activeMessageOrder.id]: msg }));
          }}
        />
      )}

      {selectedRatingOrder && (
        <PostDeliveryRatingModal
          visible={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedRatingOrder(null);
          }}
          orderId={selectedRatingOrder.id}
          orderNumber={selectedRatingOrder.orderNumber}
          storeId={selectedRatingOrder.storeId}
          storeName={selectedRatingOrder.storeName}
          riderId={selectedRatingOrder.riderId}
          riderName={selectedRatingOrder.riderName}
          onReviewSubmitted={(review) => {
            setOrderReviews((prev) => ({ ...prev, [selectedRatingOrder.id]: review }));
          }}
        />
      )}
    </SafeAreaView>
  );
}
