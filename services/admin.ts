import { getSupabaseClient } from "../lib/supabase/client";
import type { Database } from "../types/database";

export interface PlatformMetrics {
  total_users: number;
  total_stores: number;
  pending_stores: number;
  active_riders: number;
  total_orders: number;
  gross_sales_centavos: number;
}

export interface AdminUserItem {
  id: string;
  display_name: string;
  phone_number: string;
  account_status: "active" | "suspended";
  created_at: string;
  email: string;
  role: string;
  cod_strikes?: number;
  cod_eligible?: boolean;
}

export interface StoreApplication {
  id: string;
  name: string;
  slug: string;
  categories?: string[];
  address_text: string;
  barangay: string;
  approval_status: "pending" | "approved" | "rejected";
  archived_at?: string | null;
  created_at: string;
  public_phone: string | null;
  description: string;
  operating_hours?: string;
  latitude?: number | null;
  longitude?: number | null;
  verification_document_url?: string | null;
  cover_image_url?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
}

export interface StoreMetrics {
  orders_today: number;
  gross_sales_centavos: number;
  active_orders: number;
  reservations_today: number;
  pending_reservations: number;
}

/**
 * Fetch high-level platform telemetry for System Admin overview
 */
export async function fetchPlatformMetricsWithStatus(): Promise<{
  data: PlatformMetrics | null;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient("admin");
    const { data, error } = await supabase.rpc("admin_get_platform_metrics");
    if (error || !data) {
      console.warn("Could not fetch platform metrics:", error?.message);
      return { data: null, error: error?.message || "Platform metrics unavailable." };
    }
    return { data: data as PlatformMetrics };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not fetch platform metrics.";
    console.warn("fetchPlatformMetrics exception:", err);
    return { data: null, error: message };
  }
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics | null> {
  const { data } = await fetchPlatformMetricsWithStatus();
  return data;
}

/**
 * Fetch all registered accounts across Mati City for System Admin user management
 */
export async function fetchAdminUsersWithStatus(): Promise<{
  data: AdminUserItem[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient("admin");
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error || !data) {
      console.warn("Could not list admin users:", error?.message);
      return { data: [], error: error?.message || "Could not load users." };
    }
    return { data: data as AdminUserItem[] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load users.";
    console.warn("fetchAdminUsers exception:", err);
    return { data: [], error: message };
  }
}

export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  const { data } = await fetchAdminUsersWithStatus();
  return data;
}

/**
 * Suspend or reactivate a user account
 */
