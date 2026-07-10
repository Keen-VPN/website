import { appendStoredUtmsToDeepLink } from "@/lib/utm-attribution";
import {
  APP_STORE_URLS,
  isAppleAppStoreUrl,
  toNativeAppStoreSchemeUrl,
} from "@/constants/app-store-urls";
import { detectDevice } from "@/lib/device-detection";

/**
 * KeenVPN native app deep links (iOS + macOS only).
 * Registered schemes: vpnkeen, keenvpn (iOS). Prefer vpnkeen for web → app handoff.
 */
export const KEENVPN_URL_SCHEME = "vpnkeen";

/** Post-Stripe checkout — app refreshes subscription status on open. */
export const PAYMENT_SUCCESS_DEEP_LINK = `${KEENVPN_URL_SCHEME}://success`;

/** Generic handoff from web (Header/Hero/Account) — foreground app without checkout UI. */
export const OPEN_APP_DEEP_LINK = `${KEENVPN_URL_SCHEME}://open`;

/** Checkout abandoned — app dismisses in-app checkout state. */
export const PAYMENT_CANCEL_DEEP_LINK = `${KEENVPN_URL_SCHEME}://cancel`;

/** ASWebAuthenticationSession / magic link return (token in query). */
export const AUTH_DEEP_LINK_PREFIX = `${KEENVPN_URL_SCHEME}://auth`;

export const RETURN_TO_APP_LABEL = "Return to KeenVPN App";

const ASWEB_AUTH_AUTO_OPEN_DONE_KEY = "keenvpn_asweb_auth_auto_open_done";

const STRIPE_CHECKOUT_RETURN_KEY = "keenvpn_stripe_checkout_return";
const STRIPE_AUTO_OPEN_DONE_KEY = "keenvpn_stripe_auto_open_done";
const STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY =
  "keenvpn_stripe_post_checkout_ui_dismissed";

function readStripeCheckoutReturnId(): string | null {
  try {
    return sessionStorage.getItem(STRIPE_CHECKOUT_RETURN_KEY);
  } catch {
    return null;
  }
}

/** Stripe redirects to `/account?session_id=…` after checkout. */
export function markStripeCheckoutReturn(sessionId?: string | null): void {
  try {
    sessionStorage.setItem(
      STRIPE_CHECKOUT_RETURN_KEY,
      sessionId?.trim() || "1",
    );
  } catch {
    /* private mode / blocked storage */
  }
}

export function isStripeCheckoutReturn(): boolean {
  return Boolean(readStripeCheckoutReturnId());
}

/** True only once per checkout return (survives leaving and revisiting /account). */
export function shouldAutoOpenAppAfterStripeCheckout(): boolean {
  const returnId = readStripeCheckoutReturnId();
  if (!returnId) {
    return false;
  }
  try {
    return sessionStorage.getItem(STRIPE_AUTO_OPEN_DONE_KEY) !== returnId;
  } catch {
    return false;
  }
}

/** Prevents repeat programmatic open; does not hide the post-checkout banner. */
export function markStripeAutoOpenDone(): void {
  const returnId = readStripeCheckoutReturnId();
  if (!returnId) {
    return;
  }
  try {
    sessionStorage.setItem(STRIPE_AUTO_OPEN_DONE_KEY, returnId);
  } catch {
    /* ignore */
  }
}

/** Show "Payment complete" / return-to-app UI only until dismissed or user leaves /account. */
export function shouldShowStripePostCheckoutUi(): boolean {
  const returnId = readStripeCheckoutReturnId();
  if (!returnId) {
    return false;
  }
  try {
    return (
      sessionStorage.getItem(STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY) !== returnId
    );
  } catch {
    return false;
  }
}

/**
 * Hides post-checkout banner/CTAs for this checkout without removing return markers.
 * Prefer this on "Return to App" so auto-open state stays consistent; use
 * {@link clearStripeCheckoutReturn} only on sign-out or when abandoning the flow entirely.
 */
export function dismissStripePostCheckoutUi(): void {
  const returnId = readStripeCheckoutReturnId();
  if (!returnId) {
    return;
  }
  try {
    sessionStorage.setItem(STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY, returnId);
  } catch {
    /* ignore */
  }
}

