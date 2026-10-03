/**
 * Session attribution when a visitor reaches sign-in from a class-action page.
 * Survives OTP/OAuth so we can attribute signup → class-action view → claim.
 */

import { parseValidHandoffCapturedAt } from "@/lib/landing-handoff";

const STORAGE_KEY = "keenvpn_class_action_attribution";
const NEW_SIGNUP_FLAG = "keenvpn_class_action_new_signup";

export interface ClassActionAttribution {
  path: string;
  slug: string;
  capturedAt: string;
}

interface ClassActionNewSignupFlag {
  slug: string;
  capturedAt: string;
}

function redirectPathname(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return new URL(trimmed, "https://vpnkeen.com").pathname;
    }
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (
      host === "vpnkeen.com" ||
      host === "www.vpnkeen.com" ||
      host === "portal.vpnkeen.com"
    ) {
      return url.pathname;
    }
    return null;
  } catch {
    return null;
  }
}

function parseAttribution(raw: string | null): ClassActionAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ClassActionAttribution>;
    if (
      typeof parsed.path !== "string" ||
      typeof parsed.slug !== "string" ||
      !extractClassActionSlugFromPath(parsed.path)
    ) {
      return null;
    }
    const capturedAt = parseValidHandoffCapturedAt(
      typeof parsed.capturedAt === "string" ? parsed.capturedAt : undefined,
    );
    if (!capturedAt) return null;
    return {
      path: parsed.path,
      slug: parsed.slug,
      capturedAt,
    };
  } catch {
    // ignore corrupt storage
  }
  return null;
}

/** Only matches routes whose pathname starts at `/class-actions/:slug`. */
export function extractClassActionSlugFromPath(path: string): string | null {
  const pathname = redirectPathname(path);
  if (!pathname) return null;
  const match = pathname.match(/^\/class-actions\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function captureClassActionAttributionFromRedirect(
  redirectPath: string | null | undefined,
  storage: Pick<Storage, "setItem" | "removeItem"> = sessionStorage,
): void {
  if (!redirectPath) {
    storage.removeItem(STORAGE_KEY);
    return;
  }
  const slug = extractClassActionSlugFromPath(redirectPath);
  if (!slug) {
    // Non-class-action redirects must clear a prior settlement handoff.
    storage.removeItem(STORAGE_KEY);
    return;
  }
  const payload: ClassActionAttribution = {
    path: redirectPath,
    slug,
    capturedAt: new Date().toISOString(),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function peekClassActionAttribution(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): ClassActionAttribution | null {
  const value = parseAttribution(storage.getItem(STORAGE_KEY));
  if (!value) {
    storage.removeItem(STORAGE_KEY);
  }
  return value;
}

export function consumeClassActionAttribution(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): ClassActionAttribution | null {
  const value = parseAttribution(storage.getItem(STORAGE_KEY));
  storage.removeItem(STORAGE_KEY);
  return value;
}

/**
 * Mark that the just-completed auth was a new signup from a specific
 * class-action link. Scoped to slug + TTL so unrelated later views are not
 * labeled `new_signup`.
 */
export function markClassActionNewSignup(
  slug: string,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  const trimmed = slug.trim();
  if (!trimmed) return;
  const payload: ClassActionNewSignupFlag = {
    slug: trimmed,
    capturedAt: new Date().toISOString(),
  };
  storage.setItem(NEW_SIGNUP_FLAG, JSON.stringify(payload));
}

/**
 * Consume the new-signup flag only when it matches `expectedSlug` and is still
 * within the handoff TTL. Always clears when matched or stale; leaves a
 * different still-valid slug for the intended settlement page.
 */
export function consumeClassActionNewSignupFlag(
  expectedSlug?: string | null,
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): boolean {
  const raw = storage.getItem(NEW_SIGNUP_FLAG);
  if (!raw) return false;

  let parsed: Partial<ClassActionNewSignupFlag>;
  try {
    parsed = JSON.parse(raw) as Partial<ClassActionNewSignupFlag>;
  } catch {
    storage.removeItem(NEW_SIGNUP_FLAG);
    return false;
  }

  const capturedAt = parseValidHandoffCapturedAt(
    typeof parsed.capturedAt === "string" ? parsed.capturedAt : undefined,
  );
  const slug = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
  if (!capturedAt || !slug) {
    storage.removeItem(NEW_SIGNUP_FLAG);
    return false;
  }

  const expected = expectedSlug?.trim();
  if (!expected || expected !== slug) {
    // Stale / corrupt already handled; keep a still-valid different slug.
    return false;
  }

  storage.removeItem(NEW_SIGNUP_FLAG);
  return true;
}

/** Drop a lingering new-signup flag (e.g. post-login landed elsewhere). */
export function clearClassActionNewSignupFlag(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  storage.removeItem(NEW_SIGNUP_FLAG);
}

/**
 * Keep the new-signup flag only when post-login returns to a class-action page.
 * Call after resolving the post-login redirect destination.
 */
export function retainClassActionNewSignupForRedirect(
  redirectPath: string | null | undefined,
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  if (!redirectPath || !extractClassActionSlugFromPath(redirectPath)) {
    clearClassActionNewSignupFlag(storage);
  }
}
