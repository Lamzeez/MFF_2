import { getSupabaseClient } from "../lib/supabase/client";
import type { Database } from "../types/database";
import type { AuthPortalScope } from "../types/auth";
import type { FoodItem, RestaurantProfile, Store, MenuItem, MenuItemEdit } from "../types/restaurant";
import { parsePostGisPoint, MATI_CITY_HALL_COORDS } from "../lib/geo-serviceability";
import { RatingSummary, fetchStoreRatingSummary } from "./reviews";
import { resolveStoreSubscriptionSummary } from "../lib/subscription-tiers";

export const CATEGORIES = [
  "All",
  "Meals",
  "Karenderias",
  "Seafood",
  "BBQ & Grill",
  "Merienda",
  "Beverages",
] as const;

/** Menu item categories (excludes establishment types like "Karenderias"). */
/** Menu item categories (excludes establishment types like "Karenderias"). */
export const MENU_ITEM_CATEGORIES = [
  "Meals",
  "Seafood",
  "BBQ & Grill",
  "Merienda",
  "Beverages",
] as const;

export interface LiveStoreProfile extends RestaurantProfile {
  id: string;
  slug: string;
  categories: string[];
  barangay: string;
  approvalStatus: string;
  deliveryEnabled: boolean;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  isOpen: boolean;
  cover_image_url?: string;
  logo_url?: string;
  operating_hours?: string;
  subscription_tier?: string;
  subscription_status?: string;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscribed_at?: string | null;
  table_capacity?: number;
  reservations_enabled?: boolean;
}

const STORE_IMAGES: Record<string, string> = {
  "mama-lettys-karenderia": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
  "mati-baywalk-seafood-grill": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80",
  "subangan-street-grills": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
  "dahican-beach-bites": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  "aling-nenas-kitchen": "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80",
};

function getDishImage(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes("humba")) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80";
  if (n.includes("tinola")) return "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80";
  if (n.includes("bulalo")) return "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80";
  if (n.includes("tuna")) return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80";
  if (n.includes("squid") || n.includes("lapu")) return "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&auto=format&fit=crop&q=80";
  if (n.includes("bbq") || n.includes("skewer") || n.includes("isaw")) return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80";
  if (n.includes("inasal")) return "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=80";
  if (n.includes("kinilaw")) return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80";
  if (n.includes("smoothie") || n.includes("shake") || n.includes("halo")) return "https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80";
  if (category === "Seafood") return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80";
  if (category === "BBQ & Grill") return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80";
}

