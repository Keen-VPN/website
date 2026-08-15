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
  /** Multi-year terms report the Stripe interval multiplier, e.g. 2 for the 2-year plan. */
  intervalCount?: number;
  paidMonths?: number;
}

import {
  computeAnnualSavings,
  computeTermSavings,
  formatSavingsPercent,
  formatUsd,
  type AnnualSavingsSummary,
} from "@/lib/subscription-pricing";

export type { AnnualSavingsSummary };

/** Billing term a visitor can select on the pricing page. */
export type PricingTerm = "monthly" | "annual" | "twoYear";

export const TWO_YEAR_PAID_MONTHS = 24;

export function isTwoYearApiPlan(plan: ApiPlan): boolean {
  const period = (plan.billingPeriod || plan.period || "").toLowerCase();
  if (["2year", "two_year", "two-year", "2 years"].includes(period)) {
    return true;
  }
  return plan.interval === "year" && plan.intervalCount === 2;
}

/** Canonical number of months covered by one charge for a catalog term. */
export function getApiPlanPaidMonths(plan: ApiPlan): number {
  if (isTwoYearApiPlan(plan)) return TWO_YEAR_PAID_MONTHS;
  const period = (plan.billingPeriod || plan.period || "").toLowerCase();
  return period === "year" || period === "annual" ? 12 : 1;
}

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
  /** 2-year term; present only when the backend exposes a dedicated 2-year price. */
  twoYearId?: string;
  twoYearPrice?: number | null;
  twoYearPriceDisplay?: string | null;
  twoYearMonthlyEquivalent?: string | null;
  twoYearSavingsPercent?: number | null;
  twoYearSavingsLabel?: string | null;
  twoYearPriceId?: string;
  /** Number of months covered by the initial 2-year charge. */
  twoYearPaidMonths?: number;
}

export function resolvePricingPlanSelection(
  plan: PricingPlan | null | undefined,
  requestedPeriod: PricingTerm,
): { planId: string; billingPeriod: "month" | "year" | "2year" } | null {
  if (!plan) return null;

  if (requestedPeriod === "twoYear") {
    if (plan.twoYearId) {
      return { planId: plan.twoYearId, billingPeriod: "2year" };
    }
    // Plans without a 2-year price (Business) keep their longest available term.
    if (plan.annualId) {
      return { planId: plan.annualId, billingPeriod: "year" };
    }
    return plan.monthlyId
      ? { planId: plan.monthlyId, billingPeriod: "month" }
      : null;
  }

  if (requestedPeriod === "annual") {
    if (plan.annualId) {
      return { planId: plan.annualId, billingPeriod: "year" };
    }
    return plan.monthlyId
      ? { planId: plan.monthlyId, billingPeriod: "month" }
      : null;
  }

  if (plan.monthlyId) {
    return { planId: plan.monthlyId, billingPeriod: "month" };
  }
  return plan.annualId
    ? { planId: plan.annualId, billingPeriod: "year" }
    : null;
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
        acc[key] = { monthly: null, annual: null, twoYear: null };
      }

      if (isTwoYearApiPlan(plan)) {
        acc[key].twoYear = plan;
      } else if (plan.period === "month" || plan.billingPeriod === "month") {
        acc[key].monthly = plan;
      } else if (plan.period === "year" || plan.billingPeriod === "year") {
        acc[key].annual = plan;
      }

      return acc;
    },
    {} as Record<
      string,
      { monthly: ApiPlan | null; annual: ApiPlan | null; twoYear: ApiPlan | null }
    >,
  );

  const transformedPlans: PricingPlan[] = [];

  Object.entries(plansByType).forEach(([type, { monthly, annual, twoYear }]) => {
    if (!monthly && !annual && !twoYear) return;

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

    // Normalize at the catalog boundary so Pricing and Subscribe consume the
    // same term length even if display metadata is missing or inconsistent.
    const twoYearPaidMonths = twoYear
      ? getApiPlanPaidMonths(twoYear)
      : TWO_YEAR_PAID_MONTHS;
    const twoYearSavings =
      twoYear && monthlyPrice > 0
        ? computeTermSavings(monthlyPrice, twoYear.price, twoYearPaidMonths)
        : null;
    const twoYearSavingsPercent = twoYearSavings?.savingsPercent ?? null;

    const features = annual?.features?.length
      ? annual.features
      : monthly?.features?.length
        ? monthly.features
        : (twoYear?.features ?? []);

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
      ...features.filter(
        (f) => !/simultaneous device|connected device/i.test(f.name),
      ),
    ];

    transformedPlans.push({
      monthlyId: monthly?.id,
      annualId: annual?.id,
      name: isPremium ? "Individual" : isTeam ? "Business" : "Premium",
      description: isPremium
        ? "Perfect for personal use"
        : isTeam
          ? "Buy seats for your whole team, pay per person"
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
      twoYearId: twoYear?.id,
      twoYearPrice: twoYear?.price ?? null,
      twoYearPriceDisplay: twoYear ? formatUsd(twoYear.price) : null,
      twoYearMonthlyEquivalent:
        twoYearSavings && twoYearSavings.effectiveMonthlyPrice > 0
          ? formatUsd(twoYearSavings.effectiveMonthlyPrice)
          : null,
      twoYearSavingsPercent,
      twoYearSavingsLabel:
        twoYearSavingsPercent && twoYearSavingsPercent > 0
          ? `Save ${formatSavingsPercent(twoYearSavingsPercent)}%`
          : null,
      twoYearPriceId: twoYear?.priceId,
      twoYearPaidMonths: twoYear ? twoYearPaidMonths : undefined,
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

/** Hero price on plan cards when the 2-year term is selected. */
export function twoYearHeroPriceDisplay(plan: PricingPlan): string {
  if (plan.monthlyPrice === null) return "Custom";
  return (
    plan.twoYearMonthlyEquivalent ??
    plan.twoYearPriceDisplay ??
    plan.annualMonthlyEquivalent ??
    plan.monthlyPriceDisplay
  );
}

/** Subtitle under the 2-year hero price; null when the plan has no 2-year term. */
export function formatTwoYearBillingDetail(plan: PricingPlan): string | null {
  if (!plan.twoYearId || !plan.twoYearPriceDisplay) return null;
  const equivalent = plan.twoYearMonthlyEquivalent;
  const lead = equivalent
    ? `Only ${equivalent}/month`
    : plan.twoYearPriceDisplay;
  return `${lead} — ${plan.twoYearPriceDisplay} once for ${plan.twoYearPaidMonths ?? TWO_YEAR_PAID_MONTHS} months, then renews every 2 years`;
}

/** Compare-plans table price row for the 2-year term. */
export function formatTwoYearComparisonPrice(plan: PricingPlan): string {
  if (plan.monthlyPrice === null) return "Custom";
  if (!plan.twoYearId) return formatAnnualComparisonPrice(plan);
  if (plan.twoYearMonthlyEquivalent) {
    return `${plan.twoYearMonthlyEquivalent} / month, billed every 2 years`;
  }
  return `${plan.twoYearPriceDisplay} / 2 years`;
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
