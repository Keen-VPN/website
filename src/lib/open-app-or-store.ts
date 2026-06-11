import { getSessionToken } from "@/auth";
import type { SubscriptionData } from "@/auth/types";
import { detectDevice, isAppDeepLinkSupported } from "@/lib/device-detection";
import {
  openKeenVpnNativeApp,
  OPEN_APP_DEEP_LINK,
  resolveNativeAppHandoffDeepLink,
} from "@/lib/keenvpn-deep-links";
import { hasManageableSubscription } from "@/lib/subscription-cta";

export function resolveAppStoreUrl(appStoreUrl: string): string {
  return /^https?:\/\//i.test(appStoreUrl) ? appStoreUrl : "https://vpnkeen.com";
}

/** Label for buttons that always open the App Store (install flow), never a deep link. */
export function getAppStoreInstallButtonLabel(): string {
  const device = detectDevice();
  if (device === "ios") return "Download KeenVPN for iPhone";
  if (device === "macos") return "Download KeenVPN for Mac";
  return "Download KeenVPN App";
}

/** Paying subscribers on iOS/macOS: open the native app instead of the App Store. */
export function shouldOpenNativeAppFirst(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    hasManageableSubscription(subscription) && isAppDeepLinkSupported()
  );
}

/** If the tab stays visible after a deep link, assume the app is not installed. */
const APP_OPEN_FALLBACK_MS = 5000;

function resolveOpenAppDeepLink(sessionToken?: string | null): string {
  return resolveNativeAppHandoffDeepLink(
    sessionToken ?? getSessionToken(),
    OPEN_APP_DEEP_LINK,
  );
}

function openKeenVpnNativeAppWithAppStoreFallback(
  appStoreUrl: string,
  deepLink?: string,
): void {
  const link = deepLink ?? resolveOpenAppDeepLink();
  let didLeavePage = false;

  const markLeft = () => {
    didLeavePage = true;
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      markLeft();
    }
  };

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", markLeft);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", markLeft);

  openKeenVpnNativeApp(link);

  window.setTimeout(() => {
    cleanup();
    if (!didLeavePage) {
      window.open(resolveAppStoreUrl(appStoreUrl), "_blank", "noopener,noreferrer");
    }
  }, APP_OPEN_FALLBACK_MS);
}

export function openAppOrAppStore(
  subscription: SubscriptionData | null | undefined,
  appStoreUrl: string,
): void {
  const deepLink = resolveOpenAppDeepLink();

  if (shouldOpenNativeAppFirst(subscription)) {
    openKeenVpnNativeAppWithAppStoreFallback(appStoreUrl, deepLink);
    return;
  }

  // Logged-in on iOS/macOS: hand off session even when subscription is web-only / trial.
  if (getSessionToken() && isAppDeepLinkSupported()) {
    openKeenVpnNativeAppWithAppStoreFallback(appStoreUrl, deepLink);
    return;
  }

  window.open(resolveAppStoreUrl(appStoreUrl), "_blank", "noopener,noreferrer");
}

export function getAppDownloadButtonLabel(
  subscription: SubscriptionData | null | undefined,
): string {
  if (shouldOpenNativeAppFirst(subscription)) {
    const device = detectDevice();
    if (device === "ios") return "Open KeenVPN on iPhone";
    if (device === "macos") return "Open KeenVPN on Mac";
    return "Open KeenVPN App";
  }

  return getAppStoreInstallButtonLabel();
}