/** Map database Store row into consumer presentation model */
export function mapStoreToProfile(
  store: Store,
  ratingSummary?: RatingSummary
): LiveStoreProfile {
  const explicitCategories = Array.isArray(store.categories)
    ? store.categories.filter((c) => typeof c === "string" && c.trim().length > 0)
    : [];

  let fallbackCategory = "Karenderias";
  const desc = (store.description + " " + store.name).toLowerCase();
  if (desc.includes("seafood") || desc.includes("tuna") || desc.includes("fish")) {
    fallbackCategory = "Seafood";
  } else if (desc.includes("grill") || desc.includes("bbq") || desc.includes("skewer")) {
    fallbackCategory = "BBQ & Grill";
  } else if (desc.includes("beach") || desc.includes("shake") || desc.includes("smoothie")) {
    fallbackCategory = "Merienda";
  }

  const categories = explicitCategories.length > 0 ? explicitCategories : [fallbackCategory];
  const primaryCategory = categories[0];
  const category = categories.join(" · ");

  let emoji = "🍲";
  let bgColor = "#FED7AA";
  if (primaryCategory === "Seafood") {
    emoji = "🐟";
    bgColor = "#BAE6FD";
  } else if (primaryCategory === "BBQ & Grill") {
    emoji = "🍢";
    bgColor = "#FECDD3";
  } else if (primaryCategory === "Merienda") {
    emoji = "🏖️";
    bgColor = "#DDD6FE";
  } else if (primaryCategory === "Beverages") {
    emoji = "🥤";
    bgColor = "#CFFAFE";
  }

  const imageUrl = store.cover_image_url || STORE_IMAGES[store.slug] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

  const parsedCoords = parsePostGisPoint(store.location);
  const latitude = parsedCoords?.latitude ?? MATI_CITY_HALL_COORDS.latitude;
  const longitude = parsedCoords?.longitude ?? MATI_CITY_HALL_COORDS.longitude;
  const isCoastal = (store.barangay || "").toLowerCase().includes("dahican") ||
    (store.name || "").toLowerCase().includes("dahican");
  const deliveryRadiusKm = isCoastal ? 12.0 : 6.0;

  let ratingStr = "4.8";
  let reviewsCount = 120;
  if (ratingSummary) {
    if (ratingSummary.totalReviews > 0) {
      ratingStr = ratingSummary.averageRating.toFixed(1);
      reviewsCount = ratingSummary.totalReviews;
    } else {
      ratingStr = "5.0";
      reviewsCount = 0;
    }
  }

  const subSummary = resolveStoreSubscriptionSummary({
    subscriptionTier: store.subscription_tier,
    subscriptionStatus: store.subscription_status,
    trialStartedAt: store.trial_started_at,
    trialEndsAt: store.trial_ends_at,
    subscribedAt: store.subscribed_at,
  });

  const isTemporarilyOffline = subSummary.isTemporarilyOffline;
  const isGracePeriod = subSummary.isGracePeriod;
  const effectiveIsOpen = isTemporarilyOffline ? false : (store.is_open ?? true);
  const effectivePromo = isTemporarilyOffline
    ? "Temporarily Offline"
    : store.delivery_enabled
      ? "Fast Mati delivery"
      : undefined;

  const rawCapacity = typeof (store as any).table_capacity === "number" ? (store as any).table_capacity : 8;
  const rawReservationsEnabled = typeof (store as any).reservations_enabled === "boolean" ? (store as any).reservations_enabled : true;

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    category,
    categories,
    rating: ratingStr,
    address: store.address_text,
    phone: store.public_phone || "Mati City",
    hours: store.operating_hours || "7:30 AM - 9:00 PM Daily",
    availableTables: rawCapacity,
    tableCapacity: rawCapacity,
    reservationsEnabled: rawReservationsEnabled,
    table_capacity: rawCapacity,
    reservations_enabled: rawReservationsEnabled,
    emoji,
    description: store.description,
    reviews: reviewsCount,
    deliveryFee: store.delivery_enabled && !isTemporarilyOffline ? 35 : 0,
    deliveryTime: "20-30 min",
    promo: effectivePromo,
    bgColor,
    imageUrl,
    logoUrl: store.logo_url || undefined,
    barangay: store.barangay,
    approvalStatus: store.approval_status,
    deliveryEnabled: isTemporarilyOffline ? false : store.delivery_enabled,
    latitude,
    longitude,
    deliveryRadiusKm,
    isOpen: effectiveIsOpen,
    isTemporarilyOffline,
    isGracePeriod,
    cover_image_url: store.cover_image_url || undefined,
    logo_url: store.logo_url || undefined,
    operating_hours: store.operating_hours || undefined,
    subscription_tier: store.subscription_tier || "basic",
    subscription_status: store.subscription_status || "trial",
    trial_started_at: store.trial_started_at ?? null,
    trial_ends_at: store.trial_ends_at ?? null,
    subscribed_at: store.subscribed_at ?? null,
  };
}

/** Map database MenuItem into consumer presentation model */
export function mapMenuItemToFoodItem(
  item: MenuItem,
  storeName: string = "Mati Restaurant"
): FoodItem {
  const storedCategory =
    typeof item.category === "string" && item.category.trim().length > 0
      ? item.category.trim()
      : null;

  let category = storedCategory || "Meals";
  if (!storedCategory) {
    const text = (item.name + " " + item.description).toLowerCase();
    if (text.includes("tuna") || text.includes("squid") || text.includes("kinilaw") || text.includes("fish")) {
      category = "Seafood";
    } else if (text.includes("bbq") || text.includes("inasal") || text.includes("isaw") || text.includes("skewer")) {
      category = "BBQ & Grill";
    } else if (text.includes("shake") || text.includes("smoothie") || text.includes("halo-halo") || text.includes("juice") || text.includes("iced")) {
      category = "Beverages";
    }
  }

  let emoji = "🍲";
  if (category === "Seafood") emoji = "🐟";
  else if (category === "BBQ & Grill") emoji = "🍢";
  else if (category === "Beverages") emoji = "🥤";

  // Derive stable numeric ID from uuid
  const numericId =
    Math.abs(
      item.id
        .slice(0, 8)
        .split("")
        .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
    ) % 100000;

  const imageUrl =
    (item.image_url && item.image_url.trim()) ||
    getDishImage(item.name, category);

  return {
    id: numericId,
    name: item.name,
    store: storeName,
    storeId: item.store_id,
    menuItemId: item.id,
    price: Math.round(item.price_centavos / 100),
    available: item.is_available,
    category,
    rating: "4.8",
    deliveryTime: "20-30 min",
    emoji,
    description: item.description,
    imageUrl,
    modifiers: Array.isArray((item as any).modifiers) ? (item as any).modifiers : undefined,
  };
}

