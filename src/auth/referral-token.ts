/** Persists across pages until sign-up consumes it (see backend auth). */
export const REFERRAL_TOKEN_STORAGE_KEY = "keen_referral_token";

export function getReferralTokenFromStorage(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REFERRAL_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function setReferralTokenStorage(token: string): void {
  if (typeof window === "undefined") return;
  const t = token.trim();
  if (t) localStorage.setItem(REFERRAL_TOKEN_STORAGE_KEY, t);
  else localStorage.removeItem(REFERRAL_TOKEN_STORAGE_KEY);
}

export function clearReferralTokenStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_TOKEN_STORAGE_KEY);
}
