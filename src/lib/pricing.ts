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
  /** True for the Business plan: `price` is per-seat and checkout takes a seat quantity. */
  isPerSeat?: boolean;
  minSeats?: number;
  defaultSeats?: number;
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
  /** True for the Business plan: price is per-seat and checkout takes a seat quantity. */
  isPerSeat?: boolean;
  minSeats?: number;
  defaultSeats?: number;
  monthlyPriceId?: string;
  annualPriceId?: string;
}

export function transformApiPlans(apiPlans: ApiPlan[]): PricingPlan[] {
  const plansByType = apiPlans.reduce(
    (acc, plan) => {
      const id = plan.id.toLowerCase();
      const isLegacyFamilyOnly =
        id.includes("family") &&
        !id.includes("family_plus") &&
        !id.includes("familyplus");
      if (isLegacyFamilyOnly) {
        return acc;
      }
      // Family is retired from the purchasable catalog; any legacy family_plus/familyplus
      // price ids the backend might still return are folded into Business (seat-based).
      const isTeam =
        id.includes("team") ||
        id.includes("business") ||
        id.includes("family_plus") ||
        id.includes("familyplus");
      const isPremium = id.includes("premium") && !isTeam;
      const key = isPremium ? "premium" : isTeam ? "team" : "other";

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

    // Business bills per seat: `monthlyPrice`/`annualPrice` here is the per-seat price.
    const deviceConnectionFeature = {
      name: isTeam
        ? "5 connected devices per seat"
        : "Up to 3 connected devices",
      included: true,
      highlighted: true,
    };

    const mergedFeatures = [
      deviceConnectionFeature,
      ...features.filter((f) => !/simultaneous device|connected device/i.test(f.name)),
    ];

    transformedPlans.push({
      monthlyId: monthly?.id,
      annualId: annual?.id,
      name: isPremium ? "Individual" : isTeam ? "Business" : "Premium",
      description: isPremium
        ? "Perfect for personal use"
        : isTeam
          ? "Buy seats for your whole team — pay per person"
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
      popular: isTeam,
      isPerSeat: isTeam,
      minSeats: isTeam
        ? (monthly?.minSeats ?? annual?.minSeats ?? 2)
        : undefined,
      defaultSeats: isTeam
        ? Math.max(
            monthly?.minSeats ?? annual?.minSeats ?? 2,
            monthly?.defaultSeats ?? annual?.defaultSeats ?? 5,
          )
        : undefined,
      monthlyPriceId: monthly?.priceId,
      annualPriceId: annual?.priceId,
    });
  });

  return transformedPlans.sort((a, b) => {
    const order: Record<string, number> = {
      Individual: 0,
      Premium: 0,
      Business: 1,
      Team: 1,
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
