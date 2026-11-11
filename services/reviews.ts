import { getSupabaseClient } from "../lib/supabase/client";
import { Database } from "../types/database";
import { createCommunityPost } from "./community";

export type OrderReviewRow = Database["public"]["Tables"]["order_reviews"]["Row"];

export const COURIER_COMPLIMENT_OPTIONS = [
  "⚡ Fast Delivery",
  "🍲 Handled with Care",
  "😊 Polite & Friendly",
  "📞 Great Communication",
  "🛵 Safe Driving",
] as const;

export type CourierCompliment = (typeof COURIER_COMPLIMENT_OPTIONS)[number];

export interface OrderReview {
  id: string;
  orderId: string;
  customerId: string;
  storeId: string;
  riderId?: string | null;
  foodRating: number;
  riderRating?: number | null;
  reviewText?: string | null;
  riderCompliments: string[];
  postedToCommunity: boolean;
  createdAt: string;
}

export interface SubmitReviewPayload {
  orderId: string;
  storeId: string;
  storeName?: string;
  riderId?: string | null;
  foodRating: number; // 1 to 5
  riderRating?: number | null; // 1 to 5
  reviewText?: string;
  riderCompliments?: string[];
  postToCommunity?: boolean;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
}

export interface RiderRatingSummary extends RatingSummary {
  compliments: Record<string, number>;
}

/**
 * Validates that a star rating is an integer between 1 and 5.
 */
export function validateStarRating(stars: unknown): boolean {
  if (typeof stars !== "number" || !Number.isInteger(stars)) {
    return false;
  }
  return stars >= 1 && stars <= 5;
}

/**
 * Calculates average rating and count from a list of numerical star scores.
 */
export function computeRatingSummary(ratings: number[]): RatingSummary {
  const valid = ratings.filter((r) => typeof r === "number" && r >= 1 && r <= 5);
  if (valid.length === 0) {
    return {
      averageRating: 5.0,
      totalReviews: 0,
    };
  }
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  const avg = Number((sum / valid.length).toFixed(1));
  return {
    averageRating: avg,
    totalReviews: valid.length,
  };
}

/**
 * Submits a post-delivery review covering both Food and Courier service.
 * Optionally publishes a public review to the Mati Foodie Community Feed.
 */
export async function submitOrderReview(payload: SubmitReviewPayload): Promise<OrderReview> {
  if (!validateStarRating(payload.foodRating)) {
    throw new Error("Food rating must be an integer between 1 and 5 stars.");
  }

  if (payload.riderRating !== undefined && payload.riderRating !== null) {
    if (!validateStarRating(payload.riderRating)) {
      throw new Error("Courier rating must be an integer between 1 and 5 stars.");
    }
  }

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You must be logged in to submit an order review.");
  }

  const cleanReviewText = payload.reviewText?.trim() || null;
  const compliments = Array.isArray(payload.riderCompliments) ? payload.riderCompliments : [];

  const { data, error } = await supabase
    .from("order_reviews")
    .insert({
      order_id: payload.orderId,
      customer_id: session.user.id,
      store_id: payload.storeId,
      rider_id: payload.riderId || null,
      food_rating: payload.foodRating,
      rider_rating: payload.riderRating || null,
      review_text: cleanReviewText,
      rider_compliments: compliments,
      posted_to_community: !!payload.postToCommunity,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[services/reviews] submitOrderReview error:", error);
    throw new Error(error?.message || "Failed to submit review.");
  }

  // If customer opted to share to Foodie Feed, publish community post
  if (payload.postToCommunity) {
    try {
      await createCommunityPost({
        content:
          cleanReviewText ||
          `Just ordered from ${payload.storeName || "Mati Restaurant"}! Rated ${payload.foodRating} ⭐. Highly recommended!`,
        taggedRestaurant: payload.storeName,
        rating: payload.foodRating,
      });
    } catch (communityErr) {
      console.warn("[services/reviews] Community post creation failed non-fatally:", communityErr);
    }
  }

  return {
    id: data.id,
    orderId: data.order_id,
    customerId: data.customer_id,
    storeId: data.store_id,
    riderId: data.rider_id,
    foodRating: data.food_rating,
    riderRating: data.rider_rating,
    reviewText: data.review_text,
    riderCompliments: data.rider_compliments || [],
    postedToCommunity: data.posted_to_community,
    createdAt: data.created_at,
  };
}

