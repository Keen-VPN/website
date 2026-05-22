export type AnnualSavingsSummary = {
  savingsPercent: number;
  yearlySavingsAmount: number;
  annualMonthlyEquivalent: number;
};

export function computeAnnualSavings(
  monthlyPrice: number,
  annualPrice: number,
): AnnualSavingsSummary {
  if (monthlyPrice <= 0 || annualPrice <= 0) {
    return {
      savingsPercent: 0,
      yearlySavingsAmount: 0,
      annualMonthlyEquivalent: 0,
    };
  }

  const yearlyIfMonthly = monthlyPrice * 12;
  const yearlySavingsAmount = Math.max(0, yearlyIfMonthly - annualPrice);
  const savingsPercent =
    Math.round((yearlySavingsAmount / yearlyIfMonthly) * 1000) / 10;
  const annualMonthlyEquivalent = Math.round((annualPrice / 12) * 100) / 100;

  return {
    savingsPercent,
    yearlySavingsAmount,
    annualMonthlyEquivalent,
  };
}

export function formatSavingsPercent(percent: number): string {
  return Number.isInteger(percent) ? `${percent}` : percent.toFixed(1);
}

/** Fallback before plans API loads ($10/mo vs $30/yr). */
export const DEFAULT_ANNUAL_SAVINGS_PERCENT = 37.5;

export const DEFAULT_ANNUAL_SAVINGS_LABEL = `Save ${formatSavingsPercent(DEFAULT_ANNUAL_SAVINGS_PERCENT)}%`;

export function formatUsd(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return rounded % 1 === 0 ? `$${rounded.toFixed(0)}` : `$${rounded.toFixed(2)}`;
}
