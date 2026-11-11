import { getSupabaseClient } from "../lib/supabase/client";
import type { OrderStatus } from "../types/order";
import { createNotification } from "./notifications";

// Safely resolve React Native & Expo modules dynamically so Node.js test runners don't crash
function getNativeModule(name: string): any {
  if (typeof process !== "undefined" && process.release?.name === "node" && !process.env.EXPO_RUNTIME) {
    // Running in pure Node unit test environment
    return null;
  }
  try {
    const req = typeof require !== "undefined" ? require : null;
    if (req) {
      return req(name);
    }
  } catch {
    return null;
  }
  return null;
}

const RN_PKG = "react" + "-native";
const NOTIF_PKG = "expo" + "-notifications";
const DEVICE_PKG = "expo" + "-device";

const getPlatform = () => getNativeModule(RN_PKG)?.Platform;
const getNotifications = () => getNativeModule(NOTIF_PKG);
const getDevice = () => getNativeModule(DEVICE_PKG);

// Configure presentation behavior in native app runtime
const rnPlatform = getPlatform();
const Notifications = getNotifications();

if (rnPlatform && rnPlatform.OS !== "web" && Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });
  } catch {
    // Graceful fallback
  }
}

/**
 * Initializes Android notification channels and device handler.
 */
export async function initializeNotificationChannels(): Promise<void> {
  const platform = getPlatform();
  const notifs = getNotifications();

  if (platform?.OS === "android" && notifs?.setNotificationChannelAsync) {
    try {
      await notifs.setNotificationChannelAsync("orders-channel", {
        name: "Mati Order Lifecycle Updates",
        importance: notifs.AndroidImportance?.MAX || 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EA5410",
        sound: "default",
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    } catch (err) {
      console.warn("[device-notifications] Failed to set Android notification channel:", err);
    }
  }
}

/**
 * Validates Expo Push Token format.
 */
export function isValidExpoPushToken(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  return (
    token.startsWith("ExponentPushToken[") &&
    token.endsWith("]") &&
    token.length > 25
  );
}

/**
 * Requests device permission and registers for Expo Push Notifications.
 * Saves the token to Supabase profiles table for the authenticated user.
 */
export async function registerForPushNotificationsAsync(
  userId?: string
): Promise<string | null> {
  const platform = getPlatform();
  const notifs = getNotifications();
  const device = getDevice();

  if (platform?.OS === "web" || !notifs) {
    return null;
  }

  try {
    await initializeNotificationChannels();

    if (device && !device.isDevice) {
      console.log("[device-notifications] Running on simulator/emulator; push tokens require physical device.");
    }

    if (!notifs.getPermissionsAsync || !notifs.requestPermissionsAsync) {
      return null;
    }

    const { status: existingStatus } = await notifs.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await notifs.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[device-notifications] Notification permission not granted.");
      return null;
    }

    // Generate Expo Push Token
    let token: string | null = null;
    if (notifs.getExpoPushTokenAsync) {
      try {
        const pushTokenData = await notifs.getExpoPushTokenAsync();
        token = pushTokenData?.data || null;
      } catch (tokenErr) {
        console.warn("[device-notifications] Could not retrieve Expo push token:", tokenErr);
      }
    }

    // Save push token to user profile if signed in
    if (token && userId) {
      try {
        const client = getSupabaseClient();
        await client
          .from("profiles")
          .update({ expo_push_token: token })
          .eq("id", userId);
      } catch (saveErr) {
        console.warn("[device-notifications] Failed to persist push token to Supabase:", saveErr);
      }
    }

    return token;
  } catch (error) {
    console.warn("[device-notifications] Error in registerForPushNotificationsAsync:", error);
    return null;
  }
}

/**
 * Dispatches an immediate in-system device notification (lock-screen banner, sound, vibration).
 */
export async function sendSystemNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string | null> {
  const platform = getPlatform();
  const notifs = getNotifications();

  if (platform?.OS === "web" || !notifs?.scheduleNotificationAsync) {
    // Web fallback notification if supported
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/assets/icon.png" });
      } catch {
        // Ignore web browser restrictions
      }
    }
    return null;
  }

  try {
    await initializeNotificationChannels();

    const notificationId = await notifs.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
        channelId: "orders-channel",
        priority: notifs.AndroidNotificationPriority?.MAX || 2,
      },
      trigger: null, // null trigger = fires immediately
    });

    return notificationId;
  } catch (err) {
    console.warn("[device-notifications] Failed to schedule system notification:", err);
    return null;
  }
}

export interface OrderStatusNotificationCopy {
  title: string;
  body: string;
}

/**
 * Returns canonical Mati customer notification copy for each order lifecycle transition.
 */
