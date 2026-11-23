import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSession } from "../../../context/SessionContext";
import {
  fetchStoreById,
  fetchUserStoreId,
  selectMerchantSubscriptionPlan,
  type LiveStoreProfile,
} from "../../../services/catalog";
import {
  calculateCodSettlement,
  confirmCodRemittance,
  fetchStoreOrders,
  type LiveOrder,
} from "../../../services/orders";
import {
  createStoreSubscriptionCheckout,
  verifyStoreSubscriptionPayment,
  fetchStoreSubscriptionInvoices,
  type StoreSubscriptionInvoice,
} from "../../../services/paymongo";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import { ActionSuccessModal } from "../../../components/ui/ActionSuccessModal";
import { SubscriptionConfirmModal } from "../../../components/ui/SubscriptionConfirmModal";
import {
  SUBSCRIPTION_TIERS,
  resolveStoreSubscriptionSummary,
} from "../../../lib/subscription-tiers";
import type { StoreSubscriptionTier } from "../../../types/restaurant";

export default function StoreBilling() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ payment?: string; session_id?: string }>();
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeProfile, setStoreProfile] = useState<LiveStoreProfile | null>(null);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [invoices, setInvoices] = useState<StoreSubscriptionInvoice[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [refreshingBilling, setRefreshingBilling] = useState(false);
  const [updatingTier, setUpdatingTier] = useState<StoreSubscriptionTier | null>(null);
  const [confirmingTier, setConfirmingTier] = useState<typeof SUBSCRIPTION_TIERS[number] | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState("");
  const [pendingConfirmOrderId, setPendingConfirmOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const processedSessionRef = useRef<string | null>(null);

  const loadBillingData = useCallback(
    async (isRefresh = false) => {
      if (!identity?.id) {
        setLoadingBilling(false);
        return;
      }

      if (isRefresh) {
        setRefreshingBilling(true);
      } else {
        setLoadingBilling(true);
      }

      try {
        const targetStoreId = await fetchUserStoreId(identity.id);
        setStoreId(targetStoreId);
        if (!targetStoreId) {
          setOrders([]);
          setInvoices([]);
          setStoreProfile(null);
          return;
        }

        const [fetchedStore, storeOrders, storeInvoices] = await Promise.all([
          fetchStoreById(targetStoreId),
          fetchStoreOrders(targetStoreId),
          fetchStoreSubscriptionInvoices(targetStoreId),
        ]);
        if (fetchedStore) {
          setStoreProfile(fetchedStore);
        }
        setOrders(storeOrders || []);
        setInvoices(storeInvoices || []);
      } catch (err: any) {
        setBanner({
          type: "error",
          message: `Could not load store billing details: ${err?.message || "Unknown error"}`,
        });
      } finally {
        setLoadingBilling(false);
        setRefreshingBilling(false);
      }
    },
    [identity?.id]
  );

  useEffect(() => {
    void loadBillingData(false);
  }, [loadBillingData]);

  // Handle PayMongo return callbacks (?payment=success or ?payment=cancelled)
  useEffect(() => {
    const paymentStatus = searchParams.payment;
    let sessionId = searchParams.session_id;

    if (!sessionId && typeof window !== "undefined") {
      sessionId = window.sessionStorage.getItem("mff_pending_paymongo_session") || undefined;
    }

    if (paymentStatus === "success" && sessionId && processedSessionRef.current !== sessionId) {
      processedSessionRef.current = sessionId;
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("mff_pending_paymongo_session");
      }
      void handleVerifyPayment(sessionId);
    } else if (paymentStatus === "cancelled") {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("mff_pending_paymongo_session");
      }
      setBanner({
        type: "info",
        message: "PayMongo checkout was cancelled. No charges were made to your account.",
      });
      router.replace("/dashboard/billing");
    }
  }, [searchParams.payment, searchParams.session_id]);

  const handleVerifyPayment = async (sessionId: string) => {
    setVerifyingPayment(true);
    setBanner(null);
    try {
      const res = await verifyStoreSubscriptionPayment(sessionId);
      if (res.success && res.status === "paid") {
        const tierName = res.data?.store_subscription_tier || "Selected";
        const method = (res.paymentMethod || "online").toUpperCase();
        setPaymentSuccessMessage(
          `Payment of ₱${res.data?.amount || 0} via ${method} confirmed! Your store has been upgraded to the ${tierName.toUpperCase()} Plan.`
        );
        setShowPaymentSuccessModal(true);
        await loadBillingData(true);
      } else {
        setBanner({
          type: "error",
          message: res.error || "Payment was not completed. Please try again.",
        });
      }
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || "Could not verify payment status with gateway.",
      });
    } finally {
      setVerifyingPayment(false);
    }
  };

  const settlementData = useMemo(() => calculateCodSettlement(orders), [orders]);

  const subscriptionSummary = useMemo(
    () =>
      resolveStoreSubscriptionSummary({
        subscriptionTier: storeProfile?.subscription_tier,
        subscriptionStatus: storeProfile?.subscription_status,
        trialStartedAt: storeProfile?.trial_started_at,
        trialEndsAt: storeProfile?.trial_ends_at,
        subscribedAt: storeProfile?.subscribed_at,
      }),
    [storeProfile]
  );

  const executePlanSelection = async (tier: StoreSubscriptionTier) => {
    if (!storeId) return;
    setUpdatingTier(tier);
    setBanner(null);

    // If within active trial selecting Basic plan, activate directly with 0 PHP
    if (tier === "basic" && subscriptionSummary.isTrialActive) {
      try {
        const res = await selectMerchantSubscriptionPlan(storeId, tier);
        if (res.success && res.data) {
          setStoreProfile((prev) =>
            prev
              ? {
                  ...prev,
                  subscription_tier: res.data!.subscription_tier,
                  subscription_status: res.data!.subscription_status,
                  trial_started_at: res.data!.trial_started_at,
                  trial_ends_at: res.data!.trial_ends_at,
                  subscribed_at: res.data!.subscribed_at,
                }
              : prev
          );
          setBanner({
            type: "success",
            message: "Active on Basic Plan (Free 2-month trial upon approval).",
          });
          setConfirmingTier(null);
        } else {
          setBanner({
            type: "error",
            message: res.error || "Could not update subscription plan.",
          });
        }
      } catch (err: any) {
        setBanner({
          type: "error",
          message: err?.message || "Failed to update subscription plan.",
        });
      } finally {
        setUpdatingTier(null);
      }
      return;
    }

    // Launch secure PayMongo Checkout Session for paid plans / upgrades
    try {
      const checkoutRes = await createStoreSubscriptionCheckout({
        storeId,
        storeName: storeProfile?.name || "Your Store",
        tier,
      });

      if (checkoutRes.success && checkoutRes.checkoutUrl) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          if (checkoutRes.sessionId) {
            window.sessionStorage.setItem("mff_pending_paymongo_session", checkoutRes.sessionId);
          }
          window.location.href = checkoutRes.checkoutUrl;
        } else {
          await Linking.openURL(checkoutRes.checkoutUrl);
        }
      } else {
        setBanner({
          type: "error",
          message: checkoutRes.error || "Failed to initiate PayMongo checkout. Please try again.",
        });
        setUpdatingTier(null);
      }
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || "Payment gateway connection error.",
      });
      setUpdatingTier(null);
    }
  };

  const handleConfirmRemittance = async (orderId: string, foodAmount: number) => {
    setConfirmingOrderId(orderId);
    try {
      const label = storeProfile?.name || "Your Store";
      await confirmCodRemittance(orderId, label);
      setPendingConfirmOrderId(null);
      setBanner({
        type: "success",
        message: `₱${foodAmount.toFixed(2)} food cash recorded as remitted to ${label}.`,
      });
      await loadBillingData(true);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || "Failed to confirm COD remittance.",
      });
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const storeName = storeProfile?.name || "Your Store";

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-5xl self-center">
      <View className="mb-5">
        <Text className="text-[10px] font-bold text-[#EA5410] uppercase tracking-wider mb-0.5">
          Subscription & Billing
        </Text>
        <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
          Billing & Plans
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          View your current plan status, compare merchant tiers, and reconcile COD cash handovers.
        </Text>
      </View>

      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* PayMongo Payment Verifying State */}
      {verifyingPayment && (
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex-row items-center gap-3 shadow-xs">
          <ActivityIndicator size="small" color="#1D4ED8" />
          <View className="flex-1">
            <Text className="text-sm font-bold text-blue-900">Verifying PayMongo Payment...</Text>
            <Text className="text-xs text-blue-700">Connecting with the payment gateway to confirm your subscription and activate your store tier.</Text>
          </View>
        </View>
      )}

      {/* Current Availed Plan Status Banner */}
      <View className="bg-white p-5 rounded-2xl shadow-2xs border border-gray-200/80 mb-5">
        <View className="flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3.5 border-b border-gray-100 mb-3.5">
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              Currently Availed Plan • {storeName}
            </Text>
            <Text className="text-lg font-bold text-gray-900">
              {loadingBilling ? "Loading plan..." : subscriptionSummary.headline}
            </Text>
          </View>
          {!loadingBilling ? (
            <View
              className={`px-3 py-1 rounded-full border flex-row items-center gap-1.5 ${
                subscriptionSummary.isTemporarilyOffline
                  ? "bg-rose-50 border-rose-300"
                  : subscriptionSummary.isGracePeriod
                    ? "bg-amber-50 border-amber-300"
                    : subscriptionSummary.isActivePaid
                      ? "bg-blue-50 border-blue-200"
                      : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  subscriptionSummary.isTemporarilyOffline
                    ? "bg-rose-600"
                    : subscriptionSummary.isGracePeriod
                      ? "bg-amber-500"
                      : subscriptionSummary.isActivePaid
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                }`}
              />
              <Text
                className={`font-bold text-[11px] ${
                  subscriptionSummary.isTemporarilyOffline
                    ? "text-rose-800"
                    : subscriptionSummary.isGracePeriod
                      ? "text-amber-800"
                      : subscriptionSummary.isActivePaid
                        ? "text-blue-800"
                        : "text-emerald-800"
                }`}
              >
                {subscriptionSummary.isTemporarilyOffline
                  ? "Temporarily Offline"
                  : subscriptionSummary.isGracePeriod
                    ? `Grace Period (${subscriptionSummary.graceDaysRemaining}d left)`
                    : subscriptionSummary.isActivePaid
                      ? "Active Subscription"
                      : "Free Trial Active"}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          className={`p-3.5 rounded-xl border flex-row items-start gap-2.5 ${
            subscriptionSummary.isTemporarilyOffline
              ? "bg-rose-50/90 border-rose-300"
              : subscriptionSummary.isGracePeriod
                ? "bg-amber-50/90 border-amber-300"
                : "bg-orange-50/70 border-orange-200/80"
          }`}
        >
          <Ionicons
            name={
              subscriptionSummary.isTemporarilyOffline
                ? "alert-circle"
                : subscriptionSummary.isGracePeriod
                  ? "warning"
                  : "information-circle"
            }
            size={18}
            color={
              subscriptionSummary.isTemporarilyOffline
                ? "#e11d48"
                : subscriptionSummary.isGracePeriod
                  ? "#D97706"
                  : "#EA5410"
            }
            style={{ marginTop: 1 }}
          />
          <View className="flex-1">
            <Text className="text-xs text-gray-800 leading-relaxed">
              {subscriptionSummary.detailMessage}
            </Text>
            {subscriptionSummary.isTemporarilyOffline && (
              <Text className="text-[11px] font-bold text-rose-700 mt-1">
                ⚡ 1-Click Reactivation: Selecting and confirming any plan below immediately reactivates your store.
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Subscription Tiers — No Commission, Ever */}
      <View className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200/90 mb-5">
        <Text className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">
          Subscription Tiers — No Commission, Ever
        </Text>

        {/* Highlight Banner */}
        <View className="bg-[#F59E0B] rounded-xl px-4 py-2.5 mb-5 flex-row items-center justify-center gap-2">
          <Ionicons name="sparkles" size={15} color="#111827" />
          <Text className="text-xs font-bold text-slate-950 text-center">
            2-Month FREE TRIAL for all new stores — no credit card, no commission, no catch.
          </Text>
        </View>

        {/* 3 Tier Cards */}
        <View className="flex-col lg:flex-row gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const isCurrentTier = subscriptionSummary.tier === tier.id;
            const isSubmittingThis = updatingTier === tier.id;
            const isActiveAndCurrent = isCurrentTier && subscriptionSummary.isActivePaid;
            const isFreeTrialCurrent = isCurrentTier && subscriptionSummary.isTrialActive;

            return (
              <View
                key={tier.id}
                className={`flex-1 bg-white rounded-xl overflow-hidden shadow-xs border-2 flex-col justify-between ${
                  isCurrentTier ? "border-[#EA5410]" : "border-slate-200/90"
                }`}
              >
                <View>
                  {/* Colored Header */}
                  <View
                    style={{ backgroundColor: tier.headerBgHex }}
                    className="px-4 py-4 items-center"
                  >
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Text className="text-sm font-bold text-white">{tier.name}</Text>
                      {isCurrentTier ? (
                        <View className="bg-white/20 px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] font-bold text-white uppercase">
                            {isFreeTrialCurrent ? "Current • Free Trial" : "Current Plan"}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="flex-row items-baseline justify-center">
                      <Text className="text-2xl font-extrabold text-white tabular-nums">
                        ₱{tier.pricePhp}
                      </Text>
                      <Text className="text-xs font-medium text-white/90 ml-0.5">
                        {tier.periodLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Feature List */}
                  <View className="px-5 py-4 gap-2.5">
                    {tier.features.map((feature) => (
                      <View
                        key={feature}
                        className="pb-2 border-b border-gray-100 last:border-b-0 flex-row items-center gap-2"
                      >
                        <Ionicons name="checkmark" size={13} color={tier.headerBgHex} />
                        <Text className="text-xs text-gray-700 flex-1">{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Plan Action Footer */}
                <View className="px-4 pb-4 pt-1">
                  <Pressable
                    disabled={loadingBilling || Boolean(updatingTier) || isActiveAndCurrent || !storeId}
                    onPress={() => setConfirmingTier(tier)}
                    className={`h-9 rounded-lg items-center justify-center flex-row gap-1.5 cursor-pointer ${
                      isActiveAndCurrent
                        ? "bg-emerald-50 border border-emerald-200"
                        : isCurrentTier
                          ? "bg-[#EA5410] hover:bg-[#D04508]"
                          : "bg-gray-900 hover:bg-black"
                    }`}
                  >
                    {isSubmittingThis ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : null}
                    <Text
                      className={`text-xs font-bold ${
                        isActiveAndCurrent ? "text-emerald-800" : "text-white"
                      }`}
                    >
                      {isSubmittingThis
                        ? "Connecting to PayMongo..."
                        : isActiveAndCurrent
                          ? "Subscribed (Current Plan)"
                          : isFreeTrialCurrent && tier.id === "basic"
                            ? "Active (Free Trial)"
                            : `Pay with PayMongo • ₱${tier.pricePhp}`}
                    </Text>
                  </Pressable>
                  {!isActiveAndCurrent && (
                    <Text className="text-[10px] text-gray-400 text-center mt-1.5 font-medium">
                      GCash • Maya • Cards • GrabPay
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* PayMongo Subscription Invoices & Receipts */}
      <View className="bg-white p-5 rounded-2xl shadow-2xs border border-gray-200/80 mb-6">
        <View className="flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-gray-100 mb-4">
          <View>
            <Text className="text-sm font-bold text-gray-900">Subscription Invoices & Receipts</Text>
            <Text className="text-[11px] text-gray-400">
              {storeName} • Verified payment receipts powered by PayMongo
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            <Ionicons name="shield-checkmark" size={12} color="#1D4ED8" />
            <Text className="text-[10px] font-bold text-blue-800">Secure PayMongo Gateway</Text>
          </View>
        </View>

        {loadingBilling ? (
          <View className="py-6 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-[11px] text-gray-400 mt-2">Loading invoice history...</Text>
          </View>
        ) : invoices.length === 0 ? (
          <View className="bg-gray-50 border border-gray-200 p-5 rounded-xl items-center">
            <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
            <Text className="text-xs font-bold text-gray-600 mt-2">No subscription receipts yet</Text>
            <Text className="text-[11px] text-gray-400 text-center mt-0.5 max-w-sm">
              Invoices will automatically log here whenever you renew or upgrade your store tier via PayMongo.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {invoices.map((inv) => {
              const dateObj = new Date(inv.created_at);
              const dateStr = dateObj.toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const timeStr = dateObj.toLocaleTimeString("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
              const methodStr = (inv.payment_method || "Online").toUpperCase();
              const isPaid = inv.status === "paid";

              return (
                <View
                  key={inv.id}
                  className="bg-gray-50/80 border border-gray-200/90 p-3.5 rounded-xl flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-xs font-black text-gray-900 uppercase">
                        {inv.tier} Plan
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          isPaid ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase ${
                            isPaid ? "text-emerald-800" : "text-amber-800"
                          }`}
                        >
                          {isPaid ? "Paid & Active" : inv.status}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-gray-500 font-medium">via {methodStr}</Text>
                    </View>
                    <Text className="text-[11px] text-gray-500 mt-1">
                      Billing Cycle: {new Date(inv.billing_cycle_start).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} - {new Date(inv.billing_cycle_end).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} • Ref: {inv.paymongo_payment_id || inv.paymongo_checkout_session_id?.slice(0, 16) || inv.id.slice(0, 8)}
                    </Text>
                  </View>

                  <View className="items-end shrink-0">
                    <Text className="text-sm font-extrabold text-gray-900 tabular-nums">
                      ₱{Number(inv.amount).toFixed(2)}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">
                      {dateStr} • {timeStr}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* COD Settlement & Cash Remittance Reconciliation */}
      <View className="bg-white p-5 rounded-2xl shadow-2xs border border-gray-200/80 mb-6">
        <View className="flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-gray-100 mb-4">
          <View>
            <Text className="text-sm font-bold text-gray-900">COD Courier Cash Settlement</Text>
            <Text className="text-[11px] text-gray-400">
              {storeName} • Rolling reconciliation of food cash collected by independent couriers
            </Text>
          </View>
          <Pressable
            onPress={() => void loadBillingData(true)}
            disabled={refreshingBilling || loadingBilling}
            className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 flex-row items-center gap-1.5 cursor-pointer"
          >
            {refreshingBilling ? (
              <ActivityIndicator size="small" color="#374151" />
            ) : (
              <Ionicons name="refresh" size={13} color="#374151" />
            )}
            <Text className="text-[11px] font-semibold text-gray-700">Refresh</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-3 mb-4">
          <View className="flex-1 min-w-[160px] bg-gray-50 border border-gray-200 p-3.5 rounded-xl">
            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Delivered COD Food Sales
            </Text>
            <Text className="text-lg font-bold text-gray-900 mt-1 tabular-nums">
              ₱{settlementData.totalFoodSubtotalToRemit.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">
              {settlementData.totalDeliveredOrders} delivered trips
            </Text>
          </View>

          <View className="flex-1 min-w-[160px] bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
            <Text className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Cash Remitted
            </Text>
            <Text className="text-lg font-bold text-emerald-900 mt-1 tabular-nums">
              ₱{settlementData.totalRemitted.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-emerald-700 mt-0.5">Confirmed by cashier</Text>
          </View>

          <View className="flex-1 min-w-[160px] bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
            <Text className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Pending Courier Turnover
            </Text>
            <Text className="text-lg font-bold text-amber-900 mt-1 tabular-nums">
              ₱{settlementData.totalPendingRemittance.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-amber-700 mt-0.5">Awaiting cash handover</Text>
          </View>
        </View>

        {loadingBilling ? (
          <View className="py-8 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-[11px] text-gray-400 mt-2">
              Loading COD settlement ledger...
            </Text>
          </View>
        ) : settlementData.orders.length === 0 ? (
          <View className="bg-gray-50 border border-gray-200 p-5 rounded-xl items-center">
            <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
            <Text className="text-xs font-bold text-gray-600 mt-2">No delivered COD orders yet</Text>
            <Text className="text-[11px] text-gray-400 text-center mt-0.5 max-w-sm">
              Completed COD deliveries will appear here so your cashier can record courier cash handovers.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {settlementData.orders.map((ord) => {
              const isPendingConfirm = pendingConfirmOrderId === ord.orderId;
              const isConfirming = confirmingOrderId === ord.orderId;

              return (
                <View
                  key={ord.orderId}
                  className="bg-gray-50/70 border border-gray-200/90 p-3.5 rounded-xl flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-xs font-bold text-gray-900">{ord.orderNumber}</Text>
                      <Text className="text-xs text-gray-500 font-medium">{ord.customerName}</Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          ord.isRemitted ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase ${
                            ord.isRemitted ? "text-emerald-800" : "text-amber-800"
                          }`}
                        >
                          {ord.isRemitted ? "Remitted" : "Pending Cash"}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Courier: {ord.riderName || "Independent Rider"} • Collected ₱{ord.total.toFixed(2)} • Food Due:{" "}
                      <Text className="font-bold text-gray-900">₱{ord.subtotal.toFixed(2)}</Text>
                    </Text>
                  </View>

                  {!ord.isRemitted && (
                    <View className="flex-row items-center gap-1.5 shrink-0">
                      {isPendingConfirm ? (
                        <>
                          <Pressable
                            onPress={() => setPendingConfirmOrderId(null)}
                            disabled={isConfirming}
                            className="h-8 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 items-center justify-center cursor-pointer"
                          >
                            <Text className="text-[11px] font-semibold text-gray-700">Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void handleConfirmRemittance(ord.orderId, ord.subtotal)}
                            disabled={isConfirming}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex-row items-center gap-1.5 cursor-pointer"
                          >
                            {isConfirming && <ActivityIndicator size="small" color="white" />}
                            <Text className="text-[11px] font-bold text-white">
                              Confirm ₱{ord.subtotal.toFixed(2)}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          onPress={() => setPendingConfirmOrderId(ord.orderId)}
                          className="h-8 px-3 rounded-lg bg-[#111827] hover:bg-black flex-row items-center gap-1.5 cursor-pointer"
                        >
                          <Ionicons name="checkmark-done" size={13} color="white" />
                          <Text className="text-[11px] font-bold text-white">
                            Confirm Cash Received
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Strict Subscription Upgrade/Switch Confirmation Modal */}
      <SubscriptionConfirmModal
        visible={Boolean(confirmingTier)}
        currentTierName={subscriptionSummary.tierDef.name + " Plan"}
        targetTier={confirmingTier}
        isConnecting={Boolean(updatingTier)}
        onCancel={() => setConfirmingTier(null)}
        onConfirm={() => {
          if (confirmingTier) {
            void executePlanSelection(confirmingTier.id);
          }
        }}
      />

      {/* Payment Success Modal */}
      <ActionSuccessModal
        visible={showPaymentSuccessModal}
        title="Subscription Confirmed! 💳"
        message={paymentSuccessMessage}
        buttonLabel="Back to Billing"
        icon="checkmark-circle"
        iconColor="#059669"
        iconBgColor="#ECFDF5"
        onClose={() => {
          setShowPaymentSuccessModal(false);
          router.replace("/dashboard/billing");
        }}
      />
    </View>
  );
}
