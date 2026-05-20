/** Persists across pages until sign-up consumes it (see backend auth). */
export const REFERRAL_TOKEN_STORAGE_KEY = "keen_referral_token";

export function getReferralTokenFromStorage(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REFERRAL_TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setReferralTokenStorage(token: string): void {
  if (typeof window === "undefined") return;
  try {
    const t = token.trim();
    if (t) localStorage.setItem(REFERRAL_TOKEN_STORAGE_KEY, t);
    else localStorage.removeItem(REFERRAL_TOKEN_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearReferralTokenStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFERRAL_TOKEN_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}