export async function fetchLiveStores(): Promise<LiveStoreProfile[]> {
  try {
    const client = getSupabaseClient();
    const { data: stores, error } = await client
      .from("stores")
      .select("*")
      .in("approval_status", ["approved", "pending"])
      .is("archived_at", null)
      .order("name");

    if (error || !stores) return [];

    // Query aggregate ratings from order_reviews
    const ratingMap = new Map<string, { count: number; sum: number }>();
    try {
      const { data: reviewsData } = await client
        .from("order_reviews")
        .select("store_id, food_rating");

      if (reviewsData && Array.isArray(reviewsData)) {
        for (const rev of reviewsData) {
          if (rev.store_id && typeof rev.food_rating === "number") {
            const curr = ratingMap.get(rev.store_id) || { count: 0, sum: 0 };
            curr.count += 1;
            curr.sum += rev.food_rating;
            ratingMap.set(rev.store_id, curr);
          }
        }
      }
    } catch (revErr) {
      console.warn("[services/catalog] order_reviews lookup notice:", revErr);
    }

    return stores.map((store) => {
      const stats = ratingMap.get(store.id);
      const summary: RatingSummary | undefined = stats && stats.count > 0
        ? { averageRating: Number((stats.sum / stats.count).toFixed(1)), totalReviews: stats.count }
        : undefined;
      return mapStoreToProfile(store, summary);
    });
  } catch {
    return [];
  }
}

export async function fetchLiveMenuItems(): Promise<FoodItem[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("menu_items")
      .select("*, stores(name)")
      .eq("is_published", true)
      .is("archived_at", null)
      .order("name");

    if (error || !data) return [];
    return data.map((row: any) => {
      const storeName = row.stores?.name || "Mati Kitchen";
      return mapMenuItemToFoodItem(row, storeName);
    });
  } catch {
    return [];
  }
}

export async function fetchStoreMenuItems(
  storeId: string,
  scope: AuthPortalScope = "merchant",
): Promise<FoodItem[]> {
  try {
    const client = getSupabaseClient(scope);
    const { data, error } = await client
      .from("menu_items")
      .select("*, stores(name)")
      .eq("store_id", storeId)
      .is("archived_at", null)
      .order("name");

    if (error || !data) return [];
    return data.map((row: any) => {
      const storeName = row.stores?.name || "Mati Kitchen";
      return mapMenuItemToFoodItem(row, storeName);
    });
  } catch {
    return [];
  }
}

export async function fetchStoreById(
  storeId: string,
  scope: AuthPortalScope = "merchant",
): Promise<LiveStoreProfile | null> {
  try {
    const client = getSupabaseClient(scope);
    const { data, error } = await client
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (error || !data) return null;

    let summary: RatingSummary | undefined;
    try {
      summary = await fetchStoreRatingSummary(storeId);
    } catch {}

    return mapStoreToProfile(data, summary);
  } catch {
    return null;
  }
}

