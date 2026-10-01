import { getSupabaseClient } from "../lib/supabase/client";
import type { OrderStatus } from "../types/order";

export interface CreateOrderPayload {
  storeId: string;
  items: {
    menuItemId?: string;
    name: string;
    price: number; // in pesos
    quantity: number;
  }[];
  fulfillmentType: "delivery" | "pickup";
  paymentMethod: "cod" | "gcash";
  deliveryAddress: string;
  barangay: string;
  customerPhone?: string;
  notes?: string;
}

export interface LiveOrderItem {
  id: string;
  menuItemId?: string | null;
  name: string;
  price: number; // in pesos
  quantity: number;
  subtotal: number; // in pesos
}

export interface LiveOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  customerName?: string;
  customerPhone?: string;
  riderId?: string | null;
  riderName?: string;
  status: OrderStatus;
  fulfillmentType: "delivery" | "pickup";
  paymentMethod: "cod" | "gcash";
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  barangay: string;
  notes: string;
  handshakePin: string;
  items: LiveOrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** Generates a 4-digit PIN for delivery handoff */
function generateHandshakePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Map database row to LiveOrder presentation model */
function mapDatabaseOrderToLiveOrder(row: any): LiveOrder {
  const items: LiveOrderItem[] = (row.order_items || []).map((item: any) => ({
    id: item.id,
    menuItemId: item.menu_item_id,
    name: item.item_name,
    price: Math.round(item.price_centavos / 100),
    quantity: item.quantity,
    subtotal: Math.round(item.subtotal_centavos / 100),
  }));

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    storeId: row.store_id,
    storeName: row.stores?.name || "Mati Restaurant",
    storeAddress: row.stores?.address_text,
    storePhone: row.stores?.public_phone,
    customerName: row.profiles?.display_name || "Mati Foodie",
    customerPhone: row.customer_phone || row.profiles?.contact_phone || "",
    riderId: row.rider_id,
    riderName: row.rider_profiles?.display_name,
    status: row.status as OrderStatus,
    fulfillmentType: row.fulfillment_type as "delivery" | "pickup",
    paymentMethod: row.payment_method as "cod" | "gcash",
    subtotal: Math.round(row.subtotal_centavos / 100),
    deliveryFee: Math.round(row.delivery_fee_centavos / 100),
    total: Math.round(row.total_centavos / 100),
    deliveryAddress: row.delivery_address,
    barangay: row.barangay,
    notes: row.notes || "",
    handshakePin: row.handshake_pin,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates an order in Supabase with its line items.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<LiveOrder> {
  const client = getSupabaseClient();
  const user = (await client.auth.getUser()).data.user;
  if (!user) {
    throw new Error("You must be signed in to place an order.");
  }

  const subtotalPesos = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFeePesos = payload.fulfillmentType === "delivery" ? 35 : 0;
  const totalPesos = subtotalPesos + deliveryFeePesos;

  const subtotalCentavos = Math.round(subtotalPesos * 100);
  const deliveryFeeCentavos = Math.round(deliveryFeePesos * 100);
  const totalCentavos = Math.round(totalPesos * 100);
  const handshakePin = generateHandshakePin();

  // 1. Insert Order
  const { data: orderData, error: orderError } = await client
    .from("orders")
    .insert({
      customer_id: user.id,
      store_id: payload.storeId,
      status: "placed",
      fulfillment_type: payload.fulfillmentType,
      payment_method: payload.paymentMethod,
      subtotal_centavos: subtotalCentavos,
      delivery_fee_centavos: deliveryFeeCentavos,
      total_centavos: totalCentavos,
      delivery_address: payload.deliveryAddress,
      barangay: payload.barangay,
      customer_phone: payload.customerPhone || null,
      notes: payload.notes || "",
      handshake_pin: handshakePin,
    })
    .select("*, stores(name, address_text, public_phone), profiles:customer_id(display_name, contact_phone)")
    .single();

  if (orderError || !orderData) {
    throw new Error(`Failed to place order: ${orderError?.message || "Unknown error"}`);
  }

  // 2. Insert Order Items
  const itemsToInsert = payload.items.map((item) => ({
    order_id: orderData.id,
    menu_item_id: item.menuItemId || null,
    item_name: item.name,
    price_centavos: Math.round(item.price * 100),
    quantity: item.quantity,
    subtotal_centavos: Math.round(item.price * item.quantity * 100),
  }));

  const { data: itemsData, error: itemsError } = await client
    .from("order_items")
    .insert(itemsToInsert)
    .select("*");

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
  }

  return mapDatabaseOrderToLiveOrder({
    ...orderData,
    order_items: itemsData || [],
  });
}

