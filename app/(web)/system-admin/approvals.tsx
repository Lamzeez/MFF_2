import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminStoreApplicationsWithStatus,
  fetchAdminRiderApplicationsWithStatus,
  setStoreApproval,
  setStoreSuspended,
  setRiderApproval,
  type StoreApplication,
  type RiderApplicationItem,
} from "../../../services/admin";
import { getStoreApprovalTheme } from "../../../lib/status-tokens";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

type StoreFilterTab = "pending" | "approved" | "suspended" | "rejected";
type RiderFilterTab = "all" | "active" | "suspended";

function getEffectiveStoreStatus(app: StoreApplication): StoreFilterTab {
  if (app.archived_at) return "suspended";
  return app.approval_status;
}

export default function ApprovalsPage() {
  const [approvalScope, setApprovalScope] = useState<"stores" | "riders">("stores");
  const [activeTab, setActiveTab] = useState<StoreFilterTab>("pending");
  const [riderFilterTab, setRiderFilterTab] = useState<RiderFilterTab>("all");
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [riderApplications, setRiderApplications] = useState<RiderApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewCandidate, setReviewCandidate] = useState<StoreApplication | null>(null);
  const [suspendCandidate, setSuspendCandidate] = useState<StoreApplication | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [storeRes, riderRes] = await Promise.all([
      fetchAdminStoreApplicationsWithStatus(),
      fetchAdminRiderApplicationsWithStatus(),
    ]);
    setApplications(storeRes.data);
    setRiderApplications(riderRes.data);
    if (storeRes.error || riderRes.error) {
      setBanner({
        type: "error",
        message: storeRes.error || riderRes.error || "Could not load applications.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRiderAction = async (riderId: string, approve: boolean) => {
    setProcessingId(riderId);
    try {
      const res = await setRiderApproval(riderId, approve);
      if (res.success) {
        setRiderApplications((prev) =>
          prev.map((r) =>
            r.id === riderId
              ? {
                  ...r,
                  account_status: approve ? "active" : "suspended",
                  is_approved_rider: approve,
                }
              : r
          )
        );
        setBanner({
          type: approve ? "success" : "info",
          message: approve
            ? "Rider application approved and courier dispatch access activated."
            : "Rider account suspended from active delivery dispatches.",
        });
      } else {
        setBanner({
          type: "error",
          message: `Failed to update rider: ${res.error || "Unknown error"}`,
        });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setProcessingId(id);
    try {
      const res = await setStoreApproval(id, action);
      if (res.success) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, approval_status: action, archived_at: null } : app
          )
        );
        setReviewCandidate((prev) =>
          prev && prev.id === id
            ? { ...prev, approval_status: action, archived_at: null }
            : prev
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
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspension = async (store: StoreApplication, suspend: boolean) => {
    setProcessingId(store.id);
    try {
      const res = await setStoreSuspended(store.id, suspend);
      if (res.success) {
        const nextArchivedAt = suspend ? new Date().toISOString() : null;
        setApplications((prev) =>
          prev.map((app) =>
            app.id === store.id ? { ...app, archived_at: nextArchivedAt } : app
          )
        );
        setReviewCandidate((prev) =>
          prev && prev.id === store.id ? { ...prev, archived_at: nextArchivedAt } : prev
        );
        setSuspendCandidate(null);
        setBanner({
          type: suspend ? "info" : "success",
          message: suspend
            ? `${store.name} has been suspended and hidden from customer discovery.`
            : `${store.name} has been reinstated and restored to active operations.`,
        });
      } else {
        setSuspendCandidate(null);
        setBanner({
          type: "error",
          message: `Failed to update suspension: ${res.error || "Unknown error"}`,
        });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const openExternalUrl = (url: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    void Linking.openURL(url);
  };

  const filteredApps = applications.filter((app) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      app.name.toLowerCase().includes(q) ||
      app.address_text.toLowerCase().includes(q) ||
      app.barangay.toLowerCase().includes(q) ||
      (app.owner_name || "").toLowerCase().includes(q) ||
      (app.owner_email || "").toLowerCase().includes(q) ||
      (app.categories || []).some((cat) => cat.toLowerCase().includes(q));
    return matchesSearch && getEffectiveStoreStatus(app) === activeTab;
  });

  const filteredRiders = riderApplications.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.display_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone_number.toLowerCase().includes(q);
    const matchesTab =
      riderFilterTab === "all" ||
      (riderFilterTab === "active" && r.account_status === "active") ||
      (riderFilterTab === "suspended" && r.account_status === "suspended");
    return matchesSearch && matchesTab;
  });

  const pendingCount = applications.filter((a) => getEffectiveStoreStatus(a) === "pending").length;
  const approvedCount = applications.filter((a) => getEffectiveStoreStatus(a) === "approved").length;
  const suspendedCount = applications.filter((a) => getEffectiveStoreStatus(a) === "suspended").length;
  const rejectedCount = applications.filter((a) => getEffectiveStoreStatus(a) === "rejected").length;

  const activeRidersCount = riderApplications.filter((r) => r.account_status === "active").length;
  const suspendedRidersCount = riderApplications.filter((r) => r.account_status === "suspended").length;

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Page Header */}
      <View className="flex-row flex-wrap items-center justify-between gap-3 mb-4">
        <View>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            Applications & Approvals
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Inspect submitted storefront permits, review rider applications, and manage platform dispatch access.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh applications"
          disabled={loading}
          onPress={loadData}
          className="h-8 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex-row items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Ionicons name="refresh" size={13} color={loading ? "#9CA3AF" : "#4B5563"} />
          <Text className="text-[11px] font-semibold text-gray-700">
            {loading ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>
      </View>

      {/* Category Scope Selector: Store Applications vs Courier Applications */}
      <View className="flex-row items-center bg-gray-100 p-1 rounded-xl w-fit mb-4 self-start">
        <Pressable
          onPress={() => {
            setApprovalScope("stores");
            setSearch("");
          }}
          className={`px-4 py-1.5 rounded-lg flex-row items-center gap-1.5 cursor-pointer ${
            approvalScope === "stores" ? "bg-white shadow-2xs" : "hover:bg-gray-200/60"
          }`}
        >
          <Ionicons
            name="storefront"
            size={14}
            color={approvalScope === "stores" ? "#EA5410" : "#6B7280"}
          />
          <Text
            className={`text-xs font-bold ${
              approvalScope === "stores" ? "text-gray-900" : "text-gray-600"
            }`}
          >
            Store Applications ({applications.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setApprovalScope("riders");
            setSearch("");
          }}
          className={`px-4 py-1.5 rounded-lg flex-row items-center gap-1.5 cursor-pointer ${
            approvalScope === "riders" ? "bg-white shadow-2xs" : "hover:bg-gray-200/60"
          }`}
        >
          <Ionicons
            name="bicycle"
            size={14}
            color={approvalScope === "riders" ? "#EA5410" : "#6B7280"}
          />
          <Text
            className={`text-xs font-bold ${
              approvalScope === "riders" ? "text-gray-900" : "text-gray-600"
            }`}
          >
            Courier Applications ({riderApplications.length})
          </Text>
        </Pressable>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Search (Left) & Filters (Right) */}
      <View className="flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
        <View className="flex-row items-center gap-3 w-full lg:w-auto">
          <View className="flex-1 lg:flex-none lg:w-80 h-9 bg-white border border-gray-200/90 rounded-xl px-3 shadow-2xs flex-row items-center gap-2">
            <Ionicons name="search" size={14} color="#9CA3AF" />
            <TextInput
              placeholder={
                approvalScope === "stores"
                  ? "Search store, owner, or location..."
                  : "Search courier name, phone, or email..."
              }
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
              Showing{" "}
              {approvalScope === "stores"
                ? `${filteredApps.length} of ${applications.length}`
                : `${filteredRiders.length} of ${riderApplications.length}`}
            </Text>
          )}
        </View>

        {approvalScope === "stores" ? (
          <View className="flex-row flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl min-h-[36px] self-start lg:self-auto">
            {(
              [
                { key: "pending", label: `Pending (${pendingCount})` },
                { key: "approved", label: `Approved (${approvedCount})` },
                { key: "suspended", label: `Suspended (${suspendedCount})` },
                { key: "rejected", label: `Rejected (${rejectedCount})` },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`h-7 px-3 rounded-lg items-center justify-center transition-colors cursor-pointer ${
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
        ) : (
          <View className="flex-row flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl min-h-[36px] self-start lg:self-auto">
            {(
              [
                { key: "all", label: `All (${riderApplications.length})` },
                { key: "active", label: `Active (${activeRidersCount})` },
                { key: "suspended", label: `Suspended (${suspendedRidersCount})` },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setRiderFilterTab(tab.key)}
                className={`h-7 px-3 rounded-lg items-center justify-center transition-colors cursor-pointer ${
                  riderFilterTab === tab.key ? "bg-white shadow-2xs" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    riderFilterTab === tab.key ? "text-[#EA5410]" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Data Table */}
      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden mb-6">
        {approvalScope === "riders" ? (
          <>
            {/* Courier Table Header */}
            <View className="hidden lg:flex flex-row items-center bg-gray-50/90 px-5 py-3 border-b border-gray-200 gap-4">
              <Text className="flex-1 min-w-[220px] font-bold text-[11px] text-gray-400 uppercase tracking-wider">
                Courier & Contact
              </Text>
              <Text className="w-[200px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
                Vehicle & Coverage
              </Text>
              <Text className="w-[110px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
                Dispatch Status
              </Text>
              <Text className="w-[110px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
                Registered
              </Text>
              <Text className="w-[180px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider text-right">
                Actions
              </Text>
            </View>

            {/* Courier Rows */}
            {loading ? (
              <View className="py-14 items-center justify-center">
                <ActivityIndicator size="small" color="#EA5410" />
                <Text className="text-[11px] text-gray-400 mt-2">Loading couriers...</Text>
              </View>
            ) : filteredRiders.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="bicycle-outline" size={28} color="#CBD5E1" />
                <Text className="text-gray-700 font-bold text-xs mt-2.5">No couriers found</Text>
                <Text className="text-gray-400 text-[11px] mt-0.5">
                  No courier applications match this filter.
                </Text>
              </View>
            ) : (
              <View>
                {filteredRiders.map((rider, index) => {
                  const isProcessing = processingId === rider.id;
                  const isLast = index === filteredRiders.length - 1;
                  const isActive = rider.account_status === "active";

                  return (
                    <View
                      key={rider.id}
                      className={`flex-col lg:flex-row px-5 py-3.5 items-start lg:items-center gap-3 lg:gap-4 hover:bg-gray-50/70 transition-colors ${
                        isLast ? "" : "border-b border-gray-100"
                      }`}
                    >
                      {/* Courier & Contact */}
                      <View className="w-full lg:w-auto lg:flex-1 lg:min-w-[220px] min-w-0 flex-row items-center gap-3">
                        <View className="w-10 h-10 shrink-0 rounded-xl bg-orange-50 border border-orange-200 items-center justify-center">
                          <Ionicons name="bicycle" size={18} color="#EA5410" />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="font-bold text-gray-900 text-xs sm:text-sm" numberOfLines={1}>
                            {rider.display_name}
                          </Text>
                          <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                            {rider.email}
                          </Text>
                          <Text className="text-[10px] text-gray-400 font-medium">
                            {rider.phone_number || "No contact phone"}
                          </Text>
                        </View>
                      </View>

                      {/* Vehicle & Coverage */}
                      <View className="w-full lg:w-[200px] lg:shrink-0 min-w-0">
                        <Text className="text-gray-800 text-xs font-semibold" numberOfLines={1}>
                          {rider.vehicle_info || "Motorcycle (Verified Delivery)"}
                        </Text>
                        <Text className="text-gray-500 text-[11px] mt-0.5" numberOfLines={1}>
                          {rider.barangay || "Mati City Wide"}
                        </Text>
                      </View>

                      {/* Dispatch Status */}
                      <View className="lg:w-[110px] lg:shrink-0">
                        <View
                          className={`self-start px-2.5 py-0.5 rounded-full ${
                            isActive ? "bg-emerald-100" : "bg-red-100"
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              isActive ? "text-emerald-800" : "text-red-800"
                            }`}
                          >
                            {isActive ? "Approved" : "Suspended"}
                          </Text>
                        </View>
                      </View>

                      {/* Registered */}
                      <Text className="lg:w-[110px] lg:shrink-0 text-gray-500 text-[11px] tabular-nums">
                        {new Date(rider.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>

                      {/* Credentials / Verification Documents */}
                      <View className="w-full lg:w-[130px] lg:shrink-0 flex-row items-center gap-1.5 flex-wrap">
                        {rider.license_document_url ? (
                          <Pressable
                            onPress={() => openExternalUrl(rider.license_document_url!)}
                            className="px-2 py-0.5 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md cursor-pointer flex-row items-center gap-1"
                          >
                            <Ionicons name="document-text" size={11} color="#0284c7" />
                            <Text className="text-[10px] font-bold text-sky-800">License</Text>
                          </Pressable>
                        ) : null}
                        {rider.vehicle_document_url ? (
                          <Pressable
                            onPress={() => openExternalUrl(rider.vehicle_document_url!)}
                            className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md cursor-pointer flex-row items-center gap-1"
                          >
                            <Ionicons name="card" size={11} color="#4f46e5" />
                            <Text className="text-[10px] font-bold text-indigo-800">OR/CR</Text>
                          </Pressable>
                        ) : null}
                        {!rider.license_document_url && !rider.vehicle_document_url ? (
                          <Text className="text-[10px] text-gray-400 italic">No files</Text>
                        ) : null}
                      </View>

                      {/* Actions */}
                      <View className="w-full lg:w-[180px] lg:shrink-0 flex-row items-center gap-1.5 lg:justify-end">
                        {isActive ? (
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleRiderAction(rider.id, false)}
                            className="h-8 px-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors items-center justify-center cursor-pointer"
                          >
                            <Text className="text-amber-800 font-bold text-[11px]">Suspend</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => handleRiderAction(rider.id, true)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Text className="text-white font-bold text-[11px]">Approve Courier</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Table Header */}
        <View className="hidden lg:flex flex-row items-center bg-gray-50/90 px-5 py-3 border-b border-gray-200 gap-4">
          <Text className="flex-1 min-w-[220px] font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Store & Owner
          </Text>
          <Text className="w-[185px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Location
          </Text>
          <Text className="w-[108px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Proof
          </Text>
          <Text className="w-[96px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Status
          </Text>
          <Text className="w-[92px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Submitted
          </Text>
          <Text className="w-[235px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider text-right">
            Actions
          </Text>
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
            <Text className="text-gray-700 font-bold text-xs mt-2.5">No stores found</Text>
            <Text className="text-gray-400 text-[11px] mt-0.5">
              No stores currently match this filter.
            </Text>
          </View>
        ) : (
          <View>
            {filteredApps.map((app, index) => {
              const isProcessing = processingId === app.id;
              const isLast = index === filteredApps.length - 1;
              const proofUrl = app.verification_document_url || null;
              const thumbUrl = proofUrl || app.cover_image_url || null;
              const effectiveStatus = getEffectiveStoreStatus(app);
              const statusTheme = getStoreApprovalTheme(effectiveStatus);
              const categoryList =
                app.categories && app.categories.length > 0 ? app.categories : [];

              return (
                <View
                  key={app.id}
                  className={`flex-col lg:flex-row px-5 py-3.5 items-start lg:items-center gap-3 lg:gap-4 hover:bg-gray-50/70 transition-colors ${
                    isLast ? "" : "border-b border-gray-100"
                  }`}
                >
                  {/* Store & Owner */}
                  <Pressable
                    onPress={() => setReviewCandidate(app)}
                    className="w-full lg:w-auto lg:flex-1 lg:min-w-[220px] min-w-0 flex-row items-center gap-3 cursor-pointer"
                  >
                    {thumbUrl ? (
                      <Image
                        source={{ uri: thumbUrl }}
                        className="w-10 h-10 shrink-0 rounded-xl border border-gray-200 bg-gray-100"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-10 h-10 shrink-0 rounded-xl bg-orange-50 border border-orange-100 items-center justify-center">
                        <Ionicons name="storefront-outline" size={17} color="#EA5410" />
                      </View>
                    )}

                    <View className="flex-1 min-w-0">
                      <Text className="font-bold text-gray-900 text-xs sm:text-sm" numberOfLines={1}>
                        {app.name}
                      </Text>
                      <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                        {app.owner_email
                          ? `${app.owner_name || "Owner"} • ${app.owner_email}`
                          : app.slug}
                      </Text>
                      {categoryList.length > 0 && (
                        <View className="flex-row flex-wrap gap-1 mt-1">
                          {categoryList.slice(0, 3).map((cat) => (
                            <View
                              key={cat}
                              className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200/60"
                            >
                              <Text className="text-[9px] font-semibold text-gray-600">{cat}</Text>
                            </View>
                          ))}
                          {categoryList.length > 3 && (
                            <Text className="text-[9px] font-semibold text-gray-400 self-center">
                              +{categoryList.length - 3}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </Pressable>

                  {/* Location */}
                  <View className="w-full lg:w-[185px] lg:shrink-0 min-w-0">
                    <Text className="text-gray-800 text-xs font-semibold" numberOfLines={1}>
                      {app.barangay || "Mati City"}
                    </Text>
                    <Text className="text-gray-500 text-[11px] mt-0.5" numberOfLines={1}>
                      {app.address_text}
                    </Text>
                  </View>

                  {/* Proof Pill */}
                  <View className="lg:w-[108px] lg:shrink-0">
                    {proofUrl ? (
                      <Pressable
                        onPress={() => setReviewCandidate(app)}
                        className="self-start h-7 px-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 flex-row items-center gap-1 cursor-pointer"
                      >
                        <Ionicons name="image-outline" size={12} color="#334155" />
                        <Text className="text-[10px] font-semibold text-slate-700">View Proof</Text>
                      </Pressable>
                    ) : (
                      <Text className="text-[11px] text-gray-400 italic">No Photo</Text>
                    )}
                  </View>

                  {/* Status */}
                  <View className="lg:w-[96px] lg:shrink-0">
                    <View className={`self-start px-2.5 py-0.5 rounded-full ${statusTheme.badgeBg}`}>
                      <Text className={`text-[9px] font-bold uppercase tracking-wider ${statusTheme.badgeText}`}>
                        {statusTheme.label}
                      </Text>
                    </View>
                  </View>

                  {/* Submitted */}
                  <Text className="lg:w-[92px] lg:shrink-0 text-gray-500 text-[11px] tabular-nums">
                    {new Date(app.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>

                  {/* Actions */}
                  <View className="w-full lg:w-[235px] lg:shrink-0 flex-row items-center gap-1.5 lg:justify-end">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Review ${app.name}`}
                      onPress={() => setReviewCandidate(app)}
                      className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex-row items-center justify-center gap-1 cursor-pointer"
                    >
                      <Ionicons name="eye-outline" size={12} color="#374151" />
                      <Text className="text-[11px] font-semibold text-gray-700">Review</Text>
                    </Pressable>

                    {effectiveStatus === "pending" && (
                      <>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleAction(app.id, "approved")}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors items-center justify-center shadow-2xs cursor-pointer"
                        >
                          <Text className="text-white font-bold text-[11px]">Approve</Text>
                        </Pressable>
                        <Pressable
                          disabled={isProcessing}
                          onPress={() => handleAction(app.id, "rejected")}
                          className="h-8 px-3 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors items-center justify-center cursor-pointer"
                        >
                          <Text className="text-red-700 font-bold text-[11px]">Reject</Text>
                        </Pressable>
                      </>
                    )}

                    {effectiveStatus === "approved" && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => setSuspendCandidate(app)}
                        className="h-8 px-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors items-center justify-center cursor-pointer"
                      >
                        <Text className="text-amber-800 font-bold text-[11px]">Suspend</Text>
                      </Pressable>
                    )}

                    {effectiveStatus === "suspended" && (
                      <Pressable
                        disabled={isProcessing}
                        onPress={() => handleSuspension(app, false)}
                        className="h-8 px-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors items-center justify-center cursor-pointer"
                      >
                        <Text className="text-emerald-700 font-bold text-[11px]">Reinstate</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
          </>
        )}
      </View>

      {/* Store Application Review Modal */}
      <Modal
        visible={Boolean(reviewCandidate)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingId) setReviewCandidate(null);
        }}
      >
        <Pressable
          onPress={() => {
            if (!processingId) setReviewCandidate(null);
          }}
          className="flex-1 bg-black/55 items-center justify-center p-4"
        >
          <Pressable
            onPress={() => {}}
            className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xl max-h-[90%]"
          >
            {reviewCandidate ? (
              <>
                {(() => {
                  const modalStatus = getEffectiveStoreStatus(reviewCandidate);
                  const statusTheme = getStoreApprovalTheme(modalStatus);
                  return (
                    <>
                      {/* Modal Header */}
                      <View className="px-6 py-4 border-b border-gray-100 flex-row items-center justify-between gap-3">
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                              {reviewCandidate.name}
                            </Text>
                            <View className={`px-2 py-0.5 rounded-full ${statusTheme.badgeBg}`}>
                              <Text className={`text-[9px] font-bold uppercase tracking-wider ${statusTheme.badgeText}`}>
                                {statusTheme.label}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {reviewCandidate.slug} • Submitted{" "}
                            {new Date(reviewCandidate.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            if (!processingId) setReviewCandidate(null);
                          }}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                        >
                          <Ionicons name="close" size={16} color="#4B5563" />
                        </Pressable>
                      </View>

                      <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
                        {/* Verification Proof Viewer */}
                        <View className="mb-5">
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              Storefront Photo / Business Permit
                            </Text>
                            {reviewCandidate.verification_document_url ? (
                              <Pressable
                                onPress={() =>
                                  openExternalUrl(reviewCandidate.verification_document_url!)
                                }
                                className="flex-row items-center gap-1 cursor-pointer"
                              >
                                <Ionicons name="open-outline" size={12} color="#EA5410" />
                                <Text className="text-[11px] font-semibold text-[#EA5410] hover:underline">
                                  Open Full Image
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>

                          {reviewCandidate.verification_document_url ? (
                            <View className="w-full h-64 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden items-center justify-center">
                              <Image
                                source={{ uri: reviewCandidate.verification_document_url }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="contain"
                                accessibilityLabel={`${reviewCandidate.name} verification document`}
                              />
                            </View>
                          ) : (
                            <View className="w-full py-10 rounded-xl border border-dashed border-gray-200 bg-gray-50 items-center justify-center">
                              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                              <Text className="text-xs font-semibold text-gray-600 mt-1.5">
                                No verification document attached
                              </Text>
                              <Text className="text-[11px] text-gray-400 mt-0.5">
                                This store record was created without a verification upload.
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Structured Info Grid */}
                        <View className="flex-col md:flex-row gap-4 mb-2">
                          {/* Store Details Card */}
                          <View className="flex-1 bg-gray-50 border border-gray-200/80 rounded-xl p-4 gap-3">
                            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              Store Information
                            </Text>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Categories
                              </Text>
                              <View className="flex-row flex-wrap gap-1.5 mt-1">
                                {(reviewCandidate.categories && reviewCandidate.categories.length > 0
                                  ? reviewCandidate.categories
                                  : ["Not specified"]
                                ).map((cat) => (
                                  <View
                                    key={cat}
                                    className="px-2 py-0.5 rounded-md bg-white border border-gray-200"
                                  >
                                    <Text className="text-[11px] font-semibold text-gray-700">{cat}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Store Contact Phone
                              </Text>
                              <Text className="text-xs font-semibold text-gray-800 mt-0.5">
                                {reviewCandidate.public_phone || "Not provided"}
                              </Text>
                            </View>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Operating Hours
                              </Text>
                              <Text className="text-xs font-semibold text-gray-800 mt-0.5">
                                {reviewCandidate.operating_hours || "Not specified"}
                              </Text>
                            </View>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Description & Specialty
                              </Text>
                              <Text className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                {reviewCandidate.description || "No description provided."}
                              </Text>
                            </View>
                          </View>

                          {/* Owner & Location Card */}
                          <View className="flex-1 bg-gray-50 border border-gray-200/80 rounded-xl p-4 gap-3">
                            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              Owner & Location Verification
                            </Text>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Owner Account
                              </Text>
                              <Text className="text-xs font-bold text-gray-900 mt-0.5">
                                {reviewCandidate.owner_name || "Owner details unavailable"}
                              </Text>
                              {reviewCandidate.owner_email ? (
                                <Text className="text-[11px] text-gray-600 font-mono mt-0.5">
                                  {reviewCandidate.owner_email}
                                </Text>
                              ) : null}
                            </View>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Owner Mobile (GCash)
                              </Text>
                              <Text className="text-xs font-semibold text-gray-800 mt-0.5">
                                {reviewCandidate.owner_phone || "Not provided"}
                              </Text>
                            </View>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Barangay & Street Address
                              </Text>
                              <Text className="text-xs font-semibold text-gray-900 mt-0.5">
                                {reviewCandidate.barangay || "Mati City"}
                              </Text>
                              <Text className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                {reviewCandidate.address_text}
                              </Text>
                            </View>

                            <View>
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase">
                                Map Pin Coordinates
                              </Text>
                              {typeof reviewCandidate.latitude === "number" &&
                              typeof reviewCandidate.longitude === "number" ? (
                                <View className="mt-1 gap-1.5">
                                  <Text className="text-xs font-mono text-gray-700">
                                    {reviewCandidate.latitude.toFixed(6)},{" "}
                                    {reviewCandidate.longitude.toFixed(6)}
                                  </Text>
                                  <Pressable
                                    onPress={() =>
                                      openExternalUrl(
                                        `https://www.openstreetmap.org/?mlat=${reviewCandidate.latitude}&mlon=${reviewCandidate.longitude}#map=17/${reviewCandidate.latitude}/${reviewCandidate.longitude}`
                                      )
                                    }
                                    className="self-start px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex-row items-center gap-1 cursor-pointer"
                                  >
                                    <Ionicons name="location-outline" size={12} color="#EA5410" />
                                    <Text className="text-[11px] font-semibold text-[#EA5410]">
                                      View Pin on OpenStreetMap
                                    </Text>
                                  </Pressable>
                                </View>
                              ) : (
                                <Text className="text-xs text-gray-400 italic mt-0.5">
                                  Coordinates not recorded
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </ScrollView>

                      {/* Modal Footer */}
                      <View className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex-row flex-wrap items-center justify-end gap-2.5">
                        <Pressable
                          disabled={Boolean(processingId)}
                          onPress={() => setReviewCandidate(null)}
                          className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 cursor-pointer"
                        >
                          <Text className="text-xs font-semibold text-gray-700">Close</Text>
                        </Pressable>

                        {modalStatus === "pending" && (
                          <>
                            <Pressable
                              disabled={Boolean(processingId)}
                              onPress={() => handleAction(reviewCandidate.id, "rejected")}
                              className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 flex-row items-center gap-1.5 cursor-pointer"
                            >
                              {processingId === reviewCandidate.id ? (
                                <ActivityIndicator size="small" color="#B91C1C" />
                              ) : (
                                <Ionicons name="close-circle-outline" size={14} color="#B91C1C" />
                              )}
                              <Text className="text-xs font-bold text-red-700">Reject Application</Text>
                            </Pressable>
                            <Pressable
                              disabled={Boolean(processingId)}
                              onPress={() => handleAction(reviewCandidate.id, "approved")}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex-row items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              {processingId === reviewCandidate.id ? (
                                <ActivityIndicator size="small" color="white" />
                              ) : (
                                <Ionicons name="checkmark-circle-outline" size={14} color="white" />
                              )}
                              <Text className="text-xs font-bold text-white">Approve Application</Text>
                            </Pressable>
                          </>
                        )}

                        {modalStatus === "approved" && (
                          <Pressable
                            disabled={Boolean(processingId)}
                            onPress={() => {
                              const target = reviewCandidate;
                              setReviewCandidate(null);
                              setSuspendCandidate(target);
                            }}
                            className="px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 flex-row items-center gap-1.5 cursor-pointer"
                          >
                            <Ionicons name="ban-outline" size={14} color="#B45309" />
                            <Text className="text-xs font-bold text-amber-800">Suspend Store</Text>
                          </Pressable>
                        )}

                        {modalStatus === "suspended" && (
                          <Pressable
                            disabled={Boolean(processingId)}
                            onPress={() => handleSuspension(reviewCandidate, false)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex-row items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {processingId === reviewCandidate.id ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons name="checkmark-circle-outline" size={14} color="white" />
                            )}
                            <Text className="text-xs font-bold text-white">Reinstate Store</Text>
                          </Pressable>
                        )}

                        {modalStatus === "rejected" && (
                          <Pressable
                            disabled={Boolean(processingId)}
                            onPress={() => handleAction(reviewCandidate.id, "approved")}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex-row items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {processingId === reviewCandidate.id ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons name="checkmark-circle-outline" size={14} color="white" />
                            )}
                            <Text className="text-xs font-bold text-white">Approve Application</Text>
                          </Pressable>
                        )}
                      </View>
                    </>
                  );
                })()}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Suspend Store Confirmation Modal */}
      <Modal
        visible={Boolean(suspendCandidate)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingId) setSuspendCandidate(null);
        }}
      >
        <Pressable
          onPress={() => {
            if (!processingId) setSuspendCandidate(null);
          }}
          className="flex-1 bg-black/50 items-center justify-center p-4"
        >
          <Pressable
            onPress={() => {}}
            className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 items-center justify-center">
                <Ionicons name="ban-outline" size={20} color="#B45309" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">Suspend Approved Store</Text>
                <Text className="text-xs text-gray-500">Store can be reinstated at any time</Text>
              </View>
            </View>

            {suspendCandidate ? (
              <View className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
                <Text className="text-xs font-bold text-gray-900">{suspendCandidate.name}</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  {suspendCandidate.owner_name || "Store Owner"} •{" "}
                  {suspendCandidate.barangay || "Mati City"}
                </Text>
              </View>
            ) : null}

            <Text className="text-xs text-gray-600 leading-relaxed mb-5">
              Suspending this store immediately removes it from public Mati FoodFinder discovery and
              blocks merchant dashboard access until an administrator reinstates it.
            </Text>

            <View className="flex-row justify-end gap-2.5">
              <Pressable
                disabled={Boolean(processingId)}
                onPress={() => setSuspendCandidate(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 cursor-pointer"
              >
                <Text className="text-xs font-semibold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(processingId)}
                onPress={() => {
                  if (suspendCandidate) void handleSuspension(suspendCandidate, true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 flex-row items-center gap-1.5 cursor-pointer"
              >
                {processingId === suspendCandidate?.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="ban-outline" size={13} color="white" />
                )}
                <Text className="text-xs font-bold text-white">
                  {processingId === suspendCandidate?.id ? "Suspending..." : "Suspend Store"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
