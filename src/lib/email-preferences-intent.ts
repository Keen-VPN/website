/**
 * Deep-link actions the email footer ("Get Important updates only or
 * Unsubscribe") opens the preference page with. Anything else is ignored so a
 * crafted `?intent=` can never trigger a write.
 */
export type EmailPreferencesIntent = "important-only" | "unsubscribe";

export function parseEmailPreferencesIntent(
  value: string | null | undefined,
): EmailPreferencesIntent | null {
  return value === "important-only" || value === "unsubscribe" ? value : null;
}

/**
 * "Important updates only": Product Updates on, every other optional category
 * off. Mirrors the backend's category keys.
 */
export const IMPORTANT_ONLY_PREFERENCES: Record<string, boolean> = {
  product_updates: true,
  education_privacy: false,
  perks_offers: false,
  referrals: false,
};

export type EmailPreferencesMode = "token" | "session" | "identify";

export type EmailPreferencesIntentAction =
  /** Signed link from an email: apply the preset once, on load. */
  | "apply-important-only"
  /** Signed-in visitor on an unsigned link: ask before changing anything. */
  | "confirm-important-only"
  /** No token or session: email them a signed link that carries the intent. */
  | "request-link"
  /** Spotlight the existing "Unsubscribe from all" button; never auto-post. */
  | "highlight-unsubscribe"
  | "none";

export function resolveIntentAction(
  intent: EmailPreferencesIntent | null,
  mode: EmailPreferencesMode,
): EmailPreferencesIntentAction {
  if (!intent) return "none";
  if (mode === "identify") return "request-link";
  if (intent === "unsubscribe") return "highlight-unsubscribe";
  return mode === "token" ? "apply-important-only" : "confirm-important-only";
}