export async function updateMenuItemAvailability(
  menuItemId: string,
  isAvailable: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const { error } = await client
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", menuItemId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateStoreProfile(
  storeId: string,
  updates: {
    name?: string;
    description?: string;
    public_phone?: string;
    address_text?: string;
    barangay?: string;
    delivery_enabled?: boolean;
    operating_hours?: string;
    cover_image_url?: string;
    logo_url?: string;
    table_capacity?: number;
    reservations_enabled?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const payload: Database["public"]["Tables"]["stores"]["Update"] = { ...updates };
    let { error } = await client
      .from("stores")
      .update(payload)
      .eq("id", storeId);

    // If schema cache hasn't registered new optional columns on remote Supabase yet, retry with core fields
    if (
      error &&
      error.message?.includes("Could not find the") &&
      (payload.table_capacity !== undefined || payload.reservations_enabled !== undefined)
    ) {
      delete payload.table_capacity;
      delete payload.reservations_enabled;
      const retry = await client.from("stores").update(payload).eq("id", storeId);
      error = retry.error;
    }

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchUserStoreId(userId?: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const client = getSupabaseClient("merchant");
    const { data } = await client
      .from("store_memberships")
      .select("store_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return data?.store_id || null;
  } catch {
    return null;
  }
}

export async function createStoreMenuItem(
  storeId: string,
  item: {
    name: string;
    price: number;
    category?: string;
    description?: string;
    imageUrl?: string;
    isAvailable?: boolean;
    modifiers?: import("../types/restaurant").DishModifierGroup[];
  }
): Promise<{ success: boolean; data?: FoodItem; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const priceCentavos = Math.round(item.price * 100);
    const insertPayload: any = {
      store_id: storeId,
      name: item.name.trim(),
      price_centavos: priceCentavos,
      category: item.category?.trim() || "Meals",
      description: item.description?.trim() || "",
      image_url: item.imageUrl?.trim() || null,
      is_available: item.isAvailable ?? true,
      is_published: true,
      modifiers: item.modifiers || [],
    };

    let res = await client
      .from("menu_items")
      .insert(insertPayload)
      .select("*, stores(name)")
      .single();

    // If modifiers column does not exist on remote schema, retry without modifiers
    if (res.error && res.error.message?.includes("modifiers")) {
      delete insertPayload.modifiers;
      res = await client
        .from("menu_items")
        .insert(insertPayload)
        .select("*, stores(name)")
        .single();
    }

    if (res.error) return { success: false, error: res.error.message };
    const storeName = (res.data as any)?.stores?.name || "Store";
    const mapped = mapMenuItemToFoodItem(res.data, storeName);
    if (item.modifiers && (!mapped.modifiers || mapped.modifiers.length === 0)) {
      mapped.modifiers = item.modifiers;
    }
    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateStoreMenuItem(
  menuItemId: string,
  updates: {
    name?: string;
    price?: number;
    category?: string;
    description?: string;
    imageUrl?: string | null;
    isAvailable?: boolean;
    modifiers?: import("../types/restaurant").DishModifierGroup[];
  }
): Promise<{ success: boolean; data?: FoodItem; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.price !== undefined) payload.price_centavos = Math.round(updates.price * 100);
    if (updates.category !== undefined) payload.category = updates.category.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl?.trim() || null;
    if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;
    if (updates.modifiers !== undefined) payload.modifiers = updates.modifiers;

    let res = await client
      .from("menu_items")
      .update(payload)
      .eq("id", menuItemId)
      .select("*, stores(name)")
      .single();

    // If modifiers column does not exist on remote schema, retry without modifiers
    if (res.error && res.error.message?.includes("modifiers")) {
      delete payload.modifiers;
      res = await client
        .from("menu_items")
        .update(payload)
        .eq("id", menuItemId)
        .select("*, stores(name)")
        .single();
    }

    if (res.error) return { success: false, error: res.error.message };
    const storeName = (res.data as any)?.stores?.name || "Store";
    const mapped = mapMenuItemToFoodItem(res.data, storeName);
    if (updates.modifiers && (!mapped.modifiers || mapped.modifiers.length === 0)) {
      mapped.modifiers = updates.modifiers;
    }
    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function archiveStoreMenuItem(
  menuItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const { error } = await client
      .from("menu_items")
      .update({
        archived_at: new Date().toISOString(),
        is_available: false,
        is_published: false,
      })
      .eq("id", menuItemId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function selectMerchantSubscriptionPlan(
  storeId: string,
  tier: "basic" | "standard" | "commercial"
): Promise<{
  success: boolean;
  data?: {
    subscription_tier: string;
    subscription_status: string;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    subscribed_at: string | null;
  };
  error?: string;
}> {
  try {
    const client = getSupabaseClient("merchant");
    const { data, error } = await client.rpc("merchant_select_subscription_plan", {
      p_store_id: storeId,
      p_tier: tier,
    });

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: data as any,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update subscription plan." };
  }
}

export function subscribeToStoreMenuItems(
  storeId: string,
  onChange: () => void
): () => void {
  const client = getSupabaseClient("merchant");
  const channel = client
    .channel(`store_menu_items_${storeId}_${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Toggles whether the store is open for kitchen orders in Mati City.
 * Persists to Supabase stores.is_open with RPC fallback.
 */
export async function updateStoreOpenStatus(
  storeId: string,
  isOpen: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const { error } = await client
      .from("stores")
      .update({ is_open: isOpen })
      .eq("id", storeId);

    if (error) {
      const { error: rpcError } = await client.rpc("set_store_open_status", {
        p_store_id: storeId,
        p_is_open: isOpen,
      });
      if (rpcError) return { success: false, error: rpcError.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}



