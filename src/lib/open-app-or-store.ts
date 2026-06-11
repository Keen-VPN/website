import { getSessionToken } from "@/auth";
import type { SubscriptionData } from "@/auth/types";
import { detectDevice, isAppDeepLinkSupported } from "@/lib/device-detection";
import {
  isNativeAppWebSession,
  openKeenVpnAppStore,
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

/** True only when opened from the native app and a deep link is supported on this device. */
export function shouldOpenNativeAppFirst(
  subscription: SubscriptionData | null | undefined,
): boolean {
  return (
    isNativeAppWebSession() &&
    hasManageableSubscription(subscription) &&
    isAppDeepLinkSupported()
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
  const resolvedStoreUrl = resolveAppStoreUrl(appStoreUrl);
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

  openKeenVpnNativeApp(link, resolvedStoreUrl);

  window.setTimeout(() => {
    cleanup();
    if (!didLeavePage) {
      openKeenVpnAppStore(resolvedStoreUrl);
    }
  }, APP_OPEN_FALLBACK_MS);
}

/**
 * Opens the native app when this page was launched from the app; otherwise App Store / download.
 */
export function openAppOrAppStore(
  subscription: SubscriptionData | null | undefined,
  appStoreUrl: string,
): void {
  const storeUrl = resolveAppStoreUrl(appStoreUrl);

  if (!isNativeAppWebSession()) {
    openKeenVpnAppStore(storeUrl);
    return;
  }

  openKeenVpnNativeAppWithAppStoreFallback(
    appStoreUrl,
    resolveOpenAppDeepLink(),
  );
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
