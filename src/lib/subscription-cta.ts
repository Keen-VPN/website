import type { SubscriptionData, TrialData } from "@/auth/types";
import { isApplePlatform } from "@/lib/device-detection";

export const START_FREE_TRIAL_NOW_LABEL = "Start Free Trial Now";
export const SUBSCRIBE_NOW_LABEL = "Subscribe Now";
export const MANAGE_SUBSCRIPTION_LABEL = "Manage Subscription";

const manageableSubscriptionStatuses = new Set([
  "active",
  "trialing",
  "past_due",
]);

type SubscriptionState = SubscriptionData | string | null | undefined;

function getSubscriptionStatus(subscription: SubscriptionState): string {
  return (
    (typeof subscription === "string" ? subscription : subscription?.status) ??
    ""
  ).toLowerCase();
}

export function hasManageableSubscription(
  subscription: SubscriptionState,
): boolean {
  const status = getSubscriptionStatus(subscription);
  return Boolean(status && manageableSubscriptionStatuses.has(status));
}

/** Active VPN access via own subscription or shared business/family membership. */
export function hasActiveVpnAccess(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (!subscription || isEndedSubscription(subscription)) return false;

  const status = getSubscriptionStatus(subscription);
  const isProvisioned = status === "active" || status === "trialing";

  if (
    subscription.accessRole === "member" ||
    subscription.accessRole === "linked"
  ) {
    return isProvisioned;
  }

  return hasManageableSubscription(subscription);
}

const endedSubscriptionStatuses = new Set([
  "canceled",
  "cancelled",
  "expired",
]);

/** True when auth still has a subscription record but it is no longer manageable. */
export function isEndedSubscription(
  subscription: SubscriptionState,
): boolean {
  const status = getSubscriptionStatus(subscription);
  return Boolean(status && endedSubscriptionStatuses.has(status));
}

export function isStripeSubscription(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return subscription?.subscriptionType === "stripe";
}

export function canCancelStripeOnWebsite(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (
    !subscription ||
    subscription.canManageBilling !== true ||
    !isStripeSubscription(subscription)
  )
    return false;
  if (subscription.cancelAtPeriodEnd) return false;
  return hasManageableSubscription(subscription);
}

export function isAppleIapSubscription(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return subscription?.subscriptionType === "apple_iap";
}

const TWO_YEAR_BILLING_PERIODS = new Set(["2year", "two_year", "two-year"]);

/** True for a 2-year subscription, whichever spelling the backend reports. */
export function isTwoYearSubscription(
  subscription: SubscriptionData | null | undefined,
): boolean {
  const explicitPeriod = (subscription?.billingPeriod ?? "").toLowerCase();
  if (explicitPeriod) {
    return TWO_YEAR_BILLING_PERIODS.has(explicitPeriod);
  }
  const planLabel =
    `${subscription?.planId ?? ""} ${subscription?.plan ?? ""}`.toLowerCase();
  return /2\s*-?\s*year|two[\s-_]?year/.test(planLabel);
}

/** Resolve the active billing interval from backend data, with legacy plan labels as fallback. */
export function resolveSubscriptionBillingPeriod(
  subscription: SubscriptionData | null | undefined,
): "month" | "year" | "2year" {
  if (subscription?.billingPeriod === "2year") return "2year";
  if (subscription?.billingPeriod === "year") return "year";
  if (subscription?.billingPeriod === "month") return "month";
  if (isTwoYearSubscription(subscription)) return "2year";

  const planLabel =
    `${subscription?.planId ?? ""} ${subscription?.plan ?? ""}`.toLowerCase();
  return planLabel.includes("year") || planLabel.includes("annual")
    ? "year"
    : "month";
}

/**
 * Stripe subscriber on a shorter term with auto-renewal on — eligible to switch to
 * the 2-year term at the next billing date.
 */
export function canSwitchStripeToTwoYear(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (
    !subscription ||
    subscription.canManageBilling !== true ||
    !isStripeSubscription(subscription)
  )
    return false;
  if (subscription.cancelAtPeriodEnd) return false;
  if (isTwoYearSubscription(subscription)) return false;
  if (subscription.scheduledPlanChange?.to === "2year") return false;
  if (subscription.scheduledBillingInterval?.to === "2year") return false;
  if (resolveMembershipPlanTier(subscription) !== "individual") return false;

  const status = getSubscriptionStatus(subscription);
  return status === "active" || status === "trialing";
}

function isMonthlyPlanName(planName?: string | null): boolean {
  return (planName ?? "").toLowerCase().includes("monthly");
}

/** True when annual billing is already scheduled at the next renewal. */
export function hasScheduledAnnualBilling(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    subscription?.scheduledBillingInterval?.to === "year" ||
    subscription?.scheduledPlanChange?.to === "year"
  );
}