export async function setAdminUserAccountStatus(
  userId: string,
  newStatus: "active" | "suspended"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient("admin");
    const { error } = await supabase.rpc("admin_set_account_status", {
      target_user: userId,
      new_status: newStatus,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Grant or revoke platform role (admin, rider)
 */
export async function setAdminUserPlatformRole(
  userId: string,
  role: "admin" | "rider",
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient("admin");
    const { error } = await supabase.rpc("admin_set_platform_role", {
      target_user: userId,
      target_role: role,
      enabled,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Resets a customer's COD strikes to 0 and restores COD ordering eligibility (for administrative dispute resolution).
 */
export async function adminResetCustomerCodStrikes(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient("admin");
    const { error } = await supabase.rpc("admin_reset_customer_cod_strikes", {
      target_user: userId,
    });
    if (error) {
      // Fallback direct profile update
      const { error: directError } = await supabase
        .from("profiles")
        .update({ cod_strikes: 0, cod_eligible: true })
        .eq("id", userId);
      if (directError) return { success: false, error: directError.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Permanently deletes a user account and all associated database records via System Admin RPC.
 */
export async function deleteAdminUser(userId: string): Promise<{
  success: boolean;
  deletedStoresCount?: number;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient("admin");
    const { data, error } = await supabase.rpc("admin_delete_user", {
      target_user: userId,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return {
      success: true,
      deletedStoresCount: (data as { deleted_stores_count?: number } | null)?.deleted_stores_count ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to delete user account.",
    };
  }
}

/**
 * Fetch all store applications for System Admin approval reviews
 */
export async function fetchAdminStoreApplicationsWithStatus(): Promise<{
  data: StoreApplication[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient("admin");
    const { data, error } = await supabase.rpc("admin_list_store_applications");

    if (!error && Array.isArray(data)) {
      return { data: data as StoreApplication[] };
    }

    // Fallback to direct admin-scoped stores query if RPC isn't deployed yet
    const fallback = await supabase
      .from("stores")
      .select(
        "id, name, slug, categories, address_text, barangay, approval_status, archived_at, created_at, public_phone, description, operating_hours, verification_document_url, cover_image_url"
      )
      .order("created_at", { ascending: false });

    if (fallback.error || !fallback.data) {
      const errMsg = error?.message || fallback.error?.message || "Could not load store applications.";
      console.warn("Could not fetch store applications:", errMsg);
      return { data: [], error: errMsg };
    }
    return { data: fallback.data as StoreApplication[] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load store applications.";
    console.warn("fetchAdminStoreApplications exception:", err);
    return { data: [], error: message };
  }
}

export async function fetchAdminStoreApplications(): Promise<StoreApplication[]> {
  const { data } = await fetchAdminStoreApplicationsWithStatus();
  return data;
}

/**
 * Approve or reject a store registration
 */
export async function setStoreApproval(
  storeId: string,
  newStatus: "approved" | "rejected" | "pending"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient("admin");
    const { error } = await supabase.rpc("admin_set_store_approval", {
      target_store: storeId,
      new_status: newStatus,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Suspend or reinstate an approved store using `admin_set_store_archived`.
 */
export async function setStoreSuspended(
  storeId: string,
  suspended: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient("admin");
    const { error } = await supabase.rpc("admin_set_store_archived", {
      target_store: storeId,
      archived: suspended,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not update store suspension status." };
  }
}

/**
 * Fetch metrics for a specific store (orders, gross sales, table bookings)
 */
export async function fetchMerchantStoreMetrics(
  storeId: string
): Promise<StoreMetrics | null> {
  try {
    const supabase = getSupabaseClient("merchant");
    const { data, error } = await supabase.rpc("merchant_get_store_metrics", {
      p_store_id: storeId,
    });
    if (error || !data) {
      console.warn("Could not fetch store metrics:", error?.message);
      return null;
    }
    return data as StoreMetrics;
  } catch (err) {
    console.warn("fetchMerchantStoreMetrics exception:", err);
    return null;
  }
}

export interface MonthlyGmvItem {
  month: string;
  month_key: string;
  gross_sales_centavos: number;
  order_count: number;
}

export interface DiscoveryChannelsData {
  qr_checkins_count: number;
  orders_count: number;
  community_posts_count: number;
  total_interactions: number;
  qr_percent: number;
  direct_percent: number;
  social_percent: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function toManilaMonthKey(isoTimestamp: string): string | null {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return null;
  const manila = new Date(parsed + MANILA_OFFSET_MS);
  return `${manila.getUTCFullYear()}-${String(manila.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildEmptyLast9MonthsManila(now: Date = new Date()): MonthlyGmvItem[] {
  const manilaNow = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = manilaNow.getUTCFullYear();
  const month = manilaNow.getUTCMonth();
  const items: MonthlyGmvItem[] = [];

  for (let i = 8; i >= 0; i--) {
    const bucket = new Date(Date.UTC(year, month - i, 1));
    items.push({
      month: MONTH_NAMES[bucket.getUTCMonth()],
      month_key: `${bucket.getUTCFullYear()}-${String(bucket.getUTCMonth() + 1).padStart(2, "0")}`,
      gross_sales_centavos: 0,
      order_count: 0,
    });
  }

  return items;
}

function getNineMonthStartIsoManila(now: Date = new Date()): string {
  const manilaNow = new Date(now.getTime() + MANILA_OFFSET_MS);
  const startUtcMs =
    Date.UTC(manilaNow.getUTCFullYear(), manilaNow.getUTCMonth() - 8, 1) - MANILA_OFFSET_MS;
  return new Date(startUtcMs).toISOString();
}

export function formatCompactPeso(pesos: number): string {
  const rounded = Math.round(pesos);
  if (rounded <= 0) return "₱0";
  if (rounded >= 10000) return `₱${Math.round(rounded / 1000)}k`;
  return `₱${rounded.toLocaleString("en-US")}`;
}

/**
 * Pure calculation helper: scales monthly GMV sales into normalized bar heights and peso labels.
 */
export function calculateMonthlyGmvBarHeights(
  data: MonthlyGmvItem[]
): { month: string; height: string; val: string }[] {
  if (!data || data.length === 0) return [];

  const maxSales = Math.max(...data.map((d) => Math.max(0, d.gross_sales_centavos)), 1);

  return data.map((item) => {
    const centavos = Math.max(0, item.gross_sales_centavos);
    const ratio = centavos / maxSales;
    const heightPercent =
      centavos === 0 ? "0%" : `${Math.max(8, Math.round(ratio * 95))}%`;

    return {
      month: item.month,
      height: heightPercent,
      val: formatCompactPeso(centavos / 100),
    };
  });
}

function allocateExactPercentages(counts: number[], total: number): number[] {
  if (total <= 0) return counts.map(() => 0);

  const exact = counts.map((c) => (c / total) * 100);
  const floors = exact.map((val) => Math.floor(val));
  let remainder = 100 - floors.reduce((sum, val) => sum + val, 0);

  const orderByFraction = exact
    .map((val, idx) => ({ idx, frac: val - Math.floor(val), count: counts[idx] }))
    .sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : b.count - a.count));

  for (let i = 0; i < remainder; i++) {
    floors[orderByFraction[i % orderByFraction.length].idx] += 1;
  }

  return floors;
}

/**
 * Pure calculation helper: computes exact activity percentages across orders, QR check-ins, and community posts.
 */
export function calculateDiscoveryChannelRatios(
  qrCount: number,
  orderCount: number,
  communityPostsCount: number = 0
): DiscoveryChannelsData {
  const safeQr = Math.max(0, Math.round(qrCount));
  const safeOrders = Math.max(0, Math.round(orderCount));
  const safePosts = Math.max(0, Math.round(communityPostsCount));
  const total = safeQr + safeOrders + safePosts;

  if (total <= 0) {
    return {
      qr_checkins_count: 0,
      orders_count: 0,
      community_posts_count: 0,
      total_interactions: 0,
      qr_percent: 0,
      direct_percent: 0,
      social_percent: 0,
    };
  }

  const [directPercent, qrPercent, socialPercent] = allocateExactPercentages(
    [safeOrders, safeQr, safePosts],
    total
  );

  return {
    qr_checkins_count: safeQr,
    orders_count: safeOrders,
    community_posts_count: safePosts,
    total_interactions: total,
    qr_percent: qrPercent,
    direct_percent: directPercent,
    social_percent: socialPercent,
  };
}

/**
 * Fetch aggregated monthly GMV time-series from Supabase RPC or direct admin RLS order aggregation.
 */
export async function fetchMonthlyGmvTelemetry(): Promise<{
  items: MonthlyGmvItem[];
  error?: string;
}> {
  const emptyMonths = buildEmptyLast9MonthsManila();

  try {
    const supabase = getSupabaseClient("admin");
    const { data, error } = await supabase.rpc("admin_get_monthly_gmv");

    if (!error && Array.isArray(data) && data.length > 0) {
      return { items: data as unknown as MonthlyGmvItem[] };
    }

    const { data: orderRows, error: ordersError } = await supabase
      .from("orders")
      .select("total_centavos, created_at, status")
      .neq("status", "cancelled")
      .gte("created_at", getNineMonthStartIsoManila());

    if (!ordersError && Array.isArray(orderRows)) {
      const buckets = new Map<string, MonthlyGmvItem>(
        emptyMonths.map((item) => [item.month_key, { ...item }])
      );

      for (const row of orderRows) {
        const key = toManilaMonthKey(row.created_at);
        const bucket = key ? buckets.get(key) : undefined;
        if (bucket) {
          bucket.gross_sales_centavos += Number(row.total_centavos) || 0;
          bucket.order_count += 1;
        }
      }

      return { items: Array.from(buckets.values()) };
    }

    return {
      items: emptyMonths,
      error: ordersError?.message || error?.message || "Could not load monthly order volume.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load monthly order volume.";
    console.warn("fetchMonthlyGmvTelemetry exception:", err);
    return { items: emptyMonths, error: message };
  }
}

export async function fetchMonthlyGmv(): Promise<MonthlyGmvItem[]> {
  const { items } = await fetchMonthlyGmvTelemetry();
  return items;
}

/**
 * Fetch real activity counts and percentages from Supabase RPC or direct admin RLS queries.
 */
export async function fetchDiscoveryChannelsTelemetry(): Promise<{
  data: DiscoveryChannelsData;
  error?: string;
}> {
  const zeroData = calculateDiscoveryChannelRatios(0, 0, 0);

  try {
    const supabase = getSupabaseClient("admin");
    const { data, error } = await supabase.rpc("admin_get_discovery_channels");
    const parsed = data as Partial<DiscoveryChannelsData> | null;

    if (
      !error &&
      parsed &&
      typeof parsed.orders_count === "number" &&
      typeof parsed.qr_checkins_count === "number" &&
      typeof parsed.community_posts_count === "number"
    ) {
      return {
        data: calculateDiscoveryChannelRatios(
          parsed.qr_checkins_count,
          parsed.orders_count,
          parsed.community_posts_count
        ),
      };
    }

    const [ordersRes, visitsRes, postsRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
      supabase
        .from("store_visits")
        .select("id", { count: "exact", head: true })
        .eq("verified_via", "qr_scan"),
      supabase.from("community_posts").select("id", { count: "exact", head: true }),
    ]);

    const firstError = ordersRes.error || visitsRes.error || postsRes.error;
    if (!firstError) {
      return {
        data: calculateDiscoveryChannelRatios(
          visitsRes.count ?? 0,
          ordersRes.count ?? 0,
          postsRes.count ?? 0
        ),
      };
    }

    return {
      data: zeroData,
      error: firstError.message || error?.message || "Could not load activity breakdown.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load activity breakdown.";
    console.warn("fetchDiscoveryChannelsTelemetry exception:", err);
    return { data: zeroData, error: message };
  }
}

export async function fetchDiscoveryChannels(): Promise<DiscoveryChannelsData> {
  const { data } = await fetchDiscoveryChannelsTelemetry();
  return data;
}

export interface RiderApplicationItem {
  id: string;
  display_name: string;
  email: string;
  phone_number: string;
  account_status: "active" | "suspended";
  created_at: string;
  is_approved_rider: boolean;
  vehicle_info?: string;
  barangay?: string;
  license_document_url?: string;
  vehicle_document_url?: string;
}

/**
 * Fetches rider applications across Mati City for System Admin courier onboarding review.
 */
export async function fetchAdminRiderApplicationsWithStatus(): Promise<{
  data: RiderApplicationItem[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient("admin");
    const { data: users, error } = await supabase.rpc("admin_list_users");
    if (error || !users) {
      return { data: [], error: error?.message || "Could not load rider applications." };
    }

    const riderItems: RiderApplicationItem[] = (users as AdminUserItem[])
      .filter((u) => u.role === "rider" || (u as any).platform_role === "rider")
      .map((u) => ({
        id: u.id,
        display_name: u.display_name || "Mati Courier",
        email: u.email || "",
        phone_number: u.phone_number || "",
        account_status: u.account_status,
        created_at: u.created_at,
        is_approved_rider: u.account_status === "active",
        vehicle_info: (u as any).raw_user_meta_data?.motorcycle_info || "Motorcycle (Verified Delivery)",
        barangay: (u as any).raw_user_meta_data?.barangay || "Mati City Wide",
        license_document_url:
          (u as any).raw_user_meta_data?.license_document_url ||
          (u as any).license_document_url ||
          "",
        vehicle_document_url:
          (u as any).raw_user_meta_data?.vehicle_document_url ||
          (u as any).vehicle_document_url ||
          "",
      }));

    return { data: riderItems };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load rider applications.";
    return { data: [], error: message };
  }
}

export async function fetchAdminRiderApplications(): Promise<RiderApplicationItem[]> {
  const { data } = await fetchAdminRiderApplicationsWithStatus();
  return data;
}

/**
 * Approves or suspends a rider application.
 */
export async function setRiderApproval(
  userId: string,
  approved: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const roleRes = await setAdminUserPlatformRole(userId, "rider", approved);
    if (!roleRes.success) return roleRes;

    const statusRes = await setAdminUserAccountStatus(userId, approved ? "active" : "suspended");
    return statusRes;
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update rider approval status." };
  }
}

/**
 * Subscribe to store application / status changes for System Admin
 */
export function subscribeToAdminStores(onChange: () => void): () => void {
  const supabase = getSupabaseClient("admin");
  const channel = supabase
    .channel(`admin_stores_changes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "stores",
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to user and profile changes for System Admin
 */
export function subscribeToAdminUsers(onChange: () => void): () => void {
  const supabase = getSupabaseClient("admin");
  const channel = supabase
    .channel(`admin_users_changes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
      },
      () => {
        onChange();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "platform_roles",
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

