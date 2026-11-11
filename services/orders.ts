import { getSupabaseClient } from "../lib/supabase/client";
import type { AuthPortalScope } from "../types/auth";
import type { OrderStatus } from "../types/order";
import { recordVoucherRedemption } from "./vouchers";
import { notifyCustomerOrderLifecycle } from "./device-notifications";
import {
  isStoreCurrentlyOpen,
  evaluateStoreDeliveryServiceability,
  MATI_BARANGAY_CENTROIDS,
  parsePostGisPoint,
  GeoCoordinates,
} from "../lib/geo-serviceability";

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
  voucherCode?: string;
  voucherId?: string;
  discount?: number; // in pesos
  customerCoordinates?: GeoCoordinates;
  storeHours?: string;
  bypassHoursCheck?: boolean;
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
  riderPhone?: string;
  status: OrderStatus;
  fulfillmentType: "delivery" | "pickup";
  paymentMethod: "cod" | "gcash";
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  voucherCode?: string;
  voucherId?: string;
  total: number;
  deliveryAddress: string;
  barangay: string;
  notes: string;
  handshakePin: string;
  items: LiveOrderItem[];
  isRebroadcast?: boolean;
  isRemitted?: boolean;
  podImageUrl?: string;
  podTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}

/** Generates a 4-digit PIN for delivery handoff */
function generateHandshakePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Map database row to LiveOrder presentation model */
export function mapDatabaseOrderToLiveOrder(row: any): LiveOrder {
  const items: LiveOrderItem[] = (row.order_items || []).map((item: any) => ({
    id: item.id,
    menuItemId: item.menu_item_id,
    name: item.item_name,
    price: Math.round(item.price_centavos / 100),
    quantity: item.quantity,
    subtotal: Math.round(item.subtotal_centavos / 100),
  }));

  const notesText = row.notes || "";
  const isRebroadcast = Boolean(
    notesText.includes("Auto-Reassigned") ||
      notesText.includes("Courier Released") ||
      notesText.includes("Merchant Re-broadcast")
  );
  const isRemitted = Boolean(
    notesText.includes("COD Remitted") ||
      notesText.includes("Cash Remitted") ||
      notesText.includes("Settled")
  );

  // Extract discount and voucher from columns or fallback notes
  let discountPesos = row.discount_centavos ? Math.round(row.discount_centavos / 100) : 0;
  let voucherCode = row.voucher_code || undefined;
  if (!discountPesos && notesText.includes("[Promo:")) {
    const match = notesText.match(/\[Promo:\s*([A-Za-z0-9_-]+)\s*-₱([0-9.]+)\]/);
    if (match) {
      voucherCode = match[1];
      discountPesos = parseFloat(match[2]) || 0;
    }
  }

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    storeId: row.store_id,
    storeName: row.stores?.name || "Mati Restaurant",
    storeAddress: row.stores?.address_text,
    storePhone: row.stores?.public_phone,
    customerName: row.customer?.display_name || row.profiles?.display_name || "Mati Foodie",
    customerPhone: row.customer_phone || row.customer?.contact_phone || row.profiles?.contact_phone || "",
    riderId: row.rider_id,
    riderName: row.rider?.display_name || row.rider_profiles?.display_name,
    riderPhone: row.rider?.contact_phone || row.rider_profiles?.contact_phone,
    status: row.status as OrderStatus,
    fulfillmentType: row.fulfillment_type as "delivery" | "pickup",
    paymentMethod: row.payment_method as "cod" | "gcash",
    subtotal: Math.round(row.subtotal_centavos / 100),
    deliveryFee: Math.round(row.delivery_fee_centavos / 100),
    discount: discountPesos,
    voucherCode: voucherCode,
    voucherId: row.voucher_id || undefined,
    total: Math.round((row.total_centavos ?? row.total_amount_centavos ?? 0) / 100),
    deliveryAddress: row.delivery_address,
    barangay: row.barangay,
    notes: notesText,
    handshakePin: row.handshake_pin,
    items,
    isRebroadcast,
    isRemitted,
    podImageUrl: row.pod_image_url || undefined,
    podTimestamp: row.pod_timestamp || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates an order in Supabase with its line items and records voucher redemption.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<LiveOrder> {
  const client = getSupabaseClient();
  const user = (await client.auth.getUser()).data.user;
  if (!user) {
    throw new Error("You must be signed in to place an order.");
  }

  const subtotalPesos = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFeePesos = payload.fulfillmentType === "delivery" ? 35 : 0;
  const discountPesos = payload.discount || 0;
  const totalPesos = Math.max(0, subtotalPesos + deliveryFeePesos - discountPesos);

  const subtotalCentavos = Math.round(subtotalPesos * 100);
  const deliveryFeeCentavos = Math.round(deliveryFeePesos * 100);
  const discountCentavos = Math.round(discountPesos * 100);
  const totalCentavos = Math.round(totalPesos * 100);
  const handshakePin = generateHandshakePin();

  // 0. Store Operating Hours Verification
  if (!payload.bypassHoursCheck) {
    const hoursEval = isStoreCurrentlyOpen(payload.storeHours);
    if (!hoursEval.isOpen) {
      throw new Error(hoursEval.message);
    }
  }

  // Delivery boundary & serviceability guard
  if (payload.fulfillmentType === "delivery" && payload.storeId) {
    try {
      const { data: storeInfo } = await client
        .from("stores")
        .select("delivery_enabled, location, barangay, name")
        .eq("id", payload.storeId)
        .maybeSingle();

      if (storeInfo) {
        if (storeInfo.delivery_enabled === false) {
          throw new Error("This store offers counter pickup only. Delivery is currently disabled by the store.");
        }

        const parsedCoords = parsePostGisPoint(storeInfo.location);
        const storeCoords = parsedCoords || { latitude: 6.9550, longitude: 126.2165 };
        const customerCoords =
          payload.customerCoordinates ||
          MATI_BARANGAY_CENTROIDS[payload.barangay] ||
          MATI_BARANGAY_CENTROIDS["Central (Poblacion)"];

        const evalResult = evaluateStoreDeliveryServiceability(customerCoords, {
          latitude: storeCoords.latitude,
          longitude: storeCoords.longitude,
          deliveryEnabled: storeInfo.delivery_enabled,
          barangay: storeInfo.barangay,
          name: storeInfo.name,
        });

        if (!evalResult.isServiceable) {
          throw new Error(`[Serviceability Error] ${evalResult.notice}`);
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message?.startsWith("[Serviceability Error]") || checkErr.message?.includes("counter pickup only")) {
        throw checkErr;
      }
      console.warn("[orders] Non-blocking delivery serviceability check notice:", checkErr);
    }
  }

  // 1. Insert Order
  const orderInsertPayload: any = {
    customer_id: user.id,
    store_id: payload.storeId,
    status: "placed",
    fulfillment_type: payload.fulfillmentType,
    payment_method: payload.paymentMethod,
    subtotal_centavos: subtotalCentavos,
    delivery_fee_centavos: deliveryFeeCentavos,
    discount_centavos: discountCentavos,
    total_centavos: totalCentavos,
    delivery_address: payload.deliveryAddress,
    barangay: payload.barangay,
    customer_phone: payload.customerPhone || null,
    notes: payload.notes || "",
    handshake_pin: handshakePin,
    voucher_code: payload.voucherCode || null,
    voucher_id: payload.voucherId || null,
  };

  let { data: orderData, error: orderError } = await client
    .from("orders")
    .insert(orderInsertPayload)
    .select("*, stores(name, address_text, public_phone), profiles:customer_id(display_name, contact_phone)")
    .single();

  if (orderError) {
    // If remote schema has not yet applied migration columns, retry inserting without them
    if (
      orderError.message?.includes("discount_centavos") ||
      orderError.message?.includes("voucher_code") ||
      orderError.message?.includes("voucher_id")
    ) {
      const fallbackNotes = payload.voucherCode
        ? `${payload.notes || ""}${payload.notes ? " " : ""}[Promo: ${payload.voucherCode} -₱${discountPesos}]`
        : payload.notes || "";

      const fallbackPayload: any = {
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
        notes: fallbackNotes,
        handshake_pin: handshakePin,
      };

      const retryRes = await client
        .from("orders")
        .insert(fallbackPayload)
        .select("*, stores(name, address_text, public_phone), profiles:customer_id(display_name, contact_phone)")
        .single();

      orderData = retryRes.data;
      orderError = retryRes.error;
    }
  }

  if (orderError || !orderData) {
    throw new Error(`Failed to place order: ${orderError?.message || "Unknown error"}`);
  }

  // Record voucher redemption if voucher was used
  if (payload.voucherId && user.id) {
    try {
      await recordVoucherRedemption(payload.voucherId, user.id, orderData.id, discountPesos);
    } catch (redErr) {
      console.warn("[services/orders] Voucher redemption logging notice:", redErr);
    }
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

  const liveOrder = mapDatabaseOrderToLiveOrder({
    ...orderData,
    order_items: itemsData || [],
  });

  notifyCustomerOrderLifecycle({
    status: "placed",
    storeName: liveOrder.storeName,
    handshakePin: liveOrder.handshakePin,
    orderNumber: liveOrder.orderNumber,
    orderId: liveOrder.id,
    customerId: liveOrder.customerId,
  }).catch((err) => console.warn("[orders] createOrder notification note:", err));

  return liveOrder;
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
      .select("*, order_items(*), stores(name, address_text, public_phone), customer:customer_id(display_name, contact_phone), rider:rider_id(display_name, contact_phone)")
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
    const client = getSupabaseClient("merchant");
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone), customer:customer_id(display_name, contact_phone), rider:rider_id(display_name, contact_phone)")
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
 * Checks if an active delivery has exceeded the allowable courier inactivity window.
 */
export function isDeliveryStale(updatedAt: string, maxMinutes: number = 15): boolean {
  if (!updatedAt) return false;
  const updatedMs = new Date(updatedAt).getTime();
  if (isNaN(updatedMs)) return false;
  const diffMinutes = (Date.now() - updatedMs) / (1000 * 60);
  return diffMinutes >= maxMinutes;
}

/**
 * Automatically reassigns a delivery job that has been inactive for > 15 minutes.
 * Returns the order back to the available courier pool with an urgent audit note.
 */
export async function reassignStaleDeliveryJob(orderId: string): Promise<boolean> {
  try {
    const client = getSupabaseClient("rider");
    const timestamp = new Date().toLocaleTimeString();
    const { error } = await client
      .from("orders")
      .update({
        rider_id: null,
        status: "ready_for_pickup",
        notes: `[Auto-Reassigned: Courier inactive for >15 mins at ${timestamp}]`,
      })
      .eq("id", orderId)
      .eq("status", "out_for_delivery");

    if (error) {
      console.warn("reassignStaleDeliveryJob error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("reassignStaleDeliveryJob exception:", err);
    return false;
  }
}

/**
 * Fetches unassigned delivery jobs ready for pickup across Mati City.
 * Also scans and automatically releases any stale deliveries (>15 min courier inactivity).
 */
export async function fetchAvailableRiderJobs(): Promise<LiveOrder[]> {
  try {
    const client = getSupabaseClient("rider");

    // Auto-reassign any deliveries stuck in out_for_delivery for > 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: staleOrders } = await client
      .from("orders")
      .select("id, updated_at")
      .eq("status", "out_for_delivery")
      .eq("fulfillment_type", "delivery")
      .lt("updated_at", fifteenMinutesAgo);

    if (staleOrders && staleOrders.length > 0) {
      for (const stale of staleOrders) {
        await reassignStaleDeliveryJob(stale.id);
      }
    }

    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone, barangay), customer:customer_id(display_name, contact_phone)")
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
    const client = getSupabaseClient("rider");
    const user = (await client.auth.getUser()).data.user;
    if (!user) return { active: [], completed: [] };

    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*), stores(name, address_text, public_phone, barangay), customer:customer_id(display_name, contact_phone), rider:rider_id(display_name, contact_phone)")
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
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  scope: AuthPortalScope = "merchant",
): Promise<void> {
  const client = getSupabaseClient(scope);
  const { data: updatedData, error } = await client
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*, stores(name)")
    .single();

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  if (updatedData) {
    notifyCustomerOrderLifecycle({
      status,
      storeName: (updatedData.stores as any)?.name || "Restaurant",
      handshakePin: updatedData.handshake_pin,
      orderNumber: updatedData.id?.slice(0, 8),
      orderId: updatedData.id,
      customerId: updatedData.customer_id,
    }).catch((err) => console.warn("[orders] updateOrderStatus notification note:", err));
  }
}

/**
 * Rider claims an order atomically with PostgreSQL row-level locks (FOR UPDATE).
 * Sets status to 'out_for_delivery'. Prevents courier claim race conditions.
 */
export async function acceptDeliveryJob(orderId: string): Promise<LiveOrder> {
  const client = getSupabaseClient("rider");
  let rpcRes = await client.rpc("accept_delivery_job", {
    p_order_id: orderId,
  });

  if (rpcRes.error) {
    // Graceful backward-compatible fallback to legacy claim RPC if migration pending
    const fallbackRes = await client.rpc("claim_delivery_job", {
      p_order_id: orderId,
    });
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || rpcRes.error.message || "Failed to claim delivery job.");
    }
    rpcRes = fallbackRes;
  }

  // Refetch full order with details
  const { data: fullOrder } = await client
    .from("orders")
    .select("*, order_items(*), stores(name, address_text, public_phone), customer:customer_id(display_name, contact_phone), rider:rider_id(display_name, contact_phone)")
    .eq("id", orderId)
    .single();

  const liveOrder = mapDatabaseOrderToLiveOrder(fullOrder || rpcRes.data);

  notifyCustomerOrderLifecycle({
    status: "out_for_delivery",
    storeName: liveOrder.storeName,
    handshakePin: liveOrder.handshakePin,
    orderNumber: liveOrder.orderNumber,
    orderId: liveOrder.id,
    customerId: liveOrder.customerId,
  }).catch((err) => console.warn("[orders] acceptDeliveryJob notification note:", err));

  return liveOrder;
}

export const claimRiderJob = acceptDeliveryJob;

/**
 * Completes delivery by validating the customer's 4-digit handshake PIN.
 * Optionally records Proof of Delivery (POD) photo URL.
 */
export async function completeDeliveryWithPin(
  orderId: string,
  pin: string,
  podImageUrl?: string
): Promise<void> {
  const client = getSupabaseClient("rider");
  const { error } = await client.rpc("complete_delivery_with_pin", {
    p_order_id: orderId,
    p_pin: pin.trim(),
  });

  if (error) {
    throw new Error(error.message || "Failed to complete delivery.");
  }

  // Persist POD photo if captured
  if (podImageUrl) {
    try {
      await client
        .from("orders")
        .update({
          pod_image_url: podImageUrl,
          pod_timestamp: new Date().toISOString(),
        })
        .eq("id", orderId);
    } catch (err) {
      console.warn("[orders] POD metadata update note:", err);
    }
  }

  const { data: orderData } = await client
    .from("orders")
    .select("*, stores(name)")
    .eq("id", orderId)
    .single();

  if (orderData) {
    notifyCustomerOrderLifecycle({
      status: "delivered",
      storeName: (orderData.stores as any)?.name || "Restaurant",
      handshakePin: orderData.handshake_pin,
      orderNumber: orderData.id?.slice(0, 8),
      orderId: orderData.id,
      customerId: orderData.customer_id,
    }).catch((err) => console.warn("[orders] completeDelivery notification note:", err));
  }
}

/**
 * Uploads Proof of Delivery (POD) photo taken by courier to Supabase Storage delivery-proofs bucket.
 */
export async function uploadProofOfDeliveryPhoto(
  orderId: string,
  imageUri: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getSupabaseClient("rider");
    const fileName = `pod_${orderId}_${Date.now()}.jpg`;

    // If imageUri is already remote, return directly
    if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
      return { success: true, url: imageUri };
    }

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { data, error } = await client.storage
        .from("delivery-proofs")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.warn("[orders] POD storage upload failed, using URI fallback:", error.message);
        return { success: true, url: imageUri };
      }

      const { data: publicData } = client.storage
        .from("delivery-proofs")
        .getPublicUrl(data.path);

      return { success: true, url: publicData.publicUrl };
    } catch {
      // In web or restricted native offline environments, fallback gracefully to URI
      return { success: true, url: imageUri };
    }
  } catch (err: any) {
    console.warn("[orders] uploadProofOfDeliveryPhoto exception:", err);
    return { success: true, url: imageUri };
  }
}

