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
  return `${formatMoney(price, currency)}/seat/${period}`;
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
    return `Sending an invite is free. Billing updates only after your teammate creates or signs in to a KeenVPN account, accepts, and has used any paid KeenVPN time they already have. If no already-paid seat is available then, Stripe calculates the exact charge for the rest of the billing period. The renewal rate is ${renewal}.`;
  }

  return "Sending an invite is free. Billing updates only after your teammate creates or signs in to a KeenVPN account, accepts, and has used any paid KeenVPN time they already have. If no already-paid seat is available then, Stripe calculates the exact charge for the rest of the billing period.";
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
    return `Sending an invite is free. Your already-paid seats remain available until renewal. After they are used, each additional teammate can add a prorated seat charge only after they create or sign in to a KeenVPN account, accept, and have used any paid KeenVPN time they already have. Stripe calculates that charge when it applies. At renewal, billing adjusts to the owner plus accepted teammates at ${renewal}.`;
  }

  return "Sending an invite is free. Your already-paid seats remain available until renewal. After they are used, each additional teammate can add a prorated seat charge only after they create or sign in to a KeenVPN account, accept, and have used any paid KeenVPN time they already have. Stripe calculates that charge when it applies. At renewal, billing adjusts to the owner plus accepted teammates.";
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
    ? `Sending an invite is free. After your teammate creates or signs in to a KeenVPN account and accepts, they are added with no seat charge during the trial. When the trial ends, active seats are billed at ${renewal}.`
    : "Sending an invite is free. After your teammate creates or signs in to a KeenVPN account and accepts, they are added with no seat charge during the trial. Active seats are billed when the trial ends.";
}
