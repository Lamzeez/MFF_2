import { getSupabaseClient } from "../lib/supabase/client";
import type { AuthPortalScope } from "../types/auth";
import { Database } from "../types/database";
import { createNotification } from "./notifications";

export type ReservationRow = Database["public"]["Tables"]["table_reservations"]["Row"];
export type ReservationStatus = Database["public"]["Enums"]["reservation_status"];

export interface CustomerReservation extends ReservationRow {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export interface CreateReservationInput {
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  seatingPreference?: string;
  specialNotes?: string;
}

/**
 * Creates a real dine-in table reservation request in Supabase.
 */
export async function createReservation(input: CreateReservationInput): Promise<ReservationRow> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You must be signed in to book a table.");
  }

  const customerName =
    input.customerName ||
    session.user.user_metadata?.display_name ||
    session.user.email?.split("@")[0] ||
    "Customer";

  const customerPhone =
    input.customerPhone || session.user.user_metadata?.contact_phone || "";

  const { data, error } = await supabase
    .from("table_reservations")
    .insert({
      store_id: input.storeId,
      customer_id: session.user.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      party_size: input.partySize,
      reservation_date: input.reservationDate,
      reservation_time: input.reservationTime,
      seating_preference: input.seatingPreference || "Indoor Dining",
      special_notes: input.specialNotes || "",
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[services/reservations] createReservation error:", error);
    throw new Error(error?.message || "Failed to create reservation");
  }

  try {
    await createNotification({
      userId: session.user.id,
      title: "Table Reservation Requested! 📅",
      message: `Your booking for ${input.partySize} guest(s) on ${input.reservationDate} at ${input.reservationTime} has been submitted and is pending confirmation.`,
      type: "reservation",
    });
  } catch (nErr) {
    console.warn("[services/reservations] Could not create reservation notification:", nErr);
  }

  return data;
}

/**
 * Fetches all reservations for the currently authenticated customer.
 */
export async function fetchCustomerReservations(): Promise<CustomerReservation[]> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("table_reservations")
    .select(`
      *,
      stores (
        name,
        address_text,
        public_phone
      )
    `)
    .eq("customer_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/reservations] fetchCustomerReservations error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    ...row,
    storeName: row.stores?.name,
    storeAddress: row.stores?.address_text,
    storePhone: row.stores?.public_phone,
  }));
}

/**
 * Fetches all reservations for a specific store (for merchants).
 */
export async function fetchStoreReservations(storeId: string): Promise<ReservationRow[]> {
  const supabase = getSupabaseClient("merchant");
  const { data, error } = await supabase
    .from("table_reservations")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/reservations] fetchStoreReservations error:", error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Updates a reservation's status (e.g. merchant confirms or customer cancels).
 */
export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  storeNotes?: string,
  scope: AuthPortalScope = "customer",
): Promise<ReservationRow> {
  const supabase = getSupabaseClient(scope);
  const updatePayload: Partial<ReservationRow> = { status };
  if (storeNotes !== undefined) {
    updatePayload.store_notes = storeNotes;
  }

  const { data, error } = await supabase
    .from("table_reservations")
    .update(updatePayload)
    .eq("id", reservationId)
    .select()
    .single();

  if (error || !data) {
    console.error("[services/reservations] updateReservationStatus error:", error);
    throw new Error(error?.message || "Failed to update reservation status");
  }

  try {
    if (data.customer_id) {
      const isConfirmed = status === "confirmed";
      const isDeclined = status === "declined";
      const isCancelled = status === "cancelled";
      const isCompleted = status === "completed";
      const title = isConfirmed
        ? "Table Reservation Confirmed! 🍽️"
        : isDeclined
        ? "Reservation Declined"
        : isCancelled
        ? "Reservation Cancelled"
        : isCompleted
        ? "Table Visit Completed"
        : `Reservation Update: ${status}`;
      const msg = isConfirmed
        ? `Your table for ${data.party_size} guests on ${data.reservation_date} (${data.reservation_time}) is confirmed! See you at the restaurant.`
        : isDeclined
        ? `Your reservation for ${data.reservation_date} was declined by the merchant.${storeNotes ? ` Note: ${storeNotes}` : ""}`
        : `Your reservation status has been updated to ${status}.`;
      await createNotification({
        userId: data.customer_id,
        title,
        message: msg,
        type: "reservation",
      });
    }
  } catch (nErr) {
    console.warn("[services/reservations] Status notification notice:", nErr);
  }

  return data;
}

/**
 * Subscribes to real-time changes on table_reservations for a customer.
 */
export function subscribeToCustomerReservations(
  customerId: string,
  onChange: () => void
) {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`customer_reservations_${customerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "table_reservations",
        filter: `customer_id=eq.${customerId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on table_reservations for a store.
 */
export function subscribeToStoreReservations(
  storeId: string,
  onChange: () => void
) {
  const supabase = getSupabaseClient("merchant");
  const channel = supabase
    .channel(`store_reservations_${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "table_reservations",
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
