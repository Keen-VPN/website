import { describe, expect, it } from "vitest";
import { APP_STORE_URLS } from "@/constants/app-store-urls";
import {
  appendCampaignParamsToStoreUrl,
  resolveDownloadAppDecision,
  storeUrlForPlatform,
  toAppDownloadPlatform,
} from "@/lib/download-app";

describe("download-app routing", () => {
  it("routes known devices to the matching store", () => {
    expect(
      resolveDownloadAppDecision({
        detectedDevice: "ios",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
    ).toMatchObject({
      destinationPlatform: "ios",
      shouldAutoRedirect: true,
      storeUrl: expect.stringContaining("apps.apple.com"),
    });

    expect(
      resolveDownloadAppDecision({
        detectedDevice: "android",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
      }).destinationPlatform,
    ).toBe("android");

    expect(
      resolveDownloadAppDecision({
        detectedDevice: "windows",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }).destinationPlatform,
    ).toBe("windows");

    expect(
      resolveDownloadAppDecision({
        detectedDevice: "macos",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
      }).destinationPlatform,
    ).toBe("macos");
  });

  it("shows selection for unknown devices and bots", () => {
    expect(
      resolveDownloadAppDecision({
        detectedDevice: "other",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      }),
    ).toMatchObject({
      destinationPlatform: "select",
      shouldAutoRedirect: false,
      storeUrl: null,
    });

    expect(
      resolveDownloadAppDecision({
        detectedDevice: "ios",
        userAgent: "Slackbot-LinkExpanding 1.0",
      }),
    ).toMatchObject({
      detectedPlatform: "bot",
      destinationPlatform: "select",
      shouldAutoRedirect: false,
    });
  });

  it("honors platform override and select force", () => {
    expect(
      resolveDownloadAppDecision({
        detectedDevice: "windows",
        platformOverride: "android",
        userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      }),
    ).toMatchObject({
      destinationPlatform: "android",
      shouldAutoRedirect: true,
      storeUrl: APP_STORE_URLS.android,
    });

    expect(
      resolveDownloadAppDecision({
        detectedDevice: "ios",
        platformOverride: "select",
      }),
    ).toMatchObject({
      destinationPlatform: "select",
      shouldAutoRedirect: false,
    });
  });

  it("preserves campaign params on http(s) store URLs", () => {
    const withParams = appendCampaignParamsToStoreUrl(
      APP_STORE_URLS.android,
      "?utm_source=sms&utm_campaign=share&rdt_cid=abc",
    );
    const url = new URL(withParams);
    expect(url.searchParams.get("utm_source")).toBe("sms");
    expect(url.searchParams.get("utm_campaign")).toBe("share");
    expect(url.searchParams.get("rdt_cid")).toBe("abc");
    expect(url.searchParams.get("id")).toBe("com.keenvpnapp.app");
  });

  it("does not overwrite existing destination params", () => {
    const withParams = appendCampaignParamsToStoreUrl(
      `${APP_STORE_URLS.windows}&utm_source=keep`,
      "?utm_source=sms",
    );
    expect(new URL(withParams).searchParams.get("utm_source")).toBe("keep");
  });

  it("maps destinations to app download platforms", () => {
    expect(toAppDownloadPlatform("ios")).toBe("ios");
    expect(toAppDownloadPlatform("select")).toBe("unknown");
    expect(storeUrlForPlatform("chrome")).toBe(APP_STORE_URLS.chrome);
  });
});
