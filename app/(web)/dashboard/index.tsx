import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import {
  fetchStoreById,
  fetchStoreMenuItems,
  fetchUserStoreId,
  updateStoreOpenStatus,
  type LiveStoreProfile,
} from "../../../services/catalog";
import { fetchMerchantStoreMetrics, type StoreMetrics } from "../../../services/admin";
import {
  fetchStoreOrders,
  merchantRebroadcastOrder,
  subscribeToOrders,
  updateOrderStatus,
  confirmCodRemittance,
  type LiveOrder,
  type LiveOrderItem,
} from "../../../services/orders";
import {
  fetchStoreReservations,
  subscribeToStoreReservations,
  updateReservationStatus,
  type ReservationRow,
  type ReservationStatus,
} from "../../../services/reservations";
import { getOrderStatusTheme, getReservationStatusTheme } from "../../../lib/status-tokens";
import { formatReservationDate } from "../../../lib/reservation-dates";
import {
  resolveStoreSubscriptionSummary,
  canStoreViewCustomerReviews,
} from "../../../lib/subscription-tiers";
import {
  fetchStoreReviews,
  fetchStoreDetailedRatingSummary,
  computeStoreDetailedRatingSummary,
  type StoreReviewItem,
  type StoreDetailedRatingSummary,
} from "../../../services/reviews";
import {
  RESERVATION_DECLINE_PRESETS,
  filterReservationDeclineNoteInput,
  validateReservationDeclineNote,
} from "../../../lib/merchant-validation";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import { PrintableTableQrModal } from "../../../components/merchant/PrintableTableQrModal";
import { playKitchenChimeAudio } from "../../../lib/kitchen-audio";
import type { FoodItem } from "../../../types/restaurant";
import type { OrderStatus } from "../../../types/order";

export const ORDER_DECLINE_REASONS = [
  "Ingredients out of stock",
  "Kitchen at full capacity",
  "Store closing earlier than scheduled",
  "Delivery address outside service area",
  "Customer requested cancellation",
  "Other reason",
] as const;

