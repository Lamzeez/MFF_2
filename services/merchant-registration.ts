import { getSupabaseClient } from "../lib/supabase/client";
import {
  MATI_BARANGAY_CENTROIDS,
  MATI_CITY_HALL_COORDS,
  type GeoCoordinates,
} from "../lib/geo-serviceability";
import {
  isValidMatiStorePhone,
  isValidPhilippineMobile,
  sanitizePhoneNumber,
} from "../lib/phone";
import { MATI_BARANGAYS } from "../mock/barangays";
import type { Database } from "../types/database";

export const STORE_CUISINE_OPTIONS = [
  "Meals",
  "Karenderias",
  "Seafood",
  "BBQ & Grill",
  "Merienda",
  "Beverages",
] as const;

export const STORE_BARANGAY_OPTIONS = [...MATI_BARANGAYS] as const;

export const MATI_REGISTRATION_BOUNDS = {
  minLat: 6.75,
  maxLat: 7.1,
  minLng: 126.05,
  maxLng: 126.4,
} as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_OPEN_TIME = "07:00 AM";
export const DEFAULT_CLOSE_TIME = "08:00 PM";

/** Curated 30-minute AM/PM time slots from 05:00 AM to 11:30 PM. */
export const STORE_OPERATING_TIME_OPTIONS: readonly string[] = (() => {
  const slots: string[] = [];
  for (let totalMins = 5 * 60; totalMins <= 23 * 60 + 30; totalMins += 30) {
    const hour24 = Math.floor(totalMins / 60);
    const min = totalMins % 60;
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    slots.push(
      `${String(hour12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${period}`
    );
  }
  return slots;
})();

const OPERATING_TIME_SLOT_SET = new Set<string>(STORE_OPERATING_TIME_OPTIONS);
const CATEGORY_OPTION_SET = new Set<string>(STORE_CUISINE_OPTIONS);
const BARANGAY_OPTION_SET = new Set<string>(STORE_BARANGAY_OPTIONS);

export type StoreRegistrationFieldKey =
  | "storeName"
  | "categories"
  | "description"
  | "storePhone"
  | "operatingHours"
  | "barangay"
  | "addressText"
  | "location"
  | "ownerName"
  | "ownerPhone"
  | "email"
  | "password"
  | "confirmPassword"
  | "document";

export interface StoreRegistrationInput {
  storeName: string;
  categories?: string[];
  cuisine?: string;
  description: string;
  storePhone: string;
  openTime?: string;
  closeTime?: string;
  isOpen24Hours?: boolean;
  operatingHours?: string;
  deliveryEnabled?: boolean;
  barangay: string;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  ownerName: string;
  ownerPhone: string;
  email: string;
  password: string;
  confirmPassword?: string;
  hasDocument: boolean;
}

export interface MerchantPasswordEvaluation {
  minLength: boolean;
  maxLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  noEdgeWhitespace: boolean;
  metCount: number;
  totalChecks: number;
  isValid: boolean;
}

