import { describe, expect, it } from "vitest";
import {
  formatCampaignDeadline,
  formatCampaignPeriodPhrase,
  formatReferralRewardLabel,
} from "./referral-campaign-copy";

describe("referral-campaign-copy", () => {
  it("formats reward months", () => {
    expect(formatReferralRewardLabel(1)).toBe("1 free month");
    expect(formatReferralRewardLabel(3)).toBe("3 free months");
  });

  it("formats deadlines from campaign endAt without a hardcoded month", () => {
    expect(formatCampaignDeadline("2026-08-31T23:59:59.999Z")).toBe(
      "August 31, 2026",
    );
    expect(formatCampaignDeadline("not-a-date")).toBe("the campaign end date");
  });

  it("derives period phrasing from the campaign window", () => {
    expect(
      formatCampaignPeriodPhrase(
        "2026-08-01T00:00:00.000Z",
        "2026-08-31T23:59:59.999Z",
      ),
    ).toBe("during August 2026");
    expect(
      formatCampaignPeriodPhrase(
        "2026-08-01T00:00:00.000Z",
        "2026-09-15T00:00:00.000Z",
      ),
    ).toBe("between August 1, 2026 and September 15, 2026");
    expect(formatCampaignPeriodPhrase("bad", "also-bad")).toBe(
      "during this promotion",
    );
  });
});
