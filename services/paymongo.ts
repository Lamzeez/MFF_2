import { getSupabaseClient } from "../lib/supabase/client";
import type { StoreSubscriptionTier } from "../types/restaurant";
import type { Database } from "../types/database";

export type StoreSubscriptionInvoice = Database["public"]["Tables"]["store_subscription_payments"]["Row"];

export interface PayMongoCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

export interface PayMongoVerifyResponse {
  success: boolean;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  error?: string;
  data?: any;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://tqztlckmeznbsjcszzyg.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_pwbQw_DdIm4q5jjBMSpCSA_5aRUw7cj";
const PAYMONGO_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/paymongo-checkout`;

const GATEWAY_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Initiates a PayMongo Checkout Session for a Store Subscription (Basic, Standard, Commercial).
 * Redirects the merchant to PayMongo's secure hosted payment page.
 */
export async function createStoreSubscriptionCheckout({
  storeId,
  storeName,
  tier,
  successUrl,
  cancelUrl,
}: {
  storeId: string;
  storeName?: string;
  tier: StoreSubscriptionTier;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<PayMongoCheckoutResponse> {
  try {
    const response = await fetch(PAYMONGO_FUNCTION_URL, {
      method: "POST",
      headers: GATEWAY_HEADERS,
      body: JSON.stringify({
        action: "create",
        storeId,
        storeName,
        tier,
        successUrl,
        cancelUrl,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Failed to create checkout session with PayMongo.",
      };
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      sessionId: data.sessionId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Could not connect to payment gateway. Check your connection.",
    };
  }
}

/**
 * Verifies the completed PayMongo Checkout Session and activates the subscription tier.
 */
export async function verifyStoreSubscriptionPayment(
  sessionId: string
): Promise<PayMongoVerifyResponse> {
  try {
    const response = await fetch(PAYMONGO_FUNCTION_URL, {
      method: "POST",
      headers: GATEWAY_HEADERS,
      body: JSON.stringify({
        action: "verify",
        sessionId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        status: "error",
        error: data.error || "Failed to verify payment with PayMongo.",
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      status: "error",
      error: err?.message || "Could not verify payment session. Please refresh.",
    };
  }
}

/**
 * Fetches billing history / invoices for the store.
 */
export async function fetchStoreSubscriptionInvoices(
  storeId: string
): Promise<StoreSubscriptionInvoice[]> {
  try {
    const client = getSupabaseClient("merchant");
    const { data, error } = await client.rpc("get_store_subscription_invoices", {
      p_store_id: storeId,
    });

    if (error) throw error;
    return (data || []) as StoreSubscriptionInvoice[];
  } catch (err) {
    console.warn("Could not load subscription invoices:", err);
    return [];
  }
}