function stripControlChars(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function filterStoreNameInput(raw: string): string {
  return stripControlChars(raw).slice(0, 120);
}

export function filterOwnerNameInput(raw: string): string {
  return stripControlChars(raw)
    .replace(/[^A-Za-z\u00C0-\u024F\s.'-]/g, "")
    .slice(0, 100);
}

export function filterEmailInput(raw: string): string {
  return stripControlChars(raw).replace(/\s+/g, "").slice(0, 254);
}

export function filterAddressInput(raw: string): string {
  return stripControlChars(raw).slice(0, 250);
}

export function filterDescriptionInput(raw: string): string {
  return stripControlChars(raw).slice(0, 500);
}

export function filterOtpInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function parseOperatingTimeMinutes(slot: string): number | null {
  const match = slot.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export function buildOperatingHoursString(params: {
  isOpen24Hours?: boolean;
  openTime?: string;
  closeTime?: string;
}): string {
  if (params.isOpen24Hours) return "Open 24 Hours";
  const open = params.openTime?.trim() || DEFAULT_OPEN_TIME;
  const close = params.closeTime?.trim() || DEFAULT_CLOSE_TIME;
  return `${open} - ${close} Daily`;
}

export function normalizeStoreCategories(
  categories?: readonly string[],
  legacyCuisine?: string
): string[] {
  const source =
    categories && categories.length > 0
      ? categories
      : legacyCuisine
        ? [legacyCuisine]
        : [];

  const unique: string[] = [];
  for (const item of source) {
    const clean = item.trim();
    if (CATEGORY_OPTION_SET.has(clean) && !unique.includes(clean)) {
      unique.push(clean);
    }
  }
  return unique;
}

export function isWithinMatiBounds(
  latitude: number | null,
  longitude: number | null
): boolean {
  if (
    latitude === null ||
    longitude === null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return false;
  }
  return (
    latitude >= MATI_REGISTRATION_BOUNDS.minLat &&
    latitude <= MATI_REGISTRATION_BOUNDS.maxLat &&
    longitude >= MATI_REGISTRATION_BOUNDS.minLng &&
    longitude <= MATI_REGISTRATION_BOUNDS.maxLng
  );
}

export function validateVerificationDocumentFile(file: {
  mimeType?: string | null;
  sizeBytes?: number | null;
}): string | null {
  const mime = (file.mimeType || "").toLowerCase().trim();
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mime as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    return "Upload a JPEG, PNG, or WebP image file.";
  }
  if (typeof file.sizeBytes === "number") {
    if (file.sizeBytes <= 0) {
      return "Selected image file is empty. Choose another photo.";
    }
    if (file.sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      return "Upload an image up to 5MB in size (JPEG, PNG, or WebP).";
    }
  }
  return null;
}

export function evaluateMerchantPassword(password: string): MerchantPasswordEvaluation {
  const minLength = password.length >= 12;
  const maxLength = password.length <= 128;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const noEdgeWhitespace = password.length > 0 && password === password.trim();

  const checks = [minLength, hasUppercase, hasLowercase, hasNumber];
  const metCount = checks.filter(Boolean).length;

  return {
    minLength,
    maxLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    noEdgeWhitespace,
    metCount,
    totalChecks: checks.length,
    isValid: minLength && maxLength && hasUppercase && hasLowercase && hasNumber && noEdgeWhitespace,
  };
}

export function getBarangayDefaultCoordinates(barangay: string): GeoCoordinates {
  return MATI_BARANGAY_CENTROIDS[barangay] || MATI_CITY_HALL_COORDS;
}

export function buildStoreDescription(
  categoriesOrCuisine: string | readonly string[],
  rawDescription: string
): string {
  const categoryList = Array.isArray(categoriesOrCuisine)
    ? normalizeStoreCategories(categoriesOrCuisine)
    : normalizeStoreCategories(undefined, categoriesOrCuisine as string);
  const cleanCategoryLabel = categoryList.join(", ");
  const cleanDesc = stripControlChars(rawDescription).replace(/\s+/g, " ").trim();

  if (!cleanCategoryLabel && !cleanDesc) return "";
  if (!cleanDesc) return cleanCategoryLabel;
  if (
    !cleanCategoryLabel ||
    categoryList.every((c) => cleanDesc.toLowerCase().includes(c.toLowerCase()))
  ) {
    return cleanDesc;
  }
  return `${cleanCategoryLabel} — ${cleanDesc}`;
}

export function validateStoreRegistrationFieldErrors(
  input: StoreRegistrationInput
): Partial<Record<StoreRegistrationFieldKey, string>> {
  const errors: Partial<Record<StoreRegistrationFieldKey, string>> = {};

  const cleanStoreName = stripControlChars(input.storeName).replace(/\s+/g, " ").trim();
  if (cleanStoreName.length < 2 || cleanStoreName.length > 120 || !/[A-Za-z]/.test(cleanStoreName)) {
    errors.storeName = "Enter a valid store name (2–120 characters with letters).";
  }

  const normalizedCategories = normalizeStoreCategories(input.categories, input.cuisine);
  if (normalizedCategories.length === 0) {
    errors.categories = "Select at least one store category.";
  }

  const cleanDesc = stripControlChars(input.description).trim();
  if (cleanDesc.length > 500) {
    errors.description = "Keep store description under 500 characters.";
  } else if (cleanDesc.length > 0 && (cleanDesc.length < 5 || !/[A-Za-z]/.test(cleanDesc))) {
    errors.description = "Enter at least 5 descriptive characters or leave blank.";
  }

  if (!isValidMatiStorePhone(input.storePhone)) {
    errors.storePhone =
      "Enter a valid PH mobile (09XXXXXXXXX / +639XXXXXXXXX) or (087) landline.";
  }

  if (!input.isOpen24Hours) {
    const open = input.openTime?.trim() || "";
    const close = input.closeTime?.trim() || "";
    if (open && close) {
      if (!OPERATING_TIME_SLOT_SET.has(open) || !OPERATING_TIME_SLOT_SET.has(close)) {
        errors.operatingHours = "Choose valid opening and closing times from the selector.";
      } else {
        const openMin = parseOperatingTimeMinutes(open);
        const closeMin = parseOperatingTimeMinutes(close);
        if (openMin === null || closeMin === null || closeMin <= openMin) {
          errors.operatingHours =
            "Closing time must be later than opening time (or turn on Open 24 Hours).";
        }
      }
    } else if (input.operatingHours) {
      const hours = input.operatingHours.trim();
      if (hours !== "Open 24 Hours") {
        const match = hours.match(
          /^(0?[1-9]|1[0-2]):[0-5]\d\s*(?:AM|PM)\s*-\s*(0?[1-9]|1[0-2]):[0-5]\d\s*(?:AM|PM)(?:\s+Daily)?$/i
        );
        if (!match) {
          errors.operatingHours = "Select valid opening and closing hours.";
        }
      }
    } else {
      errors.operatingHours = "Select valid opening and closing hours.";
    }
  }

  if (!BARANGAY_OPTION_SET.has(input.barangay.trim())) {
    errors.barangay = "Select a valid barangay in Mati City.";
  }

  const cleanAddress = stripControlChars(input.addressText).replace(/\s+/g, " ").trim();
  if (cleanAddress.length < 8 || cleanAddress.length > 250 || !/[A-Za-z]/.test(cleanAddress)) {
    errors.addressText =
      "Enter a complete street address & landmark (at least 8 characters with street details).";
  }

  if (!isWithinMatiBounds(input.latitude, input.longitude)) {
    errors.location = "Pin your store inside Mati City service boundaries on the map.";
  }

  const cleanOwnerName = stripControlChars(input.ownerName).replace(/\s+/g, " ").trim();
  if (
    cleanOwnerName.length < 2 ||
    cleanOwnerName.length > 100 ||
    /[0-9]/.test(cleanOwnerName) ||
    !/[A-Za-z\u00C0-\u024F]{2}/.test(cleanOwnerName.replace(/[\s.'-]/g, ""))
  ) {
    errors.ownerName = "Please enter the owner's full name.";
  }

  if (!isValidPhilippineMobile(input.ownerPhone)) {
    errors.ownerPhone =
      "Enter a valid 11-digit Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
  }

  const cleanEmail = input.email.trim().toLowerCase();
  if (
    cleanEmail.length > 254 ||
    cleanEmail.includes("..") ||
    !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanEmail)
  ) {
    errors.email = "Enter a valid owner email address (e.g. owner@store.com).";
  }

  const pwEval = evaluateMerchantPassword(input.password);
  if (!pwEval.isValid) {
    if (!pwEval.noEdgeWhitespace && input.password.length > 0) {
      errors.password = "Password cannot start or end with spaces.";
    } else if (!pwEval.maxLength) {
      errors.password = "Password must be 128 characters or fewer.";
    } else {
      errors.password =
        "Password must be 12+ characters with uppercase, lowercase, and a number.";
    }
  }

  if (input.confirmPassword !== undefined) {
    if (!input.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (input.confirmPassword !== input.password) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  if (!input.hasDocument) {
    errors.document = "Upload a clear JPEG, PNG, or WebP photo of your storefront or permit.";
  }

  return errors;
}

export function validateStoreRegistrationFields(input: StoreRegistrationInput): string | null {
  const fieldErrors = validateStoreRegistrationFieldErrors(input);
  const orderedKeys: StoreRegistrationFieldKey[] = [
    "storeName",
    "storePhone",
    "categories",
    "description",
    "operatingHours",
    "barangay",
    "addressText",
    "location",
    "ownerName",
    "ownerPhone",
    "email",
    "password",
    "confirmPassword",
    "document",
  ];
  for (const key of orderedKeys) {
    if (fieldErrors[key]) {
      return fieldErrors[key] || null;
    }
  }
  return null;
}

export interface StoreApplicationResult {
  id: string;
  name: string;
  slug: string;
  categories?: string[];
  approval_status: Database["public"]["Enums"]["store_approval_status"];
}

export async function submitMerchantStoreApplication(payload: {
  name: string;
  categories?: string[];
  addressText: string;
  barangay: string;
  publicPhone: string;
  description: string;
  operatingHours: string;
  deliveryEnabled: boolean;
  latitude: number | null;
  longitude: number | null;
  verificationDocumentUrl: string | null;
}): Promise<StoreApplicationResult> {
  const cleanCategories = normalizeStoreCategories(payload.categories);
  const effectiveCategories = cleanCategories.length > 0 ? cleanCategories : [STORE_CUISINE_OPTIONS[0]];

  if (!isWithinMatiBounds(payload.latitude, payload.longitude)) {
    throw new Error("Pin your store location inside Mati City before submitting.");
  }

  if (
    !payload.verificationDocumentUrl ||
    !/^https:\/\/[^/\s]+\/storage\/v1\/object\/public\/(store-branding|foodie-uploads)\//.test(
      payload.verificationDocumentUrl
    )
  ) {
    throw new Error("Upload a valid verification image before submitting.");
  }

  const client = getSupabaseClient("merchant");
  const { data, error } = await client.rpc("merchant_submit_store_application", {
    p_name: stripControlChars(payload.name).replace(/\s+/g, " ").trim(),
    p_address_text: stripControlChars(payload.addressText).replace(/\s+/g, " ").trim(),
    p_barangay: payload.barangay.trim(),
    p_public_phone: sanitizePhoneNumber(payload.publicPhone) || null,
    p_description: stripControlChars(payload.description).trim(),
    p_operating_hours: payload.operatingHours.trim() || "07:00 AM - 08:00 PM Daily",
    p_delivery_enabled: payload.deliveryEnabled,
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_verification_document_url: payload.verificationDocumentUrl,
    p_categories: effectiveCategories,
  });

  if (error || !data) {
    throw new Error(error?.message || "Could not submit your store application.");
  }

  return data as StoreApplicationResult;
}

export interface MerchantMembershipSummary {
  hasMembership: boolean;
  storeId?: string;
  storeName?: string;
  approvalStatus?: Database["public"]["Enums"]["store_approval_status"];
}

export async function fetchMerchantMembershipStatus(
  userId: string
): Promise<MerchantMembershipSummary> {
  const client = getSupabaseClient("merchant");
  const { data, error } = await client
    .from("store_memberships")
    .select("store_id, is_active, role, store:stores(id, name, approval_status)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message || "Could not verify store membership.");
  }

  const rows = (data || []) as Array<{
    store_id: string;
    store: { id: string; name: string; approval_status: Database["public"]["Enums"]["store_approval_status"] } | null;
  }>;

  if (rows.length === 0) {
    return { hasMembership: false };
  }

  const preferred =
    rows.find((r) => r.store?.approval_status === "approved") || rows[0];

  return {
    hasMembership: true,
    storeId: preferred.store_id,
    storeName: preferred.store?.name,
    approvalStatus: preferred.store?.approval_status,
  };
}
