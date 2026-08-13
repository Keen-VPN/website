import { describe, expect, it } from "vitest";
import {
  formatTwoYearBillingDetail,
  formatTwoYearComparisonPrice,
  isTwoYearApiPlan,
  resolvePricingPlanSelection,
  transformApiPlans,
  twoYearBonusCopy,
  twoYearHeroPriceDisplay,
  twoYearTermLabel,
  type ApiPlan,
} from "@/lib/pricing";
import { computeTermSavings } from "@/lib/subscription-pricing";

function apiPlan(overrides: Partial<ApiPlan> = {}): ApiPlan {
  return {
    id: "premium_monthly",
    name: "Premium VPN - Monthly",
    price: 4,
    period: "month",
    interval: "month",
    billingPeriod: "month",
    features: [{ name: "Unlimited bandwidth", included: true }],
    priceId: "price_monthly",
    ...overrides,
  };
}

const monthlyPlan = apiPlan();

const annualPlan = apiPlan({
  id: "premium_yearly",
  name: "Premium VPN - Annual",
  price: 30,
  period: "year",
  interval: "year",
  billingPeriod: "year",
  priceId: "price_yearly",
});

const twoYearPlan = apiPlan({
  id: "premium_2year",
  name: "Premium VPN - 2 Years",
  price: 60,
  period: "2year",
  interval: "year",
  billingPeriod: "2year",
  priceId: "price_2year",
  intervalCount: 2,
  paidMonths: 24,
  bonusMonths: 4,
  totalInitialMonths: 28,
});

describe("isTwoYearApiPlan", () => {
  it("detects the 2-year term from the billing period or the Stripe interval count", () => {
    expect(isTwoYearApiPlan(twoYearPlan)).toBe(true);
    expect(
      isTwoYearApiPlan(
        apiPlan({
          id: "premium_2y",
          period: "year",
          interval: "year",
          billingPeriod: "year",
          intervalCount: 2,
        }),
      ),
    ).toBe(true);
  });

  it("leaves monthly and annual plans untouched", () => {
    expect(isTwoYearApiPlan(monthlyPlan)).toBe(false);
    expect(isTwoYearApiPlan(annualPlan)).toBe(false);
  });
});

describe("transformApiPlans with a 2-year price", () => {
  it("keeps monthly/annual fields and adds the 2-year term", () => {
    const [individual] = transformApiPlans([
      monthlyPlan,
      annualPlan,
      twoYearPlan,
    ]);

    expect(individual.monthlyId).toBe("premium_monthly");
    expect(individual.annualId).toBe("premium_yearly");
    expect(individual.monthlyPrice).toBe(4);
    expect(individual.annualPrice).toBe(30);

    expect(individual.twoYearId).toBe("premium_2year");
    expect(individual.twoYearPriceId).toBe("price_2year");
    expect(individual.twoYearPrice).toBe(60);
    expect(individual.twoYearPriceDisplay).toBe("$60");
    // $60 over 28 months of access.
    expect(individual.twoYearMonthlyEquivalent).toBe("$2.14");
    expect(individual.twoYearBonusMonths).toBe(4);
    expect(individual.twoYearTotalMonths).toBe(28);
    expect(individual.twoYearSavingsLabel).toBe("Save 46.4%");
  });

  it("omits 2-year fields when the backend exposes no 2-year price", () => {
    const [individual] = transformApiPlans([monthlyPlan, annualPlan]);

    expect(individual.twoYearId).toBeUndefined();
    expect(individual.twoYearPrice).toBeNull();
    expect(individual.twoYearBonusMonths).toBeUndefined();
    expect(individual.annualSavingsLabel).toBe("Save 37.5%");
  });
});

describe("resolvePricingPlanSelection for the 2-year term", () => {
  it("selects the dedicated 2-year plan id", () => {
    const [individual] = transformApiPlans([
      monthlyPlan,
      annualPlan,
      twoYearPlan,
    ]);

    expect(resolvePricingPlanSelection(individual, "twoYear")).toEqual({
      planId: "premium_2year",
      billingPeriod: "2year",
    });
  });

  it("falls back to the longest available term for plans without a 2-year price", () => {
    const [individual] = transformApiPlans([monthlyPlan, annualPlan]);

    expect(resolvePricingPlanSelection(individual, "twoYear")).toEqual({
      planId: "premium_yearly",
      billingPeriod: "year",
    });
  });
});

describe("2-year display copy", () => {
  const [individual] = transformApiPlans([monthlyPlan, annualPlan, twoYearPlan]);

  it("shows the effective monthly price and the promotional term", () => {
    expect(twoYearHeroPriceDisplay(individual)).toBe("$2.14");
    expect(twoYearTermLabel(individual)).toBe("2 Years + 4 Months Free");
    expect(formatTwoYearBillingDetail(individual)).toBe(
      "Only $2.14/month — $60 once for 28 months, then renews every 2 years",
    );
    expect(formatTwoYearComparisonPrice(individual)).toBe(
      "$2.14 / month, billed every 2 years",
    );
  });

  it("states that bonus months apply to the first term only", () => {
    expect(twoYearBonusCopy(individual)).toBe(
      "28 months of KeenVPN for the price of 24. Bonus months apply to this first term only; it renews every 2 years after that.",
    );
  });

  it("drops promotional copy when no bonus months are granted", () => {
    const [withoutPromo] = transformApiPlans([
      monthlyPlan,
      annualPlan,
      apiPlan({
        ...twoYearPlan,
        bonusMonths: 0,
        totalInitialMonths: 24,
      }),
    ]);

    expect(twoYearTermLabel(withoutPromo)).toBe("2 Years");
    expect(twoYearBonusCopy(withoutPromo)).toBeNull();
    expect(withoutPromo.twoYearMonthlyEquivalent).toBe("$2.50");
  });
});

describe("computeTermSavings", () => {
  it("counts bonus months as access months", () => {
    expect(computeTermSavings(4, 60, 24, 4)).toEqual({
      savingsPercent: 46.4,
      savingsAmount: 52,
      effectiveMonthlyPrice: 2.14,
      accessMonths: 28,
    });
  });

  it("returns zeroes for unusable inputs", () => {
    expect(computeTermSavings(0, 60, 24, 4)).toEqual({
      savingsPercent: 0,
      savingsAmount: 0,
      effectiveMonthlyPrice: 0,
      accessMonths: 28,
    });
  });
});