export default function StoreDashboardOverview() {
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [store, setStore] = useState<LiveStoreProfile | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [processingResId, setProcessingResId] = useState<string | null>(null);
  const [decliningReservation, setDecliningReservation] = useState<ReservationRow | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineReasonError, setDeclineReasonError] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  // Kitchen Chime Sound Alert
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const chimeEnabledRef = useRef(true);
  const knownPlacedOrderIdsRef = useRef<Set<string>>(new Set());

  // Kitchen Queue Filter & Search
  const [orderFilterTab, setOrderFilterTab] = useState<"active" | "completed" | "remittance" | "cancelled" | "all">("active");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [confirmingRemittanceId, setConfirmingRemittanceId] = useState<string | null>(null);

  // Order Ticket Chit Modal
  const [viewingTicketOrder, setViewingTicketOrder] = useState<LiveOrder | null>(null);

  // Order Decline Modal
  const [decliningOrder, setDecliningOrder] = useState<LiveOrder | null>(null);
  const [selectedOrderDeclineReason, setSelectedOrderDeclineReason] = useState<string>(ORDER_DECLINE_REASONS[0]);
  const [customOrderDeclineText, setCustomOrderDeclineText] = useState("");

  // Table Capacity & Reservation Filter States
  const [resFilterTab, setResFilterTab] = useState<"all" | "pending" | "confirmed" | "completed">("all");
  const [resSearchQuery, setResSearchQuery] = useState("");
  const [noShowConfirmTarget, setNoShowConfirmTarget] = useState<ReservationRow | null>(null);

  const router = useRouter();

  // Customer Reviews & Feedback States
  const [reviews, setReviews] = useState<StoreReviewItem[]>([]);
  const [detailedRating, setDetailedRating] = useState<StoreDetailedRatingSummary>(() =>
    computeStoreDetailedRatingSummary([])
  );
  const [reviewFilterTab, setReviewFilterTab] = useState<"all" | "5" | "4" | "critical">("all");
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    if (!identity?.id) {
      setLoading(false);
      return;
    }

    fetchUserStoreId(identity.id)
      .then((id) => {
        if (!active) return;
        if (id) {
          setStoreId(id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [identity?.id]);

  useEffect(() => {
    if (!storeId) return;
    const activeStoreId = storeId;
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [
          storeData,
          metricsData,
          ordersData,
          menuData,
          resData,
          reviewsData,
          detailedData,
        ] = await Promise.all([
          fetchStoreById(activeStoreId),
          fetchMerchantStoreMetrics(activeStoreId),
          fetchStoreOrders(activeStoreId),
          fetchStoreMenuItems(activeStoreId, "merchant"),
          fetchStoreReservations(activeStoreId).catch(() => []),
          fetchStoreReviews(activeStoreId).catch(() => []),
          fetchStoreDetailedRatingSummary(activeStoreId).catch(() =>
            computeStoreDetailedRatingSummary([])
          ),
        ]);
        if (!active) return;

        if (storeData) {
          setStore(storeData);
          setIsOpen(storeData.isOpen ?? true);
        }
        if (metricsData) setMetrics(metricsData);
        setOrders(ordersData);
        knownPlacedOrderIdsRef.current = new Set(
          ordersData.filter((o) => o.status === "placed").map((o) => o.id)
        );
        setMenuItems(menuData);
        setReservations(resData);
        setReviews(reviewsData);
        setDetailedRating(detailedData);
      } catch (err) {
        console.warn("Failed to load store dashboard data:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();

    const unsubOrders = subscribeToOrders({ storeId: activeStoreId }, () => {
      void fetchStoreOrders(activeStoreId).then((data) => {
        if (active) {
          const hasNewPlaced = data.some(
            (o) => o.status === "placed" && !knownPlacedOrderIdsRef.current.has(o.id)
          );
          if (hasNewPlaced && chimeEnabledRef.current) {
            playKitchenChimeAudio();
          }
          knownPlacedOrderIdsRef.current = new Set(
            data.filter((o) => o.status === "placed").map((o) => o.id)
          );
          setOrders(data);
        }
      });
      void fetchMerchantStoreMetrics(activeStoreId).then((m) => {
        if (active && m) setMetrics(m);
      });
    });

    const unsubReservations = subscribeToStoreReservations(activeStoreId, () => {
      void fetchStoreReservations(activeStoreId)
        .then((data) => {
          if (active) setReservations(data);
        })
        .catch(() => {});
      void fetchMerchantStoreMetrics(activeStoreId).then((m) => {
        if (active && m) setMetrics(m);
      });
    });

    return () => {
      active = false;
      unsubOrders();
      unsubReservations();
    };
  }, [storeId]);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered"),
    [orders]
  );
  const pendingRemittanceOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "delivered" &&
          (o.paymentMethod === "cod" || !o.paymentMethod) &&
          !o.isRemitted
      ),
    [orders]
  );
  const pendingRemittanceTotal = useMemo(
    () =>
      pendingRemittanceOrders.reduce(
        (sum, o) => sum + (o.subtotal || Math.max(0, o.total - (o.deliveryFee || 35))),
        0
      ),
    [pendingRemittanceOrders]
  );
  const cancelledOrders = useMemo(
    () => orders.filter((o) => o.status === "cancelled"),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderFilterTab === "active") {
      list = activeOrders;
    } else if (orderFilterTab === "completed") {
      list = completedOrders;
    } else if (orderFilterTab === "remittance") {
      list = pendingRemittanceOrders;
    } else if (orderFilterTab === "cancelled") {
      list = cancelledOrders;
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.barangay?.toLowerCase().includes(q) ||
          o.deliveryAddress?.toLowerCase().includes(q) ||
          o.notes?.toLowerCase().includes(q) ||
          o.items?.some((item) => item.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, orderFilterTab, orderSearchQuery, activeOrders, completedOrders, pendingRemittanceOrders, cancelledOrders]);

  const pendingReservationsCount = reservations.filter(
    (r) => r.status === "pending"
  ).length;
  const confirmedReservationsCount = reservations.filter(
    (r) => r.status === "confirmed"
  ).length;

  // Table Capacity & Occupancy
  const totalTables = store?.tableCapacity ?? store?.table_capacity ?? 8;
  const occupiedTables = confirmedReservationsCount;
  const availableTables = Math.max(0, totalTables - occupiedTables);
  const occupancyPercent = Math.min(100, Math.round((occupiedTables / totalTables) * 100));

  const pastReservationsCount = useMemo(
    () =>
      reservations.filter(
        (r) =>
          r.status === "completed" ||
          r.status === "no_show" ||
          r.status === "declined" ||
          r.status === "cancelled"
      ).length,
    [reservations]
  );

  const filteredReservations = useMemo(() => {
    let list = reservations;
    if (resFilterTab === "pending") {
      list = list.filter((r) => r.status === "pending");
    } else if (resFilterTab === "confirmed") {
      list = list.filter((r) => r.status === "confirmed");
    } else if (resFilterTab === "completed") {
      list = list.filter(
        (r) =>
          r.status === "completed" ||
          r.status === "no_show" ||
          r.status === "declined" ||
          r.status === "cancelled"
      );
    }

    if (resSearchQuery.trim()) {
      const q = resSearchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.customer_name?.toLowerCase().includes(q) ||
          r.customer_phone?.toLowerCase().includes(q) ||
          r.reservation_number?.toLowerCase().includes(q) ||
          r.seating_preference?.toLowerCase().includes(q) ||
          r.special_notes?.toLowerCase().includes(q) ||
          r.reservation_date?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      if (a.status === "confirmed" && b.status !== "confirmed") return -1;
      if (a.status !== "confirmed" && b.status === "confirmed") return 1;
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }, [reservations, resFilterTab, resSearchQuery]);

  // Operational Action Counter
  const pendingOrdersCount = orders.filter((o) => o.status === "placed").length;
  const totalActionCount = pendingOrdersCount + pendingReservationsCount;

  const availableMenuItemsCount = menuItems.filter((item) => item.available).length;
  const soldOutMenuItemsCount = menuItems.length - availableMenuItemsCount;

  // Customer Reviews & Feedback Computations
  const canViewReviews = canStoreViewCustomerReviews(store?.subscription_tier);

  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      if (reviewFilterTab === "5" && rev.foodRating !== 5) return false;
      if (reviewFilterTab === "4" && rev.foodRating !== 4) return false;
      if (reviewFilterTab === "critical" && rev.foodRating > 3) return false;

      if (reviewSearchQuery.trim()) {
        const q = reviewSearchQuery.trim().toLowerCase();
        const matchText = (rev.reviewText || "").toLowerCase().includes(q);
        const matchCustomer = rev.customerName.toLowerCase().includes(q);
        return matchText || matchCustomer;
      }
      return true;
    });
  }, [reviews, reviewFilterTab, reviewSearchQuery]);

  const subscriptionSummary = useMemo(
    () =>
      resolveStoreSubscriptionSummary({
        subscriptionTier: store?.subscription_tier,
        subscriptionStatus: store?.subscription_status,
        trialStartedAt: store?.trial_started_at,
        trialEndsAt: store?.trial_ends_at,
        subscribedAt: store?.subscribed_at,
      }),
    [
      store?.subscription_tier,
      store?.subscription_status,
      store?.trial_started_at,
      store?.trial_ends_at,
      store?.subscribed_at,
    ]
  );

  const handleToggleOpen = async () => {
    if (!storeId) return;
    const nextStatus = !isOpen;
    setIsOpen(nextStatus);
    setTogglingOpen(true);
    const res = await updateStoreOpenStatus(storeId, nextStatus);
    setTogglingOpen(false);
    if (!res.success) {
      setIsOpen(!nextStatus);
      setBanner({
        type: "error",
        message: `Failed to update store status: ${res.error || "Unknown error"}`,
      });
    } else {
      setBanner({
        type: "success",
        message: `Store is now marked as ${nextStatus ? "OPEN" : "CLOSED"}.`,
      });
    }
  };

  const handleOrderStatusUpdate = async (
    orderId: string,
    nextStatus: OrderStatus,
    notes?: string
  ) => {
    if (!storeId) return;
    setProcessingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus, "merchant", notes);
      const updated = await fetchStoreOrders(storeId);
      setOrders(updated);
      if (nextStatus === "cancelled") {
        setBanner({
          type: "success",
          message: "Order declined and customer notified with reason.",
        });
      }
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Could not update order status: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRebroadcast = async (orderId: string) => {
    if (!storeId) return;
    setProcessingOrderId(orderId);
    try {
      await merchantRebroadcastOrder(orderId);
      setBanner({
        type: "success",
        message: "Dispatch re-broadcasted. Nearby couriers can now claim this order.",
      });
      const updated = await fetchStoreOrders(storeId);
      setOrders(updated);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Failed to re-broadcast: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleConfirmRemittance = async (orderId: string, foodAmount: number) => {
    if (!storeId) return;
    setConfirmingRemittanceId(orderId);
    try {
      const label = store?.name || "Merchant";
      await confirmCodRemittance(orderId, label);
      setBanner({
        type: "success",
        message: `₱${foodAmount.toFixed(2)} courier food cash confirmed as remitted to ${label}.`,
      });
      const updated = await fetchStoreOrders(storeId);
      setOrders(updated);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Failed to confirm COD remittance: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setConfirmingRemittanceId(null);
    }
  };

  const handleReservationUpdate = async (
    resId: string,
    nextStatus: ReservationStatus,
    storeNotes?: string
  ) => {
    if (!storeId) return;
    setProcessingResId(resId);
    try {
      await updateReservationStatus(resId, nextStatus, storeNotes, "merchant");
      const updated = await fetchStoreReservations(storeId);
      setReservations(updated);
      setBanner({
        type: "success",
        message:
          nextStatus === "confirmed"
            ? "Table reservation confirmed. The customer has been notified live."
            : nextStatus === "declined"
              ? "Reservation declined with your explanation sent to the customer."
              : "Reservation status updated.",
      });
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Could not update reservation: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingResId(null);
    }
  };

  const openDeclineReservationModal = (reservation: ReservationRow) => {
    setDecliningReservation(reservation);
    setDeclineReason("");
    setDeclineReasonError(null);
  };

  const handleConfirmDeclineReservation = async () => {
    if (!decliningReservation) return;
    const err = validateReservationDeclineNote(declineReason);
    if (err) {
      setDeclineReasonError(err);
      return;
    }

    const cleanNote = filterReservationDeclineNoteInput(declineReason).trim();
    const targetId = decliningReservation.id;
    await handleReservationUpdate(targetId, "declined", cleanNote);
    setDecliningReservation(null);
    setDeclineReason("");
    setDeclineReasonError(null);
  };

  const handleConfirmDeclineOrder = async () => {
    if (!decliningOrder) return;
    const cleanCustom = customOrderDeclineText.trim();
    const reasonText =
      selectedOrderDeclineReason === "Other reason"
        ? cleanCustom || "Store unable to fulfill order at this time"
        : cleanCustom
          ? `${selectedOrderDeclineReason}: ${cleanCustom}`
          : selectedOrderDeclineReason;

    await handleOrderStatusUpdate(
      decliningOrder.id,
      "cancelled",
      `[Store Declined: ${reasonText}]`
    );
    setDecliningOrder(null);
    setSelectedOrderDeclineReason(ORDER_DECLINE_REASONS[0]);
    setCustomOrderDeclineText("");
  };

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Header */}
      <View className="mb-5 flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <View>
          <View className="flex-row items-center gap-2 mb-0.5 flex-wrap">
            <Text className="text-[10px] font-bold text-[#EA5410] uppercase tracking-wider">
              Store Overview
            </Text>
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-emerald-700">Live Kitchen</Text>
            </View>
            <Link href="/(web)/dashboard/billing" asChild>
              <Pressable
                className={`px-2 py-0.5 rounded-full border cursor-pointer ${
                  subscriptionSummary.isTrialExpired
                    ? "bg-rose-50 border-rose-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    subscriptionSummary.isTrialExpired ? "text-rose-700" : "text-[#EA5410]"
                  }`}
                >
                  {subscriptionSummary.shortBadgeLabel}
                </Text>
              </Pressable>
            </Link>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            {store?.name || "Store Dashboard"}
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            {store?.barangay ? `${store.barangay}, Mati City` : "Mati City"} • Operating hours:{" "}
            {store?.operating_hours || store?.hours || "07:00 AM – 08:00 PM"}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Toggle store open or closed status"
            accessibilityState={{ checked: isOpen }}
            onPress={handleToggleOpen}
            disabled={togglingOpen || !storeId || subscriptionSummary.isTemporarilyOffline}
            className={`h-9 pl-2.5 pr-3 rounded-xl flex-row items-center gap-2.5 border transition-colors cursor-pointer ${
              subscriptionSummary.isTemporarilyOffline
                ? "bg-gray-100 border-gray-300 opacity-60"
                : isOpen
                  ? "bg-emerald-50 border-emerald-300 hover:bg-emerald-100/80"
                  : "bg-rose-50 border-rose-300 hover:bg-rose-100/80"
            }`}
          >
            <View
              className={`w-9 h-5 rounded-full p-0.5 flex-row items-center ${
                subscriptionSummary.isTemporarilyOffline
                  ? "bg-gray-400 justify-start"
                  : isOpen ? "bg-emerald-600 justify-end" : "bg-rose-400 justify-start"
              }`}
            >
              <View className="w-4 h-4 rounded-full bg-white shadow-2xs" />
            </View>
            <View>
              <Text
                className={`text-[11px] font-bold leading-tight ${
                  subscriptionSummary.isTemporarilyOffline
                    ? "text-gray-700"
                    : isOpen ? "text-emerald-900" : "text-rose-800"
                }`}
              >
                {togglingOpen
                  ? "Updating..."
                  : subscriptionSummary.isTemporarilyOffline
                    ? "Temporarily Offline"
                    : isOpen ? "Store Open" : "Store Closed"}
              </Text>
              <Text
                className={`text-[9px] font-medium leading-tight ${
                  subscriptionSummary.isTemporarilyOffline
                    ? "text-gray-500"
                    : isOpen ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {subscriptionSummary.isTemporarilyOffline
                  ? "Subscription Expired"
                  : isOpen ? "Tap to pause" : "Tap to open"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle kitchen alert chime"
            onPress={() => {
              const next = !chimeEnabled;
              setChimeEnabled(next);
              chimeEnabledRef.current = next;
              if (next) playKitchenChimeAudio();
            }}
            className={`h-9 px-3 rounded-xl flex-row items-center gap-1.5 border transition-colors cursor-pointer ${
              chimeEnabled
                ? "bg-amber-50 border-amber-300 hover:bg-amber-100/80"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
          >
            <Ionicons
              name={chimeEnabled ? "notifications" : "notifications-off-outline"}
              size={13}
              color={chimeEnabled ? "#D97706" : "#6B7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                chimeEnabled ? "text-amber-900" : "text-gray-600"
              }`}
            >
              {chimeEnabled ? "Chime ON" : "Chime Muted"}
            </Text>
          </Pressable>

          <Link href="/(web)/dashboard/menu" asChild>
            <Pressable className="h-9 bg-[#EA5410] px-3.5 rounded-xl hover:bg-[#D04508] transition-colors shadow-2xs flex-row items-center gap-1.5 cursor-pointer">
              <Ionicons name="add" size={14} color="white" />
              <Text className="text-white font-bold text-[11px]">Manage Menu</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Subscription Grace Period / Offline Notice Banner */}
      {(subscriptionSummary.isGracePeriod || subscriptionSummary.isTemporarilyOffline) && (
        <View
          className={`mb-4 p-3.5 rounded-xl border flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            subscriptionSummary.isTemporarilyOffline
              ? "bg-rose-50 border-rose-300"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <View className="flex-row items-start gap-2.5 flex-1">
            <Ionicons
              name={subscriptionSummary.isTemporarilyOffline ? "alert-circle" : "warning"}
              size={18}
              color={subscriptionSummary.isTemporarilyOffline ? "#E11D48" : "#D97706"}
              style={{ marginTop: 1 }}
            />
            <View className="flex-1">
              <Text
                className={`text-xs font-bold ${
                  subscriptionSummary.isTemporarilyOffline ? "text-rose-900" : "text-amber-900"
                }`}
              >
                {subscriptionSummary.headline}
              </Text>
              <Text
                className={`text-[11px] mt-0.5 leading-relaxed ${
                  subscriptionSummary.isTemporarilyOffline ? "text-rose-800" : "text-amber-800"
                }`}
              >
                {subscriptionSummary.detailMessage}
              </Text>
            </View>
          </View>
          <Link href="/(web)/dashboard/billing" asChild>
            <Pressable
              className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 shrink-0 cursor-pointer ${
                subscriptionSummary.isTemporarilyOffline
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-[#EA5410] hover:bg-[#D04508]"
              }`}
            >
              <Ionicons
                name={subscriptionSummary.isTemporarilyOffline ? "refresh" : "arrow-up-circle-outline"}
                size={13}
                color="white"
              />
              <Text className="text-white font-bold text-[11px]">
                {subscriptionSummary.isTemporarilyOffline ? "Reactivate Store Now" : "Choose a Plan"}
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Realtime Kitchen & Table Action Needed Banner */}
      {totalActionCount > 0 && (
        <View className="mb-4 p-3.5 rounded-xl border border-amber-300 bg-amber-50 shadow-2xs flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <View className="flex-row items-center gap-2.5 flex-1">
            <View className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 items-center justify-center shrink-0">
              <Ionicons name="notifications" size={16} color="#D97706" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-amber-950">
                  {totalActionCount} Operational {totalActionCount === 1 ? "Action" : "Actions"} Require Attention
                </Text>
                <View className="bg-amber-200/90 px-2 py-0.5 rounded-full">
                  <Text className="text-[9px] font-bold text-amber-900 uppercase">Live</Text>
                </View>
              </View>
              <Text className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                {pendingOrdersCount > 0 ? `${pendingOrdersCount} new customer order${pendingOrdersCount === 1 ? "" : "s"} waiting for acceptance` : ""}
                {pendingOrdersCount > 0 && pendingReservationsCount > 0 ? " • " : ""}
                {pendingReservationsCount > 0 ? `${pendingReservationsCount} table reservation request${pendingReservationsCount === 1 ? "" : "s"} awaiting approval` : ""}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* KPI Stats Grid */}
      <View className="flex-row flex-wrap gap-3.5 mb-5">
        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Today's Orders
            </Text>
            <View className="w-7 h-7 rounded-lg bg-orange-50 items-center justify-center">
              <Ionicons name="receipt-outline" size={14} color="#EA5410" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">
            {metrics?.orders_today ?? orders.length} Orders
          </Text>
          <Text className="text-emerald-600 font-semibold text-[11px] mt-1">
            {activeOrders.length} active in kitchen
          </Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Today's Gross Sales
            </Text>
            <View className="w-7 h-7 rounded-lg bg-emerald-50 items-center justify-center">
              <Ionicons name="cash-outline" size={14} color="#047857" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">
            ₱{((metrics?.gross_sales_centavos ?? 0) / 100).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text className="text-gray-500 font-medium text-[11px] mt-1">
            100% Cash on Delivery
          </Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Dine-In Bookings
            </Text>
            <View className="w-7 h-7 rounded-lg bg-blue-50 items-center justify-center">
              <Ionicons name="calendar-outline" size={14} color="#2563EB" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">
            {reservations.length} Bookings
          </Text>
          <Text className="text-blue-600 font-semibold text-[11px] mt-1">
            {occupiedTables} / {totalTables} tables occupied ({availableTables} free)
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (typeof document !== "undefined") {
              const el = document.getElementById("customer-reviews-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Customer Rating
            </Text>
            <View className="w-7 h-7 rounded-lg bg-amber-50 items-center justify-center">
              <Ionicons name="star" size={14} color="#F59E0B" />
            </View>
          </View>
          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">
              {(detailedRating.totalReviews > 0
                ? detailedRating.averageRating
                : Number(store?.rating || 5.0)
              ).toFixed(1)}
            </Text>
            <Text className="text-amber-500 font-bold text-base">★</Text>
          </View>
          <Text className="text-gray-500 font-medium text-[11px] mt-1">
            {detailedRating.totalReviews || store?.reviews || 0}{" "}
            {(detailedRating.totalReviews || store?.reviews || 0) === 1 ? "review" : "reviews"} by Mati diners
          </Text>
        </Pressable>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Menu Availability
            </Text>
            <View className="w-7 h-7 rounded-lg bg-purple-50 items-center justify-center">
              <Ionicons name="fast-food-outline" size={14} color="#7C3AED" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">
            {menuItems.length} {menuItems.length === 1 ? "Item" : "Items"}
          </Text>
          <Text className="text-emerald-600 font-semibold text-[11px] mt-1">
            {availableMenuItemsCount} available • {soldOutMenuItemsCount} sold out
          </Text>
        </View>
      </View>

      {/* Main Grid: Live Orders + Menu Highlights */}
      <View className="flex-col xl:flex-row gap-4 w-full mb-5">
        {/* Recent Orders / Kitchen Queue Widget */}
        <View className="flex-[2] bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden">
          <View className="px-5 py-3.5 border-b border-gray-100">
            <View className="flex-row flex-wrap justify-between items-center gap-2 mb-2.5">
              <View>
                <Text className="text-sm font-bold text-gray-900">Live Kitchen Queue</Text>
                <Text className="text-[11px] text-gray-400">
                  Incoming Cash on Delivery orders in Mati City
                </Text>
              </View>
              <View className="bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-[#EA5410] uppercase">
                  {activeOrders.length} Active
                </Text>
              </View>
            </View>

            {/* Filter Pills & Quick Search */}
            <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              <View className="flex-row items-center gap-1 flex-wrap">
                {(
                  [
                    { key: "active", label: `Active (${activeOrders.length})` },
                    { key: "completed", label: `Completed (${completedOrders.length})` },
                    { key: "remittance", label: `Pending Cash (${pendingRemittanceOrders.length})` },
                    { key: "cancelled", label: `Cancelled (${cancelledOrders.length})` },
                    { key: "all", label: `All (${orders.length})` },
                  ] as const
                ).map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => setOrderFilterTab(tab.key)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      orderFilterTab === tab.key
                        ? tab.key === "remittance"
                          ? "bg-amber-600"
                          : "bg-[#EA5410]"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        orderFilterTab === tab.key ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Quick Search Input */}
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 sm:w-48">
                <Ionicons name="search-outline" size={12} color="#9CA3AF" />
                <TextInput
                  value={orderSearchQuery}
                  onChangeText={setOrderSearchQuery}
                  placeholder="Search orders..."
                  placeholderTextColor="#9CA3AF"
                  className="ml-1.5 text-xs text-gray-800 flex-1 outline-none p-0"
                />
                {orderSearchQuery ? (
                  <Pressable onPress={() => setOrderSearchQuery("")} className="cursor-pointer">
                    <Ionicons name="close-circle" size={12} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Courier Cash Remittance Notice Banner */}
            {pendingRemittanceOrders.length > 0 && orderFilterTab !== "remittance" && (
              <View className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Ionicons name="cash" size={16} color="#D97706" />
                  <Text className="text-xs font-bold text-amber-900 flex-1">
                    {pendingRemittanceOrders.length} COD {pendingRemittanceOrders.length === 1 ? "delivery has" : "deliveries have"} ₱{pendingRemittanceTotal.toFixed(2)} courier cash awaiting cashier confirmation
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOrderFilterTab("remittance")}
                  className="bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <Text className="text-[10px] font-bold text-white">Review & Settle</Text>
                </Pressable>
              </View>
            )}
          </View>

          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color="#EA5410" />
              <Text className="text-[11px] text-gray-400 mt-2">Loading live kitchen orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Ionicons name="receipt-outline" size={28} color="#CBD5E1" />
              <Text className="text-gray-700 font-bold text-xs mt-2.5">
                {orderSearchQuery
                  ? "No matching orders found"
                  : orderFilterTab === "active"
                    ? "No active orders in the kitchen"
                    : orderFilterTab === "remittance"
                      ? "No pending courier cash remittances to settle"
                    : orderFilterTab === "completed"
                      ? "No completed orders yet today"
                      : orderFilterTab === "cancelled"
                        ? "No cancelled orders"
                        : "No orders received yet today"}
              </Text>
              <Text className="text-gray-400 text-[11px] mt-0.5">
                {orderSearchQuery
                  ? "Try searching by order #, customer, barangay, or dish name"
                  : "New customer orders will appear here automatically in real time"}
              </Text>
            </View>
          ) : (
            <ScrollView className="max-h-[460px]">
              {filteredOrders.map((order) => {
                const token = getOrderStatusTheme(order.status);
                const itemsSummary =
                  order.items?.map((i: LiveOrderItem) => `${i.quantity}x ${i.name}`).join(", ") ||
                  "Order items";
                const isProcessing = processingOrderId === order.id;

                return (
                  <View
                    key={order.id}
                    className="px-5 py-3.5 border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
                  >
                    <Pressable
                      onPress={() => setViewingTicketOrder(order)}
                      className="cursor-pointer"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3 min-w-0">
                          <View className="flex-row items-center gap-2 mb-0.5 flex-wrap">
                            <Text className="font-bold text-gray-900 text-xs">{order.orderNumber}</Text>
                            <Text className="text-[10px] text-gray-400 font-medium">
                              •{" "}
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                            {order.isRebroadcast && (
                              <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                                <Text className="text-[9px] font-bold text-amber-900 uppercase">
                                  Re-broadcast
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs font-semibold text-gray-800" numberOfLines={2}>
                            {itemsSummary}
                          </Text>
                          <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                            {order.deliveryAddress || `Barangay ${order.barangay}`}
                            {order.customerPhone ? ` • ${order.customerPhone}` : ""}
                          </Text>

                          {/* Customer Cooking / Special Instruction Callout */}
                          {order.notes && order.status !== "cancelled" ? (
                            <View className="mt-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg flex-row items-center gap-1.5 self-start">
                              <Ionicons name="chatbubble-ellipses-outline" size={11} color="#B45309" />
                              <Text className="text-[10px] text-amber-900 font-semibold" numberOfLines={1}>
                                Note: {order.notes}
                              </Text>
                            </View>
                          ) : null}

                          {/* Decline Reason Callout */}
                          {order.status === "cancelled" && order.notes ? (
                            <View className="mt-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1.5 self-start">
                              <Ionicons name="alert-circle-outline" size={11} color="#E11D48" />
                              <Text className="text-[10px] text-rose-800 font-semibold" numberOfLines={1}>
                                {order.notes.startsWith("[Store Declined:")
                                  ? order.notes.replace("[Store Declined:", "Reason:").replace(/\]$/, "")
                                  : `Reason: ${order.notes}`}
                              </Text>
                            </View>
                          ) : null}

                          {order.riderName && (
                            <Text className="text-[11px] text-indigo-700 font-medium mt-0.5">
                              Courier: {order.riderName} {order.riderPhone ? `(${order.riderPhone})` : ""}
                            </Text>
                          )}
                          {order.podImageUrl && (
                            <View className="flex-row items-center gap-1 mt-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg self-start">
                              <Ionicons name="camera" size={11} color="#047857" />
                              <Text className="text-[10px] font-semibold text-emerald-800">
                                Drop-off photo on file
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className="items-end shrink-0">
                          <Text className="font-bold text-[#EA5410] text-sm mb-1 tabular-nums">
                            ₱{order.total.toFixed(2)}
                          </Text>
                          <View className={`px-2 py-0.5 rounded-full ${token.badgeBg}`}>
                            <Text className={`text-[9px] font-bold uppercase tracking-wider ${token.badgeText}`}>
                              {token.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>

                    {/* Operational Action Buttons */}
                    <View className="flex-row flex-wrap justify-between items-center gap-1.5 mt-3 pt-2.5 border-t border-gray-100">
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        {order.status === "placed" && (
                          <>
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => handleOrderStatusUpdate(order.id, "accepted")}
                              className="h-7 bg-[#EA5410] hover:bg-[#D04508] px-3 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Ionicons name="checkmark-circle" size={12} color="white" />
                              <Text className="text-[11px] font-bold text-white">Accept Order</Text>
                            </Pressable>
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => {
                                setDecliningOrder(order);
                                setSelectedOrderDeclineReason(ORDER_DECLINE_REASONS[0]);
                                setCustomOrderDeclineText("");
                              }}
                              className="h-7 bg-gray-100 hover:bg-gray-200 px-2.5 rounded-lg flex-row items-center gap-1 cursor-pointer"
                            >
                              <Ionicons name="close-circle" size={12} color="#6B7280" />
                              <Text className="text-[11px] font-semibold text-gray-700">Decline</Text>
                            </Pressable>
                          </>
                        )}

                        {order.status === "accepted" && (
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleOrderStatusUpdate(order.id, "preparing")}
                            className="h-7 bg-orange-500 hover:bg-orange-600 px-3 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Ionicons name="restaurant" size={12} color="white" />
                            <Text className="text-[11px] font-bold text-white">Start Cooking</Text>
                          </Pressable>
                        )}

                        {order.status === "preparing" && (
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleOrderStatusUpdate(order.id, "ready_for_pickup")}
                            className="h-7 bg-purple-600 hover:bg-purple-700 px-3 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Ionicons name="cube" size={12} color="white" />
                            <Text className="text-[11px] font-bold text-white">Mark Ready for Pickup</Text>
                          </Pressable>
                        )}

                        {order.status === "ready_for_pickup" && (
                          <>
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => handleOrderStatusUpdate(order.id, "out_for_delivery")}
                              className="h-7 bg-indigo-600 hover:bg-indigo-700 px-3 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Ionicons name="bicycle" size={12} color="white" />
                              <Text className="text-[11px] font-bold text-white">Hand to Rider</Text>
                            </Pressable>
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => handleRebroadcast(order.id)}
                              className="h-7 bg-amber-50 hover:bg-amber-100 px-2.5 rounded-lg flex-row items-center gap-1 border border-amber-200 cursor-pointer"
                            >
                              <Ionicons name="megaphone" size={12} color="#B45309" />
                              <Text className="text-[11px] font-semibold text-amber-900">
                                Re-broadcast Courier
                              </Text>
                            </Pressable>
                          </>
                        )}

                        {order.status === "out_for_delivery" && (
                          <View className="flex-row items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                            <Ionicons name="navigate" size={12} color="#4338CA" />
                            <Text className="text-[11px] font-semibold text-indigo-900">
                              Dispatched with {order.riderName || "courier"}
                            </Text>
                          </View>
                        )}

                        {order.status === "delivered" && (
                          <View className="flex-row items-center gap-1.5 flex-wrap">
                            <View className="flex-row items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <Ionicons name="checkmark-done" size={12} color="#047857" />
                              <Text className="text-[11px] font-semibold text-emerald-800">
                                Delivered
                              </Text>
                            </View>
                            {order.paymentMethod === "cod" || !order.paymentMethod ? (
                              order.isRemitted ? (
                                <View className="flex-row items-center gap-1 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg">
                                  <Ionicons name="checkmark-circle" size={12} color="#065F46" />
                                  <Text className="text-[10px] font-bold text-emerald-800">
                                    Cash Remitted ✓
                                  </Text>
                                </View>
                              ) : (
                                <Pressable
                                  disabled={confirmingRemittanceId === order.id}
                                  onPress={() =>
                                    handleConfirmRemittance(
                                      order.id,
                                      order.subtotal || Math.max(0, order.total - (order.deliveryFee || 35))
                                    )
                                  }
                                  className="h-7 bg-amber-500 hover:bg-amber-600 px-2.5 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                >
                                  {confirmingRemittanceId === order.id ? (
                                    <ActivityIndicator size="small" color="white" />
                                  ) : (
                                    <Ionicons name="cash" size={12} color="white" />
                                  )}
                                  <Text className="text-[11px] font-bold text-white">
                                    Confirm Cash Received (₱{(order.subtotal || Math.max(0, order.total - (order.deliveryFee || 35))).toFixed(2)})
                                  </Text>
                                </Pressable>
                              )
                            ) : null}
                          </View>
                        )}
                      </View>

                      {/* View Chit Ticket Button */}
                      <Pressable
                        onPress={() => setViewingTicketOrder(order)}
                        className="h-7 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex-row items-center gap-1 cursor-pointer"
                      >
                        <Ionicons name="receipt-outline" size={11} color="#4B5563" />
                        <Text className="text-[10px] font-bold text-gray-700">View Chit</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Menu Highlights Widget */}
        <View className="flex-1 bg-white rounded-2xl shadow-2xs border border-gray-200/80 p-4 sm:p-5 flex-col justify-between">
          <View>
            <Text className="text-sm font-bold text-gray-900 mb-0.5">Store Menu Highlights</Text>
            <Text className="text-[11px] text-gray-400 mb-4">Menu items listed for diners in Mati</Text>

            {loading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color="#EA5410" />
              </View>
            ) : menuItems.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Ionicons name="restaurant-outline" size={24} color="#CBD5E1" />
                <Text className="text-xs font-semibold text-gray-600 mt-2">
                  No menu items added yet
                </Text>
                <Text className="text-[11px] text-gray-400 text-center mt-0.5">
                  Add items in Menu Manager to appear in Mati discovery.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {menuItems.slice(0, 5).map((item, idx) => (
                  <View
                    key={item.id}
                    className="flex-row justify-between items-center pb-2.5 border-b border-gray-100"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 min-w-0 pr-2">
                      <Text className="w-5 text-xs font-bold text-[#EA5410] tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </Text>
                      <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-gray-900 text-xs" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-[11px] text-gray-400 tabular-nums">
                          ₱{item.price.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        item.available ? "bg-emerald-50" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase ${
                          item.available ? "text-emerald-700" : "text-gray-500"
                        }`}
                      >
                        {item.available ? "Available" : "Sold Out"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Link href="/(web)/dashboard/menu" asChild>
            <Pressable className="mt-4 h-9 bg-gray-50 border border-gray-200 rounded-xl items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
              <Text className="text-[11px] font-bold text-gray-700">View Full Menu Catalog</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Table Bookings Section */}
      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 p-4 sm:p-5 mb-6">
        <View className="pb-3.5 border-b border-gray-100 mb-4">
          <View className="flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-3">
            <View>
              <Text className="text-sm font-bold text-gray-900">Dine-in Table Bookings</Text>
              <Text className="text-[11px] text-gray-400">
                Manage table requests, guest seatings, and live dining table occupancy
              </Text>
            </View>
            <View className="flex-row flex-wrap items-center gap-2 shrink-0">
              {/* Table Occupancy Progress Pill */}
              <View
                className={`border px-2.5 py-1 rounded-lg flex-row items-center gap-2 ${
                  availableTables === 0
                    ? "bg-rose-50 border-rose-200"
                    : occupiedTables > 0
                      ? "bg-blue-50 border-blue-200"
                      : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <View className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <View
                    className={`h-full rounded-full ${
                      availableTables === 0 ? "bg-rose-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </View>
                <Text
                  className={`text-[11px] font-bold ${
                    availableTables === 0
                      ? "text-rose-800"
                      : occupiedTables > 0
                        ? "text-blue-900"
                        : "text-emerald-800"
                  }`}
                >
                  {occupiedTables}/{totalTables} Tables Booked ({availableTables} Free)
                </Text>
              </View>

              <Pressable
                disabled={!storeId}
                onPress={() => setQrModalVisible(true)}
                className="h-8 px-3 rounded-lg bg-gray-900 hover:bg-black flex-row items-center gap-1.5 cursor-pointer"
              >
                <Ionicons name="qr-code-outline" size={13} color="white" />
                <Text className="text-[11px] font-bold text-white">Print Table QR</Text>
              </Pressable>
            </View>
          </View>

          {/* Filter Segment Tabs & Search */}
          <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-gray-100">
            <View className="flex-row items-center gap-1 flex-wrap">
              {(
                [
                  { key: "all", label: `All (${reservations.length})` },
                  { key: "pending", label: `Pending (${pendingReservationsCount})` },
                  { key: "confirmed", label: `Confirmed (${confirmedReservationsCount})` },
                  { key: "completed", label: `Past (${pastReservationsCount})` },
                ] as const
              ).map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setResFilterTab(tab.key)}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    resFilterTab === tab.key
                      ? "bg-[#EA5410]"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      resFilterTab === tab.key ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Quick Search for Diners */}
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 sm:w-48">
              <Ionicons name="search-outline" size={12} color="#9CA3AF" />
              <TextInput
                value={resSearchQuery}
                onChangeText={setResSearchQuery}
                placeholder="Search bookings..."
                placeholderTextColor="#9CA3AF"
                className="ml-1.5 text-xs text-gray-800 flex-1 outline-none p-0"
              />
              {resSearchQuery ? (
                <Pressable onPress={() => setResSearchQuery("")} className="cursor-pointer">
                  <Ionicons name="close-circle" size={12} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {filteredReservations.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Ionicons name="calendar-outline" size={28} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-xs mt-2.5">
              {resSearchQuery
                ? "No matching table bookings found"
                : resFilterTab === "pending"
                  ? "No pending bookings awaiting approval"
                  : resFilterTab === "confirmed"
                    ? "No confirmed tables today"
                    : resFilterTab === "completed"
                      ? "No completed past bookings"
                      : "No table bookings yet today"}
            </Text>
            <Text className="text-gray-400 text-[11px] mt-0.5">
              {resSearchQuery
                ? "Try searching by customer name, phone, or reservation number"
                : "Guest reservation requests from diners across Mati City will appear here in real time"}
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {filteredReservations.map((res) => {
              const resToken = getReservationStatusTheme(res.status);
              const isPending = res.status === "pending";
              const isConfirmed = res.status === "confirmed";
              const isProcessing = processingResId === res.id;

              return (
                <View
                  key={res.id}
                  className={`p-3.5 rounded-xl border transition-colors flex-col md:flex-row justify-between items-start md:items-center gap-2.5 ${
                    isPending
                      ? "border-amber-300 bg-amber-50/30"
                      : "border-gray-200/90 hover:bg-gray-50/60"
                  }`}
                >
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-0.5 flex-wrap">
                      <Text className="font-bold text-gray-900 text-xs">
                        {res.customer_name || "Guest Diner"}
                      </Text>
                      <Text className="text-[11px] text-gray-500 font-semibold">
                        • Party of {res.party_size}
                      </Text>
                      <View className={`px-2 py-0.5 rounded ${resToken.badgeBg}`}>
                        <Text className={`text-[9px] font-bold uppercase ${resToken.badgeText}`}>
                          {resToken.label}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-gray-500">
                      {formatReservationDate(res.reservation_date)} at {res.reservation_time} •
                      Seating: {res.seating_preference || "Standard"}
                      {res.customer_phone ? ` • ${res.customer_phone}` : ""}
                    </Text>
                    {res.special_notes ? (
                      <Text className="text-[11px] text-gray-600 italic mt-1 bg-gray-50 p-2 rounded-lg">
                        Guest note: "{res.special_notes}"
                      </Text>
                    ) : null}
                    {res.store_notes ? (
                      <Text className="text-[11px] text-rose-700 font-medium mt-1 bg-rose-50/80 border border-rose-200/80 p-2 rounded-lg">
                        Store reply: {res.store_notes}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View className="flex-row flex-wrap gap-1.5">
                    {isPending && (
                      <>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => void handleReservationUpdate(res.id, "confirmed")}
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 px-3 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Ionicons name="checkmark" size={12} color="white" />
                          <Text className="text-[11px] font-bold text-white">Approve Table</Text>
                        </Pressable>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => openDeclineReservationModal(res)}
                          className="h-7 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2.5 rounded-lg flex-row items-center gap-1 cursor-pointer"
                        >
                          <Ionicons name="close" size={12} color="#BE123C" />
                          <Text className="text-[11px] font-semibold text-rose-700">Decline</Text>
                        </Pressable>
                      </>
                    )}

                    {isConfirmed && (
                      <>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => void handleReservationUpdate(res.id, "completed")}
                          className="h-7 bg-blue-600 hover:bg-blue-700 px-3 rounded-lg flex-row items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Ionicons name="restaurant" size={12} color="white" />
                          <Text className="text-[11px] font-bold text-white">Mark as Seated</Text>
                        </Pressable>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => setNoShowConfirmTarget(res)}
                          className="h-7 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2.5 rounded-lg flex-row items-center gap-1 cursor-pointer"
                        >
                          <Ionicons name="alert-circle" size={12} color="#BE123C" />
                          <Text className="text-[11px] font-bold text-rose-800">Mark as No-Show</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Customer Reviews & Reputation Section */}
      <View
        nativeID="customer-reviews-section"
        className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden mb-6"
      >
        <View className="px-5 py-3.5 border-b border-gray-100 flex-row flex-wrap justify-between items-center gap-2">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-gray-900">
                Customer Reviews & Reputation
              </Text>
              {!canViewReviews ? (
                <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <Ionicons name="lock-closed" size={10} color="#D97706" />
                  <Text className="text-[10px] font-bold text-amber-700">
                    Standard & Commercial Feature
                  </Text>
                </View>
              ) : (
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <Ionicons name="shield-checkmark" size={10} color="#059669" />
                  <Text className="text-[10px] font-bold text-emerald-700">
                    Verified Mati Diners
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] text-gray-400 mt-0.5">
              Food quality ratings, customer reviews, and feedback from delivery orders
            </Text>
          </View>

          {/* Quick Rating Pill */}
          <View className="flex-row items-center gap-2 bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-xl">
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text className="text-sm font-extrabold text-gray-900 tabular-nums">
              {(detailedRating.totalReviews > 0
                ? detailedRating.averageRating
                : Number(store?.rating || 5.0)
              ).toFixed(1)}
            </Text>
            <Text className="text-[11px] font-semibold text-gray-500">
              ({detailedRating.totalReviews || store?.reviews || 0}{" "}
              {(detailedRating.totalReviews || store?.reviews || 0) === 1 ? "review" : "reviews"})
            </Text>
          </View>
        </View>

        {!canViewReviews ? (
          /* Gated State for Basic Plan */
          <View className="p-6 relative">
            <View className="opacity-25 blur-[1.5px] pointer-events-none select-none">
              <View className="flex-col md:flex-row gap-4 mb-4">
                <View className="p-4 bg-gray-50 rounded-xl flex-1 border border-gray-100">
                  <Text className="text-2xl font-bold text-gray-900">4.9 ★</Text>
                  <Text className="text-xs text-emerald-600 font-semibold mt-1">
                    98% Positive Customer Sentiment
                  </Text>
                </View>
                <View className="p-4 bg-gray-50 rounded-xl flex-[2] border border-gray-100">
                  <Text className="text-xs font-bold text-gray-700 mb-2">Star Rating Breakdown</Text>
                  <View className="h-2 bg-gray-200 rounded-full w-full mb-1.5" />
                  <View className="h-2 bg-gray-200 rounded-full w-3/4 mb-1.5" />
                  <View className="h-2 bg-gray-200 rounded-full w-1/4" />
                </View>
              </View>
              <View className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 mb-2">
                <Text className="text-xs font-bold text-gray-700">Mati Foodie Diner • 5 ★</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  "Lami kaayo ang pagkadeliver, init pa ang pagkaon ug tarong pagkabalot!"
                </Text>
              </View>
            </View>

            {/* Clear Upgrade Callout Card */}
            <View className="absolute inset-0 items-center justify-center p-6 bg-white/80 backdrop-blur-[1px]">
              <View className="max-w-md w-full bg-white border border-gray-200 shadow-xl rounded-2xl p-5 items-center text-center">
                <View className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 items-center justify-center mb-3 shadow-2xs">
                  <Ionicons name="sparkles" size={24} color="#EA5410" />
                </View>
                <Text className="text-base font-bold text-gray-900 text-center">
                  Detailed Customer Reviews Gated
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-relaxed mt-1.5 mb-4">
                  Your store is currently on the <Text className="font-bold text-gray-800">Basic Plan</Text>. Upgrade to the <Text className="font-bold text-[#EA5410]">Standard Plan (₱299/mo)</Text> or <Text className="font-bold text-[#EA5410]">Commercial Plan</Text> to unlock full customer feedback, dish compliments, rating distributions, and posts shared to the Mati Foodie Feed.
                </Text>
                <Pressable
                  onPress={() => router.push("/dashboard/billing")}
                  className="bg-[#EA5410] hover:bg-[#c9450a] active:scale-95 px-5 py-2.5 rounded-xl shadow-xs flex-row items-center gap-2 cursor-pointer transition-transform"
                >
                  <Ionicons name="arrow-up-circle-outline" size={16} color="white" />
                  <Text className="text-xs font-bold text-white">Upgrade to Standard Plan (₱299/mo)</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* Unlocked State for Standard & Commercial Plans */
          <View className="p-5">
            {/* Top Summary Banner: Overall Average + Star Breakdown */}
            <View className="flex-col lg:flex-row gap-4 mb-5 pb-5 border-b border-gray-100">
              {/* Overall Score Box */}
              <View className="lg:w-64 bg-amber-50/40 border border-amber-200/70 rounded-2xl p-4 items-center justify-center text-center">
                <Text className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  Overall Diner Rating
                </Text>
                <View className="flex-row items-baseline gap-1 my-1">
                  <Text className="text-4xl font-extrabold text-gray-900 tabular-nums">
                    {(detailedRating.totalReviews > 0
                      ? detailedRating.averageRating
                      : Number(store?.rating || 5.0)
                    ).toFixed(1)}
                  </Text>
                  <Text className="text-amber-500 text-2xl font-bold">★</Text>
                </View>

                {/* Star visual icons */}
                <View className="flex-row items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const avg = detailedRating.totalReviews > 0
                      ? detailedRating.averageRating
                      : Number(store?.rating || 5.0);
                    return (
                      <Ionicons
                        key={s}
                        name={avg >= s ? "star" : avg >= s - 0.5 ? "star-half" : "star-outline"}
                        size={16}
                        color="#F59E0B"
                      />
                    );
                  })}
                </View>

                <Text className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  {detailedRating.positivePercentage}% Positive Diners (4-5 ★)
                </Text>
                <Text className="text-[11px] text-gray-500 mt-1.5">
                  Based on {detailedRating.totalReviews || store?.reviews || 0} customer reviews
                </Text>
              </View>

              {/* Star Rating Distribution Bars */}
              <View className="flex-1 bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4 justify-center">
                <Text className="text-xs font-bold text-gray-800 mb-2.5">
                  Rating Distribution Breakdown
                </Text>
                <View className="gap-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = detailedRating.starCounts[star as 1 | 2 | 3 | 4 | 5] || 0;
                    const pct = detailedRating.starPercentages[star as 1 | 2 | 3 | 4 | 5] || 0;
                    return (
                      <View key={star} className="flex-row items-center gap-2">
                        <View className="w-8 flex-row items-center justify-end gap-0.5">
                          <Text className="text-[11px] font-bold text-gray-700">{star}</Text>
                          <Ionicons name="star" size={10} color="#F59E0B" />
                        </View>
                        <View className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <View
                            className={`h-full rounded-full ${
                              star >= 4
                                ? "bg-amber-400"
                                : star === 3
                                ? "bg-amber-300"
                                : "bg-rose-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </View>
                        <View className="w-16 flex-row items-center justify-between">
                          <Text className="text-[11px] font-semibold text-gray-500 tabular-nums">
                            {pct}%
                          </Text>
                          <Text className="text-[11px] font-bold text-gray-700 tabular-nums">
                            ({count})
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Filter Pills + Search Input Bar */}
            <View className="flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4">
              <View className="flex-row flex-wrap gap-1.5">
                {[
                  { id: "all", label: `All (${reviews.length})` },
                  { id: "5", label: `5 ★ (${detailedRating.starCounts[5] || 0})` },
                  { id: "4", label: `4 ★ (${detailedRating.starCounts[4] || 0})` },
                  {
                    id: "critical",
                    label: `3 ★ & Below (${
                      (detailedRating.starCounts[3] || 0) +
                      (detailedRating.starCounts[2] || 0) +
                      (detailedRating.starCounts[1] || 0)
                    })`,
                  },
                ].map((tab) => (
                  <Pressable
                    key={tab.id}
                    onPress={() => setReviewFilterTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer active:scale-95 transition-all ${
                      reviewFilterTab === tab.id
                        ? "bg-amber-500 border-amber-600 text-white shadow-2xs"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        reviewFilterTab === tab.id ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-full sm:w-64 focus-within:border-[#EA5410] focus-within:bg-white">
                <Ionicons name="search" size={14} color="#9CA3AF" />
                <TextInput
                  value={reviewSearchQuery}
                  onChangeText={setReviewSearchQuery}
                  placeholder="Search comments or diners..."
                  placeholderTextColor="#9CA3AF"
                  className="ml-2 text-xs text-gray-900 flex-1 outline-none"
                />
                {reviewSearchQuery ? (
                  <Pressable onPress={() => setReviewSearchQuery("")}>
                    <Ionicons name="close-circle" size={14} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <View className="p-8 items-center justify-center bg-gray-50/50 rounded-2xl border border-gray-100">
                <View className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 items-center justify-center mb-2">
                  <Ionicons name="chatbubbles-outline" size={20} color="#D97706" />
                </View>
                <Text className="text-sm font-bold text-gray-800">
                  {reviews.length === 0
                    ? "No Customer Reviews Yet"
                    : "No Reviews Match Your Filter"}
                </Text>
                <Text className="text-xs text-gray-400 text-center max-w-sm mt-1">
                  {reviews.length === 0
                    ? "When diners complete their delivery or pickup orders, their verified ratings, feedback comments, and compliments will appear here."
                    : "Try selecting another star rating filter or clearing your search term."}
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {filteredReviews.map((rev) => {
                  const initial = (rev.customerName || "M")[0].toUpperCase();
                  const formattedDate = new Date(rev.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <View
                      key={rev.id}
                      className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs hover:border-gray-300 transition-colors"
                    >
                      <View className="flex-row items-start justify-between gap-2 mb-2">
                        <View className="flex-row items-center gap-2.5">
                          <View className="w-8 h-8 rounded-full bg-[#EA5410]/10 border border-[#EA5410]/20 items-center justify-center">
                            <Text className="text-xs font-bold text-[#EA5410]">{initial}</Text>
                          </View>
                          <View>
                            <View className="flex-row items-center gap-1.5">
                              <Text className="text-xs font-bold text-gray-900">
                                {rev.customerName}
                              </Text>
                              <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex-row items-center gap-0.5">
                                <Ionicons name="checkmark-circle" size={10} color="#059669" />
                                <Text className="text-[9px] font-bold text-emerald-700">Verified Order</Text>
                              </View>
                            </View>
                            <Text className="text-[10px] text-gray-400 mt-0.5">
                              {formattedDate}
                            </Text>
                          </View>
                        </View>

                        {/* Stars Pill */}
                        <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          <Text className="text-xs font-bold text-amber-800">
                            {rev.foodRating}.0
                          </Text>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                        </View>
                      </View>

                      {/* Review Comment Text */}
                      {rev.reviewText ? (
                        <Text className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-100 italic">
                          "{rev.reviewText}"
                        </Text>
                      ) : (
                        <Text className="text-[11px] text-gray-400 italic">
                          (Customer rated {rev.foodRating} stars without written comments)
                        </Text>
                      )}

                      {/* Shared to Community Pill */}
                      {rev.postedToCommunity ? (
                        <View className="flex-row items-center gap-1 mt-2.5">
                          <Ionicons name="sparkles" size={12} color="#EA5410" />
                          <Text className="text-[10px] font-semibold text-[#EA5410]">
                            Shared to Mati Foodie Community Feed
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Mark as No-Show Confirmation Modal */}
      <Modal
        visible={noShowConfirmTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingResId) setNoShowConfirmTarget(null);
        }}
      >
        <View className="flex-1 bg-black/55 justify-center items-center p-4">
          {noShowConfirmTarget ? (
            <View className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-5">
              <View className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 items-center justify-center mb-3">
                <Ionicons name="alert-circle" size={22} color="#E11D48" />
              </View>

              <Text className="text-base font-bold text-gray-900 mb-1">
                Confirm Customer No-Show
              </Text>
              <Text className="text-xs text-gray-600 leading-relaxed mb-3">
                Are you sure you want to mark{" "}
                <Text className="font-bold text-gray-900">
                  {noShowConfirmTarget.customer_name || "Guest Diner"}
                </Text>{" "}
                (Party of {noShowConfirmTarget.party_size}) as No-Show for their reservation on{" "}
                <Text className="font-semibold text-gray-800">
                  {formatReservationDate(noShowConfirmTarget.reservation_date)} at{" "}
                  {noShowConfirmTarget.reservation_time}
                </Text>
                ?
              </Text>

              <View className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 mb-4">
                <Text className="text-[11px] font-semibold text-rose-900 leading-snug">
                  ⚠️ This will immediately release their table back to available capacity and record an unfulfilled booking notice.
                </Text>
              </View>

              <View className="flex-row justify-end gap-2 pt-2 border-t border-gray-100">
                <Pressable
                  disabled={Boolean(processingResId)}
                  onPress={() => setNoShowConfirmTarget(null)}
                  className="h-8 px-3.5 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                >
                  <Text className="text-xs font-semibold text-gray-700">Cancel</Text>
                </Pressable>

                <Pressable
                  disabled={Boolean(processingResId)}
                  onPress={async () => {
                    const targetId = noShowConfirmTarget.id;
                    setNoShowConfirmTarget(null);
                    await handleReservationUpdate(targetId, "no_show");
                  }}
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 flex-row items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {processingResId ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="close-circle" size={13} color="white" />
                  )}
                  <Text className="text-xs font-bold text-white">Confirm No-Show</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Decline Reservation Reason Modal */}
      <Modal
        visible={decliningReservation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingResId) setDecliningReservation(null);
        }}
      >
        <View className="flex-1 bg-black/55 justify-center items-center p-4">
          {decliningReservation ? (
            <View className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl p-5">
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-3.5">
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    Decline Table Request
                  </Text>
                  <Text className="text-[11px] text-gray-400">
                    {decliningReservation.customer_name || "Guest Diner"} • Party of{" "}
                    {decliningReservation.party_size} •{" "}
                    {formatReservationDate(decliningReservation.reservation_date)} at{" "}
                    {decliningReservation.reservation_time}
                  </Text>
                </View>
                <Pressable
                  disabled={Boolean(processingResId)}
                  onPress={() => setDecliningReservation(null)}
                  className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center cursor-pointer"
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </Pressable>
              </View>

              <Text className="text-[11px] font-semibold text-gray-700 mb-1.5">
                Quick reasons
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mb-3">
                {RESERVATION_DECLINE_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => {
                      setDeclineReason(preset);
                      setDeclineReasonError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                      declineReason === preset
                        ? "bg-orange-50 border-[#EA5410]"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${
                        declineReason === preset ? "text-[#EA5410]" : "text-gray-600"
                      }`}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[11px] font-semibold text-gray-700">
                  Message to Customer *
                </Text>
                <Text className="text-[10px] text-gray-400 tabular-nums">
                  {declineReason.length}/250
                </Text>
              </View>
              <TextInput
                value={declineReason}
                onChangeText={(text) => {
                  setDeclineReason(filterReservationDeclineNoteInput(text));
                  setDeclineReasonError(null);
                }}
                maxLength={250}
                multiline
                numberOfLines={3}
                placeholder="Explain why this slot or party size cannot be accommodated..."
                placeholderTextColor="#9CA3AF"
                className={`bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-900 h-20 outline-none ${
                  declineReasonError ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                }`}
                textAlignVertical="top"
              />
              {declineReasonError ? (
                <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                  {declineReasonError}
                </Text>
              ) : null}

              <View className="flex-row justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <Pressable
                  disabled={Boolean(processingResId)}
                  onPress={() => setDecliningReservation(null)}
                  className="h-8 px-3.5 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                >
                  <Text className="text-xs font-semibold text-gray-700">Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={Boolean(processingResId)}
                  onPress={() => void handleConfirmDeclineReservation()}
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 flex-row items-center gap-1.5 cursor-pointer"
                >
                  {processingResId ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send-outline" size={13} color="white" />
                  )}
                  <Text className="text-xs font-bold text-white">Send & Decline</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Kitchen Ticket Chit Modal */}
      <Modal
        visible={viewingTicketOrder !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingTicketOrder(null)}
      >
        <View className="flex-1 bg-black/55 justify-center items-center p-4">
          {viewingTicketOrder ? (
            <View className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-2xl overflow-hidden max-h-[90vh]">
              {/* Chit Header */}
              <View className="bg-gray-900 px-5 py-4 flex-row items-center justify-between text-white">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="receipt" size={16} color="#EA5410" />
                    <Text className="text-white text-xs font-bold uppercase tracking-wider">
                      Mati FoodFinder Kitchen Ticket
                    </Text>
                  </View>
                  <Text className="text-white text-base font-extrabold mt-0.5">
                    {viewingTicketOrder.orderNumber}
                  </Text>
                  <Text className="text-gray-400 text-[11px] mt-0.5">
                    Placed: {new Date(viewingTicketOrder.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} • {new Date(viewingTicketOrder.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setViewingTicketOrder(null)}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 items-center justify-center cursor-pointer"
                >
                  <Ionicons name="close" size={18} color="white" />
                </Pressable>
              </View>

              <ScrollView className="p-5">
                {/* Store & Customer Details Box */}
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
                  <View className="flex-row justify-between items-start mb-2 pb-2 border-b border-gray-200">
                    <View>
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Kitchen Storefront
                      </Text>
                      <Text className="text-xs font-bold text-gray-900 mt-0.5">
                        {store?.name || "Merchant Store"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Status
                      </Text>
                      <View className="mt-0.5">
                        <Text className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-[#EA5410]">
                          {viewingTicketOrder.status.replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="grid grid-cols-2 gap-2">
                    <View>
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Customer
                      </Text>
                      <Text className="text-xs font-bold text-gray-800 mt-0.5">
                        {viewingTicketOrder.customerName || "Customer Diner"}
                      </Text>
                      {viewingTicketOrder.customerPhone ? (
                        <Text className="text-[11px] text-gray-600 mt-0.5">
                          📞 {viewingTicketOrder.customerPhone}
                        </Text>
                      ) : null}
                    </View>
                    <View>
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Delivery Destination
                      </Text>
                      <Text className="text-xs font-semibold text-gray-800 mt-0.5">
                        {viewingTicketOrder.deliveryAddress || `Barangay ${viewingTicketOrder.barangay}`}
                      </Text>
                      <Text className="text-[11px] text-gray-500">Mati City</Text>
                    </View>
                  </View>

                  {/* Delivery Handshake PIN */}
                  {viewingTicketOrder.handshakePin ? (
                    <View className="mt-3 pt-2.5 border-t border-gray-200 flex-row items-center justify-between bg-indigo-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl border-t border-indigo-100">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="key-outline" size={14} color="#4338CA" />
                        <Text className="text-xs font-bold text-indigo-950">
                          Handshake Completion PIN
                        </Text>
                      </View>
                      <Text className="text-sm font-extrabold tracking-widest text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 tabular-nums">
                        {viewingTicketOrder.handshakePin}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Special Instructions / Cooking Notes Callout */}
                {viewingTicketOrder.notes && (
                  <View className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row items-start gap-2.5">
                    <Ionicons name="chatbubble-ellipses" size={16} color="#B45309" style={{ marginTop: 1 }} />
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                        Customer Cooking / Hand-off Note
                      </Text>
                      <Text className="text-xs font-semibold text-amber-950 mt-0.5 leading-snug">
                        {viewingTicketOrder.notes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Items List */}
                <View className="mb-4">
                  <View className="flex-row justify-between items-center pb-2 border-b-2 border-gray-900 mb-2">
                    <Text className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wider">
                      Item
                    </Text>
                    <View className="flex-row items-center gap-4">
                      <Text className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wider w-8 text-center">
                        Qty
                      </Text>
                      <Text className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wider w-16 text-right">
                        Price
                      </Text>
                      <Text className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wider w-20 text-right">
                        Amount
                      </Text>
                    </View>
                  </View>

                  {viewingTicketOrder.items?.map((item: LiveOrderItem, idx: number) => {
                    const lineTotal = (item.price || 0) * (item.quantity || 1);
                    return (
                      <View
                        key={idx}
                        className="flex-row justify-between items-center py-2 border-b border-dashed border-gray-200"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-bold text-gray-900">{item.name}</Text>
                        </View>
                        <View className="flex-row items-center gap-4 shrink-0">
                          <Text className="text-xs font-bold text-gray-800 w-8 text-center tabular-nums">
                            {item.quantity}x
                          </Text>
                          <Text className="text-xs text-gray-500 w-16 text-right tabular-nums">
                            ₱{item.price.toFixed(2)}
                          </Text>
                          <Text className="text-xs font-bold text-gray-900 w-20 text-right tabular-nums">
                            ₱{lineTotal.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Pricing Breakdown */}
                <View className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 mb-4">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-gray-600">Subtotal</Text>
                    <Text className="text-xs font-semibold text-gray-900 tabular-nums">
                      ₱{(viewingTicketOrder.items?.reduce((acc, i) => acc + i.price * i.quantity, 0) || viewingTicketOrder.total).toFixed(2)}
                    </Text>
                  </View>
                  {viewingTicketOrder.deliveryFee ? (
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-xs text-gray-600">Delivery Fee (Mati City)</Text>
                      <Text className="text-xs font-semibold text-gray-900 tabular-nums">
                        ₱{viewingTicketOrder.deliveryFee.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  {viewingTicketOrder.discount ? (
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-xs text-emerald-600 font-semibold">Voucher Discount</Text>
                      <Text className="text-xs font-bold text-emerald-700 tabular-nums">
                        -₱{viewingTicketOrder.discount.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  <View className="pt-2 border-t border-gray-200 flex-row justify-between items-center mt-1">
                    <View>
                      <Text className="text-xs font-bold text-gray-900">Total COD Amount</Text>
                      <Text className="text-[10px] text-gray-500 font-medium">Cash on Delivery</Text>
                    </View>
                    <Text className="text-base font-extrabold text-[#EA5410] tabular-nums">
                      ₱{viewingTicketOrder.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Rider Info if assigned */}
                {viewingTicketOrder.riderName ? (
                  <View className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl mb-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="bicycle" size={16} color="#4338CA" />
                      <View>
                        <Text className="text-[10px] font-bold text-indigo-900 uppercase">
                          Assigned Courier
                        </Text>
                        <Text className="text-xs font-bold text-indigo-950">
                          {viewingTicketOrder.riderName}
                        </Text>
                      </View>
                    </View>
                    {viewingTicketOrder.riderPhone ? (
                      <Text className="text-xs font-semibold text-indigo-700">
                        {viewingTicketOrder.riderPhone}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>

              {/* Chit Modal Action Buttons */}
              <View className="p-4 bg-gray-50 border-t border-gray-200 flex-row justify-between items-center gap-2">
                <Pressable
                  onPress={() => {
                    if (Platform.OS === "web" && typeof window !== "undefined") {
                      window.print();
                    }
                  }}
                  className="h-9 px-4 rounded-xl bg-gray-900 hover:bg-black text-white flex-row items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Ionicons name="print-outline" size={14} color="white" />
                  <Text className="text-xs font-bold text-white">Print Chit</Text>
                </Pressable>

                <Pressable
                  onPress={() => setViewingTicketOrder(null)}
                  className="h-9 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 items-center justify-center cursor-pointer"
                >
                  <Text className="text-xs font-bold text-gray-700">Close Ticket</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Order Rejection Modal with Customer Reason */}
      <Modal
        visible={decliningOrder !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingOrderId) setDecliningOrder(null);
        }}
      >
        <View className="flex-1 bg-black/55 justify-center items-center p-4">
          {decliningOrder ? (
            <View className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl p-5">
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-3.5">
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    Decline Order #{decliningOrder.orderNumber}
                  </Text>
                  <Text className="text-[11px] text-gray-400">
                    {decliningOrder.customerName || "Customer"} • ₱{decliningOrder.total.toFixed(2)} COD
                  </Text>
                </View>
                <Pressable
                  disabled={Boolean(processingOrderId)}
                  onPress={() => setDecliningOrder(null)}
                  className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center cursor-pointer"
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </Pressable>
              </View>

              <Text className="text-[11px] font-semibold text-gray-700 mb-1.5">
                Select reason for cancellation:
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mb-3">
                {ORDER_DECLINE_REASONS.map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedOrderDeclineReason(reason)}
                    className={`px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                      selectedOrderDeclineReason === reason
                        ? "bg-rose-50 border-rose-500"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-semibold ${
                        selectedOrderDeclineReason === reason ? "text-rose-700" : "text-gray-700"
                      }`}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="mb-1">
                <Text className="text-[11px] font-semibold text-gray-700 mb-1">
                  Additional Note for Customer (Optional)
                </Text>
                <TextInput
                  value={customOrderDeclineText}
                  onChangeText={setCustomOrderDeclineText}
                  maxLength={200}
                  placeholder={
                    selectedOrderDeclineReason === "Other reason"
                      ? "Please specify the reason for the customer..."
                      : "Optional extra message (e.g. out of chicken wings)..."
                  }
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 h-16 outline-none"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View className="flex-row justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <Pressable
                  disabled={Boolean(processingOrderId)}
                  onPress={() => setDecliningOrder(null)}
                  className="h-8 px-3.5 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                >
                  <Text className="text-xs font-semibold text-gray-700">Keep Order</Text>
                </Pressable>
                <Pressable
                  disabled={Boolean(processingOrderId)}
                  onPress={() => void handleConfirmDeclineOrder()}
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 flex-row items-center gap-1.5 cursor-pointer"
                >
                  {processingOrderId ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="close-circle" size={13} color="white" />
                  )}
                  <Text className="text-xs font-bold text-white">Decline Order</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {storeId ? (
        <PrintableTableQrModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          storeId={storeId}
          storeName={store?.name || "Partner Store"}
        />
      ) : null}
    </View>
  );
}
