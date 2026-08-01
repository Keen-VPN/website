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

  it("emits a deduplicated SignUp only for a backend-confirmed trial", async () => {
    const analytics = await import("./reddit-analytics");
    analytics.trackRedditConfirmedTrial("trial:user-1");
    analytics.trackRedditConfirmedTrial("trial:user-1");

    expect(window.rdt?.callQueue).toEqual([
      ["init", "pixel-123"],
      ["track", "SignUp", { conversionId: "trial:user-1" }],
    ]);
  });

  it("limits engaged content tracking to public campaign landing routes", async () => {
    const analytics = await import("./reddit-analytics");

    expect(analytics.isRedditEngagedContentPath("/")).toBe(true);
    expect(analytics.isRedditEngagedContentPath("/pricing")).toBe(true);
    expect(analytics.isRedditEngagedContentPath("/account")).toBe(false);
    expect(analytics.isRedditEngagedContentPath("/admin")).toBe(false);
    expect(analytics.isRedditEngagedContentPath("/payment-success")).toBe(
      false,
    );
  });
});
