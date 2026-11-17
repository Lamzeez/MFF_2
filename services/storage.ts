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

async function uploadMerchantAsset(
  fileOrUri: Blob | string,
  pathPrefix: string,
  options?: {
    mimeType?: string;
    errorLabel?: string;
  }
): Promise<UploadResult> {
  try {
    const client = getSupabaseClient("merchant");
    const mime =
      options?.mimeType ||
      (typeof fileOrUri !== "string" && (fileOrUri as any)?.type
        ? (fileOrUri as any).type
        : "image/jpeg");
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const uniquePath = `${pathPrefix}_${Date.now()}.${ext}`;

    let blob: Blob;
    if (typeof fileOrUri === "string") {
      const response = await fetch(fileOrUri);
      blob = await response.blob();
    } else {
      blob = fileOrUri;
    }

    let bucket = "store-branding";
    let { data, error } = await client.storage
      .from(bucket)
      .upload(uniquePath, blob, {
        contentType: mime,
        upsert: true,
      });

    if (error) {
      bucket = "foodie-uploads";
      const fallbackUpload = await client.storage
        .from(bucket)
        .upload(uniquePath, blob, {
          contentType: mime,
          upsert: true,
        });
      data = fallbackUpload.data;
      error = fallbackUpload.error;
    }

    if (error || !data) {
      return {
        publicUrl: null,
        error: error?.message || `Failed to upload ${options?.errorLabel || "merchant asset"}.`,
      };
    }

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(data.path);

    return {
      publicUrl: urlData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    return {
      publicUrl: null,
      error: err?.message || `Failed to upload ${options?.errorLabel || "merchant asset"}.`,
    };
  }
}

/**
 * Uploads a merchant store cover photo or branding asset to 'store-branding' bucket (with fallback to 'foodie-uploads').
 * Supports both web File/Blob instances and local URI strings.
 */
export async function uploadStoreCoverPhoto(
  fileOrUri: Blob | string,
  storeId: string,
  options?: {
    mimeType?: string;
  }
): Promise<UploadResult> {
  return uploadMerchantAsset(fileOrUri, `covers/${storeId}`, {
    mimeType: options?.mimeType,
    errorLabel: "store cover photo",
  });
}

/**
 * Uploads a merchant store profile/logo avatar to 'store-branding' (with fallback to 'foodie-uploads').
 */
export async function uploadStoreProfilePhoto(
  fileOrUri: Blob | string,
  storeId: string,
  options?: {
    mimeType?: string;
  }
): Promise<UploadResult> {
  return uploadMerchantAsset(fileOrUri, `logos/${storeId}`, {
    mimeType: options?.mimeType,
    errorLabel: "store profile photo",
  });
}

/**
 * Uploads a menu item overview photo to 'store-branding' (with fallback to 'foodie-uploads').
 */
export async function uploadMenuItemPhoto(
  fileOrUri: Blob | string,
  storeId: string,
  options?: {
    mimeType?: string;
  }
): Promise<UploadResult> {
  return uploadMerchantAsset(fileOrUri, `menu-items/${storeId}`, {
    mimeType: options?.mimeType,
    errorLabel: "menu item photo",
  });
}

/**
 * Uploads a merchant verification permit or storefront photo during registration.
 */
export async function uploadStoreVerificationDocument(
  fileOrUri: Blob | string,
  userId: string,
  options?: {
    mimeType?: string;
  }
): Promise<UploadResult> {
  return uploadMerchantAsset(fileOrUri, `verification-docs/${userId}`, {
    mimeType: options?.mimeType,
    errorLabel: "verification document",
  });
}

/**
 * Uploads a courier registration document (Driver's License or Vehicle OR/CR) to Supabase storage.
 */
export async function uploadCourierDocument(
  fileOrUri: Blob | string,
  docType: "license" | "vehicle_or_cr",
  identifier?: string,
  options?: {
    mimeType?: string;
  }
): Promise<UploadResult> {
  const safeId = identifier ? identifier.replace(/[^a-zA-Z0-9_-]/g, "") : `courier_${Date.now()}`;
  return uploadMerchantAsset(fileOrUri, `courier-docs/${docType}_${safeId}`, {
    mimeType: options?.mimeType,
    errorLabel: docType === "license" ? "driver's license" : "vehicle registration document",
  });
}
