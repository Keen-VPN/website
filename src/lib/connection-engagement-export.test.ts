import { describe, expect, it } from "vitest";
import { buildConnectionEngagementCsv } from "./connection-engagement-export";
import type { AdminMedianMonthlySessionsReport } from "@/auth/backend";

function minimalReport(
  overrides: Partial<AdminMedianMonthlySessionsReport> = {},
): AdminMedianMonthlySessionsReport {
  return {
    summary: {
      month: "2026-05",
      median_sessions_per_user: 1,
      mean_sessions_per_user: 1,
      users_with_sessions: 1,
      total_sessions: 1,
      percentiles: { p25: 0, p50: 1, p75: 1, p90: 1, p95: 1 },
      filters: {
        min_duration_seconds: 10,
        exclude_email_patterns: [],
        exclude_platforms: [],
      },
    },
    histogram: [],
    segments: {
      platform: [],
      subscription_tier: [],
      acquisition_source: [
        {
          segment: "=cmd|'/C calc'!A0",
          median_sessions_per_user: 0,
          users_with_sessions: 0,
          total_sessions: 0,
        },
      ],
    },
    month_over_month: null,
    ...overrides,
  };
}

describe("buildConnectionEngagementCsv", () => {
  it("prefixes string cells that start with spreadsheet formula triggers", () => {
    const csv = buildConnectionEngagementCsv(minimalReport());
    expect(csv).toContain("'=cmd|'/C calc'!A0");
    expect(csv).not.toMatch(/,=cmd\|/);
  });

  it("does not prefix negative numeric metrics", () => {
    const csv = buildConnectionEngagementCsv(
      minimalReport({
        month_over_month: {
          previous_month: "2026-04",
          median_sessions_per_user: 2,
          users_with_sessions: 10,
          delta_median: -1,
        },
      }),
    );
    expect(csv).toContain("month_over_month,delta_median,-1");
    expect(csv).not.toContain("'-1");
  });
});
