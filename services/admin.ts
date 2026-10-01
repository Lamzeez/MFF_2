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
}

export interface StoreApplication {
  id: string;
  name: string;
  slug: string;
  address_text: string;
  barangay: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  public_phone: string | null;
  description: string;
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
export async function fetchPlatformMetrics(): Promise<PlatformMetrics | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_get_platform_metrics");
    if (error || !data) {
      console.warn("Could not fetch platform metrics:", error?.message);
      return null;
    }
    return data as PlatformMetrics;
  } catch (err) {
    console.warn("fetchPlatformMetrics exception:", err);
    return null;
  }
}

/**
 * Fetch all registered accounts across Mati City for System Admin user management
 */
export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error || !data) {
      console.warn("Could not list admin users:", error?.message);
      return [];
    }
    return data as AdminUserItem[];
  } catch (err) {
    console.warn("fetchAdminUsers exception:", err);
    return [];
  }
}

/**
 * Suspend or reactivate a user account
 */
export async function setAdminUserAccountStatus(
  userId: string,
  newStatus: "active" | "suspended"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
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
 * Fetch all store applications for System Admin approval reviews
 */
export async function fetchAdminStoreApplications(): Promise<StoreApplication[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, slug, address_text, barangay, approval_status, created_at, public_phone, description")
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.warn("Could not fetch store applications:", error?.message);
      return [];
    }
    return data as StoreApplication[];
  } catch (err) {
    console.warn("fetchAdminStoreApplications exception:", err);
    return [];
  }
}

/**
 * Approve or reject a store registration
 */
export async function setStoreApproval(
  storeId: string,
  newStatus: "approved" | "rejected" | "pending"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
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
 * Fetch metrics for a specific store (orders, gross sales, table bookings)
 */
export async function fetchMerchantStoreMetrics(
  storeId: string
): Promise<StoreMetrics | null> {
  try {
    const supabase = getSupabaseClient();
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
