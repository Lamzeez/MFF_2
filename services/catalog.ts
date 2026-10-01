import { getSupabaseClient } from "../lib/supabase/client";
import type { FoodItem, RestaurantProfile, Store, MenuItem } from "../types/restaurant";

export const CATEGORIES = [
  "All",
  "Karenderias",
  "Seafood",
  "BBQ & Grill",
  "Merienda",
  "Beverages",
] as const;

export interface LiveStoreProfile extends RestaurantProfile {
  id: string;
  slug: string;
  barangay: string;
  approvalStatus: string;
  deliveryEnabled: boolean;
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
export function mapStoreToProfile(store: Store): LiveStoreProfile {
  let category = "Karenderias";
  const desc = (store.description + " " + store.name).toLowerCase();
  if (desc.includes("seafood") || desc.includes("tuna") || desc.includes("fish")) {
    category = "Seafood";
  } else if (desc.includes("grill") || desc.includes("bbq") || desc.includes("skewer")) {
    category = "BBQ & Grill";
  } else if (desc.includes("beach") || desc.includes("shake") || desc.includes("smoothie")) {
    category = "Merienda";
  }

  let emoji = "🍲";
  let bgColor = "#FED7AA";
  if (category === "Seafood") {
    emoji = "🐟";
    bgColor = "#BAE6FD";
  } else if (category === "BBQ & Grill") {
    emoji = "🍢";
    bgColor = "#FECDD3";
  } else if (category === "Merienda") {
    emoji = "🏖️";
    bgColor = "#DDD6FE";
  }

  const imageUrl = STORE_IMAGES[store.slug] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    category,
    rating: "4.8",
    address: store.address_text,
    phone: store.public_phone || "Mati City",
    hours: "7:30 AM - 9:00 PM Daily",
    availableTables: 4,
    emoji,
    description: store.description,
    reviews: 120,
    deliveryFee: store.delivery_enabled ? 35 : 0,
    deliveryTime: "20-30 min",
    promo: store.delivery_enabled ? "Fast Mati delivery" : undefined,
    bgColor,
    imageUrl,
    barangay: store.barangay,
    approvalStatus: store.approval_status,
    deliveryEnabled: store.delivery_enabled,
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
    const { data, error } = await client
      .from("stores")
      .select("*")
      .eq("approval_status", "approved")
      .is("archived_at", null)
      .order("name");

    if (error || !data) return [];
    return data.map(mapStoreToProfile);
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
