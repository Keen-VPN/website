import type { DeviceType } from "@/lib/device-detection";
import { detectDevice } from "@/lib/device-detection";

// App Store URLs - Update these with your actual app store links
export const APP_STORE_URLS = {
  ios: "https://apps.apple.com/us/app/keenvpn-secure-vpn/id6753761859",
  macos: "https://apps.apple.com/us/app/keenvpn-secure-vpn/id6751677565",
  android:
    "https://play.google.com/store/apps/details?id=com.keenvpnapp.app",
  windows: "https://vpnkeen.com",
  fallback: "https://vpnkeen.com",
} as const;

const APPLE_APP_STORE_HOST = /apps\.apple\.com/i;

/** Opens the native App Store app on Apple platforms instead of the web storefront. */
export function toNativeAppStoreSchemeUrl(
  url: string,
  device: DeviceType = detectDevice(),
): string {
  if (!/^https:\/\/apps\.apple\.com\//i.test(url)) {
    return url;
  }
  if (device === "macos") {
    return url.replace(/^https:\/\//i, "macappstore://");
  }
  if (device === "ios") {
    return url.replace(/^https:\/\//i, "itms-apps://");
  }
  return url;
}

export function isAppleAppStoreUrl(url: string): boolean {
  return APPLE_APP_STORE_HOST.test(url);
}
