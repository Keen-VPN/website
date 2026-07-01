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

function isMonthlyPlanName(planName?: string | null): boolean {
  return (planName ?? "").toLowerCase().includes("monthly");
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

function isEligibleStripePlanManager(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (
    !subscription ||
    subscription.canManageBilling !== true ||
    !isStripeSubscription(subscription)
  ) {
    return false;
  }
  if (subscription.cancelAtPeriodEnd) return false;
  const status = getSubscriptionStatus(subscription);
  return status === "active" || status === "trialing";
}

/** Stripe owner on Individual — can upgrade to Family or Business via billing portal. */
export function canUpgradeStripeToFamilyPlan(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    isEligibleStripePlanManager(subscription) &&
    resolveMembershipPlanTier(subscription) === "individual"
  );
}

/** Stripe owner on Family — can upgrade to Business via billing portal. */
export function canUpgradeStripeToBusinessPlan(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    isEligibleStripePlanManager(subscription) &&
    resolveMembershipPlanTier(subscription) === "family"
  );
}

export function canUpgradeStripeMembershipPlan(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    canUpgradeStripeToFamilyPlan(subscription) ||
    canUpgradeStripeToBusinessPlan(subscription)
  );
}
