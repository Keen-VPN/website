import { describe, expect, it, vi, afterEach } from "vitest";
import {
  captureClassActionAttributionFromRedirect,
  consumeClassActionAttribution,
  consumeClassActionNewSignupFlag,
  extractClassActionSlugFromPath,
  markClassActionNewSignup,
  peekClassActionAttribution,
  retainClassActionNewSignupForRedirect,
} from "./class-action-attribution";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  } as Storage;
}

describe("class-action-attribution", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts slug only from root /class-actions/:slug paths", () => {
    expect(
      extractClassActionSlugFromPath(
        "/class-actions/sandoz-fougera-econazole-cream-settlement",
      ),
    ).toBe("sandoz-fougera-econazole-cream-settlement");
    expect(
      extractClassActionSlugFromPath(
        "/class-actions/disney-youtube-tv-settlement?utm=1",
      ),
    ).toBe("disney-youtube-tv-settlement");
    expect(extractClassActionSlugFromPath("/class-actions/disney/")).toBe(
      "disney",
    );
    expect(extractClassActionSlugFromPath("/class-actions/my%20plan")).toBe(
      "my plan",
    );
    expect(
      extractClassActionSlugFromPath("/foo/class-actions/disney"),
    ).toBeNull();
    expect(extractClassActionSlugFromPath("/class-action/disney")).toBeNull();
    expect(
      extractClassActionSlugFromPath("/class-actions/disney/extra"),
    ).toBeNull();
  });

  it("captures and peeks attribution from post-login redirect", () => {
    const storage = memoryStorage();
    captureClassActionAttributionFromRedirect(
      "/class-actions/disney?utm=1",
      storage,
    );
    expect(peekClassActionAttribution(storage)?.slug).toBe("disney");
    expect(consumeClassActionAttribution(storage)?.slug).toBe("disney");
    expect(peekClassActionAttribution(storage)).toBeNull();
  });

  it("clears prior attribution when redirect is not a class-action path", () => {
    const storage = memoryStorage();
    captureClassActionAttributionFromRedirect("/class-actions/disney", storage);
    captureClassActionAttributionFromRedirect("/perks", storage);
    expect(peekClassActionAttribution(storage)).toBeNull();
  });

  it("returns null for corrupt attribution storage", () => {
    const storage = memoryStorage();
    storage.setItem("keenvpn_class_action_attribution", "{not-json");
    expect(peekClassActionAttribution(storage)).toBeNull();
    storage.setItem(
      "keenvpn_class_action_attribution",
      JSON.stringify({ path: "/class-actions/disney" }),
    );
    expect(peekClassActionAttribution(storage)).toBeNull();
  });

  it("expires stale attribution", () => {
    const storage = memoryStorage();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    storage.setItem(
      "keenvpn_class_action_attribution",
      JSON.stringify({
        path: "/class-actions/disney",
        slug: "disney",
        capturedAt: eightDaysAgo.toISOString(),
      }),
    );
    expect(consumeClassActionAttribution(storage)).toBeNull();
  });

  it("tracks new-signup flag scoped to slug", () => {
    const storage = memoryStorage();
    expect(consumeClassActionNewSignupFlag("disney", storage)).toBe(false);
    markClassActionNewSignup("disney", storage);
    expect(consumeClassActionNewSignupFlag("other", storage)).toBe(false);
    expect(consumeClassActionNewSignupFlag("disney", storage)).toBe(true);
    expect(consumeClassActionNewSignupFlag("disney", storage)).toBe(false);
  });

  it("clears new-signup flag when post-login redirect is not class-action", () => {
    const storage = memoryStorage();
    markClassActionNewSignup("disney", storage);
    retainClassActionNewSignupForRedirect("/dashboard", storage);
    expect(consumeClassActionNewSignupFlag("disney", storage)).toBe(false);
  });
});
