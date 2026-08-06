import { describe, expect, it } from "vitest";
import {
  resolveMarketingRedirectUrl,
  shouldReplaceWithMarketingUrl,
} from "./marketing-site-redirect";

describe("resolveMarketingRedirectUrl", () => {
  it("preserves the current query string and an unclaimed hash", () => {
    expect(
      resolveMarketingRedirectUrl(
        "/pricing.html",
        "?utm_source=test",
        "#plans",
      ),
    ).toBe("https://vpnkeen.com/pricing.html?utm_source=test#plans");
  });

  it("keeps the configured destination anchor", () => {
    expect(resolveMarketingRedirectUrl("/#faq", "", "#old-section")).toBe(
      "https://vpnkeen.com/#faq",
    );
  });
});

describe("shouldReplaceWithMarketingUrl", () => {
  it("prevents an exact same-document redirect loop", () => {
    expect(
      shouldReplaceWithMarketingUrl(
        "https://vpnkeen.com/",
        "https://vpnkeen.com/",
      ),
    ).toBe(false);
  });

  it("allows navigation to a different marketing document", () => {
    expect(
      shouldReplaceWithMarketingUrl(
        "https://vpnkeen.com/pricing.html",
        "https://portal.vpnkeen.com/pricing",
      ),
    ).toBe(true);
  });

  it("fails safely when either URL is malformed", () => {
    expect(shouldReplaceWithMarketingUrl("not-a-url", "also-not-a-url")).toBe(
      false,
    );
  });
});
