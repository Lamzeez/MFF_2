import { getSupabaseClient } from "../lib/supabase/client";
import { Database } from "../types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType = "order" | "reservation" | "promo" | "system";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: "order" | "reservation" | "promo" | "system" | "community";
}

export interface CreateNotificationInput {
  userId?: string;
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Fetches all notifications for the currently authenticated user.
 */
export async function fetchNotifications(): Promise<NotificationRow[]> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/notifications] fetchNotifications error:", error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("[services/notifications] markNotificationRead error:", error);
    throw new Error(error.message);
  }
}

/**
 * Marks all notifications for the current user as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[services/notifications] markAllNotificationsRead error:", error);
    throw new Error(error.message);
  }
}

/**
 * Creates a notification (e.g. on order placed, status changed, QR check-in).
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationRow> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const targetUserId = input.userId || session?.user?.id;
  if (!targetUserId) {
    throw new Error("Target user ID is required to create notification.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: targetUserId,
      title: input.title,
      message: input.message,
      type: input.type || "system",
      is_read: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[services/notifications] createNotification error:", error);
    throw new Error(error?.message || "Failed to create notification");
  }

  return data;
}

/**
 * Subscribes to real-time notification changes for the current user.
 */
export function subscribeToNotifications(userId: string, onChange: () => void) {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`notifications_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
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
