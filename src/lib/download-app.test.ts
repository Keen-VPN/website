import { describe, expect, it } from "vitest";
import { APP_STORE_URLS } from "@/constants/app-store-urls";
import {
  appendCampaignParamsToStoreUrl,
  navigateUrlForStore,
  resolveDownloadAppDecision,
  storeUrlForPlatform,
  toAppDownloadPlatform,
} from "@/lib/download-app";

describe("download-app routing", () => {
  it("routes known devices to the matching store", () => {
    const ios = resolveDownloadAppDecision({
      detectedDevice: "ios",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      search: "?utm_source=sms",
    });
    expect(ios).toMatchObject({
      destinationPlatform: "ios",
      shouldAutoRedirect: true,
    });
    expect(ios.storeUrl).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(ios.storeUrl).toContain("utm_source=sms");
    expect(ios.navigateUrl).toMatch(/^itms-apps:\/\/apps\.apple\.com\//);
    expect(ios.navigateUrl).toContain("utm_source=sms");

    const macos = resolveDownloadAppDecision({
      detectedDevice: "macos",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
      search: "?utm_campaign=share",
    });
    expect(macos.destinationPlatform).toBe("macos");
    expect(macos.storeUrl).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(macos.storeUrl).toContain("utm_campaign=share");
    expect(macos.navigateUrl).toMatch(/^macappstore:\/\/apps\.apple\.com\//);
    expect(macos.navigateUrl).toContain("utm_campaign=share");

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
  });

  it("keeps HTTPS for cross-platform Apple overrides", () => {
    const decision = resolveDownloadAppDecision({
      detectedDevice: "windows",
      platformOverride: "ios",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      search: "?utm_source=sms",
    });
    expect(decision.storeUrl).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(decision.storeUrl).toContain("utm_source=sms");
    expect(decision.navigateUrl).toBe(decision.storeUrl);
    expect(decision.navigateUrl).not.toMatch(/^itms-apps:/);
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
      navigateUrl: null,
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
      navigateUrl: APP_STORE_URLS.android,
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

  it("only applies native Apple schemes on matching devices", () => {
    const httpsIos = `${APP_STORE_URLS.ios}?utm_source=sms`;
    expect(navigateUrlForStore(httpsIos, "ios", "ios")).toMatch(
      /^itms-apps:\/\/apps\.apple\.com\//,
    );
    expect(navigateUrlForStore(httpsIos, "ios", "windows")).toBe(httpsIos);
  });

  it("maps destinations to app download platforms", () => {
    expect(toAppDownloadPlatform("ios")).toBe("ios");
    expect(toAppDownloadPlatform("select")).toBe("unknown");
    expect(storeUrlForPlatform("chrome")).toBe(APP_STORE_URLS.chrome);
  });
});
