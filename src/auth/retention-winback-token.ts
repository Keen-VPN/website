/** Session key for email win-back deeplinks — keep aligned with `/reactivate`. */
export const RETENTION_WINBACK_TOKEN_STORAGE_KEY = "retention_winback_token";

/**
 * Read persisted win-back token. Never throws — returns "" if storage unavailable.
 */
export function getRetentionWinbackTokenFromStorage(): string {
  try {
    return sessionStorage.getItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Persist win-back token for post–sign-in redirect. Never throws.
 */
export function setRetentionWinbackTokenStorage(token: string): void {
  try {
    sessionStorage.setItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY, token);
  } catch {
    // Private mode / disabled storage — `?token=` in URL still drives the flow.
  }
}

/**
 * Remove persisted win-back token. Used when desktop ASWeb OAuth returns to account
 * so a stale Safari/shared-context token cannot hijack the next browser sign-in
 * toward `/reactivate`.
 */
export function clearRetentionWinbackTokenStorage(): void {
  try {
    sessionStorage.removeItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY);
  } catch {
    // Private mode / unsupported storage — ignore.
  }
}
