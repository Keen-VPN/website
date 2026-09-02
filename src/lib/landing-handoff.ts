export const LANDING_HANDOFF_SIGNATURE_PARAM = "landing_sig";

const MAX_HANDOFF_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HANDOFF_FUTURE_MS = 5 * 60 * 1000;

export const MARKETING_REDIRECT_ROUTES = new Set([
  "/",
  "/switch",
  "/servers",
  "/privacy",
  "/terms",
  "/my-ip-address",
  "/pricing",
]);

export function isReplaceableLandingPlaceholder(path: string): boolean {
  return MARKETING_REDIRECT_ROUTES.has(path.trim());
}

export function parseValidHandoffCapturedAt(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const timestamp = parsed.getTime();
  const now = Date.now();
  if (timestamp > now + MAX_HANDOFF_FUTURE_MS) return null;
  if (timestamp < now - MAX_HANDOFF_AGE_MS) return null;

  return parsed.toISOString();
}
