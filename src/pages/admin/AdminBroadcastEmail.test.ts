import { describe, expect, it } from "vitest";
import { createDefaultAudienceTargeting } from "@/components/admin/audience-targeting.constants";
import { buildBroadcastComposePayload } from "@/pages/admin/broadcast-email-compose";

const baseInput = {
  audience: "all_deliverable" as const,
  category: "none" as const,
  profileTargeting: createDefaultAudienceTargeting(),
  emailCategory: "none",
  subject: "",
  headline: "",
  body: "",
  preheader: "",
  ctaLabel: "View perks",
  ctaUrl: "https://vpnkeen.com/perks",
};

describe("buildBroadcastComposePayload", () => {
  it("sends template only for membership transfer when copy is blank", () => {
    expect(
      buildBroadcastComposePayload({
        ...baseInput,
        template: "membership_transfer",
      }),
    ).toEqual({
      audience: "all_deliverable",
      profileTargeting: createDefaultAudienceTargeting(),
      template: "membership_transfer",
    });
  });

  it("keeps an optional subject override on the membership transfer template", () => {
    expect(
      buildBroadcastComposePayload({
        ...baseInput,
        template: "membership_transfer",
        subject: "  Transfer now  ",
        headline: "ignored",
        body: "ignored",
        ctaUrl: "https://example.com",
      }),
    ).toEqual({
      audience: "all_deliverable",
      profileTargeting: createDefaultAudienceTargeting(),
      template: "membership_transfer",
      subject: "Transfer now",
    });
  });

  it("still requires custom copy on a one-off broadcast", () => {
    expect(
      buildBroadcastComposePayload({
        ...baseInput,
        template: "custom",
        subject: "Perk drop",
        headline: "New cashback",
        body: "See perks.",
        preheader: "Inbox preview",
      }),
    ).toEqual({
      audience: "all_deliverable",
      profileTargeting: createDefaultAudienceTargeting(),
      subject: "Perk drop",
      headline: "New cashback",
      body: "See perks.",
      preheader: "Inbox preview",
      ctaLabel: "View perks",
      ctaUrl: "https://vpnkeen.com/perks",
    });
  });
});
