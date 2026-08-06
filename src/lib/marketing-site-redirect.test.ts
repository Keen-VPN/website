import { describe, expect, it } from "vitest";
import { resolveMarketingRedirectUrl } from "./marketing-site-redirect";

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
