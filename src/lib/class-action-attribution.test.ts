import { describe, expect, it } from "vitest";
import {
  captureClassActionAttributionFromRedirect,
  consumeClassActionAttribution,
  consumeClassActionNewSignupFlag,
  extractClassActionSlugFromPath,
  markClassActionNewSignup,
  peekClassActionAttribution,
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

  it("ignores non class-action redirects", () => {
    const storage = memoryStorage();
    captureClassActionAttributionFromRedirect("/perks", storage);
    expect(peekClassActionAttribution(storage)).toBeNull();
  });

  it("tracks new-signup flag separately", () => {
    const storage = memoryStorage();
    expect(consumeClassActionNewSignupFlag(storage)).toBe(false);
    markClassActionNewSignup(storage);
    expect(consumeClassActionNewSignupFlag(storage)).toBe(true);
    expect(consumeClassActionNewSignupFlag(storage)).toBe(false);
  });
});
