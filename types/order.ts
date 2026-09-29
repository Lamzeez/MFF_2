/**
 * Unified Order Status & Contract for Mati FoodFinder
 * Shared across Customer, Merchant (Kitchen KDS), and Delivery Rider
 */

export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export interface OrderItem {
  id?: number | string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface UnifiedOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  barangay: string;
  landmarkNotes?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentType: "Cash on Delivery" | "GCash";
  status: OrderStatus;
  deliveryPin: string; // 4-digit security handshake code
  createdAt: string;
}
