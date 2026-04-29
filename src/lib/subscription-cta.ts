import type { SubscriptionData, TrialData } from "@/auth/types";

export const START_FREE_TRIAL_NOW_LABEL = "Start Free Trial Now";
export const SUBSCRIBE_NOW_LABEL = "Subscribe Now";
export const MANAGE_SUBSCRIPTION_LABEL = "Manage Subscription";

const manageableSubscriptionStatuses = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function hasManageableSubscription(
  subscription: SubscriptionData | null | undefined,
): boolean {
  const status = subscription?.status?.toLowerCase();
  return Boolean(status && manageableSubscriptionStatuses.has(status));
}

export function canStartFreeTrial(
  user: unknown,
  subscription: SubscriptionData | null | undefined,
  trial: TrialData | null | undefined,
): boolean {
  if (!user) return true;
  if (hasManageableSubscription(subscription)) return false;

  const subscriptionStatus = subscription?.status?.toLowerCase();
  if (subscriptionStatus) return false;

  return !trial?.endsAt;
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
