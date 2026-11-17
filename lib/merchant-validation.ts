import { PH_MOBILE_ERROR_MESSAGE, isValidPhilippineMobile, sanitizePhoneNumber } from "./phone";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  STORE_OPERATING_TIME_OPTIONS,
  filterDescriptionInput,
  filterStoreNameInput,
  parseOperatingTimeMinutes,
} from "../services/merchant-registration";

export const MAX_MENU_ITEM_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_STORE_MEDIA_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_MENU_ITEM_PRICE_PHP = 50000;
export const MIN_MENU_ITEM_PRICE_PHP = 1;

const OPERATING_TIME_SLOT_SET = new Set<string>(STORE_OPERATING_TIME_OPTIONS);

function stripControlChars(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

function inferMimeFromFileName(fileName?: string | null): string {
  const lower = (fileName || "").toLowerCase().trim();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export function resolveMerchantImageMimeType(file: {
  mimeType?: string | null;
  fileName?: string | null;
}): string {
  const direct = (file.mimeType || "").toLowerCase().trim();
  if (direct) return direct;
  return inferMimeFromFileName(file.fileName);
}

/**
 * Validates an uploaded or dropped image for menu items or store branding.
 */
export function validateMerchantImageFile(
  file: {
    mimeType?: string | null;
    fileName?: string | null;
    sizeBytes?: number | null;
  },
  maxBytes: number = MAX_MENU_ITEM_IMAGE_BYTES
): string | null {
  const mime = resolveMerchantImageMimeType(file);
  if (
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(
      mime as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    return "Upload a JPEG, PNG, or WebP image file.";
  }

  if (typeof file.sizeBytes === "number") {
    if (file.sizeBytes <= 0) {
      return "Selected image file is empty. Choose another photo.";
    }
    if (file.sizeBytes > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      return `Upload an image up to ${limitMb}MB in size (JPEG, PNG, or WebP).`;
    }
  }

  return null;
}

export function filterMenuSearchInput(raw: string): string {
  return stripControlChars(raw).slice(0, 100);
}

export function filterMenuItemNameInput(raw: string): string {
  return stripControlChars(raw).slice(0, 120);
}

export function filterMenuItemDescriptionInput(raw: string): string {
  return stripControlChars(raw).slice(0, 300);
}

/**
 * Constrains peso price text to positive decimal syntax (`999999.99` max digits, 2 decimal places).
 */
export function filterMenuItemPriceInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) {
    return cleaned.slice(0, 6);
  }

  const whole = cleaned.slice(0, dotIndex).slice(0, 6);
  const decimal = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${whole}.${decimal}`;
}

export function parseAndValidateMenuItemPrice(raw: string): {
  value: number | null;
  error: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: "Enter an item price in PHP." };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return {
      value: null,
      error: "Enter a valid PHP amount (e.g. 120 or 120.50).",
    };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < MIN_MENU_ITEM_PRICE_PHP) {
    return {
      value: null,
      error: `Price must be at least ₱${MIN_MENU_ITEM_PRICE_PHP.toFixed(2)}.`,
    };
  }
  if (num > MAX_MENU_ITEM_PRICE_PHP) {
    return {
      value: null,
      error: `Price cannot exceed ₱${MAX_MENU_ITEM_PRICE_PHP.toLocaleString("en-PH")}.`,
    };
  }
  return { value: Number(num.toFixed(2)), error: null };
}

export type MenuItemFieldErrors = Partial<
  Record<"name" | "description" | "category" | "price" | "image", string>
>;

export function validateMenuItemForm(input: {
  name: string;
  description: string;
  category: string;
  price: string;
  allowedCategories: readonly string[];
}): MenuItemFieldErrors {
  const errors: MenuItemFieldErrors = {};
  const cleanName = filterMenuItemNameInput(input.name).trim();
  const cleanDescription = filterMenuItemDescriptionInput(input.description).trim();

  if (!cleanName) {
    errors.name = "Item name is required.";
  } else if (cleanName.length < 2 || !/[A-Za-z0-9]/.test(cleanName)) {
    errors.name = "Enter at least 2 readable characters for the item name.";
  }

  if (
    cleanDescription.length > 0 &&
    (cleanDescription.length < 3 || !/[A-Za-z0-9]/.test(cleanDescription))
  ) {
    errors.description =
      "Enter a meaningful description (at least 3 characters) or leave it blank.";
  }

  if (!input.allowedCategories.includes(input.category)) {
    errors.category = "Select a valid menu category.";
  }

  const priceCheck = parseAndValidateMenuItemPrice(input.price);
  if (priceCheck.error) {
    errors.price = priceCheck.error;
  }

  return errors;
}

export type StoreProfileFieldErrors = Partial<
  Record<"storeName" | "description" | "operatingHours" | "phone" | "logo" | "cover", string>
>;

export function validateStoreProfileForm(input: {
  storeName: string;
  description: string;
  isOpen24Hours: boolean;
  openTime: string;
  closeTime: string;
  phone: string;
}): StoreProfileFieldErrors {
  const errors: StoreProfileFieldErrors = {};
  const cleanName = filterStoreNameInput(input.storeName).trim();
  const cleanDescription = filterDescriptionInput(input.description).trim();

  if (!cleanName) {
    errors.storeName = "Store name is required.";
  } else if (cleanName.length < 2 || !/[A-Za-z0-9]/.test(cleanName)) {
    errors.storeName = "Store name must be at least 2 readable characters.";
  }

  if (!cleanDescription) {
    errors.description = "Short description is required.";
  } else if (cleanDescription.length < 10 || !/[A-Za-z0-9]/.test(cleanDescription)) {
    errors.description =
      "Describe what your store serves in at least 10 readable characters.";
  }

  if (!input.isOpen24Hours) {
    const openValid = OPERATING_TIME_SLOT_SET.has(input.openTime);
    const closeValid = OPERATING_TIME_SLOT_SET.has(input.closeTime);
    const openMins = parseOperatingTimeMinutes(input.openTime);
    const closeMins = parseOperatingTimeMinutes(input.closeTime);

    if (!openValid || !closeValid || openMins === null || closeMins === null) {
      errors.operatingHours = "Select valid opening and closing times.";
    } else if (closeMins <= openMins) {
      errors.operatingHours = "Closing time must be later than opening time.";
    }
  }

  const cleanPhone = sanitizePhoneNumber(input.phone);
  if (!cleanPhone) {
    errors.phone = "Official contact phone is required.";
  } else if (!isValidPhilippineMobile(cleanPhone)) {
    errors.phone = PH_MOBILE_ERROR_MESSAGE;
  }

  return errors;
}

export const RESERVATION_DECLINE_PRESETS = [
  "Fully booked for the requested time slot.",
  "Party size exceeds our available table seating.",
  "Store kitchen is closing earlier than the requested time.",
] as const;

export function filterReservationDeclineNoteInput(raw: string): string {
  return stripControlChars(raw).slice(0, 250);
}

export function validateReservationDeclineNote(raw: string): string | null {
  const clean = filterReservationDeclineNoteInput(raw).trim();
  if (!clean) {
    return "Enter a brief reason so the customer knows why their booking cannot be accommodated.";
  }
  if (clean.length < 5 || !/[A-Za-z0-9]/.test(clean)) {
    return "Please write at least 5 readable characters explaining why the booking is unavailable.";
  }
  return null;
}
