import type { AdminUtmFunnelReport } from "@/auth/backend";

const SPREADSHEET_FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

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
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

export function buildUtmFunnelCsv(report: AdminUtmFunnelReport): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      "utm_source",
      "utm_campaign",
      "utm_medium",
      "signup_started",
      "signups_completed",
      "trials",
      "subscriptions",
      "revenue",
      "signup_to_completed_rate",
      "signup_to_trial_rate",
      "signup_to_paid_rate",
    ]),
  );

  for (const row of report.rows) {
    lines.push(
      csvRow([
        row.utm_source,
        row.utm_campaign,
        row.utm_medium,
        row.signup_started,
        row.signups_completed,
        row.trials,
        row.subscriptions,
        row.revenue,
        row.signup_to_completed_rate,
        row.signup_to_trial_rate,
        row.signup_to_paid_rate,
      ]),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function downloadUtmFunnelCsv(report: AdminUtmFunnelReport): void {
  const from = report.from.slice(0, 10);
  const to = report.to.slice(0, 10);
  downloadTextFile(
    `utm-funnel-${from}-to-${to}.csv`,
    buildUtmFunnelCsv(report),
    "text/csv;charset=utf-8",
  );
}
