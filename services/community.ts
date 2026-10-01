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
 * Fetches all community foodie feed posts with real-time like statuses and comments.
 * Open to both guests (read-only) and authenticated foodies.
 */
export async function fetchCommunityPosts(): Promise<SocialPost[]> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  // 1. Fetch posts
  const { data: posts, error: postsError } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false });

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

  // 4. Map to SocialPost objects
  return posts.map((p) => ({
    id: p.id,
    author: p.author_name,
    authorInitial: p.author_name.charAt(0).toUpperCase() || "F",
    avatarBg: "bg-[#EA5410]",
    roleBadge: "Verified Foodie",
    timestamp: formatRelativeTime(p.created_at),
    content: p.content,
    rating: p.rating,
    taggedRestaurant: p.tagged_restaurant || undefined,
    taggedDish: p.tagged_dish || undefined,
    imageUrl: p.image_url || undefined,
    likes: p.likes_count,
    hasLiked: userLikedPostIds.has(p.id),
    comments: commentsByPost[p.id] || [],
  }));
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
