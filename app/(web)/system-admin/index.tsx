import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  fetchPlatformMetricsWithStatus,
  fetchAdminStoreApplicationsWithStatus,
  setStoreApproval,
  type PlatformMetrics,
  type StoreApplication,
} from "../../../services/admin";
import { buildAdminCsvReport } from "../../../lib/admin-report";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

export default function SystemAdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [approvals, setApprovals] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [metricsRes, appsRes] = await Promise.all([
      fetchPlatformMetricsWithStatus(),
      fetchAdminStoreApplicationsWithStatus(),
    ]);
    setMetrics(metricsRes.data);
    setApprovals(appsRes.data);
    const loadError = metricsRes.error || appsRes.error;
    if (loadError) {
      setBanner({
        type: "error",
        message: `Could not load dashboard data: ${loadError}`,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    const csv = buildAdminCsvReport(metrics, approvals);
    if (Platform.OS === "web" && typeof document !== "undefined" && typeof URL !== "undefined") {
      try {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateStamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.setAttribute("download", `mff-admin-report-${dateStamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setBanner({ type: "success", message: "CSV report downloaded." });
        return;
      } catch {
        setBanner({ type: "error", message: "Could not download the CSV report." });
        return;
      }
    }
    setBanner({ type: "info", message: "CSV export is supported on desktop browsers." });
  };

  const handleApprove = async (id: string, name: string) => {
    const res = await setStoreApproval(id, "approved");
    if (res.success) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, approval_status: "approved" } : a))
      );
      setBanner({
        type: "success",
        message: `${name} has been approved.`,
      });
      loadData();
    } else {
      setBanner({
        type: "error",
        message: `Failed to approve store: ${res.error || "Unknown error"}`,
      });
    }
  };

  const handleReject = async (id: string, name: string) => {
    const res = await setStoreApproval(id, "rejected");
    if (res.success) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, approval_status: "rejected" } : a))
      );
      setBanner({
        type: "info",
        message: `${name} has been rejected.`,
      });
      loadData();
    } else {
      setBanner({
        type: "error",
        message: `Failed to reject store: ${res.error || "Unknown error"}`,
      });
    }
  };

  const pendingApps = approvals.filter((a) => a.approval_status === "pending");

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Header */}
      <View className="mb-5 flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Store applications, user activity, and delivery summary.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export CSV report"
          onPress={handleExportCsv}
          className="bg-[#111827] px-3.5 py-2 rounded-xl hover:bg-black transition-colors shadow-2xs flex-row items-center gap-1.5"
        >
          <Ionicons name="download-outline" size={14} color="white" />
          <Text className="text-white font-semibold text-xs">Export CSV</Text>
        </Pressable>
      </View>

      {/* Inline Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* KPI Stats Grid */}
      <View className="flex-row flex-wrap gap-3.5 mb-5">
        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Users
            </Text>
            <View className="w-7 h-7 rounded-lg bg-blue-100 items-center justify-center">
              <Ionicons name="people" size={14} color="#2563EB" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            {loading ? <ActivityIndicator size="small" color="#2563EB" /> : metrics ? metrics.total_users : "—"}
          </Text>
          <Text className="text-gray-500 font-medium text-[11px] mt-1">Registered accounts</Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Active Stores
            </Text>
            <View className="w-7 h-7 rounded-lg bg-orange-100 items-center justify-center">
              <Ionicons name="storefront" size={14} color="#EA5410" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            {loading ? <ActivityIndicator size="small" color="#EA5410" /> : metrics ? metrics.total_stores : "—"}
          </Text>
          <Text className="text-gray-500 font-medium text-[11px] mt-1">Approved stores</Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Pending Approvals
            </Text>
            <View className="w-7 h-7 rounded-lg bg-amber-100 items-center justify-center">
              <Ionicons name="hourglass" size={14} color="#D97706" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            {loading ? <ActivityIndicator size="small" color="#D97706" /> : metrics ? metrics.pending_stores : "—"}
          </Text>
          <Text className="text-gray-500 font-medium text-[11px] mt-1">
            {pendingApps.length > 0 ? "Awaiting review" : "All caught up"}
          </Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Order Volume
            </Text>
            <View className="w-7 h-7 rounded-lg bg-emerald-100 items-center justify-center">
              <Ionicons name="cash" size={14} color="#047857" />
            </View>
          </View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            {loading
              ? <ActivityIndicator size="small" color="#047857" />
              : metrics
              ? `₱${(metrics.gross_sales_centavos / 100).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}`
              : "—"}
          </Text>
          <Text className="text-gray-500 font-medium text-[11px] mt-1">
            {metrics ? `${metrics.total_orders} total orders` : "Total sales"}
          </Text>
        </View>
      </View>

      {/* Main Content Split */}
      <View className="flex-col xl:flex-row gap-5 w-full">
        {/* Store Applications List */}
        <View className="flex-[2] bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden">
          <View className="px-5 py-3.5 border-b border-gray-100 flex-row justify-between items-center gap-2">
            <View>
              <Text className="text-sm font-bold text-gray-900">Store Applications</Text>
              <Text className="text-[11px] text-gray-400">
                Recent restaurant registrations and approval status
              </Text>
            </View>
            <Link href="/(web)/system-admin/approvals" asChild>
              <Pressable>
                <Text className="text-[11px] font-bold text-[#EA5410] hover:underline">View All</Text>
              </Pressable>
            </Link>
          </View>

          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color="#EA5410" />
              <Text className="text-[11px] text-gray-400 mt-2">Loading applications...</Text>
            </View>
          ) : approvals.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Ionicons name="checkmark-done-circle" size={32} color="#047857" />
              <Text className="text-gray-800 font-bold text-xs mt-2.5">No store applications</Text>
              <Text className="text-gray-400 text-[11px] mt-0.5">
                New merchant applications will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView className="max-h-[380px]">
              {approvals.slice(0, 5).map((app) => (
                <View
                  key={app.id}
                  className="px-5 py-3.5 border-b border-gray-100 flex-col lg:flex-row items-start lg:items-center justify-between hover:bg-gray-50/70 transition-colors gap-2.5"
                >
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text className="font-bold text-gray-900 text-sm">{app.name}</Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          app.approval_status === "approved"
                            ? "bg-emerald-100"
                            : app.approval_status === "rejected"
                            ? "bg-red-100"
                            : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase ${
                            app.approval_status === "approved"
                              ? "text-emerald-800"
                              : app.approval_status === "rejected"
                              ? "text-red-800"
                              : "text-amber-800"
                          }`}
                        >
                          {app.approval_status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-gray-500 font-medium">
                      {app.barangay ? `${app.barangay} • ` : ""}
                      {app.address_text}
                    </Text>
                    <Text className="text-[11px] text-gray-400 mt-0.5">
                      Phone: {app.public_phone || "Not provided"}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {app.approval_status !== "approved" && (
                      <Pressable
                        onPress={() => handleApprove(app.id, app.name)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                      >
                        <Text className="text-white font-bold text-[11px]">Approve</Text>
                      </Pressable>
                    )}
                    {app.approval_status !== "rejected" && (
                      <Pressable
                        onPress={() => handleReject(app.id, app.name)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                      >
                        <Text className="text-red-700 font-bold text-[11px]">Reject</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Platform Operations Summary */}
        <View className="flex-1 bg-white rounded-2xl shadow-2xs border border-gray-200/80 p-5 flex-col justify-between">
          <View>
            <View className="flex-row items-center gap-2 mb-0.5">
              <Ionicons name="stats-chart-outline" size={15} color="#EA5410" />
              <Text className="text-sm font-bold text-gray-900">Summary</Text>
            </View>
            <Text className="text-[11px] text-gray-400 mb-4">Current marketplace totals</Text>

            <View className="gap-3">
              <View className="pb-2.5 border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xs font-medium text-gray-600">Approved Stores</Text>
                <Text className="text-xs font-bold text-gray-900">
                  {metrics?.total_stores ?? 0}
                </Text>
              </View>

              <View className="pb-2.5 border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xs font-medium text-gray-600">Pending Approvals</Text>
                <Text className="text-xs font-bold text-amber-700">
                  {metrics?.pending_stores ?? 0}
                </Text>
              </View>

              <View className="pb-2.5 border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xs font-medium text-gray-600">Active Riders</Text>
                <Text className="text-xs font-bold text-blue-700">
                  {metrics?.active_riders ?? 0}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-medium text-gray-600">Total Orders</Text>
                <Text className="text-xs font-bold text-emerald-700">
                  {metrics?.total_orders ?? 0}
                </Text>
              </View>
            </View>
          </View>

          <Link href="/(web)/system-admin/metrics" asChild>
            <Pressable className="mt-5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl items-center hover:bg-gray-100 transition-colors">
              <Text className="text-xs font-bold text-gray-700">View Analytics</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
