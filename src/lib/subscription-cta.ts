import type { SubscriptionData, TrialData } from "@/auth/types";

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
  if (!subscription || !isStripeSubscription(subscription)) return false;
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
  if (!subscription || !isStripeSubscription(subscription)) return false;
  if (subscription.cancelAtPeriodEnd) return false;

  const status = getSubscriptionStatus(subscription);
  if (status !== "active" && status !== "trialing") return false;

  return isMonthlyPlanName(subscription.plan);
}

/** Apple IAP monthly — upgrade via App Store subscription management. */
export function canUpgradeAppleIapToAnnual(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (!subscription || !isAppleIapSubscription(subscription)) return false;
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

/** 10-day+ prompt: Stripe uses API flag; Apple IAP uses days since subscription start. */
export function shouldShowAnnualUpgradeOffer(
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (!subscription || subscription.cancelAtPeriodEnd) return false;
  if (!isMonthlyPlanName(subscription.plan)) return false;

  if (isStripeSubscription(subscription)) {
    return subscription.showAnnualUpgradePrompt === true;
  }
  if (isAppleIapSubscription(subscription)) {
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
