/**
 * Sanitizes phone numbers by removing spaces, dashes, parentheses, and invalid characters.
 * Preserves leading '+' for international Philippine format (+63).
 */
export function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Strips non-telephone characters during typing while preserving optional leading '+',
 * digits, spaces, and hyphens up to 16 characters.
 */
export function filterPhoneInput(raw: string): string {
  const cleaned = raw.replace(/[^\d+\s-]/g, "");
  const hasLeadingPlus = cleaned.trimStart().startsWith("+");
  const withoutPlus = cleaned.replace(/\+/g, "");
  return `${hasLeadingPlus ? "+" : ""}${withoutPlus}`.slice(0, 16);
}

/**
 * Validates whether the given string is a plausible telephone number.
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  const sanitized = sanitizePhoneNumber(phone);
  // Philippine mobile numbers are 10-13 digits (e.g. 09171234567 or +639171234567)
  return sanitized.length >= 7 && sanitized.length <= 15;
}

/**
 * Strictly validates a Philippine mobile / GCash number (`09XXXXXXXXX` or `+639XXXXXXXXX`).
 */
export function isValidPhilippineMobile(phone?: string | null): boolean {
  const normalized = sanitizePhoneNumber(phone);
  return /^(\+639\d{9}|09\d{9})$/.test(normalized);
}

/**
 * Strictly validates a Mati City / Davao Oriental store phone:
 * either a Philippine mobile number or `(087)` regional landline.
 */
export function isValidMatiStorePhone(phone?: string | null): boolean {
  const normalized = sanitizePhoneNumber(phone);
  return /^(\+639\d{9}|09\d{9}|\+6387\d{7}|087\d{7})$/.test(normalized);
}

/**
 * Launches the device's native cellular phone dialer with the sanitized contact number.
 * Works seamlessly across Android, iOS, and Web without any external paid VoIP SDKs.
 */
export async function callPhoneNumber(
  phone?: string | null,
  recipientName: string = "Contact"
): Promise<boolean> {
  let rnAlert: any = null;
  let rnLinking: any = null;
  let rnPlatform: any = null;

  try {
    const req = typeof require !== "undefined" ? require : null;
    if (req) {
      const rn = req("react-native");
      rnAlert = rn?.Alert;
      rnLinking = rn?.Linking;
      rnPlatform = rn?.Platform;
    }
  } catch {
    // Dynamic fallback
  }

  const showAlert = (title: string, message: string) => {
    if (rnAlert?.alert) {
      rnAlert.alert(title, message);
    } else if (typeof window !== "undefined" && window.alert) {
      window.alert(`${title}: ${message}`);
    } else {
      console.warn(`[callPhoneNumber] ${title}: ${message}`);
    }
  };

  if (!phone || !phone.trim()) {
    showAlert(
      "No Contact Number",
      `${recipientName} has not registered an active phone number in their profile.`
    );
    return false;
  }

  const cleanNumber = sanitizePhoneNumber(phone);
  if (!isValidPhoneNumber(cleanNumber)) {
    showAlert(
      "Invalid Phone Number",
      `The phone number for ${recipientName} (${phone}) appears invalid.`
    );
    return false;
  }

  const telUrl = `tel:${cleanNumber}`;

  try {
    if (rnPlatform?.OS === "web" || typeof window !== "undefined") {
      if (typeof window !== "undefined") {
        window.location.href = telUrl;
        return true;
      }
    }

    if (rnLinking?.openURL) {
      const canOpen = await rnLinking.canOpenURL(telUrl).catch(() => true);
      if (canOpen) {
        await rnLinking.openURL(telUrl);
        return true;
      }
    }

    showAlert(
      "Dialer Unavailable",
      `Could not launch device phone dialer for ${recipientName} (${cleanNumber}). You can dial manually: ${cleanNumber}`
    );
    return false;
  } catch (error: any) {
    console.warn("[lib/phone] Failed to launch phone dialer:", error);
    showAlert(
      "Dialer Error",
      `Unable to launch phone dialer for ${recipientName}: ${error?.message || "Device linking error"}`
    );
    return false;
  }
}
