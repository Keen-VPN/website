import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendStoredUtmsToDeepLink,
  captureFirstLandingPage,
  captureFirstLandingFromSearch,
  captureUtmFromSearch,
  clearUtmAttributionStorage,
  getUtmAttributionAuthPayload,
} from "./utm-attribution";

const VALID_CAPTURED_AT = "2026-04-21T12:00:00.000Z";
const VALID_HANDOFF_SEARCH =
  "?landing_path=%2Fpricing.html&landing_url=https%3A%2F%2Fvpnkeen.com%2Fpricing.html&captured_at=2026-04-21T12%3A00%3A00.000Z&landing_sig=abc123def456";

describe("Reddit first-touch attribution", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(VALID_CAPTURED_AT));
    clearUtmAttributionStorage();
    document.cookie = "_rdt_uuid=; Max-Age=0; Path=/";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("captures rdt_cid even when the landing URL has no UTM tags", () => {
    captureUtmFromSearch("?rdt_cid=click-123", "/pricing");

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        reddit_click_id: "click-123",
        landing_path: "/pricing",
      }),
    );
  });

  it("adds Reddit's first-party UUID to the auth payload", () => {
    document.cookie = "_rdt_uuid=uuid-123; Path=/";

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({ reddit_uuid: "uuid-123" }),
    );
  });

  it("enriches stored attribution with Reddit's first-party UUID", () => {
    captureUtmFromSearch(
      "?utm_source=reddit&utm_campaign=summer&rdt_cid=click-456",
      "/pricing",
    );
    document.cookie = "_rdt_uuid=uuid-456; Path=/";

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        utm_source: "reddit",
        utm_campaign: "summer",
        reddit_click_id: "click-456",
        reddit_uuid: "uuid-456",
        landing_path: "/pricing",
      }),
    );
  });

  it("omits an invalid Reddit UUID cookie without interrupting auth", () => {
    document.cookie = "_rdt_uuid=%E0%A4%A; Path=/";

    expect(getUtmAttributionAuthPayload()).toEqual({});
  });

  it("does not include query credentials in Reddit-only attribution", () => {
    window.history.replaceState(
      {},
      "",
      "/auth/magic-link?token=secret-token&email=user%40example.com",
    );
    document.cookie = "_rdt_uuid=uuid-789; Path=/";

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        reddit_uuid: "uuid-789",
      }),
    );
    expect(
      getUtmAttributionAuthPayload().utmAttribution?.landing_path,
    ).toBeUndefined();
    expect(
      getUtmAttributionAuthPayload().utmAttribution?.landing_url,
    ).toBeUndefined();
  });

  it("captures the first attributable landing page without UTMs", () => {
    captureFirstLandingPage("/server-locations/brazil");
    window.history.replaceState({}, "", "/pricing");

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        landing_path: "/server-locations/brazil",
      }),
    );
  });

  it("accepts first landing forwarded from the marketing site", () => {
    captureFirstLandingFromSearch(VALID_HANDOFF_SEARCH);
    window.history.replaceState({}, "", "/signin");

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        landing_path: "/pricing.html",
        landing_url: "https://vpnkeen.com/pricing.html",
        landing_sig: "abc123def456",
        captured_at: VALID_CAPTURED_AT,
      }),
    );
  });

  it("preserves forwarded first landing when UTMs are captured on sign-in", () => {
    captureFirstLandingFromSearch(
      `${VALID_HANDOFF_SEARCH}&utm_source=reddit&utm_medium=paid_social`,
    );
    captureUtmFromSearch(
      "?utm_source=reddit&utm_medium=paid_social",
      "/signin",
    );

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        utm_source: "reddit",
        utm_medium: "paid_social",
        landing_path: "/pricing.html",
        landing_url: "https://vpnkeen.com/pricing.html",
        landing_sig: "abc123def456",
        captured_at: VALID_CAPTURED_AT,
      }),
    );
  });

  it("rejects forged marketing landing attribution from untrusted origins", () => {
    expect(
      captureFirstLandingFromSearch(
        "?landing_path=%2Fpricing.html&landing_url=https%3A%2F%2Fevil.example%2Fpricing.html&captured_at=2026-04-21T12%3A00%3A00.000Z&landing_sig=abc123",
      ),
    ).toBeNull();
    expect(getUtmAttributionAuthPayload()).toEqual({});
  });

  it("rejects forged landing attribution when landing_url does not match landing_path", () => {
    expect(
      captureFirstLandingFromSearch(
        "?landing_path=%2Fpricing.html&landing_url=https%3A%2F%2Fvpnkeen.com%2Fserver-locations%2Fbrazil&captured_at=2026-04-21T12%3A00%3A00.000Z&landing_sig=abc123",
      ),
    ).toBeNull();
  });

  it("rejects landing_path without a validated marketing landing_url", () => {
    expect(captureFirstLandingFromSearch("?landing_path=%2Fpricing.html")).toBeNull();
    expect(getUtmAttributionAuthPayload()).toEqual({});
  });

  it("rejects handoffs without a landing_sig parameter", () => {
    expect(
      captureFirstLandingFromSearch(
        "?landing_path=%2Fpricing.html&landing_url=https%3A%2F%2Fvpnkeen.com%2Fpricing.html&captured_at=2026-04-21T12%3A00%3A00.000Z",
      ),
    ).toBeNull();
    expect(getUtmAttributionAuthPayload()).toEqual({});
  });

  it("does not record an attributable page when a marketing handoff is rejected", () => {
    const search =
      "?landing_path=%2Fpricing.html&landing_url=https%3A%2F%2Fevil.example%2Fpricing.html&captured_at=2026-04-21T12%3A00%3A00.000Z&landing_sig=abc123";
    expect(captureFirstLandingFromSearch(search)).toBeNull();

    expect(getUtmAttributionAuthPayload()).toEqual({});
  });

  it("does not capture marketing redirect routes before handoff arrives", () => {
    expect(captureFirstLandingPage("/")).toBeNull();
    expect(captureFirstLandingPage("/pricing")).toBeNull();
  });

  it("rejects marketing handoff with malformed captured_at", () => {
    expect(
      captureFirstLandingFromSearch(
        "?landing_path=%2Fpricing.html&landing_url=https%3A%2F%2Fvpnkeen.com%2Fpricing.html&captured_at=not-a-date&landing_sig=abc123",
      ),
    ).toBeNull();
  });

  it("keeps long marketing landing URLs up to 2000 characters", () => {
    const longQuery = "x".repeat(1200);
    const landingUrl = `https://vpnkeen.com/pricing.html?${longQuery}`;
    captureFirstLandingFromSearch(
      `?landing_path=%2Fpricing.html&landing_url=${encodeURIComponent(landingUrl)}&captured_at=2026-04-21T12%3A00%3A00.000Z&landing_sig=abc123`,
    );

    expect(
      getUtmAttributionAuthPayload().utmAttribution?.landing_url,
    ).toBe(landingUrl);
  });

  it("does not capture auth or post-login routes as first landing pages", () => {
    expect(captureFirstLandingPage("/auth/magic")).toBeNull();
    expect(captureFirstLandingPage("/auth/verify-email")).toBeNull();
    expect(captureFirstLandingPage("/signin/magic")).toBeNull();
    expect(captureFirstLandingPage("/signup")).toBeNull();
    expect(captureFirstLandingPage("/dashboard")).toBeNull();

    captureFirstLandingPage("/server-locations/brazil");
    clearUtmAttributionStorage();
    expect(captureFirstLandingPage("/dashboard")).toBeNull();
    expect(getUtmAttributionAuthPayload()).toEqual({});
  });

  it("preserves the first landing page when later pages are visited", () => {
    captureFirstLandingPage("/blog/is-public-wifi-safe");
    captureFirstLandingPage("/pricing");
    captureFirstLandingPage("/signup");

    expect(getUtmAttributionAuthPayload().utmAttribution).toEqual(
      expect.objectContaining({
        landing_path: "/blog/is-public-wifi-safe",
      }),
    );
  });

  it("adds the current Reddit UUID cookie to a deep link with stored attribution", () => {
    captureUtmFromSearch(
      "?utm_source=reddit&rdt_cid=click-456",
      "/pricing",
    );
    document.cookie = "_rdt_uuid=uuid-deep-link; Path=/";

    const result = new URL(appendStoredUtmsToDeepLink("vpnkeen://open"));

    expect(result.searchParams.get("utm_source")).toBe("reddit");
    expect(result.searchParams.get("reddit_click_id")).toBe("click-456");
    expect(result.searchParams.get("reddit_uuid")).toBe("uuid-deep-link");
  });

  it("adds the current Reddit UUID cookie to a deep link without stored attribution", () => {
    document.cookie = "_rdt_uuid=uuid-only; Path=/";

    const result = new URL(appendStoredUtmsToDeepLink("vpnkeen://open"));

    expect(result.searchParams.get("reddit_uuid")).toBe("uuid-only");
  });
});
