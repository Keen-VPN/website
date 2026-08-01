import { beforeEach, describe, expect, it } from "vitest";
import {
  appendStoredUtmsToDeepLink,
  captureUtmFromSearch,
  clearUtmAttributionStorage,
  getUtmAttributionAuthPayload,
} from "./utm-attribution";

describe("Reddit first-touch attribution", () => {
  beforeEach(() => {
    clearUtmAttributionStorage();
    document.cookie = "_rdt_uuid=; Max-Age=0; Path=/";
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
        landing_path: "/auth/magic-link",
        landing_url: `${window.location.origin}/auth/magic-link`,
        reddit_uuid: "uuid-789",
      }),
    );
    expect(
      getUtmAttributionAuthPayload().utmAttribution?.landing_url,
    ).not.toContain("secret-token");
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
