import { describe, expect, it } from "vitest";
import { resolveOpenAppLandingContent } from "./open-app-landing";

describe("resolveOpenAppLandingContent", () => {
  it("returns New Zealand server copy for the email CTA location", () => {
    expect(resolveOpenAppLandingContent("new-zealand")).toEqual({
      eyebrow: "New server available",
      title: "Connect through New Zealand",
      description:
        "Our Auckland VPN server is now available in the KeenVPN app.",
      instruction:
        "Open KeenVPN, refresh your server list, and select New Zealand to connect.",
    });
  });

  it("also resolves the canonical server catalogue id", () => {
    expect(resolveOpenAppLandingContent("nz-auckland").title).toBe(
      "Connect through New Zealand",
    );
  });

  it("resolves a server catalogue alias", () => {
    expect(resolveOpenAppLandingContent("new-jersey")).toEqual({
      eyebrow: "New server available",
      title: "Connect through United States",
      description:
        "Our Secaucus VPN server is now available in the KeenVPN app.",
      instruction:
        "Open KeenVPN, refresh your server list, and select United States to connect.",
    });
  });

  it("falls back to generic app-opening copy for unknown locations", () => {
    expect(resolveOpenAppLandingContent("unknown")).toEqual({
      eyebrow: "KeenVPN",
      title: "Open KeenVPN",
      description: "Continue in the KeenVPN app to connect securely.",
      instruction: "Choose a server in the app and connect.",
    });
  });
});
