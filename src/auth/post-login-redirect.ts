export const POST_LOGIN_REDIRECT_PARAM = "redirect";
const STORAGE_KEY = "keenvpn_post_login_redirect";
const AUTH_REDIRECT_PENDING_KEY = "auth_redirect_pending";

const BLOCKED_PATH_PREFIXES = ["/signin", "/auth"];

export function sanitizePostLoginRedirect(
  raw: string,
  origin = "https://vpnkeen.com",
): string | null {
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://")) {
    return null;
  }

  try {
    const url = new URL(trimmed, origin);
    if (url.origin !== new URL(origin).origin) {
      return null;
    }

    const blocked = BLOCKED_PATH_PREFIXES.some(
      (prefix) =>
        url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
    if (blocked) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function clearPostLoginRedirect(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  storage.removeItem(STORAGE_KEY);
}

export function capturePostLoginRedirectFromSearch(
  search: string,
  storage: Pick<Storage, "setItem" | "removeItem" | "getItem"> = sessionStorage,
): void {
  const raw = new URLSearchParams(search).get(POST_LOGIN_REDIRECT_PARAM);
  if (!raw) {
    // Keep stored redirect during OAuth round-trips that drop query params.
    if (storage.getItem(AUTH_REDIRECT_PENDING_KEY) !== "true") {
      storage.removeItem(STORAGE_KEY);
    }
    return;
  }

  const safe = sanitizePostLoginRedirect(raw);
  if (safe) {
    storage.setItem(STORAGE_KEY, safe);
    return;
  }

  storage.removeItem(STORAGE_KEY);
}

export function consumePostLoginRedirect(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): string | null {
  const raw = storage.getItem(STORAGE_KEY);
  storage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  return sanitizePostLoginRedirect(raw);
}

export function buildSignInUrl(options?: {
  redirect?: string | null;
  asweb?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options?.asweb) {
    params.set("asweb", "1");
  }

  const safe = options?.redirect
    ? sanitizePostLoginRedirect(options.redirect)
    : null;
  if (safe) {
    params.set(POST_LOGIN_REDIRECT_PARAM, safe);
  }

  const query = params.toString();
  return query ? `/signin?${query}` : "/signin";
}
