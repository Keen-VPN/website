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
