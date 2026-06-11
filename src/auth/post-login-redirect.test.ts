import { describe, expect, it } from "vitest";
import {
  buildSignInUrl,
  consumePostLoginRedirect,
  capturePostLoginRedirectFromSearch,
  sanitizePostLoginRedirect,
} from "./post-login-redirect";

describe("sanitizePostLoginRedirect", () => {
  it("allows internal paths", () => {
    expect(sanitizePostLoginRedirect("/perks")).toBe("/perks");
    expect(sanitizePostLoginRedirect("/account?tab=billing")).toBe(
      "/account?tab=billing",
    );
  });

  it("blocks external and auth-loop targets", () => {
    expect(sanitizePostLoginRedirect("https://evil.com/perks")).toBeNull();
    expect(sanitizePostLoginRedirect("//evil.com/perks")).toBeNull();
    expect(sanitizePostLoginRedirect("/signin")).toBeNull();
    expect(sanitizePostLoginRedirect("/auth/magic")).toBeNull();
  });
});

describe("post-login redirect storage", () => {
  it("captures and consumes a redirect from sign-in query params", () => {
    const storage = {
      _value: null as string | null,
      setItem(_key: string, value: string) {
        this._value = value;
      },
      getItem() {
        return this._value;
      },
      removeItem() {
        this._value = null;
      },
    };

    capturePostLoginRedirectFromSearch("?redirect=%2Fperks", storage);
    expect(consumePostLoginRedirect(storage)).toBe("/perks");
    expect(consumePostLoginRedirect(storage)).toBeNull();
  });
});

describe("buildSignInUrl", () => {
  it("includes redirect and asweb params when valid", () => {
    expect(buildSignInUrl({ redirect: "/perks", asweb: true })).toBe(
      "/signin?asweb=1&redirect=%2Fperks",
    );
  });
});
