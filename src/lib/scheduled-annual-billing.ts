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

function billingTermLabel(
  period: string | null | undefined,
): "monthly" | "annual" | "2-year" {
  if (period === "2year") return "2-year";
  if (period === "year") return "annual";
  return "monthly";
}

export function getScheduledAnnualBillingCopy(
  subscription: SubscriptionData | null | undefined,
): string {
  const scheduled = subscription?.scheduledBillingInterval;
  const fromLabel = billingTermLabel(scheduled?.from);
  const toLabel = billingTermLabel(scheduled?.to ?? "year");
  const toTitle = toLabel === "2-year" ? "2-year" : toLabel === "annual" ? "Annual" : "Monthly";
  const dateLabel = formatScheduledAnnualBillingDate(scheduled?.effectiveAt);
  return dateLabel
    ? `You're on ${fromLabel} until ${dateLabel}. ${toTitle} billing starts then — you won't be charged today.`
    : `You're on ${fromLabel} until your current period ends. ${toTitle} billing starts then — you won't be charged today.`;
}
