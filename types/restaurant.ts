import type { Database } from "./database";

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type StoreApprovalStatus = Database["public"]["Enums"]["store_approval_status"];
export type StoreCatalogEdit = Pick<Store, "name" | "description" | "public_phone" | "address_text" | "barangay" | "location" | "delivery_enabled">;
export type MenuItemCreate = Pick<MenuItem, "store_id" | "name" | "description" | "price_centavos" | "currency" | "is_published" | "is_available">;
export type MenuItemEdit = Partial<Pick<MenuItem, "name" | "description" | "price_centavos" | "is_published" | "is_available" | "archived_at">>;

/** Existing prototype presentation contracts. Prices here are pesos, NOT centavos.
 * Future feature adapters must explicitly map IDs, money and display fields.
 * Keep the current fixture/UI consumers unchanged during foundation work.
 */

export interface RestaurantProfile {
  name: string;
  category: string;
  rating: string;
  address: string;
  phone: string;
  hours: string;
  availableTables: number;
  emoji: string;
  description: string;
  reviews?: number;
  deliveryFee?: number;
  deliveryTime?: string;
  promo?: string;
  bgColor?: string;
  imageUrl?: string;
}

export interface FoodItem {
  id: number;
  name: string;
  store: string;
  price: number;
  available: boolean;
  category: string;
  rating: string;
  deliveryTime: string;
  emoji?: string;
  description?: string;
  imageUrl?: string;
}
