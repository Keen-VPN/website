import { describe, expect, it } from "vitest";
import {
  formatChargeAfterPrepaidSeatsCopy,
  formatChargeOnAcceptInviteCopy,
  formatTrialSeatBillingCopy,
} from "./business-seat-billing-copy";

describe("business-seat-billing-copy", () => {
  it("avoids a stale proration quote while showing the renewal rate", () => {
    const copy = formatChargeOnAcceptInviteCopy({
      priceAmount: 30,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("Invites are free");
    expect(copy).toContain("signs in");
    expect(copy).toContain("accepts");
    expect(copy).toContain("30");
    expect(copy).toContain("per person per year");
    expect(copy).not.toContain("Stripe");
    expect(copy).not.toContain("already-paid");
    expect(copy).not.toContain("26.63");
  });

  it("explains that paid seats are used before new charges", () => {
    const copy = formatChargeAfterPrepaidSeatsCopy({
      priceAmount: 30,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("Paid seats you already have");
    expect(copy).not.toContain("Stripe");
    expect(copy).not.toContain("already-paid");
    expect(copy).toContain("30");
    expect(copy).toContain("per person per year");
  });

  it("explains that trial seats are billed when the trial ends", () => {
    const copy = formatTrialSeatBillingCopy({
      priceAmount: 30,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("no seat charge during the trial");
    expect(copy).toContain("signs in");
    expect(copy).toContain("30");
    expect(copy).toContain("per person per year");
    expect(copy).not.toContain("Stripe");
  });
});
