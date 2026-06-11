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

function createStorage() {
  const values = new Map<string, string>();
  return {
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

describe("post-login redirect storage", () => {
  it("captures and consumes a redirect from sign-in query params", () => {
    const storage = createStorage();

    capturePostLoginRedirectFromSearch("?redirect=%2Fperks", storage);
    expect(consumePostLoginRedirect(storage)).toBe("/perks");
    expect(consumePostLoginRedirect(storage)).toBeNull();
  });

  it("clears stale redirect when sign-in has no redirect param", () => {
    const storage = createStorage();
    storage.setItem("keenvpn_post_login_redirect", "/perks");

    capturePostLoginRedirectFromSearch("", storage);

    expect(storage.getItem("keenvpn_post_login_redirect")).toBeNull();
  });

  it("keeps stored redirect during oauth round-trips without query params", () => {
    const storage = createStorage();
    storage.setItem("keenvpn_post_login_redirect", "/perks");
    storage.setItem("auth_redirect_pending", "true");

    capturePostLoginRedirectFromSearch("", storage);

    expect(storage.getItem("keenvpn_post_login_redirect")).toBe("/perks");
  });

  it("clears redirect when query param is invalid", () => {
    const storage = createStorage();
    storage.setItem("keenvpn_post_login_redirect", "/perks");

    capturePostLoginRedirectFromSearch("?redirect=https%3A%2F%2Fevil.com", storage);

    expect(storage.getItem("keenvpn_post_login_redirect")).toBeNull();
  });
});

describe("buildSignInUrl", () => {
  it("includes redirect and asweb params when valid", () => {
    expect(buildSignInUrl({ redirect: "/perks", asweb: true })).toBe(
      "/signin?asweb=1&redirect=%2Fperks",
    );
  });
});