export function getOrderStatusNotificationCopy(
  status: OrderStatus,
  storeName: string,
  handshakePin?: string,
  orderNumber?: string
): OrderStatusNotificationCopy | null {
  const cleanStore = storeName || "Restaurant";
  const numLabel = orderNumber ? ` #${orderNumber}` : "";

  switch (status) {
    case "placed":
      return {
        title: "Order Placed! 🛵",
        body: `Order${numLabel} sent to ${cleanStore}. Waiting for store confirmation.`,
      };
    case "accepted":
      return {
        title: "Order Confirmed! 👨‍🍳",
        body: `${cleanStore} has accepted your order and started food preparation.`,
      };
    case "preparing":
      return {
        title: "Cooking in Progress! 🔥",
        body: `Your meal is being freshly prepared in ${cleanStore}'s kitchen.`,
      };
    case "ready_for_pickup":
      return {
        title: "Order Ready! 📦",
        body: `Your food is freshly packed! A Mati rider is on their way to pick it up.`,
      };
    case "out_for_delivery":
      return {
        title: "Out for Delivery! 🚀",
        body: `Your rider is on the way! Prepare exact cash and your Handshake PIN: [${handshakePin || "----"}].`,
      };
    case "delivered":
      return {
        title: "Delivered! 🍽️",
        body: `Your order from ${cleanStore} has arrived. Enjoy your meal in Mati City!`,
      };
    case "cancelled":
      return {
        title: "Order Cancelled ❌",
        body: `Your order${numLabel} from ${cleanStore} was cancelled.`,
      };
    default:
      return null;
  }
}

/**
 * Sends both an in-system notification (OS banner/vibrate/sound)
 * AND records an in-app notification in Supabase so the customer has full history.
 */
export async function notifyCustomerOrderLifecycle(params: {
  status: OrderStatus;
  storeName: string;
  handshakePin?: string;
  orderNumber?: string;
  orderId: string;
  customerId?: string;
}): Promise<void> {
  const copy = getOrderStatusNotificationCopy(
    params.status,
    params.storeName,
    params.handshakePin,
    params.orderNumber
  );

  if (!copy) return;

  // 1. In-System OS Notification (Heads-up banner, sound, vibration on lock-screen)
  await sendSystemNotification(copy.title, copy.body, {
    orderId: params.orderId,
    screen: "orders",
    status: params.status,
  });

  // 2. In-App Notification Record (Bell badge & history sheet)
  if (params.customerId) {
    try {
      await createNotification({
        userId: params.customerId,
        title: copy.title,
        message: copy.body,
        type: "order",
      });
    } catch (notifErr) {
      console.warn("[device-notifications] In-app notification logging note:", notifErr);
    }

    // 3. Remote In-System Push Notification (Delivers to phone even when app is locked/at home)
    dispatchRemotePushToRecipient(params.customerId, copy.title, copy.body, {
      orderId: params.orderId,
      screen: "orders",
      status: params.status,
    }).catch((pushErr) => console.warn("[device-notifications] Remote push dispatch notice:", pushErr));
  }
}

/**
 * Sends a real remote push notification payload to Expo's Push API endpoint.
 * Works even when customer/rider is at home and phone is locked or app is closed.
 */
export async function sendExpoPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isValidExpoPushToken(pushToken)) {
    return { success: false, error: "Invalid Expo push token format" };
  }

  const message = {
    to: pushToken,
    sound: "default",
    title,
    body,
    data,
    channelId: "orders-channel",
    priority: "high",
  };

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const json = (await res.json()) as any;
    if (json.data && json.data.status === "ok") {
      return { success: true, id: json.data.id };
    }
    return {
      success: false,
      error: json.data?.message || json.errors?.[0]?.message || "Expo push dispatch failed",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error sending Expo push" };
  }
}

/**
 * Dispatches a remote push notification to a user by looking up their registered Expo Push Token.
 */
export async function dispatchRemotePushToRecipient(
  recipientId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; token?: string; error?: string }> {
  const client = getSupabaseClient();
  try {
    const { data: profile } = await client
      .from("profiles")
      .select("expo_push_token")
      .eq("id", recipientId)
      .maybeSingle();

    const pushToken = profile?.expo_push_token;
    if (!pushToken || !isValidExpoPushToken(pushToken)) {
      return { success: false, error: "Recipient has no registered Expo push token" };
    }

    const pushRes = await sendExpoPushNotification(pushToken, title, body, data);

    // Record into remote push outbox queue
    try {
      await client.from("remote_push_queue").insert({
        recipient_id: recipientId,
        title,
        body,
        data,
        status: pushRes.success ? "sent" : "failed",
        error_message: pushRes.error || null,
        sent_at: pushRes.success ? new Date().toISOString() : null,
      });
    } catch {
      // Non-blocking queue log
    }

    return { success: pushRes.success, token: pushToken, error: pushRes.error };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dispatch remote push" };
  }
}

/**
 * Sets up a listener that handles the customer tapping a system notification
 * from their lock screen or phone notification drawer.
 */
export function setupNotificationResponseListener(
  onSelectOrder: (orderId: string) => void
): () => void {
  const notifs = getNotifications();
  if (!notifs?.addNotificationResponseReceivedListener) {
    return () => {};
  }

  try {
    const subscription = notifs.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if (data && data.orderId) {
        onSelectOrder(data.orderId as string);
      }
    });

    return () => {
      subscription?.remove?.();
    };
  } catch {
    return () => {};
  }
}
