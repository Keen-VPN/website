import { describe, expect, it } from "vitest";
import {
  formatChargeAfterPrepaidSeatsCopy,
  formatChargeOnAcceptInviteCopy,
  formatTrialSeatBillingCopy,
} from "./business-seat-billing-copy";

describe("business-seat-billing-copy", () => {
  it("avoids a stale proration quote while showing the renewal rate", () => {
    const copy = formatChargeOnAcceptInviteCopy({
      priceAmount: 40,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("Sending an invite is free");
    expect(copy).toContain("KeenVPN account");
    expect(copy).toContain("accepts");
    expect(copy).toContain("40");
    expect(copy).toContain("/seat/year");
    expect(copy).toContain("Stripe calculates the exact charge");
    expect(copy).not.toContain("26.63");
  });

  it("explains that already-paid seats are consumed before new charges", () => {
    const copy = formatChargeAfterPrepaidSeatsCopy({
      priceAmount: 40,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("already-paid seats");
    expect(copy).toContain("Stripe calculates that charge when it applies");
    expect(copy).toContain("40");
    expect(copy).toContain("/seat/year");
  });

  it("explains that trial seats are billed when the trial ends", () => {
    const copy = formatTrialSeatBillingCopy({
      priceAmount: 40,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("no seat charge during the trial");
    expect(copy).toContain("KeenVPN account");
    expect(copy).toContain("40");
    expect(copy).toContain("/seat/year");
  });
});
