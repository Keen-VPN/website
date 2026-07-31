import { beforeEach, describe, expect, it, vi } from "vitest";

describe("reddit analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_REDDIT_PIXEL_ID", "pixel-123");
    document.head.innerHTML = "";
    sessionStorage.clear();
    delete window.rdt;
  });

  it("loads the Pixel once and emits a signup conversion id", async () => {
    const analytics = await import("./reddit-analytics");
    analytics.trackRedditSignupCompleted("user-1");
    analytics.trackRedditSignupCompleted("user-1");

    expect(document.querySelectorAll("#reddit-pixel-script")).toHaveLength(1);
    expect(window.rdt?.callQueue).toEqual([
      ["init", "pixel-123"],
      ["track", "SignUp", { conversionId: "signup:user-1" }],
    ]);
  });
});
