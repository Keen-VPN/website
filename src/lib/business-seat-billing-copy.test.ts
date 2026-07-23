import { describe, expect, it } from "vitest";
import {
  estimateSeatAcceptCharge,
  formatChargeAfterPrepaidSeatsCopy,
  formatChargeOnAcceptInviteCopy,
  formatTrialSeatBillingCopy,
} from "./business-seat-billing-copy";

describe("business-seat-billing-copy", () => {
  it("estimates prorated annual seat charge from billing period dates", () => {
    const estimate = estimateSeatAcceptCharge({
      priceAmount: 40,
      billingPeriod: "year",
      currentPeriodStart: "2026-03-23T00:00:00.000Z",
      currentPeriodEnd: "2027-03-23T00:00:00.000Z",
      now: new Date("2026-07-23T00:00:00.000Z"),
    });

    expect(estimate).not.toBeNull();
    expect(estimate?.amount).toBeGreaterThan(20);
    expect(estimate?.amount).toBeLessThan(40);
  });

  it("formats invite copy with estimate and renewal rate", () => {
    const copy = formatChargeOnAcceptInviteCopy({
      priceAmount: 40,
      billingPeriod: "year",
      priceCurrency: "USD",
      currentPeriodStart: "2026-03-23T00:00:00.000Z",
      currentPeriodEnd: "2027-03-23T00:00:00.000Z",
      now: new Date("2026-07-23T00:00:00.000Z"),
    });

    expect(copy).toContain("Sending an invite is free");
    expect(copy).toContain("$40/seat/year");
    expect(copy).toMatch(/about \$/);
  });

  it("explains that already-paid seats are consumed before new charges", () => {
    const copy = formatChargeAfterPrepaidSeatsCopy({
      priceAmount: 40,
      billingPeriod: "year",
      priceCurrency: "USD",
      currentPeriodStart: "2026-03-23T00:00:00.000Z",
      currentPeriodEnd: "2027-03-23T00:00:00.000Z",
      now: new Date("2026-07-23T00:00:00.000Z"),
    });

    expect(copy).toContain("After your already-paid seats are used");
    expect(copy).toContain("$40/seat/year");
  });

  it("explains that trial seats are billed when the trial ends", () => {
    const copy = formatTrialSeatBillingCopy({
      priceAmount: 40,
      billingPeriod: "year",
      priceCurrency: "USD",
    });

    expect(copy).toContain("no seat charge during the trial");
    expect(copy).toContain("$40/seat/year");
  });
});
