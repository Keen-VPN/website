import {
  APP_STORE_URLS,
  toNativeAppStoreSchemeUrl,
} from "@/constants/app-store-urls";
import type { DeviceType } from "@/lib/device-detection";
import { isLikelyBotUserAgent } from "@/lib/device-detection";
import type { AppDownloadPlatform } from "@/lib/posthog-analytics";

export type DownloadAppDestinationPlatform =
  | "ios"
  | "macos"
  | "android"
  | "windows"
  | "chrome"
  | "select";

export interface DownloadAppDecision {
  detectedPlatform: DeviceType | "bot" | "unknown";
  destinationPlatform: DownloadAppDestinationPlatform;
  /**
   * HTTPS store URL with campaign params (tracking + visible Continue link).
   * Null when showing the selection page.
   */
  storeUrl: string | null;
  /**
   * URL used for automatic/manual navigation. May use a native Apple scheme
   * when the visitor is already on that Apple platform; otherwise matches storeUrl.
   */
  navigateUrl: string | null;
  shouldAutoRedirect: boolean;
}

const STORE_PLATFORMS = [
  "ios",
  "macos",
  "android",
  "windows",
  "chrome",
] as const;

export type DownloadAppStorePlatform = (typeof STORE_PLATFORMS)[number];

const CAMPAIGN_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "rdt_cid",
] as const;

export function isDownloadAppStorePlatform(
  value: string | null | undefined,
): value is DownloadAppStorePlatform {
  return (
    typeof value === "string" &&
    (STORE_PLATFORMS as readonly string[]).includes(value)
  );
}

export function storeUrlForPlatform(
  platform: DownloadAppStorePlatform,
): string {
  return APP_STORE_URLS[platform];
}

/**
 * Append campaign/UTM params from the current page search onto a store URL
 * when the destination is an http(s) URL and the param is not already set.
 */
export function appendCampaignParamsToStoreUrl(
  destinationUrl: string,
  search: string,
): string {
  try {
    const url = new URL(destinationUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return destinationUrl;
    }
    const source = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    for (const key of CAMPAIGN_PARAM_KEYS) {
      const value = source.get(key)?.trim();
      if (!value || url.searchParams.has(key)) continue;
      url.searchParams.set(key, value.slice(0, 500));
    }
    return url.toString();
  } catch {
    return destinationUrl;
  }
}

/**
 * Prefer native Apple store schemes only when the visitor is already on that
 * platform. Cross-platform picks stay on HTTPS.
 */
export function navigateUrlForStore(
  httpsStoreUrl: string,
  storePlatform: DownloadAppStorePlatform,
  detectedDevice: DeviceType,
): string {
  if (
    (storePlatform === "ios" || storePlatform === "macos") &&
    storePlatform === detectedDevice
  ) {
    return toNativeAppStoreSchemeUrl(httpsStoreUrl, detectedDevice);
  }
  return httpsStoreUrl;
}

function decisionForStorePlatform(params: {
  detectedDevice: DeviceType;
  storePlatform: DownloadAppStorePlatform;
  search: string;
  shouldAutoRedirect: boolean;
}): DownloadAppDecision {
  const httpsUrl = appendCampaignParamsToStoreUrl(
    storeUrlForPlatform(params.storePlatform),
    params.search,
  );
  return {
    detectedPlatform: params.detectedDevice,
    destinationPlatform: params.storePlatform,
    storeUrl: httpsUrl,
    navigateUrl: navigateUrlForStore(
      httpsUrl,
      params.storePlatform,
      params.detectedDevice,
    ),
    shouldAutoRedirect: params.shouldAutoRedirect,
  };
}

export function resolveDownloadAppDecision(params: {
  detectedDevice: DeviceType;
  userAgent?: string;
  /** Explicit `?platform=` override from the URL. */
  platformOverride?: string | null;
  search?: string;
}): DownloadAppDecision {
  const search = params.search ?? "";
  const override = params.platformOverride?.trim().toLowerCase() ?? "";

  if (override === "select") {
    return {
      detectedPlatform: params.detectedDevice,
      destinationPlatform: "select",
      storeUrl: null,
      navigateUrl: null,
      shouldAutoRedirect: false,
    };
  }

  if (isDownloadAppStorePlatform(override)) {
    return decisionForStorePlatform({
      detectedDevice: params.detectedDevice,
      storePlatform: override,
      search,
      shouldAutoRedirect: true,
    });
  }

  if (isLikelyBotUserAgent(params.userAgent)) {
    return {
      detectedPlatform: "bot",
      destinationPlatform: "select",
      storeUrl: null,
      navigateUrl: null,
      shouldAutoRedirect: false,
    };
  }

  switch (params.detectedDevice) {
    case "ios":
    case "macos":
    case "android":
    case "windows":
      return decisionForStorePlatform({
        detectedDevice: params.detectedDevice,
        storePlatform: params.detectedDevice,
        search,
        shouldAutoRedirect: true,
      });
    default:
      return {
        detectedPlatform:
          params.detectedDevice === "other" ? "unknown" : params.detectedDevice,
        destinationPlatform: "select",
        storeUrl: null,
        navigateUrl: null,
        shouldAutoRedirect: false,
      };
  }
}

export function toAppDownloadPlatform(
  platform: DownloadAppDestinationPlatform,
): AppDownloadPlatform {
  if (platform === "select") return "unknown";
  return platform;
}

export const DOWNLOAD_APP_PLATFORM_OPTIONS: {
  id: DownloadAppStorePlatform;
  title: string;
  subtitle: string;
  cta: string;
}[] = [
  {
    id: "windows",
    title: "Windows",
    subtitle: "Microsoft Store",
    cta: "Get for Windows",
  },
  {
    id: "macos",
    title: "macOS",
    subtitle: "Mac App Store",
    cta: "Get for Mac",
  },
  {
    id: "ios",
    title: "iOS",
    subtitle: "iPhone & iPad · App Store",
    cta: "Get for iPhone",
  },
  {
    id: "android",
    title: "Android",
    subtitle: "Google Play",
    cta: "Get for Android",
  },
  {
    id: "chrome",
    title: "Chrome Extension",
    subtitle: "Chrome Web Store",
    cta: "Add to Chrome",
  },
];
