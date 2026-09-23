export const MIN_BUSINESS_SEATS = 2;
export const DEFAULT_BUSINESS_SEATS = 5;
export const MAX_BUSINESS_SEATS = 25;

export function resolvePlanMinSeats(
  plan?: {
    minSeats?: number;
  } | null,
): number {
  return plan?.minSeats ?? MIN_BUSINESS_SEATS;
}

export function resolvePlanDefaultSeats(
  plan?: {
    minSeats?: number;
    defaultSeats?: number;
  } | null,
): number {
  const minSeats = resolvePlanMinSeats(plan);
  return Math.max(
    minSeats,
    Math.min(MAX_BUSINESS_SEATS, plan?.defaultSeats ?? DEFAULT_BUSINESS_SEATS),
  );
}

export const faqs = [
  {
    question: "What's included in the 1 month free trial?",
    answer:
      "All plans include a full-featured 1 month free trial. You'll have access to all premium features including unlimited bandwidth, all server locations, and our military-grade encryption. Simply provide a payment method to start your trial and cancel anytime during the trial period if not satisfied.",
  },
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the change will take effect at your next billing cycle.",
  },
  {
    question: "How does billing work for annual plans?",
    answer:
      "Annual plans are billed once per year upfront. You'll save significantly compared to monthly billing — that's equivalent to getting 2 months free on Individual plans.",
  },
  {
    question: "How does Family sharing work?",
    answer:
      "With Family, you start on the same Individual price. Invite friends or family by email — when they accept, you pay one more Individual seat for them (up to 5 people total). They get their own logins under your plan.",
  },
  {
    question: "Do you keep logs of my activity?",
    answer:
      "Absolutely not. We have a strict no-log policy. We don't track, collect, or store any of your browsing activity or connection logs. Your privacy is our top priority.",
  },
  {
    question: "What happens after my trial ends?",
    answer:
      "After your 1 month free trial ends, you'll be automatically enrolled in your selected plan and billing will begin. You can cancel at any time before the trial ends with no charges.",
  },
  {
    question: "How do I request a refund?",
    answer:
      "For refund request, please send an email to our support team via support@vpnkeen.com. Our support team will assist you with your refund request.",
  },
];

export const allFeatures = [
  "Simultaneous device connections",
  "Bandwidth",
  "Military-grade encryption",
  "No-log policy",
  "Kill switch protection",
  "24/7 customer support",
  "Free trial duration",
  "Share with friends & family",
  "Priority support",
];

export interface FeatureComparisonRow {
  feature: string;
  individual: string | boolean;
  family: string | boolean;
}

export const featureComparison: FeatureComparisonRow[] = [
  {
    feature: "Simultaneous device connections",
    individual: "Up to 3",
    family: "Up to 3 per person",
  },
  {
    feature: "Bandwidth",
    individual: "Unlimited",
    family: "Unlimited",
  },
  {
    feature: "Military-grade encryption",
    individual: true,
    family: true,
  },
  {
    feature: "No-log policy",
    individual: true,
    family: true,
  },
  {
    feature: "Kill switch protection",
    individual: true,
    family: true,
  },
  {
    feature: "24/7 customer support",
    individual: true,
    family: true,
  },
  {
    feature: "Free trial duration",
    individual: "1 month",
    family: "1 month",
  },
  {
    feature: "Share with friends & family",
    individual: false,
    family: "Up to 5 people total, pay on accept",
  },
  {
    feature: "Priority support",
    individual: false,
    family: true,
  },
];

/** Map a rendered pricing plan name to its comparison-table column value. */
export function featureComparisonValueForPlan(
  planName: string,
  row: FeatureComparisonRow,
): string | boolean {
  switch (planName) {
    case "Family":
      return row.family;
    case "Business":
    case "Team":
      return row.family;
    default:
      return row.individual;
  }
}