/**
 * Checks if a specific order has already been reviewed.
 */
export async function fetchOrderReview(orderId: string): Promise<OrderReview | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("order_reviews")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[services/reviews] fetchOrderReview error:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    orderId: data.order_id,
    customerId: data.customer_id,
    storeId: data.store_id,
    riderId: data.rider_id,
    foodRating: data.food_rating,
    riderRating: data.rider_rating,
    reviewText: data.review_text,
    riderCompliments: data.rider_compliments || [],
    postedToCommunity: data.posted_to_community,
    createdAt: data.created_at,
  };
}

/**
 * Aggregates courier compliment occurrences from review records.
 */
export function aggregateCompliments(
  reviewsList: Array<{ rider_compliments?: string[] | null }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of reviewsList) {
    if (Array.isArray(row.rider_compliments)) {
      for (const comp of row.rider_compliments) {
        if (typeof comp === "string" && comp.trim()) {
          counts[comp] = (counts[comp] || 0) + 1;
        }
      }
    }
  }
  return counts;
}

/**
 * Fetches aggregate rating statistics and customer compliments for an independent courier.
 */
export async function fetchRiderRatingSummary(riderId: string): Promise<RiderRatingSummary> {
  const supabase = getSupabaseClient("rider");

  // Primary: direct query to gather ratings and compliment tags
  const { data, error } = await supabase
    .from("order_reviews")
    .select("rider_rating, rider_compliments")
    .eq("rider_id", riderId);

  if (error || !data || data.length === 0) {
    // Secondary fallback: RPC if available
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_rider_rating_summary", {
        p_rider_id: riderId,
      });
      if (!rpcErr && rpcData) {
        const parsed = rpcData as { average_rating?: number; total_reviews?: number };
        return {
          averageRating: Number(parsed.average_rating ?? 5.0),
          totalReviews: Number(parsed.total_reviews ?? 0),
          compliments: {},
        };
      }
    } catch (rpcErr) {
      console.warn("[services/reviews] get_rider_rating_summary RPC notice:", rpcErr);
    }

    return { averageRating: 5.0, totalReviews: 0, compliments: {} };
  }

  const ratings = data
    .map((d) => d.rider_rating)
    .filter((r): r is number => typeof r === "number");
  const summary = computeRatingSummary(ratings);
  const compliments = aggregateCompliments(data);

  return {
    ...summary,
    compliments,
  };
}

/**
 * Fetches aggregate rating statistics for a store.
 */
export async function fetchStoreRatingSummary(storeId: string): Promise<RatingSummary> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc("get_store_rating_summary", {
      p_store_id: storeId,
    });
    if (!error && data) {
      const parsed = data as { average_rating?: number; total_reviews?: number };
      return {
        averageRating: Number(parsed.average_rating ?? 5.0),
        totalReviews: Number(parsed.total_reviews ?? 0),
      };
    }
  } catch (rpcErr) {
    console.warn("[services/reviews] get_store_rating_summary RPC failed, falling back to query:", rpcErr);
  }

  const { data, error } = await supabase
    .from("order_reviews")
    .select("food_rating")
    .eq("store_id", storeId);

  if (error || !data) {
    return { averageRating: 5.0, totalReviews: 0 };
  }

  const ratings = data.map((d) => d.food_rating).filter((r): r is number => typeof r === "number");
  return computeRatingSummary(ratings);
}
