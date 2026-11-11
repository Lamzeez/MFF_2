import { getSupabaseClient } from "../lib/supabase/client";
import type { AuthPortalScope } from "../types/auth";
import type { FoodItem, RestaurantProfile, Store, MenuItem } from "../types/restaurant";
import { parsePostGisPoint, MATI_CITY_HALL_COORDS } from "../lib/geo-serviceability";
import { RatingSummary, fetchStoreRatingSummary } from "./reviews";

export const CATEGORIES = [
  "All",
  "Meals",
  "Karenderias",
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
  operating_hours?: string;
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
    availableTables: 4,
    emoji,
    description: store.description,
    reviews: reviewsCount,
    deliveryFee: store.delivery_enabled ? 35 : 0,
    deliveryTime: "20-30 min",
    promo: store.delivery_enabled ? "Fast Mati delivery" : undefined,
    bgColor,
    imageUrl,
    barangay: store.barangay,
    approvalStatus: store.approval_status,
    deliveryEnabled: store.delivery_enabled,
    latitude,
    longitude,
    deliveryRadiusKm,
    isOpen: store.is_open ?? true,
    cover_image_url: store.cover_image_url || undefined,
    operating_hours: store.operating_hours || undefined,
  };
}

/** Map database MenuItem into consumer presentation model */
export function mapMenuItemToFoodItem(
  item: MenuItem,
  storeName: string = "Mati Restaurant"
): FoodItem {
  let category = "Karenderias";
  const text = (item.name + " " + item.description).toLowerCase();
  if (text.includes("tuna") || text.includes("squid") || text.includes("kinilaw") || text.includes("fish")) {
    category = "Seafood";
  } else if (text.includes("bbq") || text.includes("inasal") || text.includes("isaw") || text.includes("skewer")) {
    category = "BBQ & Grill";
  } else if (text.includes("shake") || text.includes("smoothie") || text.includes("halo-halo")) {
    category = "Beverages";
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

  const imageUrl = getDishImage(item.name, category);

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
  };
}

export async function fetchLiveStores(): Promise<LiveStoreProfile[]> {
  try {
    const client = getSupabaseClient();
    const { data: stores, error } = await client
      .from("stores")
      .select("*")
      .eq("approval_status", "approved")
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
    operating_hours?: string;
    cover_image_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const { error } = await client
      .from("stores")
      .update(updates)
      .eq("id", storeId);

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
    description?: string;
    isAvailable?: boolean;
  }
): Promise<{ success: boolean; data?: FoodItem; error?: string }> {
  try {
    const client = getSupabaseClient("merchant");
    const priceCentavos = Math.round(item.price * 100);
    const { data, error } = await client
      .from("menu_items")
      .insert({
        store_id: storeId,
        name: item.name.trim(),
        price_centavos: priceCentavos,
        description: item.description?.trim() || "",
        is_available: item.isAvailable ?? true,
        is_published: true,
      })
      .select("*, stores(name)")
      .single();

    if (error) return { success: false, error: error.message };
    const storeName = (data as any)?.stores?.name || "Store";
    return { success: true, data: mapMenuItemToFoodItem(data, storeName) };
  } catch (err: any) {
    return { success: false, error: err.message };
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



