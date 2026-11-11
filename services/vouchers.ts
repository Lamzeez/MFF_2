import { getSupabaseClient } from "../lib/supabase/client";

export type DiscountType = "free_delivery" | "fixed" | "percentage";

export interface Voucher {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  value: number; // in pesos (or percentage if type === 'percentage')
  minSpend: number; // in pesos
  validUntil?: string | null;
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
}

export interface VoucherValidationResult {
  isValid: boolean;
  voucher?: Voucher;
  discountAmount: number; // in pesos
  errorMessage?: string;
}

/**
 * Canonical fallback vouchers for Mati City foodies.
 * Guaranteed to resolve immediately for rapid checkout validation.
 */
export const CANONICAL_MATI_VOUCHERS: Record<string, Voucher> = {
  MATIFIRST: {
    id: "11111111-2222-3333-4444-555555555551",
    code: "MATIFIRST",
    description: "First order free delivery across Mati City",
    discountType: "free_delivery",
    value: 35,
    minSpend: 0,
    validUntil: "2028-01-01T00:00:00.000Z",
    usageLimit: 10000,
    timesUsed: 0,
    isActive: true,
  },
  MATI50: {
    id: "11111111-2222-3333-4444-555555555552",
    code: "MATI50",
    description: "₱50 off for orders ₱200 and above",
    discountType: "fixed",
    value: 50,
    minSpend: 200,
    validUntil: "2028-01-01T00:00:00.000Z",
    usageLimit: 5000,
    timesUsed: 0,
    isActive: true,
  },
  HALAHALA10: {
    id: "11111111-2222-3333-4444-555555555553",
    code: "HALAHALA10",
    description: "10% off Mati seafood & delicacies (min spend ₱150)",
    discountType: "percentage",
    value: 10,
    minSpend: 150,
    validUntil: "2028-01-01T00:00:00.000Z",
    usageLimit: 5000,
    timesUsed: 0,
    isActive: true,
  },
};

/**
 * Calculates discount deduction in pesos based on voucher rules.
 */
export function calculateVoucherDiscount(
  voucher: Voucher,
  subtotal: number,
  deliveryFee: number = 35
): number {
  if (!voucher.isActive) return 0;
  if (subtotal < voucher.minSpend) return 0;

  switch (voucher.discountType) {
    case "free_delivery":
      // Deducts the ₱35 delivery fee
      return Math.min(deliveryFee, voucher.value > 0 ? voucher.value : deliveryFee);
    case "fixed":
      // Deducts fixed peso value, up to the food subtotal
      return Math.min(subtotal, voucher.value);
    case "percentage":
      // Deducts percentage off the food subtotal
      return Math.round(subtotal * (voucher.value / 100));
    default:
      return 0;
  }
}

/**
 * Validates a promo code against Supabase public.vouchers with instant fallback.
 * Enforces single-use rules via public.voucher_redemptions.
 */
export async function validateVoucherCode(
  rawCode: string,
  subtotal: number,
  deliveryFee: number = 35,
  userId?: string
): Promise<VoucherValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      isValid: false,
      discountAmount: 0,
      errorMessage: "Palihug pagsulod ug promo code.",
    };
  }

  let voucher: Voucher | null = null;

  // 1. Try querying remote Supabase public.vouchers table
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("vouchers")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      voucher = {
        id: data.id,
        code: data.code,
        description: data.description,
        discountType: data.discount_type as DiscountType,
        value: Number(data.value),
        minSpend: Number(data.min_spend),
        validUntil: data.valid_until,
        usageLimit: data.usage_limit,
        timesUsed: data.times_used || 0,
        isActive: data.is_active,
      };
    }
  } catch (err) {
    // Falls back to canonical local vouchers when client is unconfigured or offline
  }

  // 2. Fallback to canonical Mati vouchers
  if (!voucher && CANONICAL_MATI_VOUCHERS[code]) {
    voucher = CANONICAL_MATI_VOUCHERS[code];
  }

  if (!voucher) {
    return {
      isValid: false,
      discountAmount: 0,
      errorMessage: `Invalid promo code "${code}". Palihug susiha ang imong code.`,
    };
  }

  // 3. Expiration Check
  if (voucher.validUntil) {
    const expiresAt = new Date(voucher.validUntil).getTime();
    if (Date.now() > expiresAt) {
      return {
        isValid: false,
        discountAmount: 0,
        errorMessage: `Ang promo code "${code}" na-expire na.`,
      };
    }
  }

  // 4. Usage Limit Check
  if (voucher.usageLimit && voucher.timesUsed >= voucher.usageLimit) {
    return {
      isValid: false,
      discountAmount: 0,
      errorMessage: `Ang promo code "${code}" nahurot na ang usage limit.`,
    };
  }

  // 5. Minimum Spend Check
  if (subtotal < voucher.minSpend) {
    return {
      isValid: false,
      discountAmount: 0,
      errorMessage: `Gikinahanglan ang minimum order nga ₱${voucher.minSpend.toFixed(2)} para magamit ang ${code}. (Subtotal: ₱${subtotal.toFixed(2)})`,
    };
  }

  // 6. Single-Use Rule enforcement per customer
  if (userId && voucher.id) {
    try {
      const client = getSupabaseClient();
      const { data: redemption, error: redErr } = await client
        .from("voucher_redemptions")
        .select("id")
        .eq("voucher_id", voucher.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!redErr && redemption) {
        return {
          isValid: false,
          discountAmount: 0,
          errorMessage: `Nagamit na nimo ang promo code "${code}". 1-time use lamang kini matag customer.`,
        };
      }
    } catch {
      // Graceful notice if client or table is unavailable
    }
  }

  const discountAmount = calculateVoucherDiscount(voucher, subtotal, deliveryFee);

  return {
    isValid: true,
    voucher,
    discountAmount,
  };
}

/**
 * Records voucher redemption in public.voucher_redemptions.
 */
export async function recordVoucherRedemption(
  voucherId: string,
  userId: string,
  orderId?: string,
  discountApplied: number = 0
): Promise<void> {
  try {
    const client = getSupabaseClient();
    await client.from("voucher_redemptions").insert({
      voucher_id: voucherId,
      user_id: userId,
      order_id: orderId || null,
      discount_applied: discountApplied,
    });

    const { data: v } = await client
      .from("vouchers")
      .select("times_used")
      .eq("id", voucherId)
      .maybeSingle();
    if (v) {
      await client
        .from("vouchers")
        .update({ times_used: (v.times_used || 0) + 1 })
        .eq("id", voucherId);
    }
  } catch (err) {
    console.warn("[vouchers] Failed to persist voucher redemption:", err);
  }
}
