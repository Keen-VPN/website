export interface SeatBillingCopyInput {
  priceAmount: number | null | undefined;
  billingPeriod: string | null | undefined;
  priceCurrency?: string | null;
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
  return `${formatMoney(price, currency)} per person per ${period}`;
}

/** User-facing copy for charge-on-accept team invites. */
export function formatChargeOnAcceptInviteCopy(
  input: SeatBillingCopyInput,
): string {
  const renewal = formatSeatRenewalRate(
    input.priceAmount,
    input.billingPeriod,
    input.priceCurrency,
  );

  if (renewal) {
    return `Invites are free. You are charged only after a teammate signs in, accepts, and has used any KeenVPN time they already paid for. If you do not already have a paid seat free for them, your card is charged for one seat for the rest of this billing period, then ${renewal} at renewal.`;
  }

  return "Invites are free. You are charged only after a teammate signs in, accepts, and has used any KeenVPN time they already paid for. If you do not already have a paid seat free for them, your card is charged for one seat for the rest of this billing period.";
}

export function formatChargeAfterPrepaidSeatsCopy(
  input: SeatBillingCopyInput,
): string {
  const renewal = formatSeatRenewalRate(
    input.priceAmount,
    input.billingPeriod,
    input.priceCurrency,
  );

  if (renewal) {
    return `Invites are free. Paid seats you already have stay available until renewal. After those are used, each new teammate can add a prorated seat charge only after they sign in, accept, and have used any KeenVPN time they already paid for. At renewal, billing adjusts to you plus accepted teammates at ${renewal}.`;
  }

  return "Invites are free. Paid seats you already have stay available until renewal. After those are used, each new teammate can add a prorated seat charge only after they sign in, accept, and have used any KeenVPN time they already paid for. At renewal, billing adjusts to you plus accepted teammates.";
}

export function formatTrialSeatBillingCopy(
  input: SeatBillingCopyInput,
): string {
  const renewal = formatSeatRenewalRate(
    input.priceAmount,
    input.billingPeriod,
    input.priceCurrency,
  );

  return renewal
    ? `Invites are free. After a teammate signs in and accepts, they join with no seat charge during the trial. When the trial ends, active seats are billed at ${renewal}.`
    : "Invites are free. After a teammate signs in and accepts, they join with no seat charge during the trial. Active seats are billed when the trial ends.";
}
