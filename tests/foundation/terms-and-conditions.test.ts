import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CUSTOMER_TERMS,
  MERCHANT_TERMS,
  RIDER_TERMS,
  getTermsForRole,
} from "../../lib/terms-and-conditions";

test("Customer Terms & Conditions cover all required platform, COD, and legal policies", () => {
  assert.equal(CUSTOMER_TERMS.role, "customer");
  assert.equal(CUSTOMER_TERMS.sections.length >= 6, true);

  const allContent = CUSTOMER_TERMS.sections
    .map((s) => `${s.title} ${s.content} ${(s.highlights || []).join(" ")}`)
    .join(" ");

  // 1. Serviceability: Mati City 26 official barangays
  assert.match(allContent, /Mati City/);
  assert.match(allContent, /barangay/i);

  // 2. COD & 4-digit Handshake PIN
  assert.match(allContent, /Cash-on-Delivery|COD/);
  assert.match(allContent, /4-digit/i);
  assert.match(allContent, /Handshake PIN/i);

  // 3. Anti-Bogus Buyer Strike Policy (2 strikes threshold)
  assert.match(allContent, /Anti-Bogus Buyer/i);
  assert.match(allContent, /2 Strikes|Second Strike/i);

  // 4. Dine-in Table Reservations (15-minute grace period)
  assert.match(allContent, /reservation/i);
  assert.match(allContent, /15.*minute/i);

  // 5. Community review standards
  assert.match(allContent, /review/i);

  // 6. Data Privacy Act (RA 10173) & Personalization
  assert.match(allContent, /10173|Data Privacy/i);
  assert.match(allContent, /opt-in|personalization/i);
});

test("Store Merchant Partner Terms cover privacy policy and terms and conditions", () => {
  assert.equal(MERCHANT_TERMS.role, "merchant");
  assert.equal(MERCHANT_TERMS.sections.length, 2);

  const allContent = MERCHANT_TERMS.sections
    .map((s) => `${s.title} ${s.content}`)
    .join(" ");

  assert.match(allContent, /Privacy Policy/i);
  assert.match(allContent, /Terms & Conditions/i);
  assert.match(allContent, /Data Privacy Act of 2012|R\.A\. 10173/i);
  assert.match(allContent, /Mati FoodFinder Merchant Platform/i);
});

test("Delivery Rider / Courier Terms cover road safety, atomic dispatch, and COD fiduciary duty", () => {
  assert.equal(RIDER_TERMS.role, "rider");
  assert.equal(RIDER_TERMS.sections.length >= 6, true);

  const allContent = RIDER_TERMS.sections
    .map((s) => `${s.title} ${s.content} ${(s.highlights || []).join(" ")}`)
    .join(" ");

  // 1. Independent contractor status
  assert.match(allContent, /independent contractor/i);

  // 2. Driver license (LTO) & roadworthy vehicle
  assert.match(allContent, /LTO|Driver.*License/i);
  assert.match(allContent, /thermal bag/i);

  // 3. Atomic job claim & 4-digit PIN handoff
  assert.match(allContent, /one.*job|single/i);
  assert.match(allContent, /4-digit.*PIN/i);

  // 4. COD Remittance & Article 315 Revised Penal Code (Estafa)
  assert.match(allContent, /fiduciary/i);
  assert.match(allContent, /Estafa|315/i);

  // 5. Customer no-show GPS proximity beacon audit
  assert.match(allContent, /500-meter|proximity/i);
  assert.match(allContent, /no-show/i);
});

test("Terms getter function resolves correct role definitions", () => {
  assert.equal(getTermsForRole("customer").role, "customer");
  assert.equal(getTermsForRole("merchant").role, "merchant");
  assert.equal(getTermsForRole("rider").role, "rider");
});

