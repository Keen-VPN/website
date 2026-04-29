import { useMemo } from "react";
import { detectDevice } from "@/lib/device-detection";
import { APP_STORE_URLS } from "@/constants/app-store-urls";

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function useAppStoreUrl(): string {
  return useMemo(() => {
    const device = detectDevice();
    let appStoreUrl: string;

    switch (device) {
      case "ios":
        appStoreUrl = APP_STORE_URLS.ios;
        break;
      case "macos":
        appStoreUrl = APP_STORE_URLS.macos;
        break;
      case "android":
        appStoreUrl = APP_STORE_URLS.android;
        break;
      default:
        appStoreUrl = APP_STORE_URLS.fallback;
    }

    return isHttpUrl(appStoreUrl) ? appStoreUrl : APP_STORE_URLS.fallback;
  }, []);
}
