import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminUsers,
  setAdminUserAccountStatus,
  type AdminUserItem,
} from "../../../services/admin";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchAdminUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleStatus = async (id: string, currentStatus: "active" | "suspended") => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, account_status: nextStatus } : u))
    );

    const res = await setAdminUserAccountStatus(id, nextStatus);
    if (!res.success) {
      alert(`Failed to update user status: ${res.error || "Unknown error"}`);
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, account_status: currentStatus } : u))
      );
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.display_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.phone_number.includes(search);
    if (roleFilter === "All") return matchesSearch;
    return matchesSearch && user.role === roleFilter;
  });

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            IDENTITY & ACCESS
          </Text>
          <View className="bg-orange-100 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-black text-[#EA5410] uppercase">Live Supabase Auth</Text>
          </View>
        </View>
        <Text className="text-3xl font-black text-gray-900 tracking-tight">User Account Management</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Inspect, verify, and moderate customer, merchant, and rider accounts registered in Mati City.
        </Text>
      </View>

      {/* Search and Filters */}
      <View className="flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <View className="w-full md:w-96 bg-white border border-gray-200/90 rounded-2xl px-4 py-2.5 shadow-2xs flex-row items-center gap-2">
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            placeholder="Search name, email, or phone..."
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-xs text-gray-900 outline-none"
            placeholderTextColor="#9ca3af"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-2xl">
          {["All", "Customer", "Store Admin", "Rider", "Superadmin"].map((role) => (
            <Pressable
              key={role}
              onPress={() => setRoleFilter(role)}
              className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                roleFilter === role ? "bg-white shadow-2xs" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  roleFilter === role ? "text-[#EA5410]" : "text-gray-500"
                }`}
              >
                {role}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Users Table */}
      <View className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50/80 px-8 py-4 border-b border-gray-200 hidden md:flex">
          <Text className="flex-[2] font-black text-xs text-gray-400 uppercase tracking-wider">User & Email</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Role</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Phone</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider">Status</Text>
          <Text className="flex-1 font-black text-xs text-gray-400 uppercase tracking-wider text-right">Actions</Text>
        </View>

        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#EA5410" />
            <Text className="text-xs text-gray-400 mt-2">Loading user accounts from Supabase...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <Ionicons name="people-outline" size={36} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-sm mt-3">No users match your criteria</Text>
            <Text className="text-gray-400 text-xs mt-1">Try searching a different name or role</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[600px]">
            {filteredUsers.map((user) => (
              <View
                key={user.id}
                className="flex-col md:flex-row px-8 py-4 items-start md:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
              >
                {/* User Info */}
                <View className="flex-[2] flex-row items-center gap-3.5 mb-2 md:mb-0">
                  <View className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center border border-gray-200/60">
                    <Ionicons
                      name={
                        user.role === "Superadmin"
                          ? "shield-checkmark"
                          : user.role === "Store Admin"
                          ? "storefront"
                          : user.role === "Rider"
                          ? "bicycle"
                          : "person"
                      }
                      size={18}
                      color={
                        user.role === "Superadmin"
                          ? "#EA5410"
                          : user.role === "Store Admin"
                          ? "#D97706"
                          : user.role === "Rider"
                          ? "#2563EB"
                          : "#4B5563"
                      }
                    />
                  </View>
                  <View className="flex-1 pr-2">
                    <Text className="font-black text-gray-900 text-sm">{user.display_name}</Text>
                    <Text className="text-xs text-gray-400 font-mono">{user.email}</Text>
                  </View>
                </View>

                {/* Role Pill */}
                <View className="flex-1 mb-2 md:mb-0">
                  <View
                    className={`self-start px-2.5 py-0.5 rounded-md ${
                      user.role === "Superadmin"
                        ? "bg-red-100"
                        : user.role === "Store Admin"
                        ? "bg-orange-100"
                        : user.role === "Rider"
                        ? "bg-blue-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        user.role === "Superadmin"
                          ? "text-red-800"
                          : user.role === "Store Admin"
                          ? "text-[#EA5410]"
                          : user.role === "Rider"
                          ? "text-blue-800"
                          : "text-gray-700"
                      }`}
                    >
                      {user.role}
                    </Text>
                  </View>
                </View>

                {/* Contact */}
                <Text className="flex-1 text-gray-600 text-xs font-medium mb-2 md:mb-0">
                  {user.phone_number || "No phone added"}
                </Text>

                {/* Status Indicator */}
                <View className="flex-1 mb-3 md:mb-0">
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className={`w-2 h-2 rounded-full ${
                        user.account_status === "active" ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <Text
                      className={`font-bold text-xs ${
                        user.account_status === "active" ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {user.account_status === "active" ? "Active" : "Suspended"}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-1 flex-row gap-2 md:justify-end w-full md:w-auto">
                  {user.role !== "Superadmin" && (
                    <Pressable
                      onPress={() => toggleStatus(user.id, user.account_status)}
                      className={`px-3.5 py-1.5 rounded-xl border transition-colors flex-1 md:flex-none items-center ${
                        user.account_status === "active"
                          ? "bg-red-50 border-red-200 hover:bg-red-100"
                          : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      <Text
                        className={`font-bold text-xs ${
                          user.account_status === "active" ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {user.account_status === "active" ? "Suspend" : "Restore"}
                      </Text>
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
