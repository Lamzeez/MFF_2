import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, type DimensionValue } from "react-native";
import {
  fetchPlatformMetricsWithStatus,
  fetchMonthlyGmvTelemetry,
  fetchDiscoveryChannelsTelemetry,
  calculateMonthlyGmvBarHeights,
  type PlatformMetrics,
  type MonthlyGmvItem,
  type DiscoveryChannelsData,
} from "../../../services/admin";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyGmvItem[]>([]);
  const [channels, setChannels] = useState<DiscoveryChannelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  useEffect(() => {
    Promise.all([
      fetchPlatformMetricsWithStatus(),
      fetchMonthlyGmvTelemetry(),
      fetchDiscoveryChannelsTelemetry(),
    ]).then(([platRes, gmvRes, channelsRes]) => {
      if (platRes.data) setMetrics(platRes.data);
      setMonthlyData(gmvRes.items);
      setChannels(channelsRes.data);

      const loadError = platRes.error || gmvRes.error || channelsRes.error;
      if (loadError) {
        setBanner({
          type: "error",
          message: `Some analytics could not be loaded: ${loadError}`,
        });
      }
      setLoading(false);
    });
  }, []);

  const periodGmvCentavos = monthlyData.reduce(
    (sum, item) => sum + (Number(item.gross_sales_centavos) || 0),
    0
  );
  const periodOrderCount = monthlyData.reduce(
    (sum, item) => sum + (Number(item.order_count) || 0),
    0
  );
  const totalGmv =
    monthlyData.length > 0
      ? periodGmvCentavos / 100
      : metrics
      ? metrics.gross_sales_centavos / 100
      : 0;
  const displayedOrders =
    monthlyData.length > 0 ? periodOrderCount : metrics?.total_orders ?? 0;
  const barItems = calculateMonthlyGmvBarHeights(monthlyData);

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Header */}
      <View className="mb-5">
        <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
          Analytics
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          Order volume and marketplace performance.
        </Text>
      </View>

      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Order Volume Card */}
        <View className="bg-white p-4 lg:p-5 rounded-2xl shadow-2xs border border-gray-200/80 mb-5">
          <View className="flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <View>
              <Text className="text-sm font-bold text-gray-900">Order Volume</Text>
              <Text className="text-[11px] text-gray-400">
                Delivery and pickup orders across Mati City
              </Text>
            </View>
            <View className="bg-gray-100 px-2.5 py-1 rounded-lg mt-2 md:mt-0">
              <Text className="text-[11px] font-semibold text-gray-600">Last 9 Months</Text>
            </View>
          </View>

          <View className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <View className="flex-row flex-wrap items-baseline gap-2 mb-4">
              <Text className="text-xl lg:text-2xl font-bold text-gray-900">
                {loading ? (
                  <ActivityIndicator size="small" color="#EA5410" />
                ) : (
                  `₱${totalGmv.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                )}
              </Text>
              {!loading && (
                <Text className="text-emerald-600 font-semibold text-xs">
                  {displayedOrders} {displayedOrders === 1 ? "order" : "orders"}
                </Text>
              )}
            </View>

            {/* Plot Tracks (isolated flex-1 track prevents 95% bars from overlapping labels) */}
            <View className="flex-row gap-2 sm:gap-3 h-36 border-b border-gray-200/80">
              {barItems.map((bar) => (
                <View key={bar.month} className="flex-1 min-w-0 items-center h-full">
                  <Text
                    className="text-[9px] sm:text-[10px] font-medium text-gray-500 mb-1"
                    numberOfLines={1}
                  >
                    {bar.val}
                  </Text>
                  <View className="w-full flex-1 justify-end items-center">
                    {bar.height !== "0%" ? (
                      <View
                        style={{ height: bar.height as DimensionValue }}
                        className="w-full max-w-[36px] bg-[#EA5410] rounded-t-md opacity-90 hover:opacity-100 transition-opacity"
                      />
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            {/* X-Axis Month Labels */}
            <View className="flex-row gap-2 sm:gap-3 pt-1.5">
              {barItems.map((bar) => (
                <View key={bar.month} className="flex-1 min-w-0 items-center">
                  <Text className="text-[10px] font-semibold text-gray-500" numberOfLines={1}>
                    {bar.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Activity Breakdown & Platform Totals */}
        <View className="flex-col lg:flex-row gap-5 mb-6">
          <View className="flex-1 bg-white p-4 lg:p-5 rounded-2xl shadow-2xs border border-gray-200/80">
            <Text className="text-sm font-bold text-gray-900 mb-0.5">Activity Breakdown</Text>
            <Text className="text-[11px] text-gray-400 mb-4">
              Orders, QR check-ins, and community posts
            </Text>
            <View className="gap-4">
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-semibold text-gray-700">
                    Orders ({channels?.orders_count ?? 0})
                  </Text>
                  <Text className="text-xs font-bold text-gray-900">
                    {channels?.direct_percent ?? 0}%
                  </Text>
                </View>
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${channels?.direct_percent ?? 0}%` as DimensionValue }}
                    className="h-full bg-[#EA5410] rounded-full"
                  />
                </View>
              </View>

              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-semibold text-gray-700">
                    QR Check-ins ({channels?.qr_checkins_count ?? 0})
                  </Text>
                  <Text className="text-xs font-bold text-gray-900">
                    {channels?.qr_percent ?? 0}%
                  </Text>
                </View>
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${channels?.qr_percent ?? 0}%` as DimensionValue }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </View>
              </View>

              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-semibold text-gray-700">
                    Community Posts ({channels?.community_posts_count ?? 0})
                  </Text>
                  <Text className="text-xs font-bold text-gray-900">
                    {channels?.social_percent ?? 0}%
                  </Text>
                </View>
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${channels?.social_percent ?? 0}%` as DimensionValue }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="flex-1 bg-white p-4 lg:p-5 rounded-2xl shadow-2xs border border-gray-200/80 justify-between">
            <View>
              <Text className="text-sm font-bold text-gray-900 mb-0.5">Platform Totals</Text>
              <Text className="text-[11px] text-gray-400 mb-4">Active marketplace counts</Text>

              <View className="gap-2.5">
                <View className="flex-row justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <Text className="text-xs font-semibold text-gray-700">Total Users</Text>
                  <Text className="text-xs font-bold text-gray-900">
                    {metrics ? metrics.total_users : loading ? "..." : "—"}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <Text className="text-xs font-semibold text-gray-700">Active Stores</Text>
                  <Text className="text-xs font-bold text-gray-900">
                    {metrics ? metrics.total_stores : loading ? "..." : "—"}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <Text className="text-xs font-semibold text-gray-700">Active Riders</Text>
                  <Text className="text-xs font-bold text-gray-900">
                    {metrics ? metrics.active_riders : loading ? "..." : "—"}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <Text className="text-xs font-semibold text-gray-700">Total Orders</Text>
                  <Text className="text-xs font-bold text-emerald-700">
                    {metrics ? metrics.total_orders : loading ? "..." : "—"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
