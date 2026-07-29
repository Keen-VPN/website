import { describe, expect, it } from "vitest";
import { resolvePricingPlanSelection, type PricingPlan } from "@/lib/pricing";

function businessPlan(overrides: Partial<PricingPlan> = {}): PricingPlan {
  return {
    name: "Business",
    description: "Business plan",
    monthlyPrice: 4,
    annualPrice: 40,
    monthlyPriceDisplay: "$4",
    annualPriceDisplay: "$40",
    annualMonthlyEquivalent: null,
    annualSavingsPercent: null,
    annualYearlySavingsDisplay: null,
    annualSavingsLabel: null,
    features: [],
    buttonText: "Enable Business",
    popular: true,
    isPerSeat: true,
    ...overrides,
  };
}

describe("resolvePricingPlanSelection", () => {
  it("uses the requested interval when both plans exist", () => {
    const plan = businessPlan({
      monthlyId: "team_monthly",
      annualId: "team_yearly",
    });

    expect(resolvePricingPlanSelection(plan, "monthly")).toEqual({
      planId: "team_monthly",
      billingPeriod: "month",
    });
    expect(resolvePricingPlanSelection(plan, "annual")).toEqual({
      planId: "team_yearly",
      billingPeriod: "year",
    });
  });

  it("reports the actual fallback interval when only one plan exists", () => {
    expect(
      resolvePricingPlanSelection(
        businessPlan({ annualId: "team_yearly" }),
        "monthly",
      ),
    ).toEqual({
      planId: "team_yearly",
      billingPeriod: "year",
    });
  });
});
