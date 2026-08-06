import { describe, expect, it } from "vitest";
import { resolvePricingRouteDestination } from "@/auth/pricing-route";

describe("resolvePricingRouteDestination", () => {
  it("keeps a restored authenticated user in portal pricing", () => {
    expect(
      resolvePricingRouteDestination({
        hasUser: true,
        hasSessionToken: false,
        authLoading: true,
        search: "",
      }),
    ).toBe("portal");
  });

  it("waits for the initial auth callback before redirecting a visitor", () => {
    expect(
      resolvePricingRouteDestination({
        hasUser: false,
        hasSessionToken: false,
        authLoading: true,
        search: "",
      }),
    ).toBe("loading");
  });

  it("redirects only after auth confirms there is no user or session", () => {
    expect(
      resolvePricingRouteDestination({
        hasUser: false,
        hasSessionToken: false,
        authLoading: false,
        search: "",
      }),
    ).toBe("marketing");
  });

  it("keeps a retained backend session in portal pricing", () => {
    expect(
      resolvePricingRouteDestination({
        hasUser: false,
        hasSessionToken: true,
        authLoading: false,
        search: "",
      }),
    ).toBe("portal");
  });

  it("always preserves the membership-transfer pricing flow", () => {
    expect(
      resolvePricingRouteDestination({
        hasUser: false,
        hasSessionToken: false,
        authLoading: true,
        search: "?membershipTransfer=1&source=switch",
      }),
    ).toBe("portal");
  });
});
