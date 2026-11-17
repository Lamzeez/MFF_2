import type {
  StoreSubscriptionStatus,
  StoreSubscriptionTier,
} from "../types/restaurant";

export interface SubscriptionTierDefinition {
  id: StoreSubscriptionTier;
  name: string;
  pricePhp: number;
  periodLabel: string;
  headerBgHex: string;
  badgeText: string;
  maxMenuItems: number | null;
  maxGalleryPhotos: number | null;
  features: readonly string[];
}

export const SUBSCRIPTION_TRIAL_MONTHS = 2;
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;

export const SUBSCRIPTION_TIERS: readonly SubscriptionTierDefinition[] = [
  {
    id: "basic",
    name: "Basic",
    pricePhp: 99,
    periodLabel: "/month",
    headerBgHex: "#5D6D7E",
    badgeText: "Free for first 2 months upon approval",
    maxMenuItems: 15,
    maxGalleryPhotos: 3,
    features: [
      "Up to 15 menu items",
      "3 gallery photos",
      "Store profile + open/closed status",
      "Manual availability toggle",
      "Scheduled open/close hours",
      "No delivery integration",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    pricePhp: 299,
    periodLabel: "/month",
    headerBgHex: "#155EEF",
    badgeText: "Popular for active Mati eateries",
    maxMenuItems: 60,
    maxGalleryPhotos: 10,
    features: [
      "Up to 60 menu items",
      "10 gallery photos",
      "Everything in Basic Plan",
      "Delivery toggle + details",
      "Item-level sold-out toggle",
      "Customer ratings & reviews visible",
    ],
  },
  {
    id: "commercial",
    name: "Commercial",
    pricePhp: 699,
    periodLabel: "/month",
    headerBgHex: "#EA9300",
    badgeText: "Built for multi-branch restaurants",
    maxMenuItems: null,
    maxGalleryPhotos: null,
    features: [
      "Unlimited menu items",
      "Unlimited gallery photos",
      "Everything in Standard Plan",
      "External menu API linking",
      "Priority placement in search results",
      "Multiple branches + Verified badge",
    ],
  },
] as const;

export function normalizeSubscriptionTier(raw?: string | null): StoreSubscriptionTier {
  const clean = (raw || "").trim().toLowerCase();
  if (clean === "standard" || clean === "commercial") return clean;
  return "basic";
}

export function normalizeSubscriptionStatus(raw?: string | null): StoreSubscriptionStatus {
  const clean = (raw || "").trim().toLowerCase();
  if (clean === "active" || clean === "expired") return clean;
  return "trial";
}

export interface StoreSubscriptionSummary {
  tier: StoreSubscriptionTier;
  tierDef: SubscriptionTierDefinition;
  status: StoreSubscriptionStatus;
  isActivePaid: boolean;
  isTrialActive: boolean;
  isGracePeriod: boolean;
  isTrialExpired: boolean;
  isTemporarilyOffline: boolean;
  daysRemaining: number | null;
  graceDaysRemaining: number | null;
  trialEndDateLabel: string | null;
  shortBadgeLabel: string;
  headline: string;
  detailMessage: string;
}

function formatShortDate(iso?: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function resolveStoreSubscriptionSummary(
  input: {
    subscriptionTier?: string | null;
    subscriptionStatus?: string | null;
    trialStartedAt?: string | null;
    trialEndsAt?: string | null;
    subscribedAt?: string | null;
  },
  nowMs: number = Date.now()
): StoreSubscriptionSummary {
  const tier = normalizeSubscriptionTier(input.subscriptionTier);
  const status = normalizeSubscriptionStatus(input.subscriptionStatus);
  const tierDef =
    SUBSCRIPTION_TIERS.find((item) => item.id === tier) || SUBSCRIPTION_TIERS[0];

  const isActivePaid = status === "active";
  const endMs = input.trialEndsAt ? Date.parse(input.trialEndsAt) : NaN;
  const hasValidEnd = Number.isFinite(endMs);
  const daysRemaining = hasValidEnd
    ? Math.max(0, Math.ceil((endMs - nowMs) / (24 * 60 * 60 * 1000)))
    : null;
  const trialEndDateLabel = formatShortDate(input.trialEndsAt);

  const isTrialExpired =
    !isActivePaid &&
    (status === "expired" || (hasValidEnd && endMs <= nowMs));
  const isTrialActive = !isActivePaid && !isTrialExpired;

  if (isActivePaid) {
    return {
      tier,
      tierDef,
      status,
      isActivePaid: true,
      isTrialActive: false,
      isGracePeriod: false,
      isTrialExpired: false,
      isTemporarilyOffline: false,
      daysRemaining: null,
      graceDaysRemaining: null,
      trialEndDateLabel,
      shortBadgeLabel: `${tierDef.name} Plan • ₱${tierDef.pricePhp}/mo`,
      headline: `${tierDef.name} Plan (₱${tierDef.pricePhp}/month)`,
      detailMessage:
        "Your store subscription is active with zero commission on orders or reservations.",
    };
  }

  if (isTrialExpired) {
    const msSinceEnd = hasValidEnd ? Math.max(0, nowMs - endMs) : 0;
    const daysSinceEnd = Math.floor(msSinceEnd / (24 * 60 * 60 * 1000));
    const inGracePeriod = status !== "expired" && daysSinceEnd < SUBSCRIPTION_GRACE_PERIOD_DAYS;
    const graceDaysRemaining = inGracePeriod
      ? Math.max(1, SUBSCRIPTION_GRACE_PERIOD_DAYS - daysSinceEnd)
      : null;

    if (inGracePeriod) {
      return {
        tier,
        tierDef,
        status: "trial",
        isActivePaid: false,
        isTrialActive: false,
        isGracePeriod: true,
        isTrialExpired: true,
        isTemporarilyOffline: false,
        daysRemaining: 0,
        graceDaysRemaining,
        trialEndDateLabel,
        shortBadgeLabel: `Grace Period (${graceDaysRemaining}d left)`,
        headline: `Subscription Expired • 7-Day Grace Period (${graceDaysRemaining} Days Left)`,
        detailMessage: trialEndDateLabel
          ? `Your 2-month free trial ended on ${trialEndDateLabel}. Your store is currently in a 7-day grace period with ${graceDaysRemaining} day${graceDaysRemaining === 1 ? "" : "s"} remaining. Please choose a plan before your grace period ends to prevent your storefront from going offline.`
          : `Your trial has ended. You have ${graceDaysRemaining} days remaining in your 7-day grace period to select a plan.`,
      };
    }

    return {
      tier,
      tierDef,
      status: "expired",
      isActivePaid: false,
      isTrialActive: false,
      isGracePeriod: false,
      isTrialExpired: true,
      isTemporarilyOffline: true,
      daysRemaining: 0,
      graceDaysRemaining: 0,
      trialEndDateLabel,
      shortBadgeLabel: "Temporarily Offline • Subscribe to Reactivate",
      headline: "Storefront Temporarily Offline",
      detailMessage:
        "Your 2-month free trial and 7-day grace period have ended. Your store is temporarily offline from customer discovery. All your menu items, photos, and records are safely preserved. Select a plan below (starting at ₱99/mo) to immediately bring your store back online with 1 click.",
    };
  }

  const remainingText =
    daysRemaining !== null ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left` : "2-month free trial";

  return {
    tier,
    tierDef,
    status: "trial",
    isActivePaid: false,
    isTrialActive: true,
    isGracePeriod: false,
    isTrialExpired: false,
    isTemporarilyOffline: false,
    daysRemaining,
    graceDaysRemaining: null,
    trialEndDateLabel,
    shortBadgeLabel: `${tierDef.name} • Free Trial (${remainingText})`,
    headline: `${tierDef.name} Plan (2-Month Free Trial)`,
    detailMessage: trialEndDateLabel
      ? `Activated automatically when your store was approved (${remainingText}, ends ${trialEndDateLabel}). Subscribe to Basic, Standard, or Commercial before ${trialEndDateLabel} to prevent your store from going offline.`
      : "Your store automatically enjoys the Basic plan free for 2 months after approval. Choose any plan before your 2-month trial ends to prevent store suspension.",
  };
}

/**
 * Evaluates whether a store's subscription tier entitles them to view detailed customer reviews,
 * comment feedback, and star rating analytics (Standard and Commercial plans).
 */
export function canStoreViewCustomerReviews(tier?: string | null): boolean {
  const normalized = normalizeSubscriptionTier(tier);
  return normalized === "standard" || normalized === "commercial";
}
