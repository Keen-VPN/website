import { describe, expect, it } from "vitest";
import {
  formatTwoYearBillingDetail,
  formatTwoYearComparisonPrice,
  isTwoYearApiPlan,
  resolvePricingPlanSelection,
  transformApiPlans,
  twoYearHeroPriceDisplay,
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
    // $60 over the 24-month billing term.
    expect(individual.twoYearMonthlyEquivalent).toBe("$2.50");
    expect(individual.twoYearSavingsLabel).toBe("Save 37.5%");
  });

  it("omits 2-year fields when the backend exposes no 2-year price", () => {
    const [individual] = transformApiPlans([monthlyPlan, annualPlan]);

    expect(individual.twoYearId).toBeUndefined();
    expect(individual.twoYearPrice).toBeNull();
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

  it("shows the effective monthly price and 24-month term", () => {
    expect(twoYearHeroPriceDisplay(individual)).toBe("$2.50");
    expect(formatTwoYearBillingDetail(individual)).toBe(
      "Only $2.50/month — $60 once for 24 months, then renews every 2 years",
    );
    expect(formatTwoYearComparisonPrice(individual)).toBe(
      "$2.50 / month, billed every 2 years",
    );
  });
});

describe("computeTermSavings", () => {
  it("uses the 24 paid months", () => {
    expect(computeTermSavings(4, 60, 24)).toEqual({
      savingsPercent: 37.5,
      savingsAmount: 36,
      effectiveMonthlyPrice: 2.5,
      accessMonths: 24,
    });
  });

  it("returns zeroes for unusable inputs", () => {
    expect(computeTermSavings(0, 60, 24)).toEqual({
      savingsPercent: 0,
      savingsAmount: 0,
      effectiveMonthlyPrice: 0,
      accessMonths: 24,
    });
  });
});
