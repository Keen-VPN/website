import { describe, expect, it } from "vitest";
import { buildPerksQuery, type PerkItem } from "@/auth/backend";
import {
  claimHost,
  displaySettlementTitle,
  filterSettlements,
  firstNonBlank,
  formatDaysLeft,
  formatSettlementDate,
  isClaimWindowClosed,
  isSubscribedToPerkOffers,
  parseClassActionFilter,
  resolveClaimActions,
  settlementClaimDeadline,
  settlementDaysRemaining,
  settlementInitials,
  settlementStats,
  sortSettlements,
} from "./class-action-settlements";

function perk(overrides: Partial<PerkItem>): PerkItem {
  return {
    id: "perk",
    title: "Settlement",
    partnerName: null,
    category: "class_action",
    description: "",
    imageUrl: null,
    offerText: "",
    redemptionType: "external_link",
    accessLevel: "free",
    isFeatured: false,
    accessible: true,
    redeemed: false,
    ctaLabel: "Claim",
    startsAt: null,
    endsAt: null,
    daysRemaining: null,
    userTab: "new",
    settlementStatus: "open",
    claimDeadline: null,
    docsNeeded: true,
    ...overrides,
  };
}

const rows = [
  perk({ id: "open-late", settlementStatus: "open", claimDeadline: "2026-11-14T00:00:00Z" }),
  perk({ id: "open-none", settlementStatus: "open", claimDeadline: null, docsNeeded: false }),
  perk({ id: "soon", settlementStatus: "closing_soon", claimDeadline: "2026-10-03T00:00:00Z", docsNeeded: false }),
  perk({ id: "closed-old", settlementStatus: "closed", claimDeadline: "2026-01-10T00:00:00Z", docsNeeded: false }),
  perk({ id: "closed-new", settlementStatus: "closed", claimDeadline: "2026-08-01T00:00:00Z" }),
];

const ids = (list: PerkItem[]) => list.map((row) => row.id);

describe("buildPerksQuery", () => {
  it("builds the class-action list query", () => {
    expect(buildPerksQuery({ category: "class_action", status: "all" })).toBe(
      "category=class_action&status=all",
    );
  });

  it("keeps the shared perks query unchanged", () => {
    expect(buildPerksQuery()).toBe("");
    expect(buildPerksQuery({ category: "finance", search: " a ", tab: "new" })).toBe(
      "category=finance&search=a&tab=new",
    );
  });

  it("serialises docsNeeded only when it is a boolean", () => {
    expect(buildPerksQuery({ docsNeeded: false })).toBe("docsNeeded=false");
    expect(buildPerksQuery({ docsNeeded: undefined })).toBe("");
  });
});

describe("filterSettlements", () => {
  it("All is open plus closing soon", () => {
    expect(ids(filterSettlements(rows, "all"))).toEqual(["open-late", "open-none", "soon"]);
  });

  it("Closing soon, no documents, and closed", () => {
    expect(ids(filterSettlements(rows, "closing_soon"))).toEqual(["soon"]);
    expect(ids(filterSettlements(rows, "no_docs"))).toEqual(["open-none", "soon"]);
    expect(ids(filterSettlements(rows, "closed"))).toEqual(["closed-old", "closed-new"]);
  });

  it("ignores endsAt and trusts settlementStatus", () => {
    const row = perk({ settlementStatus: "closed", endsAt: "2099-01-01T00:00:00Z" });
    expect(filterSettlements([row], "all")).toEqual([]);
  });
});

describe("sortSettlements", () => {
  it("sorts open rows by soonest deadline with nulls last", () => {
    expect(ids(sortSettlements(filterSettlements(rows, "all"), "all"))).toEqual([
      "soon",
      "open-late",
      "open-none",
    ]);
  });

  it("sorts by the same effective deadline the card displays", () => {
    const glance = {
      status: "open" as const,
      proof: "",
      paymentMethod: "",
      expectedPayout: "",
      daysRemaining: null,
    };
    const later = perk({ id: "later", claimDeadline: "2026-10-01T00:00:00Z" });
    const glanceSooner = {
      ...perk({ id: "glance", claimDeadline: "2026-12-01T00:00:00Z" }),
      atAGlance: { ...glance, claimBy: "2026-09-30T00:00:00Z" },
    };
    expect(ids(sortSettlements([later, glanceSooner], "all"))).toEqual(["glance", "later"]);
  });

  it("sorts closed rows newest first", () => {
    expect(ids(sortSettlements(filterSettlements(rows, "closed"), "closed"))).toEqual([
      "closed-new",
      "closed-old",
    ]);
  });
});

