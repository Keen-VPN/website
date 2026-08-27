import { describe, expect, it } from "vitest";
import {
  normalizeBackendAuthResponse,
  type RawBackendAuthResponse,
} from "@/auth/backend";

describe("normalizeBackendAuthResponse", () => {
  it("preserves a scheduled Business 2-year billing interval", () => {
    const raw: RawBackendAuthResponse = {
      success: true,
      subscription: {
        status: "active",
        scheduledBillingInterval: {
          from: "year",
          to: "2year",
          effectiveAt: "2027-08-27T00:00:00.000Z",
        },
      },
    };

    expect(
      normalizeBackendAuthResponse(raw).subscription?.scheduledBillingInterval,
    ).toEqual({
      from: "year",
      to: "2year",
      effectiveAt: "2027-08-27T00:00:00.000Z",
    });
  });

  it("preserves the canonical two-year period and scheduled plan details", () => {
    const raw: RawBackendAuthResponse = {
      success: true,
      subscription: {
        status: "ACTIVE",
        plan: "Premium VPN",
        billingPeriod: "2year",
        serviceThroughDate: "2028-08-15T00:00:00.000Z",
        canManageBilling: true,
        scheduledPlanChange: {
          from: "2year",
          to: "year",
          planId: "premium_yearly",
          planName: "Premium VPN - Annual",
          effectiveAt: "2028-08-15T00:00:00.000Z",
        },
      },
    };

    expect(normalizeBackendAuthResponse(raw).subscription).toEqual(
      expect.objectContaining({
        billingPeriod: "2year",
        serviceThroughDate: "2028-08-15T00:00:00.000Z",
        scheduledPlanChange: {
          from: "2year",
          to: "year",
          planId: "premium_yearly",
          planName: "Premium VPN - Annual",
          effectiveAt: "2028-08-15T00:00:00.000Z",
        },
      }),
    );
  });

  it("does not trust malformed scheduled-plan metadata", () => {
    const raw: RawBackendAuthResponse = {
      success: true,
      subscription: {
        status: "active",
        billingPeriod: "year",
        canManageBilling: true,
        scheduledPlanChange: {
          from: "year",
          to: "three-year",
          planId: "premium_3year",
          planName: "Premium VPN - 3 Years",
          effectiveAt: "2028-08-15T00:00:00.000Z",
        },
      },
    };

    expect(
      normalizeBackendAuthResponse(raw).subscription?.scheduledPlanChange,
    ).toBeUndefined();
  });

  it.each(["", "not-a-date"])(
    "rejects a scheduled plan change with invalid effectiveAt %j",
    (effectiveAt) => {
      const raw: RawBackendAuthResponse = {
        success: true,
        subscription: {
          status: "active",
          billingPeriod: "2year",
          canManageBilling: true,
          scheduledPlanChange: {
            from: "2year",
            to: "year",
            planId: "premium_yearly",
            planName: "Premium VPN - Annual",
            effectiveAt,
          },
        },
      };

      expect(
        normalizeBackendAuthResponse(raw).subscription?.scheduledPlanChange,
      ).toBeUndefined();
    },
  );

  it("keeps canceled/expired subscriptions so renew UI can render", () => {
    const canceled = normalizeBackendAuthResponse({
      success: true,
      subscription: {
        status: "canceled",
        plan: "Premium VPN",
        canManageBilling: false,
      },
    });
    expect(canceled.subscription).toEqual(
      expect.objectContaining({
        status: "canceled",
        plan: "Premium VPN",
      }),
    );

    const incomplete = normalizeBackendAuthResponse({
      success: true,
      subscription: {
        status: "incomplete",
        canManageBilling: false,
      },
    });
    expect(incomplete.subscription).toBeNull();
  });
});
