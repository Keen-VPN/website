import { useMemo } from "react";
import { detectDevice } from "@/lib/device-detection";
import { APP_STORE_URLS } from "@/constants/app-store-urls";

export function useAppStoreUrl(): string {
  return useMemo(() => {
    const device = detectDevice();

    switch (device) {
      case "ios":
        return APP_STORE_URLS.ios;
      case "macos":
        return APP_STORE_URLS.macos;
      case "android":
        return APP_STORE_URLS.android;
      default:
        return APP_STORE_URLS.fallback;
    }
  }, []);
}