describe("settlementStats", () => {
  it("counts from the loaded list", () => {
    expect(settlementStats(rows)).toEqual({
      openNow: 3,
      closingSoon: 1,
      noDocumentsNeeded: 2,
      closed: 2,
    });
  });
});

describe("display helpers", () => {
  it("strips the analyst title prefix only", () => {
    expect(displaySettlementTitle("Class Action: Ridgeline Bank overdraft")).toBe(
      "Ridgeline Bank overdraft",
    );
    expect(displaySettlementTitle("Ridgeline Bank overdraft")).toBe("Ridgeline Bank overdraft");
    expect(displaySettlementTitle("Class Action: ")).toBe("Class Action: ");
  });

  it("formats dates and days left", () => {
    expect(formatSettlementDate("2026-09-28T00:00:00.000Z")).toBe("28 Sep 2026");
    expect(formatSettlementDate("2026-08-01T00:00:00.000Z")).toBe("1 Aug 2026");
    expect(formatSettlementDate(null)).toBeNull();
    expect(formatSettlementDate("")).toBeNull();
    expect(formatSettlementDate("nope")).toBeNull();
    expect(formatDaysLeft(13)).toBe("13 days left");
    expect(formatDaysLeft(1)).toBe("1 day left");
    expect(formatDaysLeft(0)).toBe("Closes today");
    expect(formatDaysLeft(null)).toBeNull();
  });

  it("reads the claim host from safe URLs only", () => {
    expect(claimHost("https://www.ridgelinefeesettlement.com/claim")).toBe(
      "ridgelinefeesettlement.com",
    );
    expect(claimHost("javascript:alert(1)")).toBeNull();
    expect(claimHost(null)).toBeNull();
  });

  it("parses the filter param", () => {
    expect(parseClassActionFilter("closed")).toBe("closed");
    expect(parseClassActionFilter("bogus")).toBe("all");
    expect(parseClassActionFilter(null)).toBe("all");
  });
});

describe("resolveClaimActions", () => {
  const cta = { primary: "File claim", secondary: null, primaryDisabled: false };

  it("allows claiming an open settlement with a safe URL", () => {
    expect(
      resolveClaimActions({ settlementStatus: "open", claimUrl: "https://a.com", cta, accessible: true }),
    ).toEqual({ claimUrl: "https://a.com", canClaim: true, showCheckExisting: false });
  });

  it("disables claiming when closed but offers a status check", () => {
    expect(
      resolveClaimActions({
        settlementStatus: "closed",
        claimUrl: "https://a.com",
        cta: { primary: "Claim window closed", secondary: null, primaryDisabled: true },
        accessible: true,
      }),
    ).toEqual({ claimUrl: "https://a.com", canClaim: false, showCheckExisting: true });
  });

  it("disables everything for a missing or unsafe URL", () => {
    for (const claimUrl of [null, "", "javascript:alert(1)"]) {
      expect(
        resolveClaimActions({ settlementStatus: "open", claimUrl, cta, accessible: true }),
      ).toEqual({ claimUrl: null, canClaim: false, showCheckExisting: false });
    }
  });

  it("hides every claim link when the member cannot access the perk", () => {
    expect(
      resolveClaimActions({ settlementStatus: "open", claimUrl: "https://a.com", cta, accessible: false }),
    ).toEqual({ claimUrl: "https://a.com", canClaim: false, showCheckExisting: false });
    expect(
      resolveClaimActions({
        settlementStatus: "closed",
        claimUrl: "https://a.com",
        cta: { ...cta, secondary: "Check an existing claim", primaryDisabled: true },
        accessible: false,
      }).showCheckExisting,
    ).toBe(false);
  });

  it("shows the status check on open rows only when the API sends it", () => {
    expect(
      resolveClaimActions({
        settlementStatus: "closing_soon",
        claimUrl: "https://a.com",
        cta: { ...cta, secondary: "Check an existing claim" },
        accessible: true,
      }).showCheckExisting,
    ).toBe(true);
  });
});

describe("isSubscribedToPerkOffers", () => {
  const prefs = (subscribed: boolean) => ({
    success: true,
    preferences: [{ category: "perks_offers", label: "", description: "", subscribed }],
  });

  it("treats failures and missing rows as subscribed", () => {
    expect(isSubscribedToPerkOffers(null)).toBe(true);
    expect(isSubscribedToPerkOffers({ success: false })).toBe(true);
    expect(isSubscribedToPerkOffers({ success: true, preferences: [] })).toBe(true);
  });

  it("only reports unsubscribed on an explicit opt-out", () => {
    expect(isSubscribedToPerkOffers(prefs(true))).toBe(true);
    expect(isSubscribedToPerkOffers(prefs(false))).toBe(false);
    expect(isSubscribedToPerkOffers({ ...prefs(true), unsubscribedFromAll: true })).toBe(false);
  });
});

