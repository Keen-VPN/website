export interface SeatAcceptChargeEstimateInput {
  priceAmount: number | null | undefined;
  billingPeriod: string | null | undefined;
  priceCurrency?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  now?: Date;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/** Prorated one-seat charge for the remainder of the current billing period. */
export function estimateSeatAcceptCharge(
  input: SeatAcceptChargeEstimateInput,
): { amount: number; currency: string } | null {
  const price = Number(input.priceAmount);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const currency = (input.priceCurrency ?? "USD").toUpperCase();
  const now = input.now ?? new Date();
  const periodEnd = input.currentPeriodEnd
    ? new Date(input.currentPeriodEnd)
    : null;
  const periodStart = input.currentPeriodStart
    ? new Date(input.currentPeriodStart)
    : null;

  if (
    periodEnd &&
    periodStart &&
    !Number.isNaN(periodEnd.getTime()) &&
    !Number.isNaN(periodStart.getTime()) &&
    periodEnd.getTime() > now.getTime() &&
    periodEnd.getTime() > periodStart.getTime()
  ) {
    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const remainingMs = periodEnd.getTime() - now.getTime();
    const ratio = Math.min(1, Math.max(0, remainingMs / totalMs));
    const amount = Math.max(0.01, Math.round(price * ratio * 100) / 100);
    return { amount, currency };
  }

  return { amount: price, currency };
}

export function formatSeatRenewalRate(
  priceAmount: number | null | undefined,
  billingPeriod: string | null | undefined,
  priceCurrency?: string | null,
): string | null {
  const price = Number(priceAmount);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }
  const currency = (priceCurrency ?? "USD").toUpperCase();
  const period = billingPeriod === "year" ? "year" : "month";
  return `${formatMoney(price, currency)}/seat/${period}`;
}

/** User-facing copy for charge-on-accept team invites. */
export function formatChargeOnAcceptInviteCopy(
  input: SeatAcceptChargeEstimateInput,
): string {
  const estimate = estimateSeatAcceptCharge(input);
  const renewal = formatSeatRenewalRate(
    input.priceAmount,
    input.billingPeriod,
    input.priceCurrency,
  );

  if (!estimate) {
    return "When a teammate accepts, your card on file is charged for one seat for the rest of this billing period (not when you send the invite).";
  }

  const chargeLabel = formatMoney(estimate.amount, estimate.currency);
  if (renewal) {
    return `When a teammate accepts, your card is charged about ${chargeLabel} for one seat for the rest of this billing period, then ${renewal} at renewal. Sending an invite is free.`;
  }

  return `When a teammate accepts, your card is charged about ${chargeLabel} for one seat for the rest of this billing period. Sending an invite is free.`;
}

export function formatChargeAfterPrepaidSeatsCopy(
  input: SeatAcceptChargeEstimateInput,
): string {
  const estimate = estimateSeatAcceptCharge(input);
  const renewal = formatSeatRenewalRate(
    input.priceAmount,
    input.billingPeriod,
    input.priceCurrency,
  );

  if (!estimate) {
    return "After your already-paid seats are used, each additional accepted teammate is charged for one prorated seat. Sending an invite is always free.";
  }

  const chargeLabel = formatMoney(estimate.amount, estimate.currency);
  if (renewal) {
    return `After your already-paid seats are used, each additional accepted teammate is charged about ${chargeLabel} for the rest of this billing period, then ${renewal} at renewal.`;
  }

  return `After your already-paid seats are used, each additional accepted teammate is charged about ${chargeLabel} for the rest of this billing period.`;
}

export function formatTrialSeatBillingCopy(
  input: SeatAcceptChargeEstimateInput,
): string {
  const renewal = formatSeatRenewalRate(
    input.priceAmount,
    input.billingPeriod,
    input.priceCurrency,
  );

  return renewal
    ? `Accepted teammates are added now with no seat charge during the trial. When the trial ends, active seats are billed at ${renewal}.`
    : "Accepted teammates are added now with no seat charge during the trial. Active seats are billed when the trial ends.";
}
