import type { SubscriptionData } from "@/auth/types";
import { detectDevice, isAppDeepLinkSupported } from "@/lib/device-detection";
import {
  openKeenVpnNativeApp,
  PAYMENT_SUCCESS_DEEP_LINK,
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

export function openAppOrAppStore(
  subscription: SubscriptionData | null | undefined,
  appStoreUrl: string,
): void {
  if (shouldOpenNativeAppFirst(subscription)) {
    openKeenVpnNativeApp(PAYMENT_SUCCESS_DEEP_LINK);
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
