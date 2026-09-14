import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const identify = vi.fn();
const init = vi.fn();
const register = vi.fn();
const optOut = vi.fn();
const reset = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init,
    capture,
    identify,
    register,
    opt_out_capturing: optOut,
    reset,
  },
}));

describe("posthog analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test_key");
    vi.stubEnv("VITE_POSTHOG_ENABLE_DEV", "true");
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, "", "/");
    capture.mockClear();
    identify.mockClear();
    init.mockClear();
    register.mockClear();
    optOut.mockClear();
    reset.mockClear();
    init.mockImplementation((_key: string, options?: { loaded?: (client: unknown) => void }) => {
      options?.loaded?.({
        register,
        opt_out_capturing: optOut,
      });
    });
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not initialize when PostHog key is unset", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "");
    const analytics = await import("./posthog-analytics");
    expect(analytics.isPostHogConfigured()).toBe(false);
    expect(analytics.initializePostHog()).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes PostHog when configured", async () => {
    const analytics = await import("./posthog-analytics");
    expect(analytics.initializePostHog()).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("opts out during init when ph_internal=1", async () => {
    window.history.pushState({}, "", "/?ph_internal=1");
    try {
      const analytics = await import("./posthog-analytics");
      analytics.initializePostHog();
      expect(optOut).toHaveBeenCalled();
      expect(localStorage.getItem("keen_posthog_internal_persist")).toBe("1");
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("deduplicates account_created events persistently", async () => {
    const analytics = await import("./posthog-analytics");
    analytics.trackPostHogAccountCreated("user-1");
    analytics.trackPostHogAccountCreated("user-1");

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      "user_account_created",
      expect.objectContaining({ user_id: "user-1" }),
    );
    expect(identify).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ keen_environment: expect.any(String) }),
    );
    expect(analytics.hadIdentifiedPostHogUser()).toBe(true);
  });

  it("marks internal email domains and opts out", async () => {
    const analytics = await import("./posthog-analytics");
    analytics.initializePostHog();
    analytics.markInternalTraffic("dev@keenvpn.com");

    expect(register).toHaveBeenCalledWith({ is_internal: true });
    expect(optOut).toHaveBeenCalled();
    expect(localStorage.getItem("keen_posthog_internal_persist")).toBe("1");
  });

  it("redacts credential-bearing URLs before pageview capture", async () => {
    const analytics = await import("./posthog-analytics");
    const sanitized = analytics.sanitizeAnalyticsLocation(
      "/auth/magic/verify/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
      "?token=secret-value&utm_source=test",
      "https://portal.vpnkeen.com",
    );

    expect(sanitized.path).toContain("[redacted]");
    expect(sanitized.path).toContain("utm_source=test");
    expect(sanitized.path).not.toContain("secret-value");
    expect(sanitized.path).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(sanitized.url).not.toContain("secret-value");

    const percentEncoded = analytics.sanitizeAnalyticsLocation(
      "/auth/callback/abc%2Bdef%2Fghi%3D0123456789abcdef0123456789abcdef",
      "",
      "https://portal.vpnkeen.com",
    );
    expect(percentEncoded.path).toContain("[redacted]");
    expect(percentEncoded.path).not.toContain("%2B");
  });

  it("resolves staging hostnames without replacing window", async () => {
    const analytics = await import("./posthog-analytics");
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, hostname: "staging-portal.vpnkeen.com" },
    });

    try {
      expect(analytics.resolveKeenEnvironment()).toBe("staging");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });
});
