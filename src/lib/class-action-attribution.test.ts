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
  it("extracts slug from redirect paths", () => {
    expect(
      extractClassActionSlugFromPath(
        "/class-actions/sandoz-fougera-econazole-cream-settlement",
      ),
    ).toBe("sandoz-fougera-econazole-cream-settlement");
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

  it("tracks new-signup flag separately", () => {
    const storage = memoryStorage();
    expect(consumeClassActionNewSignupFlag(storage)).toBe(false);
    markClassActionNewSignup(storage);
    expect(consumeClassActionNewSignupFlag(storage)).toBe(true);
    expect(consumeClassActionNewSignupFlag(storage)).toBe(false);
  });
});
