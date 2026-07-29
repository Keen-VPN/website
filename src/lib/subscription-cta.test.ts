import { describe, expect, it } from "vitest";
import type { SubscriptionData } from "@/auth/types";
import {
  canUpgradeStripeToAnnual,
  canUpgradeToBusinessPlan,
  hasScheduledAnnualBilling,
  resolveMembershipPlanTier,
  resolveSubscriptionBillingPeriod,
} from "@/lib/subscription-cta";

function stripeSub(
  overrides: Partial<SubscriptionData> = {},
): SubscriptionData {
  return {
    status: "active",
    endDate: "2027-01-01T00:00:00.000Z",
    canManageBilling: true,
    subscriptionType: "stripe",
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("membership plan tier helpers", () => {
  it("resolves tiers from plan name or id", () => {
    expect(
      resolveMembershipPlanTier(
        stripeSub({ plan: "Premium VPN - Monthly", planId: "premium_monthly" }),
      ),
    ).toBe("individual");
    expect(
      resolveMembershipPlanTier(
        stripeSub({
          plan: "KeenVPN Family - Annual",
          planId: "family_yearly",
        }),
      ),
    ).toBe("family");
    expect(
      resolveMembershipPlanTier(
        stripeSub({
          plan: "KeenVPN Business - Monthly",
          planId: "team_monthly",
        }),
      ),
    ).toBe("business");
  });

  it("detects upgrade eligibility to Business for Stripe and Apple IAP", () => {
    const individual = stripeSub({
      plan: "Premium VPN - Monthly",
      planId: "premium_monthly",
    });
    const family = stripeSub({
      plan: "KeenVPN Family - Monthly",
      planId: "family_monthly",
    });
    const business = stripeSub({
      plan: "KeenVPN Business - Monthly",
      planId: "team_monthly",
    });
    const apple = stripeSub({
      plan: "Premium VPN - Annual",
      planId: "premium_yearly",
      subscriptionType: "apple_iap",
    });

    expect(canUpgradeToBusinessPlan(individual)).toBe(true);
    expect(canUpgradeToBusinessPlan(family)).toBe(true);
    expect(canUpgradeToBusinessPlan(apple)).toBe(true);
    expect(canUpgradeToBusinessPlan(business)).toBe(false);
  });

  it("uses the backend billing period before legacy plan-name fallbacks", () => {
    expect(
      resolveSubscriptionBillingPeriod(
        stripeSub({
          billingPeriod: "year",
          plan: "Premium VPN",
          planId: "premium",
        }),
      ),
    ).toBe("year");
    expect(
      resolveSubscriptionBillingPeriod(
        stripeSub({
          billingPeriod: "month",
          plan: "Premium VPN - Annual",
          planId: "premium_yearly",
        }),
      ),
    ).toBe("month");
    expect(
      resolveSubscriptionBillingPeriod(
        stripeSub({
          plan: "Premium VPN - Annual",
          planId: null,
        }),
      ),
    ).toBe("year");
  });

  it("hides annual upgrade CTA when annual billing is already scheduled", () => {
    const scheduled = stripeSub({
      plan: "KeenVPN Business - Monthly",
      planId: "team_monthly",
      billingPeriod: "month",
      status: "trialing",
      scheduledBillingInterval: {
        from: "month",
        to: "year",
        effectiveAt: "2026-08-27T00:00:00.000Z",
      },
    });

    expect(hasScheduledAnnualBilling(scheduled)).toBe(true);
    expect(canUpgradeStripeToAnnual(scheduled)).toBe(false);
  });

  it("still hides annual upgrade CTA when scheduled effectiveAt is empty", () => {
    const scheduled = stripeSub({
      plan: "KeenVPN Business - Monthly",
      planId: "team_monthly",
      billingPeriod: "month",
      status: "active",
      scheduledBillingInterval: {
        from: "month",
        to: "year",
        effectiveAt: "",
      },
    });

    expect(hasScheduledAnnualBilling(scheduled)).toBe(true);
    expect(canUpgradeStripeToAnnual(scheduled)).toBe(false);
  });
});
