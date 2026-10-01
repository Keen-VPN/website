/**
 * Session attribution when a visitor reaches sign-in from a class-action page.
 * Survives OTP/OAuth so we can attribute signup → class-action view → claim.
 */

const STORAGE_KEY = "keenvpn_class_action_attribution";
const NEW_SIGNUP_FLAG = "keenvpn_class_action_new_signup";

export type ClassActionAttribution = {
  path: string;
  slug: string;
  capturedAt: string;
};

function parseAttribution(raw: string | null): ClassActionAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ClassActionAttribution>;
    if (
      typeof parsed.path === "string" &&
      typeof parsed.slug === "string" &&
      parsed.path.includes("/class-actions/")
    ) {
      return {
        path: parsed.path,
        slug: parsed.slug,
        capturedAt:
          typeof parsed.capturedAt === "string"
            ? parsed.capturedAt
            : new Date().toISOString(),
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

export function extractClassActionSlugFromPath(path: string): string | null {
  const match = path.match(/\/class-actions\/([^/?#]+)/);
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
  if (!redirectPath) return;
  const slug = extractClassActionSlugFromPath(redirectPath);
  if (!slug) return;
  const payload: ClassActionAttribution = {
    path: redirectPath,
    slug,
    capturedAt: new Date().toISOString(),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function peekClassActionAttribution(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): ClassActionAttribution | null {
  return parseAttribution(storage.getItem(STORAGE_KEY));
}

export function consumeClassActionAttribution(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): ClassActionAttribution | null {
  const value = parseAttribution(storage.getItem(STORAGE_KEY));
  storage.removeItem(STORAGE_KEY);
  return value;
}

/** Mark that the just-completed auth was a new signup from a class-action link. */
export function markClassActionNewSignup(
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  storage.setItem(NEW_SIGNUP_FLAG, "1");
}

export function consumeClassActionNewSignupFlag(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): boolean {
  const flagged = storage.getItem(NEW_SIGNUP_FLAG) === "1";
  storage.removeItem(NEW_SIGNUP_FLAG);
  return flagged;
}