/**
 * Rider voluntarily releases an accepted delivery job back to the Mati pool
 * (e.g., due to vehicle breakdown, emergency, or flat tire).
 */
export async function releaseDeliveryJob(
  orderId: string,
  reason: string = "Emergency / Vehicle breakdown"
): Promise<void> {
  const client = getSupabaseClient("rider");
  const timestamp = new Date().toLocaleTimeString();
  const { error } = await client
    .from("orders")
    .update({
      rider_id: null,
      status: "ready_for_pickup",
      notes: `[Courier Released: ${reason} at ${timestamp}]`,
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to release delivery job: ${error.message}`);
  }
}

/**
 * Courier reports a Customer No-Show at the drop-off location with verified GPS coordinates.
 * Cancels the delivery order, logs courier GPS location, and records a strike against the customer's account.
 */
export async function reportCustomerNoShow(
  orderId: string,
  gps: { latitude: number; longitude: number },
  reason: string = "Customer unreachable after waiting at drop-off location",
  customerId?: string
): Promise<void> {
  const client = getSupabaseClient("rider");
  const timestamp = new Date().toLocaleTimeString();
  const gpsFormatted = `(${gps.latitude.toFixed(4)}° N, ${gps.longitude.toFixed(4)}° E)`;
  const auditNote = `[Cancelled: Customer No-Show verified by courier GPS ${gpsFormatted} - ${reason} at ${timestamp}]`;

  // Fetch customer_id if not explicitly provided
  let targetCustomerId = customerId;
  if (!targetCustomerId) {
    const { data: orderData } = await client
      .from("orders")
      .select("customer_id")
      .eq("id", orderId)
      .maybeSingle();
    targetCustomerId = orderData?.customer_id;
  }

  const { error } = await client
    .from("orders")
    .update({
      status: "cancelled",
      notes: auditNote,
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to report customer no-show: ${error.message}`);
  }

  // Record no-show strike on customer profile (disables COD on 2 strikes)
  if (targetCustomerId) {
    try {
      await client.rpc("record_customer_no_show_strike", {
        p_customer_id: targetCustomerId,
      });
    } catch (strikeErr) {
      console.warn("[orders] Failed to record customer no-show strike:", strikeErr);
    }
  }
}

