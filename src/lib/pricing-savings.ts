export const CANONICAL_MONTHLY_PRICE_USD = 10;
export const CANONICAL_ANNUAL_PRICE_USD = 30;

export interface AnnualSavingsMetrics {
  savingsPercent: number;
  savingsPercentLabel: string;
  monthlyEquivalent: number;
  monthlyEquivalentLabel: string;
  annualDollarSavings: number;
  annualDollarSavingsLabel: string;
  annualBadgeLabel: string;
}

export function computeAnnualSavings(
  monthlyPrice: number,
  annualPrice: number,
): AnnualSavingsMetrics | null {
  if (
    !Number.isFinite(monthlyPrice) ||
    !Number.isFinite(annualPrice) ||
    monthlyPrice <= 0 ||
    annualPrice <= 0
  ) {
    return null;
  }

  const monthlyAnnualized = monthlyPrice * 12;
  const annualDollarSavings = Math.max(0, monthlyAnnualized - annualPrice);
  const savingsPercent = Math.round(
    (annualDollarSavings / monthlyAnnualized) * 100,
  );
  const monthlyEquivalent = annualPrice / 12;

  const formatUsd = (amount: number) =>
    amount % 1 === 0 ? `$${amount.toFixed(0)}` : `$${amount.toFixed(2)}`;

  const savingsPercentLabel = `Save ${savingsPercent}%`;
  const monthlyEquivalentLabel = formatUsd(monthlyEquivalent);
  const annualDollarSavingsLabel = formatUsd(annualDollarSavings);

  return {
    savingsPercent,
    savingsPercentLabel,
    monthlyEquivalent,
    monthlyEquivalentLabel,
    annualDollarSavings,
    annualDollarSavingsLabel,
    annualBadgeLabel: `${savingsPercentLabel} · Annual — ${monthlyEquivalentLabel}/month billed yearly`,
  };
}

/** Fallback when API plans are unavailable. */
export const FALLBACK_ANNUAL_SAVINGS = computeAnnualSavings(
  CANONICAL_MONTHLY_PRICE_USD,
  CANONICAL_ANNUAL_PRICE_USD,
)!;
