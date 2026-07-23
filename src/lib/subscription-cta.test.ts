import { describe, expect, it } from "vitest";
import type { SubscriptionData } from "@/auth/types";
import {
  canUpgradeToBusinessPlan,
  resolveMembershipPlanTier,
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
});
