import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminUsersWithStatus,
  setAdminUserAccountStatus,
  setAdminUserPlatformRole,
  adminResetCustomerCodStrikes,
  deleteAdminUser,
  subscribeToAdminUsers,
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
  const [deleteCandidate, setDeleteCandidate] = useState<AdminUserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    const unsub = subscribeToAdminUsers(loadUsers);
    return () => {
      unsub();
    };
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

  const handleConfirmDeleteUser = async () => {
    if (!deleteCandidate) return;
    const target = deleteCandidate;
    setDeleting(true);
    setProcessingId(target.id);
    try {
      const res = await deleteAdminUser(target.id);
      if (res.success) {
        setDeleteCandidate(null);
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        const storeNote =
          res.deletedStoresCount && res.deletedStoresCount > 0
            ? ` and ${res.deletedStoresCount} owned store(s)`
            : "";
        setBanner({
          type: "success",
          message: `Deleted ${target.display_name} (${target.email})${storeNote} permanently.`,
        });
      } else {
        setDeleteCandidate(null);
        setBanner({
          type: "error",
          message: `Failed to delete user: ${res.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      setDeleteCandidate(null);
      setBanner({
        type: "error",
        message: `Delete user error: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setDeleting(false);
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
      <View className="flex-row flex-wrap items-center justify-between gap-3 mb-5">
        <View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Users</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Manage customer, merchant, and rider accounts.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh users list"
          disabled={loading}
          onPress={loadUsers}
          className="h-8 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex-row items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Ionicons
            name="refresh"
            size={13}
            color={loading ? "#9CA3AF" : "#4B5563"}
          />
          <Text className="text-[11px] font-semibold text-gray-700">
            {loading ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Summary Cards */}
      <View className="flex-row flex-wrap gap-3.5 mb-5">
        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex-row items-start justify-between">
          <View>
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Total Users
            </Text>
            <Text className="text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">
              {users.length}
            </Text>
            <Text className="text-[11px] text-gray-500 mt-1">Registered accounts</Text>
          </View>
          <View className="w-8 h-8 rounded-xl bg-gray-100 items-center justify-center">
            <Ionicons name="people-outline" size={16} color="#4B5563" />
          </View>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex-row items-start justify-between">
          <View>
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Active Riders
            </Text>
            <Text className="text-xl lg:text-2xl font-bold text-blue-600 tabular-nums">
              {totalRiders}
            </Text>
            <Text className="text-[11px] text-gray-500 mt-1">Approved delivery riders</Text>
          </View>
          <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
            <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
          </View>
        </View>

        <View className="w-full sm:w-auto sm:flex-1 sm:min-w-[175px] bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex-row items-start justify-between">
          <View>
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Flagged Accounts
            </Text>
            <Text className="text-xl lg:text-2xl font-bold text-amber-600 tabular-nums">
              {strikedCustomers}
            </Text>
            <Text className="text-[11px] text-gray-500 mt-1">Cash on delivery restrictions</Text>
          </View>
          <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
            <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
          </View>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
        <View className="flex-row items-center gap-3 w-full lg:w-auto">
          <View className="flex-1 lg:flex-none lg:w-80 h-9 bg-white border border-gray-200/90 rounded-xl px-3 shadow-2xs flex-row items-center gap-2">
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
          {!loading && (
            <Text className="text-[11px] font-medium text-gray-400 hidden sm:flex tabular-nums">
              Showing {filteredUsers.length} of {users.length}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl min-h-[36px] self-start lg:self-auto">
          {USER_ROLE_FILTERS.map((role) => (
            <Pressable
              key={role.value}
              onPress={() => setRoleFilter(role.value)}
              className={`h-7 px-3 rounded-lg items-center justify-center transition-colors cursor-pointer ${
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
      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden mb-6">
        {/* Table Header */}
        <View className="hidden lg:flex flex-row items-center bg-gray-50/90 px-5 py-3 border-b border-gray-200 gap-4">
          <Text className="flex-1 min-w-[200px] font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            User
          </Text>
          <Text className="w-[100px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Role
          </Text>
          <Text className="w-[122px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Phone
          </Text>
          <Text className="w-[96px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Status
          </Text>
          <Text className="w-[264px] xl:w-[310px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider text-right">
            Actions
          </Text>
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
          <View>
            {filteredUsers.map((user, index) => {
              const isRider = user.role === "Rider";
              const isCustomer = user.role === "Customer";
              const hasStrikes =
                (user.cod_strikes && user.cod_strikes > 0) || user.cod_eligible === false;
              const isProcessing = processingId === user.id;
              const isLast = index === filteredUsers.length - 1;

              return (
                <View
                  key={user.id}
                  className={`flex-col lg:flex-row px-5 py-3.5 items-start lg:items-center gap-3 lg:gap-4 hover:bg-gray-50/70 transition-colors ${
                    isLast ? "" : "border-b border-gray-100"
                  }`}
                >
                  {/* User Info */}
                  <View className="w-full lg:w-auto lg:flex-1 lg:min-w-[200px] min-w-0 flex-row items-center gap-3">
                    <View className="w-9 h-9 shrink-0 rounded-xl bg-gray-100 items-center justify-center border border-gray-200/60">
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
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="font-bold text-gray-900 text-xs" numberOfLines={1}>
                          {user.display_name}
                        </Text>
                        {hasStrikes && (
                          <View className="bg-rose-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] font-bold text-rose-800 uppercase">
                              {user.cod_strikes || 0} Strike
                              {user.cod_strikes && user.cod_strikes > 1 ? "s" : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-gray-500 font-mono" numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                  </View>

                  {/* Role Pill */}
                  <View className="lg:w-[100px] lg:shrink-0">
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
                  <View className="lg:w-[122px] lg:shrink-0">
                    {user.phone_number ? (
                      <Text className="text-gray-700 text-xs font-medium tabular-nums" numberOfLines={1}>
                        {user.phone_number}
                      </Text>
                    ) : (
                      <Text className="text-gray-400 text-[11px] italic">Not provided</Text>
                    )}
                  </View>

                  {/* Status Indicator */}
                  <View className="lg:w-[96px] lg:shrink-0">
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

                  {/* Actions — Single horizontal row on desktop */}
                  <View className="w-full lg:w-[264px] xl:w-[310px] lg:shrink-0 flex-row flex-wrap xl:flex-nowrap items-center gap-1.5 lg:justify-end">
                    {hasStrikes && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => handleResetCodStrikes(user.id)}
                        className="h-8 px-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 items-center justify-center flex-row gap-1 cursor-pointer"
                      >
                        <Ionicons name="refresh" size={11} color="#B45309" />
                        <Text className="text-[11px] font-semibold text-amber-900">
                          Reset Strikes
                        </Text>
                      </Pressable>
                    )}

                    {(isRider || isCustomer) && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => handleToggleRiderRole(user.id, isRider)}
                        className={`h-8 px-2.5 rounded-lg border items-center justify-center flex-row gap-1.5 cursor-pointer ${
                          isRider
                            ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Ionicons
                          name={isRider ? "bicycle" : "bicycle-outline"}
                          size={12}
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

                    {user.role === "Superadmin" ? (
                      <View className="h-8 px-2.5 rounded-lg bg-gray-50 border border-gray-200/80 flex-row items-center gap-1.5">
                        <Ionicons name="lock-closed-outline" size={11} color="#9CA3AF" />
                        <Text className="text-[11px] font-medium text-gray-400">Protected</Text>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => toggleStatus(user.id, user.account_status)}
                          className={`h-8 px-3 rounded-lg border transition-colors items-center justify-center cursor-pointer ${
                            user.account_status === "active"
                              ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                              : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          <Text
                            className={`font-semibold text-[11px] ${
                              user.account_status === "active" ? "text-amber-800" : "text-emerald-700"
                            }`}
                          >
                            {user.account_status === "active" ? "Suspend" : "Restore"}
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${user.display_name}`}
                          disabled={isProcessing}
                          onPress={() => setDeleteCandidate(user)}
                          className="w-8 h-8 rounded-lg border border-red-200/80 bg-white hover:bg-red-50 hover:border-red-300 items-center justify-center cursor-pointer transition-colors"
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
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

      {/* Delete User Confirmation Modal */}
      <Modal
        visible={Boolean(deleteCandidate)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteCandidate(null);
        }}
      >
        <Pressable
          onPress={() => {
            if (!deleting) setDeleteCandidate(null);
          }}
          className="flex-1 bg-black/50 items-center justify-center p-4"
        >
          <Pressable
            onPress={() => {}}
            className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 items-center justify-center">
                <Ionicons name="warning-outline" size={20} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">Permanently Delete User</Text>
                <Text className="text-xs text-gray-500">This action cannot be undone</Text>
              </View>
            </View>

            {deleteCandidate ? (
              <View className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
                <Text className="text-xs font-bold text-gray-900">{deleteCandidate.display_name}</Text>
                <Text className="text-[11px] text-gray-500 font-mono mt-0.5">{deleteCandidate.email}</Text>
                <Text className="text-[11px] font-semibold text-gray-600 mt-1">
                  Role: {displayRoleLabel(deleteCandidate.role, deleteCandidate.role)}
                </Text>
              </View>
            ) : null}

            <Text className="text-xs text-gray-600 leading-relaxed mb-5">
              Deleting this account permanently removes their login credentials along with their
              profile, orders, table reservations, community posts, notifications, and any store
              exclusively owned by this account.
            </Text>

            <View className="flex-row justify-end gap-2.5">
              <Pressable
                disabled={deleting}
                onPress={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100"
              >
                <Text className="text-xs font-semibold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={deleting}
                onPress={handleConfirmDeleteUser}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 flex-row items-center gap-1.5"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="trash-outline" size={13} color="white" />
                )}
                <Text className="text-xs font-bold text-white">
                  {deleting ? "Deleting..." : "Delete User"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
