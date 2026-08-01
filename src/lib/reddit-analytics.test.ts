import { beforeEach, describe, expect, it, vi } from "vitest";

describe("reddit analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_REDDIT_PIXEL_ID", "pixel-123");
    document.head.innerHTML = "";
    sessionStorage.clear();
    delete window.rdt;
  });

  it("loads the Pixel once and emits a deduplicated Lead conversion", async () => {
    const analytics = await import("./reddit-analytics");
    analytics.trackRedditLeadCompleted("user-1");
    analytics.trackRedditLeadCompleted("user-1");

    expect(document.querySelectorAll("#reddit-pixel-script")).toHaveLength(1);
    expect(window.rdt?.callQueue).toEqual([
      ["init", "pixel-123"],
      ["track", "Lead", { conversionId: "lead:user-1" }],
    ]);
  });

  it("uses Reddit's standard ViewContent event for engaged visits", async () => {
    const analytics = await import("./reddit-analytics");
    analytics.trackRedditLandingEngagement("/pricing");

    expect(window.rdt?.callQueue).toEqual([
      ["init", "pixel-123"],
      ["track", "ViewContent", undefined],
    ]);
  });
});
