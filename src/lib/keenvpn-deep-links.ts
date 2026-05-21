/**
 * KeenVPN native app deep links (iOS + macOS only).
 * Registered schemes: vpnkeen, keenvpn (iOS). Prefer vpnkeen for web → app handoff.
 */
export const KEENVPN_URL_SCHEME = "vpnkeen";

/** Post-Stripe checkout — app refreshes subscription status on open. */
export const PAYMENT_SUCCESS_DEEP_LINK = `${KEENVPN_URL_SCHEME}://success`;

/** Checkout abandoned — app dismisses in-app checkout state. */
export const PAYMENT_CANCEL_DEEP_LINK = `${KEENVPN_URL_SCHEME}://cancel`;

/** ASWebAuthenticationSession / magic link return (token in query). */
export const AUTH_DEEP_LINK_PREFIX = `${KEENVPN_URL_SCHEME}://auth`;

export const RETURN_TO_APP_LABEL = "Return to KeenVPN App";

const STRIPE_CHECKOUT_RETURN_KEY = "keenvpn_stripe_checkout_return";
const STRIPE_AUTO_OPEN_DONE_KEY = "keenvpn_stripe_auto_open_done";
const STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY = "keenvpn_stripe_post_checkout_ui_dismissed";

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
    sessionStorage.setItem(STRIPE_CHECKOUT_RETURN_KEY, sessionId?.trim() || "1");
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
    return sessionStorage.getItem(STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY) !== returnId;
  } catch {
    return false;
  }
}

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

export function clearStripeCheckoutReturn(): void {
  try {
    sessionStorage.removeItem(STRIPE_CHECKOUT_RETURN_KEY);
    sessionStorage.removeItem(STRIPE_AUTO_OPEN_DONE_KEY);
    sessionStorage.removeItem(STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

/** Programmatic handoff to the native app (same pattern as export download anchor). */
export function openKeenVpnNativeApp(deepLink: string = PAYMENT_SUCCESS_DEEP_LINK): void {
  // Hidden iframe improves handoff when the page is inside ASWebAuthenticationSession.
  try {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = deepLink;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 500);
  } catch {
    /* ignore */
  }

  const anchor = document.createElement("a");
  anchor.href = deepLink;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 100);
}

/**
 * Return to the native app after Stripe checkout without tearing down the account UI first.
 * Dismisses post-checkout chrome only after a short delay so the browser sheet can close.
 */
export function returnToKeenVpnAppAfterPayment(
  onDismissUi?: () => void,
  deepLink: string = PAYMENT_SUCCESS_DEEP_LINK,
): void {
  openKeenVpnNativeApp(deepLink);
  if (onDismissUi) {
    window.setTimeout(onDismissUi, 1200);
  }
}
