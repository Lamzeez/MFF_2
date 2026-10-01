import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminStoreApplications,
  setStoreApproval,
  type StoreApplication,
} from "../../../services/admin";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAdminStoreApplications();
    setApplications(data);
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
      alert(`Store marked as ${action}.`);
    } else {
      alert(`Failed to update approval: ${res.error || "Unknown error"}`);
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
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Page Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            STORE VERIFICATION
          </Text>
          <View className="bg-orange-100 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-black text-[#EA5410] uppercase">Live Supabase</Text>
          </View>
        </View>
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Merchant Approvals</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Review business registration, PostGIS location coordinates, and menus for new Mati City restaurants.
        </Text>
      </View>

      {/* Search & Tabs */}
      <View className="flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <View className="flex-row gap-2 bg-gray-100 p-1.5 rounded-2xl">
          {[
            { key: "pending", label: `Pending (${pendingCount})` },
            { key: "approved", label: `Approved (${approvedCount})` },
            { key: "rejected", label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === tab.key ? "bg-white shadow-2xs" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === tab.key ? "text-[#EA5410]" : "text-gray-500"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="w-full md:w-72 bg-white border border-gray-200/90 rounded-2xl px-3.5 py-2 shadow-2xs flex-row items-center gap-2">
          <Ionicons name="search" size={16} color="#9CA3AF" />
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
      <View className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50/80 px-8 py-4 border-b border-gray-200 hidden md:flex">
          <Text className="flex-[2] font-black text-xs text-gray-400 uppercase tracking-wider">Store Name & Slug</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Barangay</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Address</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Status</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Date Applied</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider text-right">Actions</Text>
        </View>

        {/* Table Rows */}
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#EA5410" />
            <Text className="text-xs text-gray-400 mt-2">Loading store applications from Supabase...</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <Ionicons name="documents-outline" size={36} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-sm mt-3">No applications found</Text>
            <Text className="text-gray-400 text-xs mt-1">No store applications in this category</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[600px]">
            {filteredApps.map((app) => (
              <View
                key={app.id}
                className="flex-col md:flex-row px-8 py-4 items-start md:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
              >
                <View className="flex-[2] mb-2 md:mb-0">
                  <Text className="font-black text-gray-900 text-base">{app.name}</Text>
                  <Text className="text-xs text-gray-400 font-mono">{app.slug}</Text>
                </View>
                <Text className="flex-1 text-gray-700 text-xs font-semibold mb-1 md:mb-0">
                  {app.barangay || "Mati City"}
                </Text>
                <Text className="flex-1 text-gray-500 text-xs mb-2 md:mb-0" numberOfLines={1}>
                  {app.address_text}
                </Text>
                <View className="flex-1 mb-2 md:mb-0">
                  <View
                    className={`self-start px-3 py-1 rounded-full ${
                      app.approval_status === "pending"
                        ? "bg-amber-100"
                        : app.approval_status === "approved"
                        ? "bg-emerald-100"
                        : "bg-red-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        app.approval_status === "pending"
                          ? "text-amber-800"
                          : app.approval_status === "approved"
                          ? "text-emerald-800"
                          : "text-red-800"
                      }`}
                    >
                      {app.approval_status}
                    </Text>
                  </View>
                </View>
                <Text className="flex-1 text-gray-400 text-xs mb-3 md:mb-0">
                  {new Date(app.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </Text>

                <View className="flex-1 flex-row gap-2 md:justify-end w-full md:w-auto">
                  {app.approval_status !== "approved" && (
                    <Pressable
                      onPress={() => handleAction(app.id, "approved")}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex-1 md:flex-none items-center shadow-2xs"
                    >
                      <Text className="text-white font-extrabold text-xs">Approve</Text>
                    </Pressable>
                  )}
                  {app.approval_status !== "rejected" && (
                    <Pressable
                      onPress={() => handleAction(app.id, "rejected")}
                      className="px-3.5 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-colors flex-1 md:flex-none items-center"
                    >
                      <Text className="text-red-700 font-bold text-xs">Reject</Text>
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
