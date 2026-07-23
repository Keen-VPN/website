import type { PricingPlan } from "@/lib/pricing";

export const MIN_BUSINESS_SEATS = 2;
export const DEFAULT_BUSINESS_SEATS = 5;
export const MAX_BUSINESS_SEATS = 25;

export function resolvePlanMinSeats(plan?: {
  minSeats?: number;
} | null): number {
  return plan?.minSeats ?? MIN_BUSINESS_SEATS;
}

export function resolvePlanDefaultSeats(plan?: {
  minSeats?: number;
  defaultSeats?: number;
} | null): number {
  const minSeats = resolvePlanMinSeats(plan);
  return Math.max(
    minSeats,
    Math.min(MAX_BUSINESS_SEATS, plan?.defaultSeats ?? DEFAULT_BUSINESS_SEATS),
  );
}

export const enterprisePlan: PricingPlan = {
  name: "Enterprise",
  description: "Custom solutions for large organizations (50+ users)",
  monthlyPrice: null,
  annualPrice: null,
  monthlyPriceDisplay: "Custom",
  annualPriceDisplay: "Custom",
  annualMonthlyEquivalent: null,
  annualSavingsPercent: null,
  annualYearlySavingsDisplay: null,
  annualSavingsLabel: null,
  features: [
    { name: "1 month free trial", included: true, highlighted: true },
    { name: "Access to all server locations", included: true },
    { name: "Unlimited bandwidth", included: true },
    { name: "Military-grade encryption", included: true },
    { name: "Custom simultaneous device policy", included: true },
    { name: "24/7 customer support", included: true },
    { name: "No-log policy guaranteed", included: true },
    { name: "Kill switch protection", included: true },
    { name: "Team management dashboard", included: true },
    { name: "Priority support", included: true },
    { name: "Custom solutions", included: true },
  ],
  buttonText: "Contact Sales",
  popular: false,
};

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
    question: "How does Business seat billing work?",
    answer:
      "Business is priced per active team member. Upgrade to Business for yourself, invite teammates by email, and you are charged for each person when they accept — not when you send an invite. Each seat includes 5 connected devices.",
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
    question: "How do I get started with Enterprise solutions?",
    answer:
      "For Enterprise solutions with 50+ users, we offer custom pricing and dedicated support. Contact our sales team to discuss your specific requirements and get a personalized quote.",
    isEnterprise: true,
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
  "Team management dashboard",
  "Priority support",
  "Custom security solutions",
  "Dedicated account manager",
];

export interface FeatureComparisonRow {
  feature: string;
  individual: string | boolean;
  business: string | boolean;
  enterprise: string | boolean;
}

export const featureComparison: FeatureComparisonRow[] = [
  {
    feature: "Simultaneous device connections",
    individual: "Up to 3",
    business: "5 per seat",
    enterprise: "Custom",
  },
  {
    feature: "Bandwidth",
    individual: "Unlimited",
    business: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Military-grade encryption",
    individual: true,
    business: true,
    enterprise: true,
  },
  {
    feature: "No-log policy",
    individual: true,
    business: true,
    enterprise: true,
  },
  {
    feature: "Kill switch protection",
    individual: true,
    business: true,
    enterprise: true,
  },
  {
    feature: "24/7 customer support",
    individual: true,
    business: true,
    enterprise: true,
  },
  {
    feature: "Free trial duration",
    individual: "1 month",
    business: "1 month",
    enterprise: "1 month",
  },
  {
    feature: "Team management dashboard",
    individual: false,
    business: true,
    enterprise: true,
  },
  {
    feature: "Priority support",
    individual: false,
    business: true,
    enterprise: true,
  },
  {
    feature: "Custom security solutions",
    individual: false,
    business: false,
    enterprise: true,
  },
  {
    feature: "Dedicated account manager",
    individual: false,
    business: false,
    enterprise: true,
  },
];

/** Map a rendered pricing plan name to its comparison-table column value. */
export function featureComparisonValueForPlan(
  planName: string,
  row: FeatureComparisonRow,
): string | boolean {
  switch (planName) {
    case "Business":
    case "Team":
      return row.business;
    case "Enterprise":
      return row.enterprise;
    default:
      return row.individual;
  }
}
