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

export type DownloadAppDecision = {
  detectedPlatform: DeviceType | "bot" | "unknown";
  destinationPlatform: DownloadAppDestinationPlatform;
  /** Absolute store URL, or null when showing the selection page. */
  storeUrl: string | null;
  shouldAutoRedirect: boolean;
};

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
      shouldAutoRedirect: false,
    };
  }

  if (isDownloadAppStorePlatform(override)) {
    const raw = storeUrlForPlatform(override);
    const withNative = toNativeAppStoreSchemeUrl(raw, params.detectedDevice);
    return {
      detectedPlatform: params.detectedDevice,
      destinationPlatform: override,
      storeUrl: appendCampaignParamsToStoreUrl(withNative, search),
      shouldAutoRedirect: true,
    };
  }

  if (isLikelyBotUserAgent(params.userAgent)) {
    return {
      detectedPlatform: "bot",
      destinationPlatform: "select",
      storeUrl: null,
      shouldAutoRedirect: false,
    };
  }

  switch (params.detectedDevice) {
    case "ios":
    case "macos":
    case "android":
    case "windows": {
      const platform = params.detectedDevice;
      const raw = storeUrlForPlatform(platform);
      const withNative = toNativeAppStoreSchemeUrl(raw, platform);
      return {
        detectedPlatform: platform,
        destinationPlatform: platform,
        storeUrl: appendCampaignParamsToStoreUrl(withNative, search),
        shouldAutoRedirect: true,
      };
    }
    default:
      return {
        detectedPlatform:
          params.detectedDevice === "other" ? "unknown" : params.detectedDevice,
        destinationPlatform: "select",
        storeUrl: null,
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

export const DOWNLOAD_APP_PLATFORM_OPTIONS: Array<{
  id: DownloadAppStorePlatform;
  title: string;
  subtitle: string;
  cta: string;
}> = [
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