/**
 * Merchant manually re-broadcasts an order if the assigned courier has delayed pickup (>10 mins).
 * Returns the order to ready_for_pickup without an assigned rider and triggers fresh dispatch.
 */
export async function merchantRebroadcastOrder(
  orderId: string,
  reason: string = "Courier pickup delayed at store"
): Promise<void> {
  const client = getSupabaseClient("merchant");
  const timestamp = new Date().toLocaleTimeString();

  const { error } = await client
    .from("orders")
    .update({
      rider_id: null,
      status: "ready_for_pickup",
      notes: `[Merchant Re-broadcast: ${reason} at ${timestamp}]`,
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to re-broadcast order: ${error.message}`);
  }
}

/**
 * Checks if a customer is eligible for Cash On Delivery (COD) based on their no-show strike record.
 */
export async function checkCustomerCodEligibility(
  customerId: string
): Promise<{ eligible: boolean; strikes: number }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("profiles")
      .select("cod_eligible, cod_strikes")
      .eq("id", customerId)
      .maybeSingle();

    if (error || !data) {
      return { eligible: true, strikes: 0 };
    }
    return {
      eligible: data.cod_eligible ?? true,
      strikes: data.cod_strikes ?? 0,
    };
  } catch {
    return { eligible: true, strikes: 0 };
  }
}

/**
 * Realtime subscription helper for orders.
 */
export function subscribeToOrders(
  filter: { storeId?: string; customerId?: string; riderId?: string } | null,
  onUpdate: () => void,
  scope?: AuthPortalScope,
): () => void {
  const resolvedScope: AuthPortalScope =
    scope ?? (filter?.storeId ? "merchant" : filter?.riderId ? "rider" : "customer");
  const client = getSupabaseClient(resolvedScope);
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

export interface CodSettlementOrder {
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  customerName: string;
  riderName?: string;
  subtotal: number; // Food amount to remit to store
  deliveryFee: number; // Courier fee earned
  total: number; // Gross cash collected from customer
  isRemitted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CodStoreSettlementGroup {
  storeId: string;
  storeName: string;
  orderCount: number;
  totalFoodSubtotal: number;
  remittedAmount: number;
  pendingAmount: number;
  isFullySettled: boolean;
}

export interface CodSettlementSummary {
  totalDeliveredOrders: number;
  totalCashCollected: number; // Gross physical cash (Subtotals + Delivery Fees)
  totalRiderFeesEarned: number; // Delivery fees kept by rider
  totalFoodSubtotalToRemit: number; // Total food cost owed to stores
  totalRemitted: number; // Food cost already confirmed/remitted
  totalPendingRemittance: number; // Food cost still pending remittance
  byStore: CodStoreSettlementGroup[];
  orders: CodSettlementOrder[];
}

/**
 * Calculates rolling 24/7 COD cash settlement breakdown for completed deliveries.
 * Separates physical cash collected, rider delivery fees, and merchant food payable.
 */
export function calculateCodSettlement(orders: LiveOrder[]): CodSettlementSummary {
  const codDelivered = orders.filter(
    (o) => o.status === "delivered" && (o.paymentMethod === "cod" || !o.paymentMethod)
  );

  let totalCashCollected = 0;
  let totalRiderFeesEarned = 0;
  let totalFoodSubtotalToRemit = 0;
  let totalRemitted = 0;
  let totalPendingRemittance = 0;

  const storeMap: Record<
    string,
    {
      storeId: string;
      storeName: string;
      orderCount: number;
      totalFoodSubtotal: number;
      remittedAmount: number;
      pendingAmount: number;
    }
  > = {};

  const settlementOrders: CodSettlementOrder[] = codDelivered.map((o) => {
    const subtotal = o.subtotal || Math.max(0, o.total - (o.deliveryFee || 35));
    const fee = o.deliveryFee || 35;
    const total = o.total || subtotal + fee;
    const isRemitted = Boolean(o.isRemitted);

    totalCashCollected += total;
    totalRiderFeesEarned += fee;
    totalFoodSubtotalToRemit += subtotal;

    if (isRemitted) {
      totalRemitted += subtotal;
    } else {
      totalPendingRemittance += subtotal;
    }

    const sId = o.storeId || "mati-store";
    if (!storeMap[sId]) {
      storeMap[sId] = {
        storeId: sId,
        storeName: o.storeName || "Mati Store",
        orderCount: 0,
        totalFoodSubtotal: 0,
        remittedAmount: 0,
        pendingAmount: 0,
      };
    }

    storeMap[sId].orderCount += 1;
    storeMap[sId].totalFoodSubtotal += subtotal;
    if (isRemitted) {
      storeMap[sId].remittedAmount += subtotal;
    } else {
      storeMap[sId].pendingAmount += subtotal;
    }

    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      storeId: sId,
      storeName: o.storeName,
      customerName: o.customerName || "Customer",
      riderName: o.riderName,
      subtotal,
      deliveryFee: fee,
      total,
      isRemitted,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  });

  const byStore: CodStoreSettlementGroup[] = Object.values(storeMap).map((s) => ({
    ...s,
    isFullySettled: s.pendingAmount === 0 && s.orderCount > 0,
  }));

  return {
    totalDeliveredOrders: codDelivered.length,
    totalCashCollected,
    totalRiderFeesEarned,
    totalFoodSubtotalToRemit,
    totalRemitted,
    totalPendingRemittance,
    byStore,
    orders: settlementOrders,
  };
}

/**
 * Confirms remittance of physical COD food cash between courier and merchant.
 * Appends audit verification note to order in Supabase.
 */
export async function confirmCodRemittance(
  orderId: string,
  confirmedBy: string = "Merchant"
): Promise<void> {
  const client = getSupabaseClient("merchant");
  const timestamp = new Date().toLocaleTimeString();
  const noteTag = `[COD Remitted: Food cash confirmed by ${confirmedBy} at ${timestamp}]`;

  const { data: existing } = await client
    .from("orders")
    .select("notes")
    .eq("id", orderId)
    .single();

  const currentNotes = existing?.notes || "";
  const updatedNotes = currentNotes ? `${currentNotes} ${noteTag}` : noteTag;

  const { error } = await client
    .from("orders")
    .update({ notes: updatedNotes })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to confirm COD remittance: ${error.message}`);
  }
}

