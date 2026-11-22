/**
 * lib/customer-profile.ts
 *
 * Client persistence & synchronization module for personalized customer profiles
 * (Facebook-style Profile Picture, Cover Photo, Bio & Favorite Mati Dish).
 * Integrates with Supabase Auth metadata and provides cross-platform local caching.
 */

import { getSupabaseClient } from "./supabase/client";

export interface CustomerProfileData {
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  bio: string;
  favoriteDish: string;
  badgeTitle: string;
}

const STORAGE_KEY_PREFIX = "mff_customer_profile_";

export const DEFAULT_COVER_PHOTO =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80"; // Mati Dahican Beach Coastline

export const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80";

const DEFAULT_PROFILE: CustomerProfileData = {
  avatarUrl: null,
  coverPhotoUrl: DEFAULT_COVER_PHOTO,
  bio: "Mati foodie exploring the best seaside grills and authentic karenderias 🌊🍲",
  favoriteDish: "Classic Pork Humba",
  badgeTitle: "Mati Food Explorer 🌟",
};

/**
 * Sanitizes profile photo URIs to prevent saving or rendering ephemeral local blob: URLs
 * which are revoked by the browser upon refresh or session restart.
 */
export function sanitizeProfileUrl(url: any, fallback: string | null): string | null {
  if (typeof url !== "string" || !url.trim()) return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("file:///data/user/") ||
    trimmed.startsWith("file:///var/mobile/")
  ) {
    return fallback;
  }
  return trimmed;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Loads customized customer profile attributes for the given user ID.
 */
export async function getCustomerProfile(userId?: string | null): Promise<CustomerProfileData> {
  const key = `${STORAGE_KEY_PREFIX}${userId || "guest"}`;
  const storage = getStorage();

  // Try local persistent cache first for instant rendering
  if (storage) {
    const raw = storage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          avatarUrl: sanitizeProfileUrl(parsed.avatarUrl, null),
          coverPhotoUrl: sanitizeProfileUrl(parsed.coverPhotoUrl, DEFAULT_COVER_PHOTO),
        };
      } catch {
        // Fall back
      }
    }
  }

  // If user is authenticated, query Supabase user metadata
  if (userId) {
    try {
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (user && user.user_metadata) {
        const meta = user.user_metadata;
        const profile: CustomerProfileData = {
          avatarUrl: sanitizeProfileUrl(meta.avatar_url, null),
          coverPhotoUrl: sanitizeProfileUrl(meta.cover_photo_url, DEFAULT_COVER_PHOTO),
          bio: meta.bio || DEFAULT_PROFILE.bio,
          favoriteDish: meta.favorite_dish || DEFAULT_PROFILE.favoriteDish,
          badgeTitle: meta.badge_title || DEFAULT_PROFILE.badgeTitle,
        };
        if (storage) {
          storage.setItem(key, JSON.stringify(profile));
        }
        return profile;
      }
    } catch (e) {
      console.warn("Could not fetch remote user profile metadata:", e);
    }
  }

  return DEFAULT_PROFILE;
}

/**
 * Saves customized customer profile attributes (avatar, cover, bio, favorite dish)
 * to local persistent storage and synchronizes with Supabase Auth user metadata.
 */
export async function saveCustomerProfile(
  userId: string | null | undefined,
  updates: Partial<CustomerProfileData>
): Promise<CustomerProfileData> {
  const current = await getCustomerProfile(userId);
  const updated: CustomerProfileData = {
    ...current,
    ...updates,
    avatarUrl:
      updates.avatarUrl !== undefined
        ? sanitizeProfileUrl(updates.avatarUrl, null)
        : current.avatarUrl,
    coverPhotoUrl:
      updates.coverPhotoUrl !== undefined
        ? sanitizeProfileUrl(updates.coverPhotoUrl, DEFAULT_COVER_PHOTO)
        : current.coverPhotoUrl,
  };

  const key = `${STORAGE_KEY_PREFIX}${userId || "guest"}`;
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, JSON.stringify(updated));
  }

  // Sync to remote Supabase Auth metadata if logged in
  if (userId) {
    try {
      const client = getSupabaseClient();
      await client.auth.updateUser({
        data: {
          avatar_url: updated.avatarUrl,
          cover_photo_url: updated.coverPhotoUrl,
          bio: updated.bio,
          favorite_dish: updated.favoriteDish,
          badge_title: updated.badgeTitle,
        },
      });
    } catch (e) {
      console.warn("Failed to sync customer profile to Supabase metadata:", e);
    }
  }

  return updated;
}