/**
 * Fetches all orders placed by the current authenticated customer.
 */
export async function fetchCustomerOrders(): Promise<LiveOrder[]> {
  try {
    const client = getSupabaseClient();
    const user = (await client.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone), profiles:customer_id(display_name, contact_phone)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDatabaseOrderToLiveOrder);
  } catch (err) {
    console.error("fetchCustomerOrders error:", err);
    return [];
  }
}

/**
 * Fetches orders for a specific store (for merchant kitchen KDS display).
 */
export async function fetchStoreOrders(storeId: string): Promise<LiveOrder[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone), profiles:customer_id(display_name, contact_phone)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDatabaseOrderToLiveOrder);
  } catch (err) {
    console.error("fetchStoreOrders error:", err);
    return [];
  }
}

/**
 * Fetches unassigned delivery jobs ready for pickup across Mati City.
 */
export async function fetchAvailableRiderJobs(): Promise<LiveOrder[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone, barangay), profiles:customer_id(display_name, contact_phone)")
      .eq("status", "ready_for_pickup")
      .is("rider_id", null)
      .eq("fulfillment_type", "delivery")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDatabaseOrderToLiveOrder);
  } catch (err) {
    console.error("fetchAvailableRiderJobs error:", err);
    return [];
  }
}

/**
 * Fetches active or completed deliveries assigned to the current rider.
 */
export async function fetchRiderDeliveries(): Promise<{
  active: LiveOrder[];
  completed: LiveOrder[];
}> {
  try {
    const client = getSupabaseClient();
    const user = (await client.auth.getUser()).data.user;
    if (!user) return { active: [], completed: [] };

    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone, barangay), profiles:customer_id(display_name, contact_phone)")
      .eq("rider_id", user.id)
      .order("updated_at", { ascending: false });

    if (error || !data) return { active: [], completed: [] };

    const orders = data.map(mapDatabaseOrderToLiveOrder);
    return {
      active: orders.filter((o) => o.status === "out_for_delivery"),
      completed: orders.filter((o) => o.status === "delivered"),
    };
  } catch (err) {
    console.error("fetchRiderDeliveries error:", err);
    return { active: [], completed: [] };
  }
}

/**
 * Updates status of an order (e.g. accepted, preparing, ready_for_pickup, cancelled).
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

/**
 * Rider claims an order atomically. Sets status to 'out_for_delivery'.
 */
export async function claimRiderJob(orderId: string): Promise<LiveOrder> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("claim_delivery_job", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message || "Failed to claim delivery job.");
  }

  // Refetch full order with details
  const { data: fullOrder } = await client
    .from("orders")
    .select("*, order_items(*), stores(name, address_text, public_phone), profiles:customer_id(display_name, contact_phone)")
    .eq("id", orderId)
    .single();

  return mapDatabaseOrderToLiveOrder(fullOrder || data);
}

/**
 * Completes delivery by validating the customer's 4-digit handshake PIN.
 */
export async function completeDeliveryWithPin(orderId: string, pin: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.rpc("complete_delivery_with_pin", {
    p_order_id: orderId,
    p_pin: pin.trim(),
  });

  if (error) {
    throw new Error(error.message || "Failed to complete delivery.");
  }
}

/**
 * Realtime subscription helper for orders.
 */
export function subscribeToOrders(
  filter: { storeId?: string; customerId?: string; riderId?: string } | null,
  onUpdate: () => void
): () => void {
  const client = getSupabaseClient();
  const channelName = `orders-realtime-${Date.now()}-${Math.random()}`;

  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