describe("settlementInitials", () => {
  it("uses the first letter of the first two words", () => {
    expect(settlementInitials("Pixel Harbor Games", "x")).toBe("PH");
    expect(settlementInitials("Lumen Air", "x")).toBe("LA");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(settlementInitials("Ridgeline", "x")).toBe("RI");
    expect(settlementInitials("verity", "x")).toBe("VE");
  });

  it("falls back to the display title without the analyst prefix", () => {
    expect(settlementInitials(null, "Class Action: Harbor Streaming settlement")).toBe("HS");
    expect(settlementInitials("  ", "Northwind")).toBe("NO");
  });

  it("ignores punctuation and always returns exactly two letters", () => {
    expect(settlementInitials("AT&T Inc.", "x")).toBe("AT");
    expect(settlementInitials("X", "Y")).toBe("CA");
    expect(settlementInitials("X", "Yelp")).toBe("YE");
    expect(settlementInitials(null, "!!!")).toBe("CA");
    expect(settlementInitials("Élan Vital", "x")).toBe("ÉV");
  });

  it("keeps one character per initial when uppercasing would expand it", () => {
    expect(settlementInitials("ßa", "x")).toBe("ßA");
    expect(settlementInitials("ß Bank", "x")).toBe("ßB");
  });

  it("keeps decomposed accented letters whole", () => {
    expect(settlementInitials("E\u0301lan Vital", "x")).toBe("ÉV");
  });

  it("never returns anything but exactly two characters", () => {
    const names = [
      "ßa", "ß", "ﬀ", "ǆungla", "İstanbul Bank", "E\u0301lan", "Ⅻ Corp",
      "😀 Emoji Co", "東京 電力", "A", "a b c d", "", "   ", "!!!", null,
      "AT&T Inc.", "3M", "ʼn Company", "ΐ Bank",
    ];
    for (const name of names) {
      for (const title of ["", "Class Action: ", "x", "Harbor Streaming settlement"]) {
        expect([...settlementInitials(name, title)]).toHaveLength(2);
      }
    }
  });
});

describe("isClaimWindowClosed", () => {
  it("treats closed status or a disabled primary CTA as closed", () => {
    const cta = { primary: "File claim", secondary: null, primaryDisabled: false };
    expect(isClaimWindowClosed({ settlementStatus: "open", cta })).toBe(false);
    expect(isClaimWindowClosed({ settlementStatus: "closed", cta })).toBe(true);
    expect(
      isClaimWindowClosed({ settlementStatus: "open", cta: { ...cta, primaryDisabled: true } }),
    ).toBe(true);
  });
});

describe("settlementDaysRemaining", () => {
  const glance = {
    status: "open" as const,
    proof: "",
    paymentMethod: "",
    expectedPayout: "",
    claimBy: null,
  };

  it("prefers the detail glance, then the perk value", () => {
    expect(settlementDaysRemaining({ daysRemaining: 5, atAGlance: { ...glance, daysRemaining: 4 } })).toBe(4);
    expect(settlementDaysRemaining({ daysRemaining: 5, atAGlance: { ...glance, daysRemaining: null } })).toBe(5);
    expect(settlementDaysRemaining({ daysRemaining: 5 })).toBe(5);
    expect(settlementDaysRemaining({ daysRemaining: null })).toBeNull();
  });
});

describe("firstNonBlank", () => {
  it("skips null, undefined, empty and whitespace values", () => {
    expect(firstNonBlank(null, "", "  ", "Up to $60")).toBe("Up to $60");
    expect(firstNonBlank(undefined, " Varies ")).toBe("Varies");
    expect(firstNonBlank("", null, undefined)).toBeNull();
    expect(firstNonBlank()).toBeNull();
  });
});

describe("settlementClaimDeadline", () => {
  const glance = {
    status: "open" as const,
    proof: "",
    paymentMethod: "",
    expectedPayout: "",
    daysRemaining: null,
  };

  it("prefers a valid glance date, then the perk date", () => {
    expect(
      settlementClaimDeadline({
        claimDeadline: "2026-11-14T00:00:00Z",
        atAGlance: { ...glance, claimBy: "2026-10-03T00:00:00Z" },
      }),
    ).toBe("3 Oct 2026");
    expect(
      settlementClaimDeadline({
        claimDeadline: "2026-11-14T00:00:00Z",
        atAGlance: { ...glance, claimBy: "" },
      }),
    ).toBe("14 Nov 2026");
    expect(settlementClaimDeadline({ claimDeadline: "2026-11-14T00:00:00Z" })).toBe(
      "14 Nov 2026",
    );
    expect(settlementClaimDeadline({ claimDeadline: null })).toBeNull();
  });
});
