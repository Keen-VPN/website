/** Session key for email win-back deeplinks — keep aligned with `/reactivate`. */
export const RETENTION_WINBACK_TOKEN_STORAGE_KEY = "retention_winback_token";

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