test("All 3 registration portals integrate Terms & Conditions modals and agreements", () => {
  // 1. Customer Registration
  const accountFormPath = path.resolve(process.cwd(), "components/auth/AccountForm.tsx");
  const accountFormSource = fs.readFileSync(accountFormPath, "utf-8");
  assert.equal(accountFormSource.includes("TermsModal"), true);
  assert.equal(accountFormSource.includes('role="customer"'), true);
  assert.equal(accountFormSource.includes("setShowTermsModal(true)"), true);
  assert.equal(accountFormSource.includes("customerTermsAgreed"), true);
  assert.equal(accountFormSource.includes("!customerTermsAgreed"), true);

  // 2. Merchant Store Registration
  const storeRegPath = path.resolve(process.cwd(), "app/(web)/auth/store-register.tsx");
  const storeRegSource = fs.readFileSync(storeRegPath, "utf-8");
  assert.equal(storeRegSource.includes("TermsModal"), true);
  assert.equal(storeRegSource.includes('role="merchant"'), true);
  assert.equal(storeRegSource.includes("termsAgreed"), true);
  assert.equal(storeRegSource.includes("disabled={!canSubmit}"), true);

  // 3. Courier Rider Registration
  const riderRegPath = path.resolve(process.cwd(), "app/(mobile)/auth/rider-register.tsx");
  const riderRegSource = fs.readFileSync(riderRegPath, "utf-8");
  assert.equal(riderRegSource.includes("TermsModal"), true);
  assert.equal(riderRegSource.includes('role="rider"'), true);
  assert.equal(riderRegSource.includes("setShowTermsModal(true)"), true);
  assert.equal(riderRegSource.includes("useState(false)"), true);
  assert.equal(riderRegSource.includes("disabled={loading || !riderCodAgreed}"), true);
});

test("TERMS_AND_CONDITIONS.md documentation exists and covers all non-admin roles", () => {
  const docPath = path.resolve(process.cwd(), "docs/TERMS_AND_CONDITIONS.md");
  assert.equal(fs.existsSync(docPath), true, "docs/TERMS_AND_CONDITIONS.md must exist");
  const docSource = fs.readFileSync(docPath, "utf-8");
  assert.equal(docSource.includes("Customer / Foodie Terms & Conditions"), true);
  assert.equal(docSource.includes("Store Merchant Partner Terms & Conditions"), true);
  assert.equal(docSource.includes("Delivery Courier Partner Terms & Conditions"), true);
  assert.equal(docSource.includes("Exclusion of System Administrators"), true);
});

test("Merchant Store Registration UI conforms to simplified labels, 1:1 map, and Image 2 terms layout", () => {
  const storeRegPath = path.resolve(process.cwd(), "app/(web)/auth/store-register.tsx");
  const storeRegSource = fs.readFileSync(storeRegPath, "utf-8");

  // Simplified and clean wording
  assert.equal(storeRegSource.includes("3. Personal Information"), true);
  assert.equal(storeRegSource.includes("Mobile Number *"), true);
  assert.equal(storeRegSource.includes("Full Name *"), true);
  assert.equal(storeRegSource.includes("2. Address"), true);
  assert.equal(storeRegSource.includes("Clear Draft"), true);

  // Removed redundant labels
  assert.equal(storeRegSource.includes("Owner Full Name"), false);
  assert.equal(storeRegSource.includes("Owner Mobile"), false);
  assert.equal(storeRegSource.includes("Required fields *"), false);
  assert.equal(storeRegSource.includes("Address & Map Pinpoint"), false);
  assert.equal(storeRegSource.includes("Within Mati City boundaries"), false);
  assert.equal(storeRegSource.includes("Owner Mobile (GCash)"), false);
  assert.equal(storeRegSource.includes("({categories.length} selected)"), false);
  assert.equal(storeRegSource.includes("Choose 30-minute AM/PM time slots or toggle 24-hour service"), false);

  // Streamlined on-page legal agreement: highlighted in blue, Terms & Conditions wording
  assert.equal(storeRegSource.includes("Privacy Policy"), true);
  assert.equal(storeRegSource.includes("Terms & Conditions"), true);
  assert.equal(storeRegSource.includes("text-blue-600"), true);
  assert.equal(storeRegSource.includes("Privacy Statement"), false);
  assert.equal(storeRegSource.includes("Click to view more"), false);
  assert.equal(storeRegSource.includes("I have read and agree to the"), true);

  // Barangay Autofill Input removed official badge
  const brgyInputPath = path.resolve(process.cwd(), "components/ui/BarangayAutofillInput.tsx");
  const brgyInputSource = fs.readFileSync(brgyInputPath, "utf-8");
  assert.equal(brgyInputSource.includes("Official Mati Brgy"), false);

  // Map Picker enforces 1:1 aspect ratio and Mati boundaries
  const mapPickerPath = path.resolve(process.cwd(), "components/auth/StoreMapPicker.web.tsx");
  const mapPickerSource = fs.readFileSync(mapPickerPath, "utf-8");
  assert.equal(mapPickerSource.includes("aspectRatio: 1"), true);
  assert.equal(mapPickerSource.includes("matiBounds"), true);
  assert.equal(mapPickerSource.includes("maxBoundsViscosity"), true);
});
