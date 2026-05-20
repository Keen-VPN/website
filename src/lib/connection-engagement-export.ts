import type { AdminMedianMonthlySessionsReport } from "@/auth/backend";

/** Spreadsheet apps treat these leading characters as formula/DDE triggers. */
const SPREADSHEET_FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Neutralize CSV formula injection for string cells (OWASP CSV injection).
 * Numeric/boolean cells are left unchanged so negative numbers stay numeric.
 */
function neutralizeSpreadsheetFormula(text: string): string {
  const leadingWhitespace = text.match(/^\s*/)?.[0] ?? "";
  const body = text.slice(leadingWhitespace.length);
  if (SPREADSHEET_FORMULA_PREFIX_RE.test(body)) {
    return `${leadingWhitespace}'${body}`;
  }
  return text;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text =
    typeof value === "string"
      ? neutralizeSpreadsheetFormula(value)
      : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  // Defer cleanup so older WebViews finish the download before revoke/DOM removal.
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Builds a human-readable multi-section CSV (summary, histogram, segments).
 * Sections are separated by blank lines and use different column layouts (3 vs 6
 * columns) — fine for spreadsheets, not for uniform-schema parsers. Use JSON export
 * for programmatic consumption.
 */
export function buildConnectionEngagementCsv(
  report: AdminMedianMonthlySessionsReport,
): string {
  const lines: string[] = [];
  const { summary, histogram, segments, month_over_month: mom } = report;

  lines.push(csvRow(["section", "field", "value"]));
  lines.push(csvRow(["summary", "month", summary.month]));
  lines.push(
    csvRow(["summary", "median_sessions_per_user", summary.median_sessions_per_user]),
  );
  lines.push(
    csvRow(["summary", "mean_sessions_per_user", summary.mean_sessions_per_user]),
  );
  lines.push(csvRow(["summary", "users_with_sessions", summary.users_with_sessions]));
  lines.push(csvRow(["summary", "total_sessions", summary.total_sessions]));
  lines.push(csvRow(["summary", "min_duration_seconds", summary.filters.min_duration_seconds]));
  lines.push(
    csvRow([
      "summary",
      "exclude_email_patterns",
      summary.filters.exclude_email_patterns.join("; "),
    ]),
  );
  lines.push(
    csvRow([
      "summary",
      "exclude_platforms",
      summary.filters.exclude_platforms.join("; "),
    ]),
  );

  for (const [key, value] of Object.entries(summary.percentiles)) {
    lines.push(csvRow(["percentile", key, value]));
  }

  if (mom) {
    lines.push(csvRow(["month_over_month", "previous_month", mom.previous_month]));
    lines.push(
      csvRow([
        "month_over_month",
        "median_sessions_per_user",
        mom.median_sessions_per_user,
      ]),
    );
    lines.push(
      csvRow(["month_over_month", "users_with_sessions", mom.users_with_sessions]),
    );
    lines.push(csvRow(["month_over_month", "delta_median", mom.delta_median]));
  }

  lines.push("");
  lines.push(
    csvRow([
      "section",
      "session_count",
      "users",
    ]),
  );
  for (const bucket of histogram) {
    lines.push(
      csvRow(["histogram", bucket.session_count, bucket.users]),
    );
  }

  const segmentGroups = [
    ["platform", segments.platform] as const,
    ["subscription_tier", segments.subscription_tier] as const,
    ["acquisition_source", segments.acquisition_source] as const,
  ];

  lines.push("");
  lines.push(
    csvRow([
      "section",
      "segment_group",
      "segment",
      "median_sessions_per_user",
      "users_with_sessions",
      "total_sessions",
    ]),
  );
  for (const [group, rows] of segmentGroups) {
    for (const row of rows) {
      lines.push(
        csvRow([
          "segment",
          group,
          row.segment,
          row.median_sessions_per_user,
          row.users_with_sessions,
          row.total_sessions,
        ]),
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function downloadConnectionEngagementCsv(
  report: AdminMedianMonthlySessionsReport,
): void {
  const month = report.summary.month.replace(/[^\d-]/g, "") || "report";
  const csv = buildConnectionEngagementCsv(report);
  downloadTextFile(
    `connection-engagement-${month}.csv`,
    csv,
    "text/csv;charset=utf-8",
  );
}

export function downloadConnectionEngagementJson(
  report: AdminMedianMonthlySessionsReport,
): void {
  const month = report.summary.month.replace(/[^\d-]/g, "") || "report";
  downloadTextFile(
    `connection-engagement-${month}.json`,
    JSON.stringify(report, null, 2),
    "application/json;charset=utf-8",
  );
}
