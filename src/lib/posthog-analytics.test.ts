import { beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test_key");
    vi.stubEnv("VITE_POSTHOG_ENABLE_DEV", "true");
    sessionStorage.clear();
    capture.mockClear();
    identify.mockClear();
    init.mockClear();
    register.mockClear();
    optOut.mockClear();
    reset.mockClear();
  });

  it("initializes PostHog when configured", async () => {
    const analytics = await import("./posthog-analytics");
    expect(analytics.initializePostHog()).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("deduplicates account_created events", async () => {
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
  });

  it("marks internal email domains and opts out", async () => {
    const analytics = await import("./posthog-analytics");
    analytics.initializePostHog();
    analytics.markInternalTraffic("dev@keenvpn.com");

    expect(register).toHaveBeenCalledWith({ is_internal: true });
    expect(optOut).toHaveBeenCalled();
  });

  it("resolves staging hostnames", async () => {
    const analytics = await import("./posthog-analytics");
    vi.stubGlobal("window", {
      location: { hostname: "staging-portal.vpnkeen.com" },
    } as Window & typeof globalThis);

    expect(analytics.resolveKeenEnvironment()).toBe("staging");
  });
});