/** True when a switch to 2-year billing is already scheduled at the next renewal. */
export function hasScheduledTwoYearBilling(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    subscription?.scheduledBillingInterval?.to === "2year" ||
    subscription?.scheduledPlanChange?.to === "2year"
  );
}

/** Stripe monthly (or trialing monthly) with auto-renewal on — eligible for one-click annual upgrade. */
export function canUpgradeStripeToAnnual(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (
    !subscription ||
    subscription.canManageBilling !== true ||
    !isStripeSubscription(subscription)
  )
    return false;
  if (subscription.cancelAtPeriodEnd) return false;
  if (hasScheduledAnnualBilling(subscription)) return false;

  const status = getSubscriptionStatus(subscription);
  if (status !== "active" && status !== "trialing") return false;

  return isMonthlyPlanName(subscription.plan);
}

/** Apple IAP monthly — upgrade via App Store subscription management. */
export function canUpgradeAppleIapToAnnual(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (
    !subscription ||
    subscription.canManageBilling !== true ||
    !isAppleIapSubscription(subscription)
  )
    return false;
  if (subscription.cancelAtPeriodEnd) return false;

  const status = getSubscriptionStatus(subscription);
  if (status !== "active" && status !== "trialing") return false;

  return isMonthlyPlanName(subscription.plan);
}

/** Either billing provider eligible for annual upgrade UI. */
export function canUpgradeToAnnual(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    canUpgradeStripeToAnnual(subscription) ||
    canUpgradeAppleIapToAnnual(subscription)
  );
}

const ANNUAL_UPGRADE_PROMPT_MIN_DAYS = 10;

/** Whether the account can render a one-click or App Store annual upgrade CTA. */
export function hasAnnualUpgradeCta(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    canUpgradeStripeToAnnual(subscription) ||
    (canUpgradeAppleIapToAnnual(subscription) && isApplePlatform())
  );
}

/** 10-day+ prompt: Stripe uses API flag; Apple IAP uses days since subscription start. */
export function shouldShowAnnualUpgradeOffer(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (canUpgradeStripeToAnnual(subscription)) {
    return subscription.showAnnualUpgradePrompt === true;
  }
  if (canUpgradeAppleIapToAnnual(subscription)) {
    if (!isApplePlatform()) return false;
    const days = subscription.daysSinceSubscriptionStart ?? 0;
    return days >= ANNUAL_UPGRADE_PROMPT_MIN_DAYS;
  }
  return false;
}

export function canStartFreeTrial(
  user: unknown,
  subscription: SubscriptionState,
  trial: TrialData | null | undefined,
): boolean {
  // Signed-out visitors have no server-side trial history yet; product copy
  // should invite them to start the trial before the subscribe flow asks them to sign in.
  if (!user) return true;
  if (hasManageableSubscription(subscription)) return false;

  const subscriptionStatus = getSubscriptionStatus(subscription);
  if (subscriptionStatus) return false;

  return !trial?.active && !trial?.endsAt;
}

export function getSubscriptionCtaLabel(
  user: unknown,
  subscription: SubscriptionData | null | undefined,
  trial: TrialData | null | undefined,
): string {
  if (hasManageableSubscription(subscription)) {
    return MANAGE_SUBSCRIPTION_LABEL;
  }

  return canStartFreeTrial(user, subscription, trial)
    ? START_FREE_TRIAL_NOW_LABEL
    : SUBSCRIBE_NOW_LABEL;
}

export type MembershipPlanTier = "individual" | "family" | "business";

function hasPlanToken(value: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(value);
}

/** Resolve Individual / Family / Business from plan id or display name. */
export function resolveMembershipPlanTier(
  subscription: SubscriptionData | null | undefined,
): MembershipPlanTier {
  const raw = `${subscription?.planId ?? ""} ${subscription?.plan ?? ""}`
    .trim()
    .toLowerCase();
  if (!raw) return "individual";

  if (
    hasPlanToken(raw, "team") ||
    hasPlanToken(raw, "business") ||
    hasPlanToken(raw, "family_plus") ||
    hasPlanToken(raw, "familyplus")
  ) {
    return "business";
  }
  if (hasPlanToken(raw, "family")) {
    return "family";
  }
  return "individual";
}

function isEligibleBusinessPlanManager(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (!subscription || subscription.canManageBilling !== true) {
    return false;
  }
  if (subscription.cancelAtPeriodEnd) return false;
  const status = getSubscriptionStatus(subscription);
  return status === "active" || status === "trialing";
}

/**
 * Owner with an active/trialing subscription not already on Business — eligible to
 * start Business (in-place Stripe upgrade or Stripe checkout migration).
 */
export function canUpgradeToBusinessPlan(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    isEligibleBusinessPlanManager(subscription) &&
    resolveMembershipPlanTier(subscription) !== "business"
  );
}
