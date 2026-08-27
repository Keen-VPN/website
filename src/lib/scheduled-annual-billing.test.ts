import { describe, expect, it } from "vitest";
import type { SubscriptionData } from "@/auth/types";
import { getScheduledAnnualBillingCopy } from "@/lib/scheduled-annual-billing";

function sub(overrides: Partial<SubscriptionData> = {}): SubscriptionData {
  return {
    status: "active",
    endDate: "2026-12-01T00:00:00.000Z",
    canManageBilling: true,
    ...overrides,
  };
}

describe("getScheduledAnnualBillingCopy", () => {
  it("formats a valid effectiveAt date", () => {
    const copy = getScheduledAnnualBillingCopy(
      sub({
        scheduledBillingInterval: {
          from: "month",
          to: "year",
          effectiveAt: "2026-08-27T00:00:00.000Z",
        },
      }),
    );
    expect(copy).toContain("You're on monthly until");
    expect(copy).toContain("Annual billing starts then");
    expect(copy).not.toContain("current period ends");
  });

  it("describes a 2-year to annual schedule without calling the current term monthly", () => {
    const copy = getScheduledAnnualBillingCopy(
      sub({
        scheduledBillingInterval: {
          from: "2year",
          to: "year",
          effectiveAt: "2026-08-27T00:00:00.000Z",
        },
      }),
    );
    expect(copy).toContain("You're on 2-year until");
    expect(copy).toContain("Annual billing starts then");
    expect(copy).not.toContain("You're on monthly");
  });

  it("falls back when effectiveAt is empty", () => {
    expect(
      getScheduledAnnualBillingCopy(
        sub({
          scheduledBillingInterval: {
            from: "month",
            to: "year",
            effectiveAt: "",
          },
        }),
      ),
    ).toContain("current period ends");
  });

  it("falls back when effectiveAt is malformed instead of throwing", () => {
    expect(
      getScheduledAnnualBillingCopy(
        sub({
          scheduledBillingInterval: {
            from: "month",
            to: "year",
            effectiveAt: "not-a-date",
          },
        }),
      ),
    ).toContain("current period ends");
  });
});
