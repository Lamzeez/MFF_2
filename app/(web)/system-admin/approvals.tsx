import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");

  const [applications, setApplications] = useState([
    { id: "APP-001", store: "Mati Baywalk Seafood Grill", owner: "Ramon Cruz", location: "Baywalk Pavilion, Mati", status: "Pending", date: "Oct 24, 2026", type: "Seafood & Grill" },
    { id: "APP-002", store: "Mati Burger Hub", owner: "James Santos", location: "Dahican, Mati City", status: "Pending", date: "Oct 24, 2026", type: "Fast Food" },
    { id: "APP-003", store: "Seafoods Paradise", owner: "Maria Cruz", location: "Baywalk, Mati", status: "Under Review", date: "Oct 23, 2026", type: "Seafood" },
    { id: "APP-004", store: "Tapsilog Express", owner: "Ramon Perez", location: "Matiao, Mati", status: "Pending", date: "Oct 22, 2026", type: "Karenderia" },
  ]);

  const handleAction = (id: string, action: "Approved" | "Rejected") => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: action } : app))
    );
    alert(`Store application ${id} marked as ${action}.`);
  };

  const filteredApps = applications.filter((app) => {
    const matchesSearch = app.store.toLowerCase().includes(search.toLowerCase()) ||
      app.owner.toLowerCase().includes(search.toLowerCase()) ||
      app.location.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "pending") return matchesSearch && (app.status === "Pending" || app.status === "Under Review");
    if (activeTab === "approved") return matchesSearch && app.status === "Approved";
    if (activeTab === "rejected") return matchesSearch && app.status === "Rejected";
    return matchesSearch;
  });

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Page Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            STORE VERIFICATION
          </Text>
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
            { key: "pending", label: `Pending (${applications.filter(a => a.status === 'Pending' || a.status === 'Under Review').length})` },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
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
            placeholder="Search store or owner..."
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
          <Text className="flex-[2] font-black text-xs text-gray-400 uppercase tracking-wider">Store & ID</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Owner</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Barangay Location</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Status</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Date Applied</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider text-right">Actions</Text>
        </View>

        {/* Table Rows */}
        {filteredApps.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <Ionicons name="documents-outline" size={36} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-sm mt-3">No applications found</Text>
            <Text className="text-gray-400 text-xs mt-1">No applications matching current filters</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[600px]">
            {filteredApps.map((app) => (
              <View
                key={app.id}
                className="flex-col md:flex-row px-8 py-4 items-start md:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
              >
                <View className="flex-[2] mb-2 md:mb-0">
                  <Text className="font-black text-gray-900 text-base">{app.store}</Text>
                  <Text className="text-xs text-gray-400 font-mono">{app.id} • {app.type}</Text>
                </View>
                <Text className="flex-1 text-gray-700 text-xs font-semibold mb-1 md:mb-0">{app.owner}</Text>
                <Text className="flex-1 text-gray-500 text-xs mb-2 md:mb-0">{app.location}</Text>
                <View className="flex-1 mb-2 md:mb-0">
                  <View
                    className={`self-start px-3 py-1 rounded-full ${
                      app.status === "Pending"
                        ? "bg-amber-100"
                        : app.status === "Under Review"
                        ? "bg-blue-100"
                        : app.status === "Approved"
                        ? "bg-emerald-100"
                        : "bg-red-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        app.status === "Pending"
                          ? "text-amber-800"
                          : app.status === "Under Review"
                          ? "text-blue-800"
                          : app.status === "Approved"
                          ? "text-emerald-800"
                          : "text-red-800"
                      }`}
                    >
                      {app.status}
                    </Text>
                  </View>
                </View>
                <Text className="flex-1 text-gray-400 text-xs mb-3 md:mb-0">{app.date}</Text>

                <View className="flex-1 flex-row gap-2 md:justify-end w-full md:w-auto">
                  {app.status !== "Approved" && (
                    <Pressable
                      onPress={() => handleAction(app.id, "Approved")}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex-1 md:flex-none items-center shadow-2xs"
                    >
                      <Text className="text-white font-extrabold text-xs">Approve</Text>
                    </Pressable>
                  )}
                  {app.status !== "Rejected" && (
                    <Pressable
                      onPress={() => handleAction(app.id, "Rejected")}
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
