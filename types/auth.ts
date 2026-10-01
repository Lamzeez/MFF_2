import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PlatformRole = Database["public"]["Enums"]["platform_role"];
export type StoreMembershipRole = Database["public"]["Enums"]["store_role"];
export type StoreMembership = Database["public"]["Tables"]["store_memberships"]["Row"];
// Customer is baseline; merchant derives from active store membership.
export type ApplicationRole = "customer" | "merchant" | PlatformRole;
export type ProfileEdit = Pick<Profile, "display_name" | "contact_phone">;

/** Prototype form payloads below are NOT database records or authorization contracts.
 * Passwords belong only to Auth requests. Application approvals are server-controlled.
 * Retained to avoid migrating registration UI in the foundation change.
 */

// Store registration form draft; backend submission is deferred.
export interface StoreRegistrationPayload {
  storeName: string;
  completeAddress: string;
  ownerFullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  verificationDocumentUri?: string;
  status: "pending" | "approved" | "rejected";
  appliedDate: string;
}

// Customer Registration (Mobile only)
export interface CustomerRegistrationPayload {
  fullName: string;
  email: string;
  password: string;
  mobileNumber: string;
  barangay: string;
  deliveryAddress: string;
  personalizationOptIn: boolean;
}

// Delivery Rider Registration (Mobile only)
export interface RiderRegistrationPayload {
  fullName: string;
  mobileNumber: string;
  motorcycleModel: string;
  plateNumber: string;
  licenseNumber: string;
  barangay: string;
  shiftPin: string;
  codAgreementAccepted: boolean;
  status: "active" | "offline";
}
