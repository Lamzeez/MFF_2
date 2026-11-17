import type { Database } from "./database";

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type StoreApprovalStatus = Database["public"]["Enums"]["store_approval_status"];
export type StoreSubscriptionTier = "basic" | "standard" | "commercial";
export type StoreSubscriptionStatus = "trial" | "active" | "expired";
export type StoreCatalogEdit = Pick<Store, "name" | "description" | "public_phone" | "address_text" | "barangay" | "location" | "delivery_enabled" | "operating_hours" | "cover_image_url" | "logo_url"> & {
  table_capacity?: number;
  reservations_enabled?: boolean;
};
export type MenuItemCreate = Pick<MenuItem, "store_id" | "name" | "description" | "price_centavos" | "currency" | "is_published" | "is_available"> & Partial<Pick<MenuItem, "image_url" | "category">> & {
  modifiers?: DishModifierGroup[];
};
export type MenuItemEdit = Partial<Pick<MenuItem, "name" | "description" | "price_centavos" | "image_url" | "category" | "is_published" | "is_available" | "archived_at">> & {
  modifiers?: DishModifierGroup[];
};

/** Existing prototype presentation contracts. Prices here are pesos, NOT centavos.
 * Future feature adapters must explicitly map IDs, money and display fields.
 * Keep the current fixture/UI consumers unchanged during foundation work.
 */

export interface RestaurantProfile {
  id?: string;
  name: string;
  category: string;
  categories?: string[];
  rating: string;
  address: string;
  phone: string;
  hours: string;
  availableTables: number;
  tableCapacity?: number;
  reservationsEnabled?: boolean;
  emoji: string;
  description: string;
  reviews?: number;
  deliveryFee?: number;
  deliveryTime?: string;
  promo?: string;
  bgColor?: string;
  imageUrl?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  isOpen?: boolean;
  isTemporarilyOffline?: boolean;
  isGracePeriod?: boolean;
}

export interface DishModifierOption {
  id: string;
  name: string;
  priceAdjustment: number; // in pesos (e.g. 0, 15, 20)
}

export interface DishModifierGroup {
  id: string;
  name: string; // e.g. "Spice Level", "Add-ons & Sides", "Choice of Drink"
  required?: boolean;
  options: DishModifierOption[];
}

export interface FoodItem {
  id: number;
  name: string;
  store: string;
  storeId?: string;
  menuItemId?: string;
  price: number;
  available: boolean;
  category: string;
  rating: string;
  deliveryTime: string;
  emoji?: string;
  description?: string;
  imageUrl?: string;
  modifiers?: DishModifierGroup[];
}
