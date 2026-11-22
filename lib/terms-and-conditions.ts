/**
 * Mati FoodFinder (MFF) - Terms & Conditions and Policies
 * 
 * Formal terms of service for the registration pages of:
 * 1. Customer Users (Food Discovery, Orders, Table Reservations, Community Reviews)
 * 2. Store Merchant Partners (Restaurant/Karenderia Catalog, Order Fulfillment, Table Bookings)
 * 3. Delivery Rider Partners (Courier Dispatch, Food Transit, COD Cash Remittance)
 * 
 * Note: System Administrator accounts are internal staff credentials and are excluded.
 */

export interface TermsSection {
  id: string;
  title: string;
  content: string;
  highlights?: string[];
}

export interface RoleTermsDefinition {
  role: "customer" | "merchant" | "rider";
  roleName: string;
  version: string;
  lastUpdated: string;
  summary: string;
  sections: TermsSection[];
}

// ---------------------------------------------------------------------------
// 1. CUSTOMER TERMS AND CONDITIONS
// ---------------------------------------------------------------------------
export const CUSTOMER_TERMS: RoleTermsDefinition = {
  role: "customer",
  roleName: "Customer / Foodie",
  version: "1.0.0",
  lastUpdated: "November 2026",
  summary:
    "By creating a customer account on Mati FoodFinder (MFF), you agree to respect local food merchants, provide accurate delivery information across Mati City's 26 barangays, adhere to the Cash-on-Delivery (COD) 4-digit PIN verification protocol, and abide by the community review standards.",
  sections: [
    {
      id: "scope-and-eligibility",
      title: "1. Eligibility & Account Security",
      content:
        "You must be at least eighteen (18) years of age or possess legal parental/guardian consent to register an account. You agree to provide a valid Philippine mobile number (+63), a genuine name, and an active email address. You are solely responsible for safeguarding your credentials and all activity conducted through your account.",
      highlights: [
        "One account per customer; fraudulent or duplicate identities are prohibited.",
        "Accurate Philippine mobile number is required for delivery driver dispatch.",
      ],
    },
    {
      id: "orders-and-serviceability",
      title: "2. Food Ordering & Delivery Serviceability",
      content:
        "Mati FoodFinder facilitates food discovery and ordering from registered restaurants, grills, cafes, and karenderias across Mati City. Deliveries are constrained to the official twenty-six (26) barangays of Mati City. Once an order is accepted and marked as 'preparing' by the restaurant kitchen, cancellations cannot be accommodated due to the perishable nature of freshly cooked meals.",
      highlights: [
        "Deliveries strictly cover designated Mati City barangay boundaries.",
        "Cancellations are only permissible before the restaurant accepts the order.",
      ],
    },
    {
      id: "cod-and-handshake-pin",
      title: "3. Cash-on-Delivery (COD) & Handshake PIN Protocol",
      content:
        "Cash-on-Delivery (COD) is offered as a convenience for customers in Mati City. When your delivery courier arrives, you agree to inspect the parcel seal, pay the exact order subtotal plus delivery fee in cash, and provide the secure 4-digit Handshake PIN generated in your MFF active order screen. Handover of the order is completed only upon PIN verification.",
      highlights: [
        "Always prepare exact cash or inform your driver in advance if large bills require change.",
        "The 4-digit Handshake PIN serves as authoritative proof of order receipt.",
      ],
    },
    {
      id: "anti-bogus-buyer-policy",
      title: "4. Anti-Bogus Buyer & Strike Policy",
      content:
        "To protect local small businesses and independent couriers from financial loss, Mati FoodFinder enforces a strict Anti-Bogus Buyer Policy. Submitting fake orders, failing to be present at the pinned delivery address without prior notice, refusing delivery after food preparation, or failing to respond to driver communication upon arrival triggers an official strike.",
      highlights: [
        "First Strike: Formal warning on your account profile.",
        "Second Strike (2 Strikes Threshold): Immediate and indefinite suspension of Cash-on-Delivery (COD) privileges. Future orders will require pre-approved electronic payment.",
        "Willful malicious intent may result in permanent platform banning and referral to local authorities under Philippine consumer and cybercrime laws.",
      ],
    },
    {
      id: "table-reservations",
      title: "5. Dine-In Table Reservations",
      content:
        "Table reservation requests submitted through MFF remain in a 'pending' state until affirmatively confirmed or declined by the restaurant. Confirmed reservations include a strict fifteen (15) minute grace period. If your party does not arrive within 15 minutes of the reserved time, the restaurant reserves the right to release the table to walk-in guests and mark the reservation as a 'no-show'.",
      highlights: [
        "Reservation is confirmed only when merchant accepts the booking.",
        "A 15-minute grace period applies; unannounced tardiness constitutes a no-show.",
      ],
    },
    {
      id: "community-reviews",
      title: "6. Community Food Feed & Content Standards",
      content:
        "Registered customers can share photos, dish ratings, and culinary reviews on the Foodie Feed. You warrant that your reviews represent honest, first-hand experiences at Mati establishments. Defamatory, vulgar, extortive, or non-food content is strictly prohibited. MFF reserves the right to moderate or remove posts that violate these guidelines.",
      highlights: [
        "Photos must depict real dishes purchased at local eateries.",
        "Zero tolerance for harassment, competitor sabotage, or abusive language.",
      ],
    },
    {
      id: "privacy-and-consent",
      title: "7. Data Privacy & Personalization Consent (RA 10173)",
      content:
        "Mati FoodFinder complies with Republic Act No. 10173 (Philippine Data Privacy Act of 2012). Your delivery address, GPS coordinates, and contact details are used solely to fulfill your orders and bookings. Feature personalization (such as recording in-store visit check-ins and dish preferences) is strictly opt-in and can be revoked anytime in your profile settings.",
      highlights: [
        "Your contact information is shared with couriers strictly for active delivery coordination.",
        "We never sell your personal browsing or contact records to third-party advertisers.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. STORE MERCHANT PARTNER TERMS AND CONDITIONS
// ---------------------------------------------------------------------------
export const MERCHANT_TERMS: RoleTermsDefinition = {
  role: "merchant",
  roleName: "Privacy Policy & Terms & Conditions",
  version: "1.0.0",
  lastUpdated: "November 2026",
  summary: "",
  sections: [
    {
      id: "privacy-policy",
      title: "Privacy Policy",
      content:
        "Mati FoodFinder is committed to protecting your personal information and upholding your privacy. All data processing activities adhere to the guiding principles of legitimate purpose, transparency, and proportionality as prescribed in the Data Privacy Act of 2012 (R.A. 10173), its Implementing Rules and Regulations (IRR), and issuances of the National Privacy Commission (NPC).",
    },
    {
      id: "terms-and-conditions",
      title: "Terms & Conditions",
      content:
        "Your access to and use of the Mati FoodFinder Merchant Platform is conditioned on your acceptance of and compliance with these Terms & Conditions. These terms serve as the agreement between you and Mati FoodFinder in relation to your store registration, merchant operations, food hygiene standards, and order fulfillment.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. DELIVERY RIDER / COURIER PARTNER TERMS AND CONDITIONS
// ---------------------------------------------------------------------------
export const RIDER_TERMS: RoleTermsDefinition = {
  role: "rider",
  roleName: "Delivery Courier Partner",
  version: "1.0.0",
  lastUpdated: "November 2026",
  summary:
    "By registering as an independent delivery courier on Mati FoodFinder, you agree to operate roadworthy transport, adhere strictly to the Cash-on-Delivery (COD) Remittance Protocol, uphold food safety and thermal bag standards, verify handoffs using 4-digit PINs, and treat customers and kitchen staff with professional courtesy.",
  sections: [
    {
      id: "independent-contractor-status",
      title: "1. Independent Contractor Relationship",
      content:
        "As a delivery courier partner, you operate as an independent contractor and not as an employee, agent, or representative of Mati FoodFinder or partner restaurants. You retain discretion over when you log online and accept available delivery jobs, subject to fulfilling accepted orders in full compliance with these terms.",
      highlights: [
        "Flexible dispatch: you choose your active online shift hours.",
        "You are responsible for your own motorcycle maintenance, fuel, and mobile data.",
      ],
    },
    {
      id: "qualifications-and-road-safety",
      title: "2. Credentials, Vehicle Roadworthiness & Road Safety",
      content:
        "You must hold a valid Land Transportation Office (LTO) Driver's License and operate a duly registered, roadworthy motorcycle or vehicle (with valid OR/CR). You agree to follow all traffic regulations, speed limits, and helmet laws in Mati City. You must equip yourself with an insulated thermal bag to keep hot meals and cold beverages secure and fresh.",
      highlights: [
        "Valid LTO Driver's License and motorcycle registration are mandatory.",
        "Food must always be carried inside a clean, insulated thermal bag.",
      ],
    },
    {
      id: "atomic-job-dispatch-and-handoff",
      title: "3. Atomic Job Claim & 4-Digit PIN Verification",
      content:
        "To ensure rapid delivery, couriers may claim only one (1) active delivery job at a time. Once a job is accepted, you agree to proceed immediately to the store kitchen, inspect packaging integrity, and transit safely to the customer's delivery address. You must obtain and enter the customer's 4-digit Handshake PIN in the Rider App to successfully complete the order.",
      highlights: [
        "One active delivery job at a time guarantees prompt delivery without route detours.",
        "The customer's 4-digit Handshake PIN is required to complete delivery.",
      ],
    },
    {
      id: "cod-remittance-fiduciary-duty",
      title: "4. Cash-on-Delivery (COD) Remittance Protocol (Strict Fiduciary Duty)",
      content:
        "When fulfilling Cash-on-Delivery orders, you hold all collected customer money in fiduciary trust for the restaurant partner and platform. You agree to collect the exact gross cash amount from the customer, retain your designated delivery fee, and promptly remit the entire food subtotal to the partner merchant upon delivery completion.",
      highlights: [
        "All cash collected is held in legal trust; withholding or misallocating COD funds constitutes Estafa under Article 315 of the Revised Penal Code of the Philippines.",
        "Remittances must match the exact food subtotal recorded in the digital dispatch slip.",
        "Failure to remit collected COD cash will result in immediate account termination, blacklisting, and legal prosecution.",
      ],
    },
    {
      id: "customer-no-show-and-gps-audit",
      title: "5. Customer Unresponsiveness & GPS Beacon Audit",
      content:
        "If a customer cannot be reached at the pinned delivery location, you must remain within the 500-meter GPS proximity beacon radius and attempt contact via phone call and SMS for at least ten (10) minutes. You must log the no-show verification through the app, which generates an immutable GPS audit trail to protect your delivery record.",
      highlights: [
        "Never abandon or keep food without completing the official in-app no-show protocol.",
        "In-app GPS proximity telemetry verifies your physical presence at the customer landmark.",
      ],
    },
    {
      id: "professional-conduct",
      title: "6. Professional Code of Conduct & Anti-Tampering",
      content:
        "You agree to interact respectfully with customers, restaurant crews, and platform administrators. Food tampering, opening sealed containers, consuming customer food, or demanding tips beyond the indicated delivery fee is strictly prohibited and results in immediate, permanent banishment from the platform.",
      highlights: [
        "Zero tolerance for food tampering, bag opening, or disrespectful behavior.",
        "Professional and clean presentation represents the pride of Mati City's delivery community.",
      ],
    },
  ],
};

/**
 * Helper to fetch terms by role.
 */
export function getTermsForRole(role: "customer" | "merchant" | "rider"): RoleTermsDefinition {
  switch (role) {
    case "customer":
      return CUSTOMER_TERMS;
    case "merchant":
      return MERCHANT_TERMS;
    case "rider":
      return RIDER_TERMS;
  }
}
