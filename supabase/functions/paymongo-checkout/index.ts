// Follow Deno and Supabase Edge Function standards
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIER_PRICING: Record<string, { name: string; amountCentavos: number; pricePhp: number }> = {
  basic: { name: "Basic", amountCentavos: 9900, pricePhp: 99 },
  standard: { name: "Standard", amountCentavos: 29900, pricePhp: 299 },
  commercial: { name: "Commercial", amountCentavos: 69900, pricePhp: 699 },
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
    if (!paymongoSecretKey) {
      throw new Error("Server configuration error: PAYMONGO_SECRET_KEY is missing in Supabase Secrets.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload: any = await req.json();

    // 2. Handle PayMongo Webhook Events (checkout_session.payment.paid)
    const webhookEventType = payload?.data?.attributes?.type;
    if (webhookEventType === "checkout_session.payment.paid") {
      const sessionObj = payload.data.attributes.data;
      const sessionId = sessionObj?.id;
      const payments = sessionObj?.attributes?.payments || [];
      const primaryPayment = payments[0];
      const paymentId = primaryPayment?.id || null;
      const paymentMethod = primaryPayment?.attributes?.source?.type || "qrph";

      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing session ID in webhook event." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: confirmResult, error: confirmError } = await supabaseClient.rpc(
        "confirm_subscription_payment",
        {
          p_session_id: sessionId,
          p_payment_id: paymentId,
          p_payment_method: paymentMethod,
        }
      );

      if (confirmError) {
        console.error("Webhook payment confirmation failed:", confirmError);
        return new Response(JSON.stringify({ error: confirmError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, status: "paid", data: confirmResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. ACTION: CREATE CHECKOUT SESSION
    if (payload.action === "create") {
      const { storeId, storeName = "Your Store", tier, successUrl, cancelUrl } = payload;
      if (!storeId || !tier) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters: storeId and tier." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tierConfig = TIER_PRICING[String(tier).toLowerCase()];
      if (!tierConfig) {
        return new Response(
          JSON.stringify({ error: "Invalid tier. Supported: basic, standard, commercial." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const defaultSuccessUrl =
        "https://mati-foodfinder.onrender.com/dashboard/billing?payment=success";
      const defaultCancelUrl =
        "https://mati-foodfinder.onrender.com/dashboard/billing?payment=cancelled";

      const finalSuccessUrl = successUrl || defaultSuccessUrl;
      const finalCancelUrl = cancelUrl || defaultCancelUrl;

      // Call PayMongo Checkout API with QR Ph included!
      const paymongoAuth = btoa(`${paymongoSecretKey}:`);
      const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${paymongoAuth}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              description: `Mati FoodFinder Store Subscription - ${tierConfig.name} Plan`,
              line_items: [
                {
                  amount: tierConfig.amountCentavos,
                  currency: "PHP",
                  name: `Mati FoodFinder - ${tierConfig.name} Plan`,
                  description: `Monthly subscription for ${storeName} (₱${tierConfig.pricePhp}/month)`,
                  quantity: 1,
                },
              ],
              payment_method_types: ["gcash", "paymaya", "card", "qrph", "grab_pay", "dob"],
              success_url: finalSuccessUrl,
              cancel_url: finalCancelUrl,
              metadata: {
                store_id: storeId,
                tier: String(tier).toLowerCase(),
              },
            },
          },
        }),
      });

      const pmResult = await response.json();
      if (!response.ok) {
        const errorMsg =
          pmResult?.errors?.[0]?.detail || "Failed to create PayMongo checkout session.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const checkoutSessionId = pmResult?.data?.id;
      const checkoutUrl = pmResult?.data?.attributes?.checkout_url;

      // Record pending checkout session in Supabase database
      const { error: dbError } = await supabaseClient.rpc(
        "record_subscription_checkout_intent",
        {
          p_store_id: storeId,
          p_tier: String(tier).toLowerCase(),
          p_amount: tierConfig.pricePhp,
          p_session_id: checkoutSessionId,
        }
      );

      if (dbError) {
        console.warn("Could not log pending checkout intent to DB:", dbError.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl,
          sessionId: checkoutSessionId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. ACTION: VERIFY CHECKOUT SESSION
    if (payload.action === "verify") {
      const { sessionId } = payload;
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing sessionId parameter." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paymongoAuth = btoa(`${paymongoSecretKey}:`);
      const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${paymongoAuth}`,
        },
      });

      const pmResult = await response.json();
      if (!response.ok) {
        const errorMsg =
          pmResult?.errors?.[0]?.detail || "Failed to retrieve PayMongo checkout session.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sessionData = pmResult?.data?.attributes;
      const payments = sessionData?.payments || [];
      const paidPayment = payments.find((p: any) => p?.attributes?.status === "paid") || payments[0];
      const paymentIntentStatus = sessionData?.payment_intent?.attributes?.status;
      const paymentId = paidPayment?.id || null;
      const paymentMethod = paidPayment?.attributes?.source?.type || "qrph";
      const isPaid =
        sessionData?.status === "paid" ||
        paidPayment?.attributes?.status === "paid" ||
        paymentIntentStatus === "succeeded";

      if (isPaid) {
        // Atomically confirm payment in database and upgrade store tier
        const { data: confirmResult, error: confirmError } = await supabaseClient.rpc(
          "confirm_subscription_payment",
          {
            p_session_id: sessionId,
            p_payment_id: paymentId,
            p_payment_method: paymentMethod,
          }
        );

        if (confirmError) {
          return new Response(
            JSON.stringify({
              error: `Payment captured, but database activation failed: ${confirmError.message}`,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: "paid",
            paymentId,
            paymentMethod,
            data: confirmResult,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Not paid yet or cancelled
      return new Response(
        JSON.stringify({
          success: false,
          status: sessionData?.status || "unpaid",
          paymentsCount: payments.length,
          paymentIntentStatus,
          message: "Payment has not been completed yet.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Supported: create, verify, or webhook event." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error in PayMongo gateway." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
