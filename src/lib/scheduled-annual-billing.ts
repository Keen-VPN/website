import type { SubscriptionData } from "@/auth/types";

export function formatScheduledAnnualBillingDate(
  value: string | null | undefined,
): string | null {
  if (!value || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getScheduledAnnualBillingCopy(
  subscription: SubscriptionData | null | undefined,
): string {
  const dateLabel = formatScheduledAnnualBillingDate(
    subscription?.scheduledBillingInterval?.effectiveAt,
  );
  return dateLabel
    ? `You're on monthly until ${dateLabel}. Annual billing starts then — you won't be charged today.`
    : "You're on monthly until your current period ends. Annual billing starts then — you won't be charged today.";
}