/** Removes all Stripe checkout return session keys (logout, signed-out /account). */
export function clearStripeCheckoutReturn(): void {
  try {
    sessionStorage.removeItem(STRIPE_CHECKOUT_RETURN_KEY);
    sessionStorage.removeItem(STRIPE_AUTO_OPEN_DONE_KEY);
    sessionStorage.removeItem(STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

function resolveAppStoreDownloadUrl(downloadPageUrl?: string): string {
  const device = detectDevice();
  if (downloadPageUrl && isAppleAppStoreUrl(downloadPageUrl)) {
    return downloadPageUrl;
  }
  if (device === "ios") return APP_STORE_URLS.ios;
  if (device === "macos") return APP_STORE_URLS.macos;
  if (downloadPageUrl && /^https?:\/\//i.test(downloadPageUrl)) {
    return downloadPageUrl;
  }
  return APP_STORE_URLS.fallback;
}

/** Opens the platform App Store page — never uses vpnkeen:// custom schemes. */
export function openKeenVpnAppStore(downloadPageUrl?: string): void {
  const webUrl = resolveAppStoreDownloadUrl(downloadPageUrl);
  const url = toNativeAppStoreSchemeUrl(webUrl);

  // Native store schemes open the App Store app; https links stay in the browser.
  if (/^(macappstore|itms-apps):/i.test(url)) {
    window.location.assign(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/** @deprecated Use {@link openKeenVpnAppStore} */
export const openKeenVpnDownloadPage = openKeenVpnAppStore;

/**
 * Programmatic handoff to the native KeenVPN app via custom URL scheme.
 * Only allowed when {@link isNativeAppWebSession} — otherwise opens the App Store.
 */
export function openKeenVpnNativeApp(
  deepLink: string = PAYMENT_SUCCESS_DEEP_LINK,
  downloadPageUrl?: string,
): void {
  if (!isNativeAppWebSession()) {
    openKeenVpnAppStore(downloadPageUrl);
    return;
  }

  const resolvedDeepLink = appendStoredUtmsToDeepLink(deepLink);

  try {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = resolvedDeepLink;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 500);
  } catch {
    /* ignore */
  }

  const anchor = document.createElement("a");
  anchor.href = resolvedDeepLink;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 100);
}

/** Build auth callback URL with a URL-encoded session token. */
export function buildAuthDeepLink(sessionToken: string): string {
  return `${AUTH_DEEP_LINK_PREFIX}?token=${encodeURIComponent(sessionToken)}`;
}

/**
 * Deep link for return-to-app handoffs. Only call when {@link isNativeAppWebSession}.
 * Attaches session token when available so the native app can sign in.
 */
export function resolveNativeAppHandoffDeepLink(
  sessionToken: string | null | undefined,
  fallback: string = OPEN_APP_DEEP_LINK,
): string {
  const token = sessionToken?.trim();
  return token ? buildAuthDeepLink(token) : fallback;
}

/**
 * Return to the native app after Stripe checkout. Does not hide post-checkout UI;
 * callers should dismiss explicitly (e.g. "Continue on web") so users can retry the deep link.
 */
export function returnToKeenVpnAppAfterPayment(
  sessionToken?: string | null,
  downloadPageUrl?: string,
): void {
  openKeenVpnNativeApp(
    resolveNativeAppHandoffDeepLink(sessionToken, PAYMENT_SUCCESS_DEEP_LINK),
    downloadPageUrl,
  );
}

/**
 * True when this browser tab was opened from the native KeenVPN app
 * (ASWebAuthenticationSession / in-app browser with `?asweb=1`).
 */
export function isNativeAppWebSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return (
      urlParams.get("asweb") === "1" ||
      sessionStorage.getItem("asweb_session") === "1"
    );
  } catch {
    return false;
  }
}

/** @deprecated Use {@link isNativeAppWebSession} */
export const isAsWebAuthSession = isNativeAppWebSession;

/** Prevent duplicate programmatic auth handoffs for the same session token. */
export function shouldAutoOpenAppAfterAsWebAuth(sessionToken: string): boolean {
  if (!sessionToken) {
    return false;
  }
  try {
    return (
      sessionStorage.getItem(ASWEB_AUTH_AUTO_OPEN_DONE_KEY) !== sessionToken
    );
  } catch {
    return false;
  }
}

export function markAsWebAuthAutoOpenDone(sessionToken: string): void {
  if (!sessionToken) {
    return;
  }
  try {
    sessionStorage.setItem(ASWEB_AUTH_AUTO_OPEN_DONE_KEY, sessionToken);
  } catch {
    /* ignore */
  }
}

/** Hand off session token to the native app after ASWeb Google login. */
export function returnToKeenVpnAppAfterAuth(
  sessionToken: string,
  downloadPageUrl?: string,
): void {
  openKeenVpnNativeApp(buildAuthDeepLink(sessionToken), downloadPageUrl);
}

/**
 * Auto-return to KeenVPN after web OAuth when opened from ASWebAuthenticationSession.
 * Returns true when a handoff was attempted.
 */
export function maybeAutoReturnToKeenVpnAppAfterAuth(
  sessionToken: string,
): boolean {
  if (!sessionToken || !isNativeAppWebSession()) {
    return false;
  }
  if (!shouldAutoOpenAppAfterAsWebAuth(sessionToken)) {
    return false;
  }
  markAsWebAuthAutoOpenDone(sessionToken);
  returnToKeenVpnAppAfterAuth(sessionToken);
  return true;
}
