import { getSupabaseClient } from "../lib/supabase/client";
import { Database } from "../types/database";
import { SocialPost, FeedComment } from "../types/post";

export type CommunityPostRow = Database["public"]["Tables"]["community_posts"]["Row"];
export type CommunityCommentRow = Database["public"]["Tables"]["community_comments"]["Row"];

export interface CreatePostInput {
  content: string;
  taggedRestaurant?: string;
  taggedDish?: string;
  rating?: number;
  imageUrl?: string;
}

/**
 * Formats a relative timestamp (e.g. "5m ago", "2h ago", "1d ago").
 */
function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Recognized and popular Mati City culinary destinations.
 * Tagging these establishments boosts community relevance and promotes notable local eateries.
 */
export const POPULAR_MATI_EATERIES = [
  "mama letty's karenderia",
  "mama letty",
  "mati baywalk seafood grill",
  "baywalk seafood grill",
  "subangan street grills",
  "subangan grills",
  "dahican beach bites",
  "dahican beach",
  "aling nena's kitchen",
  "aling nena",
  "ciudades",
  "mening's",
  "lanit",
  "karenderia",
  "seafood grill",
];

/**
 * Checks whether a restaurant name matches a recognized/popular Mati dining spot.
 */
export function isPopularMatiEatery(restaurantName?: string | null): boolean {
  if (!restaurantName || !restaurantName.trim()) return false;
  const normalized = restaurantName.toLowerCase().trim();
  return POPULAR_MATI_EATERIES.some((eatery) => normalized.includes(eatery));
}

export interface PostEngagementInput {
  likesCount: number;
  commentsCount: number;
  hasPhoto: boolean;
  rating?: number | null;
  taggedRestaurant?: string | null;
  createdAt: string;
}

export interface EngagementScoreResult {
  finalScore: number;
  baseScore: number;
  timeDecayFactor: number;
  photoBonus: number;
  restaurantBonus: number;
  popularEateryBonus: number;
  likesScore: number;
  commentsScore: number;
  ratingScore: number;
}

/**
 * Smart Foodie Feed Algorithm Constants
 *
 * Weightings:
 * - Photo Bonus: +35 points (Real dish photos provide visual proof & credibility)
 * - Tagged Restaurant Bonus: +15 points (Contextual eatery review)
 * - Popular Mati Eatery Bonus: +25 points (Promotes established local culinary spots)
 * - Likes: +3 points per like
 * - Comments: +5 points per comment (Higher weight for active diner conversation)
 * - Rating: +2 points per star (Quality indicator)
 * - Time Decay: Half-life gravity decay so fresh posts trend, but high-engagement classics retain rank
 */
export const ENGAGEMENT_WEIGHTS = {
  PHOTO_BONUS: 35,
  TAGGED_RESTAURANT_BONUS: 15,
  POPULAR_EATERY_BONUS: 25,
  LIKE_MULTIPLIER: 3,
  COMMENT_MULTIPLIER: 5,
  RATING_MULTIPLIER: 2,
  DECAY_HALF_LIFE_HOURS: 12,
  GRAVITY_POWER: 0.75,
};

/**
 * Calculates the smart engagement score for a foodie review.
 * Formula ensures verified photo reviews and popular Mati eateries trend at the top.
 */
export function calculateEngagementScore(
  input: PostEngagementInput,
  referenceTimeMs: number = Date.now()
): EngagementScoreResult {
  const photoBonus = input.hasPhoto ? ENGAGEMENT_WEIGHTS.PHOTO_BONUS : 0;

  const hasTaggedRestaurant = Boolean(
    input.taggedRestaurant && input.taggedRestaurant.trim().length > 0
  );
  const restaurantBonus = hasTaggedRestaurant
    ? ENGAGEMENT_WEIGHTS.TAGGED_RESTAURANT_BONUS
    : 0;

  const isPopular = isPopularMatiEatery(input.taggedRestaurant);
  const popularEateryBonus = isPopular
    ? ENGAGEMENT_WEIGHTS.POPULAR_EATERY_BONUS
    : 0;

  const likesScore =
    Math.max(0, input.likesCount || 0) * ENGAGEMENT_WEIGHTS.LIKE_MULTIPLIER;
  const commentsScore =
    Math.max(0, input.commentsCount || 0) * ENGAGEMENT_WEIGHTS.COMMENT_MULTIPLIER;

  const ratingValue =
    input.rating !== undefined && input.rating !== null
      ? Math.min(5, Math.max(1, input.rating))
      : 5;
  const ratingScore = ratingValue * ENGAGEMENT_WEIGHTS.RATING_MULTIPLIER;

  const baseScore =
    photoBonus +
    restaurantBonus +
    popularEateryBonus +
    likesScore +
    commentsScore +
    ratingScore;

  // Calculate elapsed hours since creation
  const postDate = new Date(input.createdAt);
  const postTimeMs = isNaN(postDate.getTime()) ? referenceTimeMs : postDate.getTime();
  const hoursElapsed = Math.max(0, (referenceTimeMs - postTimeMs) / (1000 * 60 * 60));

  // Time decay factor using standard gravity model
  const timeDecayFactor =
    1 /
    Math.pow(
      hoursElapsed / ENGAGEMENT_WEIGHTS.DECAY_HALF_LIFE_HOURS + 1,
      ENGAGEMENT_WEIGHTS.GRAVITY_POWER
    );

  const finalScore = Math.round(baseScore * timeDecayFactor * 10) / 10;

  return {
    finalScore,
    baseScore,
    timeDecayFactor: Math.round(timeDecayFactor * 1000) / 1000,
    photoBonus,
    restaurantBonus,
    popularEateryBonus,
    likesScore,
    commentsScore,
    ratingScore,
  };
}

