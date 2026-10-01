import { getSupabaseClient } from "../lib/supabase/client";
import { Database } from "../types/database";
import { createNotification } from "./notifications";

export type StoreVisitRow = Database["public"]["Tables"]["store_visits"]["Row"];

export interface StoreVisitWithStore extends StoreVisitRow {
  storeName?: string;
  storeAddress?: string;
}

export interface UserVisitSummary {
  totalVisits: number;
  mostVisitedStore: {
    id: string;
    name: string;
    visitCount: number;
  } | null;
}

/**
 * Records a real in-store QR stand scan / check-in.
 */
export async function recordStoreVisit(
  storeId: string,
  verifiedVia: "qr_scan" | "order_fulfillment" | "manual" = "qr_scan"
): Promise<StoreVisitRow> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You must be logged in to check in to a restaurant.");
  }

  const { data, error } = await supabase
    .from("store_visits")
    .insert({
      user_id: session.user.id,
      store_id: storeId,
      verified_via: verifiedVia,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[services/visits] recordStoreVisit error:", error);
    throw new Error(error?.message || "Failed to record store visit");
  }

  // Fetch store name for notification
  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .single();

  const storeName = store?.name || "Mati Restaurant";

  // Automatically trigger a personalized welcome notification
  try {
    await createNotification({
      userId: session.user.id,
      title: `Checked In at ${storeName}! 📍`,
      message: `You successfully checked in via the counter QR stand. Personalized recommendations are now updated!`,
      type: "system",
    });
  } catch (notifErr) {
    console.warn("Could not create check-in notification:", notifErr);
  }

  return data;
}

/**
 * Fetches all visits for the current authenticated user.
 */
export async function fetchUserVisits(): Promise<StoreVisitWithStore[]> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("store_visits")
    .select(`
      *,
      stores (
        name,
        address
      )
    `)
    .eq("user_id", session.user.id)
    .order("visited_at", { ascending: false });

  if (error) {
    console.error("[services/visits] fetchUserVisits error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    ...row,
    storeName: row.stores?.name,
    storeAddress: row.stores?.address,
  }));
}

/**
 * Computes the total visit count and #1 Most Visited store from real database rows.
 */
export async function fetchUserVisitSummary(): Promise<UserVisitSummary> {
  const visits = await fetchUserVisits();

  if (visits.length === 0) {
    return {
      totalVisits: 0,
      mostVisitedStore: null,
    };
  }

  // Count visits per store
  const counts: Record<string, { name: string; count: number }> = {};
  for (const v of visits) {
    const sId = v.store_id;
    const name = v.storeName || "Restaurant";
    if (!counts[sId]) {
      counts[sId] = { name, count: 0 };
    }
    counts[sId].count += 1;
  }

  let topStoreId = "";
  let topStoreName = "";
  let maxCount = 0;

  for (const [sId, info] of Object.entries(counts)) {
    if (info.count > maxCount) {
      maxCount = info.count;
      topStoreId = sId;
      topStoreName = info.name;
    }
  }

  return {
    totalVisits: visits.length,
    mostVisitedStore: topStoreId
      ? {
          id: topStoreId,
          name: topStoreName,
          visitCount: maxCount,
        }
      : null,
  };
}
