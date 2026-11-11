import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../context/SessionContext";
import { fetchStoreById, fetchUserStoreId } from "../../../services/catalog";
import {
  calculateCodSettlement,
  confirmCodRemittance,
  fetchStoreOrders,
  type LiveOrder,
} from "../../../services/orders";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

export default function StoreBilling() {
  const { identity } = useSession("merchant");
  const [storeName, setStoreName] = useState("Your Store");
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loadingSettlement, setLoadingSettlement] = useState(true);
  const [refreshingSettlement, setRefreshingSettlement] = useState(false);
  const [pendingConfirmOrderId, setPendingConfirmOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadSettlementOrders = useCallback(async (isRefresh = false) => {
    if (!identity?.id) {
      setLoadingSettlement(false);
      return;
    }

    if (isRefresh) {
      setRefreshingSettlement(true);
    } else {
      setLoadingSettlement(true);
    }

    try {
      const targetStoreId = await fetchUserStoreId(identity.id);
      if (!targetStoreId) {
        setOrders([]);
        return;
      }

      const [storeProfile, storeOrders] = await Promise.all([
        fetchStoreById(targetStoreId),
        fetchStoreOrders(targetStoreId),
      ]);
      if (storeProfile?.name) {
        setStoreName(storeProfile.name);
      }
      setOrders(storeOrders || []);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Could not load COD settlement records: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setLoadingSettlement(false);
      setRefreshingSettlement(false);
    }
  }, [identity?.id]);

  useEffect(() => {
    void loadSettlementOrders(false);
  }, [loadSettlementOrders]);

  const settlementData = useMemo(() => calculateCodSettlement(orders), [orders]);

  const handleConfirmRemittance = async (orderId: string, foodAmount: number) => {
    setConfirmingOrderId(orderId);
    try {
      await confirmCodRemittance(orderId, storeName);
      setPendingConfirmOrderId(null);
      setBanner({
        type: "success",
        message: `₱${foodAmount.toFixed(2)} food cash recorded as remitted to ${storeName}.`,
      });
      await loadSettlementOrders(true);
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || "Failed to confirm COD remittance.",
      });
    } finally {
      setConfirmingOrderId(null);
    }
  };

  return (
    <View className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-4xl self-center">
      <View className="mb-6 sm:mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            SUBSCRIPTION & BILLING
          </Text>
        </View>
        <Text className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Billing & Plans</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Manage your Mati FoodFinder merchant partner plan, COD courier reconciliation, and payout settings.
        </Text>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* COD Settlement & Cash Remittance Reconciliation */}
      <View className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-200/80 mb-6 sm:mb-8">
        <View className="flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100 mb-5">
          <View>
            <Text className="text-lg font-black text-gray-900">COD Courier Cash Settlement</Text>
            <Text className="text-xs text-gray-400">
              {storeName} • Rolling reconciliation of food cash collected by independent couriers
            </Text>
          </View>
          <Pressable
            onPress={() => void loadSettlementOrders(true)}
            disabled={refreshingSettlement || loadingSettlement}
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 flex-row items-center gap-1.5"
          >
            {refreshingSettlement ? (
              <ActivityIndicator size="small" color="#374151" />
            ) : (
              <Ionicons name="refresh" size={14} color="#374151" />
            )}
            <Text className="text-xs font-bold text-gray-700">Refresh</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-3 mb-5">
          <View className="flex-1 min-w-[160px] bg-gray-50 border border-gray-200 p-4 rounded-2xl">
            <Text className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              Delivered COD Food Sales
            </Text>
            <Text className="text-xl font-black text-gray-900 mt-1">
              ₱{settlementData.totalFoodSubtotalToRemit.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">
              {settlementData.totalDeliveredOrders} delivered trips
            </Text>
          </View>

          <View className="flex-1 min-w-[160px] bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
            <Text className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
              Cash Remitted
            </Text>
            <Text className="text-xl font-black text-emerald-900 mt-1">
              ₱{settlementData.totalRemitted.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-emerald-700 mt-0.5">Confirmed by cashier</Text>
          </View>

          <View className="flex-1 min-w-[160px] bg-amber-50 border border-amber-200 p-4 rounded-2xl">
            <Text className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
              Pending Courier Turnover
            </Text>
            <Text className="text-xl font-black text-amber-900 mt-1">
              ₱{settlementData.totalPendingRemittance.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-amber-700 mt-0.5">Awaiting cash handover</Text>
          </View>
        </View>

        {loadingSettlement ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-xs text-gray-400 mt-2">Loading COD settlement ledger...</Text>
          </View>
        ) : settlementData.orders.length === 0 ? (
          <View className="bg-gray-50 border border-gray-200 p-6 rounded-2xl items-center">
            <Ionicons name="receipt-outline" size={28} color="#9CA3AF" />
            <Text className="text-xs font-bold text-gray-600 mt-2">No delivered COD orders yet</Text>
            <Text className="text-[11px] text-gray-400 text-center mt-1 max-w-sm">
              Completed COD deliveries will appear here so your cashier can record courier cash handovers.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {settlementData.orders.map((ord) => {
              const isPendingConfirm = pendingConfirmOrderId === ord.orderId;
              const isConfirming = confirmingOrderId === ord.orderId;

              return (
                <View
                  key={ord.orderId}
                  className="bg-gray-50/70 border border-gray-200/90 p-4 rounded-2xl flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-sm font-black text-gray-900">{ord.orderNumber}</Text>
                      <Text className="text-xs text-gray-500 font-medium">{ord.customerName}</Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          ord.isRemitted ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            ord.isRemitted ? "text-emerald-800" : "text-amber-800"
                          }`}
                        >
                          {ord.isRemitted ? "Remitted" : "Pending Cash"}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">
                      Courier: {ord.riderName || "Independent Rider"} • Collected ₱{ord.total.toFixed(2)} • Food Due:{" "}
                      <Text className="font-bold text-gray-900">₱{ord.subtotal.toFixed(2)}</Text>
                    </Text>
                  </View>

                  {!ord.isRemitted && (
                    <View className="flex-row items-center gap-2 shrink-0">
                      {isPendingConfirm ? (
                        <>
                          <Pressable
                            onPress={() => setPendingConfirmOrderId(null)}
                            disabled={isConfirming}
                            className="px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100"
                          >
                            <Text className="text-xs font-bold text-gray-700">Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void handleConfirmRemittance(ord.orderId, ord.subtotal)}
                            disabled={isConfirming}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 flex-row items-center gap-1.5"
                          >
                            {isConfirming && <ActivityIndicator size="small" color="white" />}
                            <Text className="text-xs font-bold text-white">
                              Confirm ₱{ord.subtotal.toFixed(2)}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          onPress={() => setPendingConfirmOrderId(ord.orderId)}
                          className="px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-black flex-row items-center gap-1.5"
                        >
                          <Ionicons name="checkmark-done" size={14} color="white" />
                          <Text className="text-xs font-bold text-white">Confirm Cash Received</Text>
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

      {/* Subscription Card */}
      <View className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-200/80 mb-6 sm:mb-8">
        <View className="flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-100">
          <View className="flex-1">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">Current Merchant Plan</Text>
            <Text className="text-2xl font-black text-gray-900">Partner Pioneer Trial</Text>
            <Text className="text-xs text-gray-500 mt-1">Unlimited orders, live menu management, and zero commission on COD.</Text>
          </View>
          <View className="bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full mt-4 md:mt-0 flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-emerald-800 font-extrabold text-xs">Active Trial</Text>
          </View>
        </View>

        <View className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200/80 mb-6 flex-row items-center gap-3">
          <Ionicons name="information-circle" size={20} color="#EA5410" />
          <Text className="text-xs text-gray-700 leading-snug flex-1">
            Your pioneer trial period is active for <Text className="font-bold text-[#EA5410]">45 more days</Text>. No card charges or deduction fees will be applied during this period.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-4">
          <Pressable
            onPress={() =>
              setBanner({
                type: "info",
                message: "PayMongo Portal: In production, opens PayMongo checkout for GCash, Maya, and Card settlements.",
              })
            }
            className="flex-1 min-w-[200px] py-4 px-4 bg-[#111827] rounded-2xl hover:bg-black transition-colors items-center shadow-sm"
          >
            <Text className="text-white font-extrabold text-xs text-center">Upgrade to Pro Merchant (₱499/mo)</Text>
          </Pressable>
        </View>
      </View>

      {/* Payment Methods */}
      <View className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-200/80">
        <View className="flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <View>
            <Text className="text-lg font-black text-gray-900">Payment & Payout Methods</Text>
            <Text className="text-xs text-gray-400">GCash, Maya, and local bank transfers</Text>
          </View>
          <Pressable
            onPress={() =>
              setBanner({
                type: "info",
                message: "Add Method: Configure GCash number or Bank Account for automated merchant settlements.",
              })
            }
            className="px-4 py-2 bg-[#EA5410]/10 border border-[#EA5410]/20 rounded-xl"
          >
            <Text className="text-[#EA5410] font-bold text-xs">+ Add Payout Account</Text>
          </Pressable>
        </View>

        <View className="items-center py-10">
          <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center mb-3">
            <Ionicons name="card-outline" size={30} color="#9CA3AF" />
          </View>
          <Text className="text-gray-700 font-bold text-sm">No payout method added yet</Text>
          <Text className="text-gray-400 text-xs mt-1 text-center max-w-xs">
            Add a GCash or Bank account to receive weekly payouts for non-COD platform transactions.
          </Text>
        </View>
      </View>
    </View>
  );
}
