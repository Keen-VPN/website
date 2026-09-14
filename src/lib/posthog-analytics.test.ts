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

  it("initializes PostHog when configured with before_send sanitizer", async () => {
    const analytics = await import("./posthog-analytics");
    expect(analytics.initializePostHog()).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        before_send: analytics.sanitizeCaptureResult,
      }),
    );
  });

  it("opts out during init for staff email before recording starts", async () => {
    const analytics = await import("./posthog-analytics");
    analytics.initializePostHog({ email: "dev@keenvpn.com" });
    expect(optOut).toHaveBeenCalled();
    expect(init.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        disable_session_recording: true,
      }),
    );
    expect(localStorage.getItem("keen_posthog_internal_persist")).toBe("1");
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

  it("skips signup_started for returning/authenticated browsers", async () => {
    localStorage.setItem("keen_posthog_identified", "1");
    const analytics = await import("./posthog-analytics");
    analytics.trackPostHogSignupStarted();
    expect(capture).not.toHaveBeenCalled();
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
      "/auth/callback/abc%2Fdef%2Fghi%3D0123456789abcdef0123456789abcdef",
      "",
      "https://portal.vpnkeen.com",
    );
    expect(percentEncoded.path).toContain("[redacted]");
    expect(percentEncoded.path).not.toContain("%2F");
    expect(
      analytics.looksLikeOpaqueCredential(
        "abc%2Fdef%2Fghi%3D0123456789abcdef0123456789abcdef",
      ),
    ).toBe(true);
  });

  it("sanitizes auto-attached URL properties via before_send", async () => {
    const analytics = await import("./posthog-analytics");
    const event = analytics.sanitizeCaptureResult({
      event: "website_visit",
      properties: {
        $current_url:
          "https://portal.vpnkeen.com/auth/magic/verify/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig?token=secret",
        $pathname:
          "/auth/magic/verify/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig",
        $host: "portal.vpnkeen.com",
      },
    });

    expect(event?.properties?.$current_url).toContain("[redacted]");
    expect(String(event?.properties?.$current_url)).not.toContain("secret");
    expect(event?.properties?.$pathname).toBe(
      "/auth/magic/verify/[redacted]",
    );
    expect(event?.properties?.$host).toBe("portal.vpnkeen.com");
  });

  it("does not inject page location into $set person properties", async () => {
    const analytics = await import("./posthog-analytics");
    const event = analytics.sanitizeCaptureResult({
      event: "$identify",
      properties: {},
      $set: { auth_provider: "google" },
    });

    expect(event?.$set).toEqual({ auth_provider: "google" });
    expect(event?.$set).not.toHaveProperty("$current_url");
    expect(event?.$set).not.toHaveProperty("$pathname");
  });

  it("opts out staff learned after init without recursing", async () => {
    const analytics = await import("./posthog-analytics");
    expect(analytics.initializePostHog()).toBe(true);
    expect(() =>
      analytics.initializePostHog({ email: "dev@keenvpn.com" }),
    ).not.toThrow();
    expect(optOut).toHaveBeenCalled();
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
