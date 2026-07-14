import { describe, expect, it } from "vitest";
import {
  STICKER_CAMPAIGN_TEMPLATES,
  buildStickerCampaignUrl,
  buildStickerUrlFromTemplate,
  isStickerUtmSource,
  stickerQrCodeImageUrl,
} from "./sticker-campaigns";

describe("sticker-campaigns", () => {
  it("builds launch sticker URL with required UTMs", () => {
    const url = buildStickerCampaignUrl({
      content: "defcon_2026",
      origin: "https://vpnkeen.com",
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://vpnkeen.com");
    expect(parsed.searchParams.get("utm_source")).toBe("sticker");
    expect(parsed.searchParams.get("utm_medium")).toBe("physical");
    expect(parsed.searchParams.get("utm_campaign")).toBe("launch_2026");
    expect(parsed.searchParams.get("utm_content")).toBe("defcon_2026");
  });

  it("builds template URLs for every predefined campaign", () => {
    for (const template of STICKER_CAMPAIGN_TEMPLATES) {
      const url = buildStickerUrlFromTemplate(template);
      const parsed = new URL(url);
      expect(parsed.searchParams.get("utm_source")).toBe("sticker");
      expect(parsed.searchParams.get("utm_content")).toBe(template.content);
    }
  });

  it("builds QR image URL encoding the landing link", () => {
    const landing = buildStickerCampaignUrl({ content: "generic" });
    const qr = stickerQrCodeImageUrl(landing, 200);
    expect(qr).toContain("create-qr-code");
    expect(qr).toContain(encodeURIComponent(landing));
  });

  it("detects sticker utm_source", () => {
    expect(isStickerUtmSource("sticker")).toBe(true);
    expect(isStickerUtmSource("Sticker")).toBe(true);
    expect(isStickerUtmSource("google")).toBe(false);
  });
  it("falls back to defaults for blank medium and campaign", () => {
    const url = buildStickerCampaignUrl({
      content: "generic",
      medium: "   ",
      campaign: "",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_medium")).toBe("physical");
    expect(parsed.searchParams.get("utm_campaign")).toBe("launch_2026");
  });

  it("ignores absolute landing paths", () => {
    const url = buildStickerCampaignUrl({
      landingPath: "https://evil.example/phish",
      content: "generic",
    });
    expect(url.startsWith("https://vpnkeen.com/")).toBe(true);
  });
});
