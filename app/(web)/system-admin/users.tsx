import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminUsersWithStatus,
  setAdminUserAccountStatus,
  setAdminUserPlatformRole,
  adminResetCustomerCodStrikes,
  type AdminUserItem,
} from "../../../services/admin";
import { getUserAccountStatusTheme, getUserRoleTheme } from "../../../lib/status-tokens";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

const USER_ROLE_FILTERS = [
  { value: "All", label: "All" },
  { value: "Customer", label: "Customer" },
  { value: "Store Admin", label: "Merchant" },
  { value: "Rider", label: "Rider" },
  { value: "Superadmin", label: "Admin" },
] as const;

function displayRoleLabel(role: string, fallback: string): string {
  if (role === "Store Admin") return "Merchant";
  if (role === "Superadmin") return "Admin";
  return fallback;
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await fetchAdminUsersWithStatus();
    setUsers(data);
    if (error) {
      setBanner({
        type: "error",
        message: `Could not load users: ${error}`,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleStatus = async (id: string, currentStatus: "active" | "suspended") => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, account_status: nextStatus } : u))
    );

    const res = await setAdminUserAccountStatus(id, nextStatus);
    if (!res.success) {
      setBanner({
        type: "error",
        message: `Failed to update status: ${res.error || "Unknown error"}`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, account_status: currentStatus } : u))
      );
    } else {
      setBanner({
        type: "success",
        message: `Account marked as ${nextStatus}.`,
      });
    }
  };

  const handleToggleRiderRole = async (userId: string, isRider: boolean) => {
    setProcessingId(userId);
    const nextGrant = !isRider;
    try {
      const res = await setAdminUserPlatformRole(userId, "rider", nextGrant);
      if (res.success) {
        setBanner({
          type: "success",
          message: nextGrant ? "Rider role assigned." : "Rider role removed.",
        });
        await loadUsers();
      } else {
        setBanner({
          type: "error",
          message: `Failed to update role: ${res.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Role update error: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResetCodStrikes = async (userId: string) => {
    setProcessingId(userId);
    try {
      const res = await adminResetCustomerCodStrikes(userId);
      if (res.success) {
        setBanner({
          type: "success",
          message: "COD strikes reset to 0.",
        });
        await loadUsers();
      } else {
        setBanner({
          type: "error",
          message: `Failed to reset strikes: ${res.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      setBanner({
        type: "error",
        message: `Reset error: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setProcessingId(null);
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

  const totalRiders = users.filter((u) => u.role === "Rider").length;
  const strikedCustomers = users.filter(
    (u) => (u.cod_strikes && u.cod_strikes > 0) || u.cod_eligible === false
  ).length;

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Header */}
      <View className="mb-5">
        <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Users</Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          Manage customer, merchant, and rider accounts.
        </Text>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Summary Cards */}
      <View className="flex-row flex-wrap gap-3.5 mb-5">
        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Users
          </Text>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900">{users.length}</Text>
          <Text className="text-[11px] text-gray-500 mt-1">Registered accounts</Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Active Riders
          </Text>
          <Text className="text-xl lg:text-2xl font-bold text-blue-600">{totalRiders}</Text>
          <Text className="text-[11px] text-gray-500 mt-1">Approved delivery riders</Text>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Flagged Accounts
          </Text>
          <Text className="text-xl lg:text-2xl font-bold text-amber-600">{strikedCustomers}</Text>
          <Text className="text-[11px] text-gray-500 mt-1">Cash on delivery restrictions</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
        <View className="w-full lg:w-72 bg-white border border-gray-200/90 rounded-xl px-3 py-2 shadow-2xs flex-row items-center gap-2">
          <Ionicons name="search" size={14} color="#9CA3AF" />
          <TextInput
            placeholder="Search name, email, or phone..."
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-xs text-gray-900 outline-none"
            placeholderTextColor="#9ca3af"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={14} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
          {USER_ROLE_FILTERS.map((role) => (
            <Pressable
              key={role.value}
              onPress={() => setRoleFilter(role.value)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                roleFilter === role.value ? "bg-white shadow-2xs" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  roleFilter === role.value ? "text-[#EA5410]" : "text-gray-500"
                }`}
              >
                {role.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Users Table */}
      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50/80 px-5 py-3 border-b border-gray-200 hidden lg:flex">
          <Text className="flex-[2] font-bold text-[11px] text-gray-400 uppercase tracking-wider">User</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Role</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Phone</Text>
          <Text className="flex-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider">Status</Text>
          <Text className="flex-[1.5] font-bold text-[11px] text-gray-400 uppercase tracking-wider text-right">Actions</Text>
        </View>

        {loading ? (
          <View className="py-14 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-[11px] text-gray-400 mt-2">Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Ionicons name="people-outline" size={28} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-xs mt-2.5">No users found</Text>
            <Text className="text-gray-400 text-[11px] mt-0.5">
              Try adjusting your search or role filter.
            </Text>
          </View>
        ) : (
          <ScrollView className="max-h-[540px]">
            {filteredUsers.map((user) => {
              const isRider = user.role === "Rider";
              const isCustomer = user.role === "Customer";
              const hasStrikes =
                (user.cod_strikes && user.cod_strikes > 0) || user.cod_eligible === false;
              const isProcessing = processingId === user.id;

              return (
                <View
                  key={user.id}
                  className="flex-col lg:flex-row px-5 py-3 items-start lg:items-center border-b border-gray-100 hover:bg-gray-50/70 transition-colors gap-2.5 lg:gap-0"
                >
                  {/* User Info */}
                  <View className="w-full lg:w-auto lg:flex-[2] flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-xl bg-gray-100 items-center justify-center border border-gray-200/60">
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
                        size={15}
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
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="font-bold text-gray-900 text-xs">{user.display_name}</Text>
                        {hasStrikes && (
                          <View className="bg-rose-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] font-bold text-rose-800 uppercase">
                              {user.cod_strikes || 0} Strike
                              {user.cod_strikes && user.cod_strikes > 1 ? "s" : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-gray-400 font-mono">{user.email}</Text>
                    </View>
                  </View>

                  {/* Role Pill */}
                  <View className="lg:flex-1">
                    {(() => {
                      const roleTheme = getUserRoleTheme(user.role);
                      return (
                        <View className={`self-start px-2 py-0.5 rounded ${roleTheme.badgeBg}`}>
                          <Text className={`text-[9px] font-bold uppercase tracking-wider ${roleTheme.badgeText}`}>
                            {displayRoleLabel(user.role, roleTheme.label)}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Contact */}
                  <Text className="lg:flex-1 text-gray-600 text-[11px] font-medium">
                    {user.phone_number || "Not provided"}
                  </Text>

                  {/* Status Indicator */}
                  <View className="lg:flex-1">
                    {(() => {
                      const accountTheme = getUserAccountStatusTheme(user.account_status);
                      return (
                        <View className="flex-row items-center gap-1.5">
                          <View className={`w-1.5 h-1.5 rounded-full ${accountTheme.dotColor}`} />
                          <Text className={`font-semibold text-[11px] ${accountTheme.badgeText}`}>
                            {accountTheme.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Actions */}
                  <View className="lg:flex-[1.5] flex-row flex-wrap gap-1.5 lg:justify-end w-full lg:w-auto items-center">
                    {hasStrikes && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => handleResetCodStrikes(user.id)}
                        className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 items-center flex-row gap-1 cursor-pointer"
                      >
                        <Ionicons name="refresh" size={11} color="#B45309" />
                        <Text className="text-[11px] font-semibold text-amber-900">Reset Strikes</Text>
                      </Pressable>
                    )}

                    {(isRider || isCustomer) && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => handleToggleRiderRole(user.id, isRider)}
                        className={`px-2.5 py-1 rounded-lg border items-center flex-row gap-1 cursor-pointer ${
                          isRider
                            ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Ionicons
                          name={isRider ? "bicycle" : "bicycle-outline"}
                          size={11}
                          color={isRider ? "#1D4ED8" : "#4B5563"}
                        />
                        <Text
                          className={`text-[11px] font-semibold ${
                            isRider ? "text-blue-800" : "text-gray-700"
                          }`}
                        >
                          {isRider ? "Revoke Rider" : "Assign Rider"}
                        </Text>
                      </Pressable>
                    )}

                    {user.role !== "Superadmin" && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => toggleStatus(user.id, user.account_status)}
                        className={`px-2.5 py-1 rounded-lg border transition-colors items-center cursor-pointer ${
                          user.account_status === "active"
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        <Text
                          className={`font-semibold text-[11px] ${
                            user.account_status === "active" ? "text-red-700" : "text-emerald-700"
                          }`}
                        >
                          {user.account_status === "active" ? "Suspend" : "Restore"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
