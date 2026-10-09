/**
 * services/storage.ts
 *
 * Handles Supabase Storage uploads for customer dish reviews and merchant assets.
 */

import { getSupabaseClient } from "../lib/supabase/client";

export interface UploadResult {
  publicUrl: string | null;
  path?: string;
  error?: string;
}

/**
 * Uploads a customer dish photo or merchant asset to the public 'foodie-uploads' bucket.
 * Works seamlessly with Expo ImagePicker local URIs and web Blob URLs.
 */
export async function uploadDishPhoto(
  fileUri: string,
  options?: {
    mimeType?: string;
    folder?: string;
  }
): Promise<UploadResult> {
  try {
    const client = getSupabaseClient();
    const folder = options?.folder || "dishes";
    const mime = options?.mimeType || "image/jpeg";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const uniquePath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Convert local file URI / blob to standard Blob
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { data, error } = await client.storage
      .from("foodie-uploads")
      .upload(uniquePath, blob, {
        contentType: mime,
        upsert: false,
      });

    if (error) {
      return { publicUrl: null, error: error.message };
    }

    const { data: urlData } = client.storage
      .from("foodie-uploads")
      .getPublicUrl(data.path);

    return {
      publicUrl: urlData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    return {
      publicUrl: null,
      error: err?.message || "Failed to upload photo to Supabase storage.",
    };
  }
}
