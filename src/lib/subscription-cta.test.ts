import { describe, expect, it } from "vitest";
import type { SubscriptionData } from "@/auth/types";
import {
  canUpgradeStripeToBusinessPlan,
  canUpgradeStripeToFamilyPlan,
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

  it("detects stripe upgrade eligibility", () => {
    const individual = stripeSub({
      plan: "Premium VPN - Monthly",
      planId: "premium_monthly",
    });
    const family = stripeSub({
      plan: "KeenVPN Family - Monthly",
      planId: "family_monthly",
    });

    expect(canUpgradeStripeToFamilyPlan(individual)).toBe(true);
    expect(canUpgradeStripeToBusinessPlan(individual)).toBe(false);
    expect(canUpgradeStripeToFamilyPlan(family)).toBe(false);
    expect(canUpgradeStripeToBusinessPlan(family)).toBe(true);
  });
});
