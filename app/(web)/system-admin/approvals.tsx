import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminStoreApplicationsWithStatus,
  setStoreApproval,
  type StoreApplication,
} from "../../../services/admin";
import { getStoreApprovalTheme } from "../../../lib/status-tokens";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await fetchAdminStoreApplicationsWithStatus();
    setApplications(data);
    if (error) {
      setBanner({
        type: "error",
        message: `Could not load store applications: ${error}`,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    const res = await setStoreApproval(id, action);
    if (res.success) {
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, approval_status: action } : app))
      );
      setBanner({
        type: action === "approved" ? "success" : "info",
        message: `Store marked as ${action}.`,
      });
    } else {
      setBanner({
        type: "error",
        message: `Failed to update status: ${res.error || "Unknown error"}`,
      });
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.address_text.toLowerCase().includes(search.toLowerCase()) ||
      app.barangay.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && app.approval_status === activeTab;
  });

  const pendingCount = applications.filter((a) => a.approval_status === "pending").length;
  const approvedCount = applications.filter((a) => a.approval_status === "approved").length;
  const rejectedCount = applications.filter((a) => a.approval_status === "rejected").length;

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Page Header */}
      <View className="mb-5">
        <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
          Store Approvals
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          Review and manage restaurant applications.
        </Text>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Search & Tabs */}
      <View className="flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
        <View className="flex-row flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl">
          {[
            { key: "pending", label: `Pending (${pendingCount})` },
            { key: "approved", label: `Approved (${approvedCount})` },
            { key: "rejected", label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === tab.key ? "bg-white shadow-2xs" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  activeTab === tab.key ? "text-[#EA5410]" : "text-gray-500"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="w-full lg:w-64 bg-white border border-gray-200/90 rounded-xl px-3 py-2 shadow-2xs flex-row items-center gap-2">
          <Ionicons name="search" size={14} color="#9CA3AF" />
          <TextInput
            placeholder="Search store or location..."
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-xs text-gray-900 outline-none"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Data Table */}
      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50/80 px-5 py-3 border-b border-gray-200 hidden lg:flex">
          <Text className="flex-[2] font-bold text-[11px] text-gray-400 uppercase tracking-wider">Store</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Barangay</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Address</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Status</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Submitted</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider text-right">Actions</Text>
        </View>

        {/* Table Rows */}
        {loading ? (
          <View className="py-14 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-[11px] text-gray-400 mt-2">Loading applications...</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Ionicons name="documents-outline" size={28} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-xs mt-2.5">No applications found</Text>
            <Text className="text-gray-400 text-[11px] mt-0.5">No stores in this status.</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[540px]">
            {filteredApps.map((app) => (
              <View
                key={app.id}
                className="flex-col lg:flex-row px-5 py-3 items-start lg:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors gap-2 lg:gap-0"
              >
                <View className="lg:flex-[2]">
                  <Text className="font-bold text-gray-900 text-xs sm:text-sm">{app.name}</Text>
                  <Text className="text-[11px] text-gray-400 font-mono">{app.slug}</Text>
                </View>
                <Text className="lg:flex-1 text-gray-700 text-[11px] font-medium">
                  {app.barangay || "Mati City"}
                </Text>
                <Text className="lg:flex-1 text-gray-500 text-[11px]" numberOfLines={1}>
                  {app.address_text}
                </Text>
                <View className="lg:flex-1">
                  {(() => {
                    const statusTheme = getStoreApprovalTheme(app.approval_status);
                    return (
                      <View className={`self-start px-2.5 py-0.5 rounded-full ${statusTheme.badgeBg}`}>
                        <Text className={`text-[9px] font-bold uppercase tracking-wider ${statusTheme.badgeText}`}>
                          {statusTheme.label}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <Text className="lg:flex-1 text-gray-400 text-[11px] mb-1.5 lg:mb-0">
                  {new Date(app.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </Text>

                <View className="lg:flex-1 flex-row gap-2 lg:justify-end w-full lg:w-auto">
                  {app.approval_status !== "approved" && (
                    <Pressable
                      onPress={() => handleAction(app.id, "approved")}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex-1 lg:flex-none items-center shadow-2xs"
                    >
                      <Text className="text-white font-bold text-[11px]">Approve</Text>
                    </Pressable>
                  )}
                  {app.approval_status !== "rejected" && (
                    <Pressable
                      onPress={() => handleAction(app.id, "rejected")}
                      className="px-3 py-1 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors flex-1 lg:flex-none items-center"
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
    </View>
  );
}
