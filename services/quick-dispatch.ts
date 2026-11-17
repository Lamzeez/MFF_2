import { getSupabaseClient } from "../lib/supabase/client";
import { createNotification } from "./notifications";

export const COURIER_QUICK_MESSAGES = [
  "🛵 Padulong na ko sa inyong drop-off location",
  "📍 Naa na ko sa gawas / gate",
  "🔔 Palihug i-andam ang 4-digit PIN ug COD cash",
  "💵 Naa koy sukli sa ₱500 / ₱1,000",
  "⏳ Kadiyot lang, medyo trapik / naay gamayng aberya",
] as const;

export const BISAYA_RIDER_DISPATCH_CHIPS = [
  "🛵 Padulong na sa kan-anan",
  "🥡 Naghulat pa gi-pack ang pagkaon",
  "📍 Nakuha na ang order, padulong na diha",
  "🏡 Naa nako sa gawas sa inyong balay/gate",
  "💵 Palihug andam sa saktong bayad",
  "🔔 Palihug i-andam ang 4-digit PIN",
] as const;

export const CUSTOMER_QUICK_MESSAGES = [
  "📍 Naa na ko sa gawas / gate naghulat",
  "💵 Naa kay sukli sa ₱1,000 / ₱500?",
  "🔔 Palihug tawag o busina pag-abot",
  "🚪 Palihug ibilin lang sa guard house / reception",
  "🏠 Tapad ra sa tindahan / landmark ang balay",
] as const;

export interface QuickDispatchMessage {
  id: string;
  orderId: string;
  orderNumber?: string;
  senderId: string;
  senderName: string;
  senderRole: "rider" | "customer";
  recipientId?: string | null;
  message: string;
  timestamp: string;
  createdAtMs: number;
}

export interface SendQuickDispatchInput {
  orderId: string;
  orderNumber?: string;
  senderId: string;
  senderName: string;
  senderRole: "rider" | "customer";
  recipientId?: string | null;
  message: string;
}

/**
 * Sends a pre-defined one-tap dispatch update over Supabase Realtime broadcast
 * and records an in-app notification for the recipient.
 */
export async function sendQuickDispatchMessage(
  input: SendQuickDispatchInput
): Promise<QuickDispatchMessage> {
  const client = getSupabaseClient();
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  const messagePayload: QuickDispatchMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole,
    recipientId: input.recipientId,
    message: input.message,
    timestamp,
    createdAtMs: Date.now(),
  };

  // 1. Broadcast over Supabase Realtime channel for instant sub-50ms peer delivery
  try {
    const channel = client.channel(`order-dispatch-${input.orderId}`);
    await channel.send({
      type: "broadcast",
      event: "quick_dispatch_message",
      payload: messagePayload,
    });
  } catch (err) {
    console.warn("[services/quick-dispatch] Realtime broadcast error:", err);
  }

  // 2. Persist in-app notification if recipient ID is available
  if (input.recipientId) {
    try {
      const orderRef = input.orderNumber ? ` #${input.orderNumber}` : "";
      const senderTag = input.senderRole === "rider" ? "Courier" : "Customer";
      await createNotification({
        userId: input.recipientId,
        title: `Order${orderRef} Update (${senderTag})`,
        message: `${input.senderName}: "${input.message}"`,
        type: "order",
      });
    } catch (notifErr) {
      console.warn("[services/quick-dispatch] Failed to save in-app notification:", notifErr);
    }
  }

  return messagePayload;
}

/**
 * Subscribes to real-time quick dispatch broadcasts for an active order.
 */
export function subscribeToQuickDispatch(
  orderId: string,
  onMessage: (msg: QuickDispatchMessage) => void
): () => void {
  const client = getSupabaseClient();
  const channel = client.channel(`order-dispatch-${orderId}`);

  channel
    .on("broadcast", { event: "quick_dispatch_message" }, (event: any) => {
      if (event?.payload) {
        onMessage(event.payload as QuickDispatchMessage);
      }
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
