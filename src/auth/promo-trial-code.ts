/** Persists across sign-in so redeem can run after auth returns. */
export const PROMO_TRIAL_CODE_STORAGE_KEY = "keen_promo_trial_code";

export function getPromoTrialCodeFromStorage(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PROMO_TRIAL_CODE_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setPromoTrialCodeStorage(code: string): void {
  if (typeof window === "undefined") return;
  try {
    const t = code.trim();
    if (t) sessionStorage.setItem(PROMO_TRIAL_CODE_STORAGE_KEY, t);
    else sessionStorage.removeItem(PROMO_TRIAL_CODE_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearPromoTrialCodeStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PROMO_TRIAL_CODE_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}
