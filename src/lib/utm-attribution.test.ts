import { beforeEach, describe, expect, it } from "vitest";
import {
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
});
