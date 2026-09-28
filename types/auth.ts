/**
 * Shared Registration Data Contracts
 * Guaranteed 1:1 schema parity between Web and Mobile for backend integration.
 */

// Store Admin Registration (Exact 1:1 parity with app/(web)/auth/store-register.tsx)
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
