export interface ApiPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  interval: string;
  billingPeriod: string;
  features: {
    name: string;
    included: boolean;
    highlighted?: boolean;
  }[];
  priceId: string;
  description?: string;
}

import {
  computeAnnualSavings,
  formatSavingsPercent,
  formatUsd,
  type AnnualSavingsSummary,
} from "@/lib/subscription-pricing";

export type { AnnualSavingsSummary };

export interface PricingPlan {
  monthlyId?: string;
  annualId?: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  monthlyPriceDisplay: string;
  annualPriceDisplay: string;
  annualMonthlyEquivalent: string | null;
  annualSavingsPercent: number | null;
  annualYearlySavingsDisplay: string | null;
  annualSavingsLabel: string | null;
  features: {
    name: string;
    included: boolean;
    highlighted?: boolean;
  }[];
  buttonText: string;
  popular: boolean;
  monthlyPriceId?: string;
  annualPriceId?: string;
}

export function transformApiPlans(apiPlans: ApiPlan[]): PricingPlan[] {
  const plansByType = apiPlans.reduce(
    (acc, plan) => {
      const id = plan.id.toLowerCase();
      const isFamily =
        id.includes("family") &&
        !id.includes("family_plus") &&
        !id.includes("familyplus");
      const isTeam =
        id.includes("team") ||
        id.includes("business") ||
        id.includes("family_plus") ||
        id.includes("familyplus");
      const isPremium =
        id.includes("premium") &&
        !id.includes("family") &&
        !id.includes("team") &&
        !id.includes("business");
      const key = isPremium
        ? "premium"
        : isFamily
          ? "family"
          : isTeam
            ? "team"
            : "other";

      if (!acc[key]) {
        acc[key] = { monthly: null, annual: null };
      }

      if (plan.period === "month" || plan.billingPeriod === "month") {
        acc[key].monthly = plan;
      } else if (plan.period === "year" || plan.billingPeriod === "year") {
        acc[key].annual = plan;
      }

      return acc;
    },
    {} as Record<string, { monthly: ApiPlan | null; annual: ApiPlan | null }>,
  );

  const transformedPlans: PricingPlan[] = [];

  Object.entries(plansByType).forEach(([type, { monthly, annual }]) => {
    if (!monthly && !annual) return;

    const isPremium = type === "premium";
    const isFamily = type === "family";
    const isTeam = type === "team";
    const monthlyPrice = monthly?.price || annual?.price || 0;
    const annualPrice =
      annual?.price || (monthly?.price ? monthly.price * 12 : 0);
    const savings =
      monthly && annual
        ? computeAnnualSavings(monthlyPrice, annualPrice)
        : null;
    const annualMonthlyEquivalent =
      savings && savings.annualMonthlyEquivalent > 0
        ? formatUsd(savings.annualMonthlyEquivalent)
        : null;
    const annualSavingsPercent = savings?.savingsPercent ?? null;
    const annualYearlySavingsDisplay =
      savings && savings.yearlySavingsAmount > 0
        ? formatUsd(savings.yearlySavingsAmount)
        : null;
    const annualSavingsLabel =
      annualSavingsPercent && annualSavingsPercent > 0
        ? `Save ${formatSavingsPercent(annualSavingsPercent)}%`
        : null;

    const features = annual?.features?.length
      ? annual.features
      : monthly?.features?.length
        ? monthly.features
        : [];

    const deviceConnectionFeature = {
      name: isTeam
        ? "Up to 14 simultaneous devices"
        : isFamily
          ? "Up to 12 simultaneous devices"
          : "Up to 10 simultaneous devices",
      included: true,
      highlighted: true,
    };

    const mergedFeatures = [
      deviceConnectionFeature,
      ...features.filter((f) => !/simultaneous device/i.test(f.name)),
    ];

    transformedPlans.push({
      monthlyId: monthly?.id,
      annualId: annual?.id,
        name: isPremium
        ? "Individual"
        : isFamily
          ? "Family"
          : isTeam
            ? "Business"
            : "Premium",
      description: isPremium
        ? "Perfect for personal use"
        : isFamily
          ? "Share premium with up to 5 members"
          : isTeam
            ? "For teams and businesses (up to 10 members)"
            : "Premium VPN service",
      monthlyPrice,
      annualPrice,
      monthlyPriceDisplay: `$${monthlyPrice}`,
      annualPriceDisplay: `$${annualPrice}`,
      annualMonthlyEquivalent,
      annualSavingsPercent,
      annualYearlySavingsDisplay,
      annualSavingsLabel,
      features: mergedFeatures,
      buttonText: "Start Free Trial",
      popular: isFamily,
      monthlyPriceId: monthly?.priceId,
      annualPriceId: annual?.priceId,
    });
  });

  return transformedPlans.sort((a, b) => {
    const order: Record<string, number> = {
      Individual: 0,
      Premium: 0,
      Family: 1,
      Business: 2,
      Team: 2,
    };
    return (
      (order[a.name as keyof typeof order] ?? 99) -
      (order[b.name as keyof typeof order] ?? 99)
    );
  });
}

/** Hero price on plan cards when annual billing is selected. */
export function annualHeroPriceDisplay(
  plan: PricingPlan,
  isAnnual: boolean,
): string {
  if (plan.monthlyPrice === null) return "Custom";
  if (isAnnual) {
    return (
      plan.annualMonthlyEquivalent ??
      plan.annualPriceDisplay ??
      plan.monthlyPriceDisplay
    );
  }
  return plan.monthlyPriceDisplay;
}

/** Subtitle under annual hero price; null when yearly price is unavailable. */
export function formatAnnualBillingDetail(plan: PricingPlan): string | null {
  if (plan.monthlyPrice === null || !plan.annualPriceDisplay) return null;
  if (plan.annualMonthlyEquivalent) {
    return `Only ${plan.annualMonthlyEquivalent}/month billed yearly (${plan.annualPriceDisplay}/year)`;
  }
  return plan.annualPriceDisplay;
}

/** Compare-plans table price row for annual billing. */
export function formatAnnualComparisonPrice(plan: PricingPlan): string {
  if (plan.monthlyPrice === null) return "Custom";
  if (plan.annualMonthlyEquivalent) {
    return `${plan.annualMonthlyEquivalent} / month, billed annually`;
  }
  if (plan.annualPriceDisplay) {
    return `${plan.annualPriceDisplay} / year`;
  }
  return `${plan.monthlyPriceDisplay} / month`;
}
