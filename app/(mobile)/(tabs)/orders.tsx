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
import { useRouter, Redirect } from "expo-router";
import { fetchCustomerOrders, subscribeToOrders, LiveOrder } from "../../../services/orders";
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

export default function MobileOrdersScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"deliveries" | "reservations">("deliveries");
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
      <View className="w-full max-w-3xl self-center px-4 sm:px-5">
      <View className="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-sm mb-4">
        {/* Order Header */}
        <View className="flex-row justify-between items-start border-b border-gray-100 pb-3.5 mb-3.5">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-2 mb-1 flex-wrap">
              <Text className="font-black text-gray-900 text-base">
                {order.orderNumber}
              </Text>
              <View className="bg-orange-100 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-black text-[#EA5410] uppercase">
                  COD
                </Text>
              </View>
              <View className={`${orderTheme.badgeBg} px-2 py-0.5 rounded-md`}>
                <Text className={`text-[10px] font-black uppercase ${orderTheme.badgeText}`}>
                  {orderTheme.label}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-xs text-gray-600 font-semibold">
                {restaurantTitle}
              </Text>
              {order.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(order.storePhone, restaurantTitle)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restaurantTitle}`}
                  className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 active:bg-orange-100"
                >
                  <Ionicons name="call" size={10} color="#EA5410" />
                  <Text className="text-[10px] font-bold text-[#EA5410]">Call Store</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View className="items-end">
            <Text className="font-black text-[#EA5410] text-lg">
              ₱{order.total.toFixed(2)}
            </Text>
            {order.discount && order.discount > 0 ? (
              <Text className="text-[10px] text-emerald-600 font-bold">
                Saved ₱{order.discount.toFixed(2)}
              </Text>
            ) : null}
            <Text className="text-[10px] text-gray-400 font-medium">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View className="gap-1.5 mb-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
          {order.items.map((item: any, idx: number) => (
            <View key={idx} className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-800 font-medium">
                {item.quantity}x {item.name}
              </Text>
              <Text className="text-xs text-gray-500 font-semibold">
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          {order.discount && order.discount > 0 ? (
            <View className="flex-row justify-between items-center bg-emerald-50/90 px-2.5 py-1.5 rounded-xl border border-emerald-200 mt-1">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="pricetag" size={12} color="#059669" />
                <Text className="text-[11px] font-black text-emerald-800">
                  Voucher Discount {order.voucherCode ? `(${order.voucherCode})` : ""}
                </Text>
              </View>
              <Text className="text-[11px] font-black text-emerald-700">
                -₱{order.discount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1.5 pt-2 mt-1 border-t border-gray-200/60">
            <Ionicons name="location-sharp" size={12} color="#EA5410" />
            <Text className="text-[11px] text-gray-500 flex-1" numberOfLines={1}>
              {order.deliveryAddress}, Brgy. {order.barangay}
            </Text>
          </View>
        </View>

        {/* Delivery Progress Bar & Handshake PIN OR Cancellation Alert */}
        {order.status === "cancelled" ? (
          <View className="bg-rose-50 rounded-2xl p-4 border border-rose-200 mb-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons name="alert-circle" size={18} color="#be123c" />
              <Text className="text-xs font-black text-rose-800 uppercase tracking-wide">
                {order.notes?.toLowerCase().includes("no-show")
                  ? "⚠️ Delivery Cancelled — Customer No-Show"
                  : "⚠️ Delivery Cancelled"}
              </Text>
            </View>
            <Text className="text-xs text-rose-700 leading-snug">
              {order.notes?.toLowerCase().includes("no-show")
                ? "The courier arrived at your delivery address but was unable to reach you. Verified courier GPS coordinates were logged at your drop-off location. Repeated customer no-shows will suspend COD ordering privileges."
                : (order.notes || "This delivery order has been cancelled.")}
            </Text>
          </View>
        ) : (
          <>
            {/* Delivery Progress Bar */}
            <View className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/80 mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#EA5410]" />
                  <Text className="text-xs font-black text-gray-900">
                    Status: {statusLabel}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-[#EA5410]">
                  {order.status === "delivered" ? "Completed" : "~10-15 mins away"}
                </Text>
              </View>

              {/* Timeline Steps */}
              <View className="flex-row items-center justify-between mt-1 px-1">
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep1 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="checkmark" size={13} color="white" />
                  </View>
                  <Text className="text-[9px] font-bold text-gray-800 mt-1">Confirmed</Text>
                </View>
                <View className={`flex-1 h-0.5 mx-1 ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep2 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="checkmark" size={13} color="white" />
                  </View>
                  <Text className="text-[9px] font-bold text-gray-800 mt-1">Prepped</Text>
                </View>
                <View className={`flex-1 h-0.5 mx-1 ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep3 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    <Ionicons name="bicycle" size={13} color="white" />
                  </View>
                  <Text className={`text-[9px] font-bold mt-1 ${isStep3 ? "text-[#EA5410]" : "text-gray-400"}`}>On the Way</Text>
                </View>
                <View className={`flex-1 h-0.5 mx-1 ${isStep4 ? "bg-[#EA5410]" : "bg-gray-200"}`} />
                <View className="items-center">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${isStep4 ? "bg-[#EA5410]" : "bg-gray-200"}`}>
                    {isStep4 && <Ionicons name="checkmark" size={13} color="white" />}
                  </View>
                  <Text className={`text-[9px] mt-1 ${isStep4 ? "font-bold text-[#EA5410]" : "text-gray-400"}`}>Delivered</Text>
                </View>
              </View>
            </View>

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
              orderReviews[order.id] ? (
                <View className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl mb-3.5 flex-row items-center justify-between shadow-xs">
                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <View className="flex-1">
                      <Text className="text-xs font-black text-emerald-950">
                        Rated {orderReviews[order.id].foodRating} ⭐ for Food
                        {orderReviews[order.id].riderRating
                          ? ` · ${orderReviews[order.id].riderRating} ⭐ for Courier`
                          : ""}
                      </Text>
                      <Text className="text-[10px] text-emerald-700">
                        Thank you for reviewing! Your feedback helps Mati City diners.
                      </Text>
                    </View>
                  </View>
                  {orderReviews[order.id].postedToCommunity && (
                    <View className="bg-emerald-200 px-2.5 py-1 rounded-full">
                      <Text className="text-[9px] font-black text-emerald-900 uppercase">
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
                  className="bg-[#EA5410] p-3.5 rounded-2xl mb-3.5 flex-row items-center justify-between shadow-sm active:bg-[#EA5410]/90"
                >
                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                    <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <Ionicons name="star" size={16} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-white">Rate Food & Courier</Text>
                      <Text className="text-[10px] text-white/80">
                        Help neighbors discover great food in Mati! Tap to rate.
                      </Text>
                    </View>
                  </View>
                  <View className="bg-white/25 px-3 py-1.5 rounded-xl border border-white/20">
                    <Text className="text-xs font-black text-white">Rate ⭐</Text>
                  </View>
                </Pressable>
              )
            ) : (
              <View className="bg-[#EA5410]/5 p-4 rounded-2xl border border-[#EA5410]/20 mb-3.5 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Ionicons name="shield-checkmark" size={13} color="#EA5410" />
                    <Text className="text-[10px] font-black text-[#EA5410] uppercase tracking-wider">
                      DELIVERY HANDSHAKE PIN
                    </Text>
                  </View>
                  <Text className="text-[11px] text-gray-600 leading-snug">
                    Tell this 4-digit code to the rider upon arrival for safe COD handoff
                  </Text>
                </View>
                <View className="bg-[#111827] px-3.5 py-2 rounded-xl shadow-xs">
                  <Text className="text-base font-black text-white font-mono tracking-widest">
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
        <View className="flex-row items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${order.riderName ? "bg-[#111827]" : "bg-orange-100"}`}>
              <Ionicons name={order.riderName ? "bicycle" : "time-outline"} size={18} color={order.riderName ? "white" : "#EA5410"} />
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
                className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full flex-row items-center gap-1 active:bg-emerald-100"
              >
                <Ionicons name="chatbubble-ellipses" size={13} color="#059669" />
                <Text className="text-[11px] font-bold text-emerald-800">Message</Text>
              </Pressable>
              <Pressable
                onPress={() => callPhoneNumber(order.riderPhone, order.riderName)}
                className="w-9 h-9 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-full items-center justify-center active:bg-[#EA5410]/20"
              >
                <Ionicons name="call" size={16} color="#EA5410" />
              </Pressable>
            </View>
          ) : null}
        </View>
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
      <View className="w-full max-w-3xl self-center px-4 sm:px-5">
      <View
        className={`bg-white rounded-3xl p-5 border mb-4 shadow-sm ${
          isConfirmed
            ? "border-emerald-300"
            : isPending
            ? "border-amber-300"
            : "border-gray-200"
        }`}
      >
        <View className="flex-row justify-between items-start mb-3 gap-2">
          <View className="flex-1 pr-2 min-w-0">
            <Text className="text-base font-black text-gray-900">{restoName}</Text>
            <Text className="text-xs text-gray-400 font-medium">Booking {bookingRef}</Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full shrink-0 ${resTheme.badgeBg} border ${resTheme.borderColor}`}
          >
            <Text
              className={`text-[10px] font-black uppercase ${resTheme.badgeText}`}
            >
              {resTheme.label}
            </Text>
          </View>
        </View>

        <View className="bg-gray-50 p-3.5 rounded-2xl mb-3 border border-gray-100 flex-row flex-wrap justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="calendar-outline" size={16} color="#EA5410" />
            <Text className="text-xs font-bold text-gray-800">{resDate}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={16} color="#EA5410" />
            <Text className="text-xs font-bold text-gray-800">{resTime}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="people-outline" size={16} color="#EA5410" />
            <Text className="text-xs font-bold text-gray-800">{partySize} Guests</Text>
          </View>
        </View>

        {specialNotes ? (
          <View className="bg-gray-50/70 p-2.5 rounded-xl mb-3 border border-gray-100">
            <Text className="text-[11px] text-gray-500 italic">"{specialNotes}"</Text>
          </View>
        ) : null}

        {isPending ? (
          <View className="pt-2 border-t border-gray-100 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-[11px] text-gray-500 font-medium flex-1 min-w-[160px]">Awaiting restaurant confirmation...</Text>
            <View className="flex-row items-center gap-2">
              {res.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(res.storePhone, restoName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restoName}`}
                  className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                >
                  <Ionicons name="call" size={12} color="#EA5410" />
                  <Text className="text-xs font-bold text-[#EA5410]">Call</Text>
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
                className="py-1 px-3 bg-gray-100 rounded-lg"
              >
                <Text className="text-xs font-bold text-gray-600">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : isConfirmed ? (
          <View className="pt-2 border-t border-gray-100 flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-row items-center gap-1.5 flex-1 min-w-[160px] pr-2">
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text className="text-xs font-bold text-emerald-800">Seating Ready Upon Arrival</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {res.storePhone ? (
                <Pressable
                  onPress={() => callPhoneNumber(res.storePhone, restoName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${restoName}`}
                  className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg flex-row items-center gap-1 active:bg-orange-100"
                >
                  <Ionicons name="call" size={12} color="#EA5410" />
                  <Text className="text-xs font-bold text-[#EA5410]">Call</Text>
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
                className="py-1 px-3 bg-emerald-50 border border-emerald-200 rounded-lg flex-row items-center gap-1 active:bg-emerald-100"
              >
                <Ionicons name="navigate-outline" size={12} color="#065f46" />
                <Text className="text-xs font-bold text-emerald-800">Directions</Text>
              </Pressable>
            </View>
          </View>
        ) : res.status === "completed" ? (
          <View className="pt-2 border-t border-gray-100 flex-row items-center gap-1.5">
            <Ionicons name="restaurant" size={15} color="#0284c7" />
            <Text className="text-xs font-bold text-sky-800">
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
        ) : null}
      </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* Top Header */}
      <View className="px-4 sm:px-5 pt-3 pb-3 bg-white border-b border-gray-100 shadow-xs">
        <View className="w-full max-w-3xl self-center">
        <View className="flex-row justify-between items-center mb-3 gap-2">
          <View className="flex-1 min-w-0">
            <Text className="text-[11px] font-extrabold text-[#EA5410] uppercase tracking-wider">
              MATI ORDERS & BOOKINGS
            </Text>
            <Text className="text-xl font-black text-gray-900 tracking-tight" numberOfLines={1}>
              Your Orders & Bookings
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)/discover")}
            className="bg-[#EA5410]/10 border border-[#EA5410]/20 px-3 py-1.5 rounded-full flex-row items-center gap-1.5 shrink-0"
          >
            <Ionicons name="add-circle-outline" size={15} color="#EA5410" />
            <Text className="text-xs font-bold text-[#EA5410]">New Order</Text>
          </Pressable>
        </View>

        {/* View Switcher Segmented Control */}
        <View className="flex-row bg-gray-100 p-1.5 rounded-2xl gap-1">
          <Pressable
            onPress={() => setActiveTab("deliveries")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "deliveries" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="bicycle"
              size={16}
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
              className={`px-1.5 py-0.5 rounded-full ${
                activeTab === "deliveries" ? "bg-[#EA5410]/10" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-[10px] font-black ${
                  activeTab === "deliveries" ? "text-[#EA5410]" : "text-gray-600"
                }`}
              >
                {displayOrders.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("reservations")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "reservations" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="calendar"
              size={15}
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
              className={`px-1.5 py-0.5 rounded-full ${
                activeTab === "reservations" ? "bg-[#EA5410]/10" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-[10px] font-black ${
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
