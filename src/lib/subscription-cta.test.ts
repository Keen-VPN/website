import { describe, expect, it } from "vitest";
import type { SubscriptionData } from "@/auth/types";
import {
  canUpgradeStripeToBusinessPlan,
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

  it("detects stripe upgrade eligibility to Business (Family retired from catalog)", () => {
    const individual = stripeSub({
      plan: "Premium VPN - Monthly",
      planId: "premium_monthly",
    });
    // Grandfathered legacy Family subscribers can still upgrade to Business.
    const family = stripeSub({
      plan: "KeenVPN Family - Monthly",
      planId: "family_monthly",
    });
    const business = stripeSub({
      plan: "KeenVPN Business - Monthly",
      planId: "team_monthly",
    });

    expect(canUpgradeStripeToBusinessPlan(individual)).toBe(true);
    expect(canUpgradeStripeToBusinessPlan(family)).toBe(true);
    expect(canUpgradeStripeToBusinessPlan(business)).toBe(false);
  });
});