export type FeedSortOption = "trending" | "recent";

/**
 * Fetches community foodie feed posts with smart photo ranking and engagement scores.
 * Open to both guests (read-only) and authenticated foodies.
 */
export async function fetchCommunityPosts(
  page: number = 1,
  pageSize: number = 10,
  sortBy: FeedSortOption = "trending"
): Promise<SocialPost[]> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let postsQuery = supabase.from("community_posts").select("*");

  // In "recent" mode: order strictly by created_at desc with database range
  // In "trending" mode: fetch generous candidate window to score and rank intelligently
  if (sortBy === "recent") {
    postsQuery = postsQuery.order("created_at", { ascending: false }).range(from, to);
  } else {
    // Trending mode: fetch recent candidates pool (up to 50 posts)
    postsQuery = postsQuery.order("created_at", { ascending: false }).limit(50);
  }

  const { data: posts, error: postsError } = await postsQuery;

  if (postsError) {
    console.error("[services/community] fetchCommunityPosts error:", postsError);
    throw new Error(postsError.message);
  }

  if (!posts || posts.length === 0) {
    return [];
  }

  const postIds = posts.map((p) => p.id);

  // 2. Fetch comments for these posts
  const { data: comments } = await supabase
    .from("community_comments")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  const commentsByPost: Record<string, FeedComment[]> = {};
  for (const c of comments || []) {
    if (!commentsByPost[c.post_id]) {
      commentsByPost[c.post_id] = [];
    }
    commentsByPost[c.post_id].push({
      id: c.id,
      author: c.author_name,
      avatarColor: "bg-[#EA5410]",
      text: c.text,
      timestamp: formatRelativeTime(c.created_at),
    });
  }

  // 3. Fetch user's likes if signed in
  const userLikedPostIds = new Set<string>();
  if (currentUserId) {
    const { data: userLikes } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);

    for (const l of userLikes || []) {
      userLikedPostIds.add(l.post_id);
    }
  }

  // 4. Map and score posts
  const mappedPosts: SocialPost[] = posts.map((p) => {
    const postComments = commentsByPost[p.id] || [];
    const hasPhoto = Boolean(p.image_url && p.image_url.trim().length > 0);
    const popularEatery = isPopularMatiEatery(p.tagged_restaurant);

    const scoreResult = calculateEngagementScore({
      likesCount: p.likes_count,
      commentsCount: postComments.length,
      hasPhoto,
      rating: p.rating,
      taggedRestaurant: p.tagged_restaurant,
      createdAt: p.created_at,
    });

    return {
      id: p.id,
      author: p.author_name,
      authorInitial: p.author_name.charAt(0).toUpperCase() || "F",
      avatarBg: "bg-[#EA5410]",
      roleBadge: "Verified Foodie",
      timestamp: formatRelativeTime(p.created_at),
      createdAt: p.created_at,
      content: p.content,
      rating: p.rating,
      taggedRestaurant: p.tagged_restaurant || undefined,
      taggedDish: p.tagged_dish || undefined,
      imageUrl: p.image_url || undefined,
      likes: p.likes_count,
      hasLiked: userLikedPostIds.has(p.id),
      comments: postComments,
      engagementScore: scoreResult.finalScore,
      isTrending: scoreResult.finalScore >= 25,
      isPhotoVerified: hasPhoto,
      isPopularEatery: popularEatery,
    };
  });

  // 5. In trending mode: Sort by engagementScore descending, then slice for pagination
  if (sortBy === "trending") {
    mappedPosts.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
    return mappedPosts.slice(from, to + 1);
  }

  return mappedPosts;
}

/**
 * Creates a new community post review.
 */
export async function createCommunityPost(input: CreatePostInput): Promise<CommunityPostRow> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You must be signed in to post a foodie review.");
  }

  const authorName =
    session.user.user_metadata?.display_name ||
    session.user.email?.split("@")[0] ||
    "Foodie";

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: session.user.id,
      author_name: authorName,
      content: input.content,
      tagged_restaurant: input.taggedRestaurant || "",
      tagged_dish: input.taggedDish || "",
      rating: input.rating !== undefined ? input.rating : 5,
      image_url: input.imageUrl || "",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[services/community] createCommunityPost error:", error);
    throw new Error(error?.message || "Failed to create community post");
  }

  return data;
}

/**
 * Toggles a like on a post atomically via RPC.
 */
export async function togglePostLike(postId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("toggle_post_like", {
    p_post_id: postId,
  });

  if (error) {
    console.error("[services/community] togglePostLike error:", error);
    throw new Error(error.message);
  }

  return !!data;
}

/**
 * Adds a comment to a community post.
 */
export async function addCommunityComment(
  postId: string,
  text: string
): Promise<FeedComment> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You must be signed in to comment.");
  }

  const authorName =
    session.user.user_metadata?.display_name ||
    session.user.email?.split("@")[0] ||
    "Foodie";

  const { data, error } = await supabase
    .from("community_comments")
    .insert({
      post_id: postId,
      author_id: session.user.id,
      author_name: authorName,
      text: text.trim(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[services/community] addCommunityComment error:", error);
    throw new Error(error?.message || "Failed to add comment");
  }

  return {
    id: data.id,
    author: data.author_name,
    avatarColor: "bg-[#EA5410]",
    text: data.text,
    timestamp: "Just now",
  };
}

/**
 * Subscribes to real-time changes on community posts and comments.
 */
export function subscribeToCommunityFeed(onChange: () => void) {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("community_realtime_feed")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "community_posts",
      },
      () => {
        onChange();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "community_comments",
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
