/** User-facing singular/plural for referral reward months. */
export function formatReferralRewardLabel(months: number): string {
  const n = Math.max(1, Math.floor(months));
  return n === 1 ? "1 free month" : `${n} free months`;
}

function parseUtcDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const utcDateParts = (d: Date) => ({
  year: d.getUTCFullYear(),
  month: d.getUTCMonth(),
  day: d.getUTCDate(),
});

/** e.g. August 31, 2026 — no hardcoded campaign month. */
export function formatCampaignDeadline(iso: string): string {
  const d = parseUtcDate(iso);
  if (!d) return "the campaign end date";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Period wording derived from campaign start/end (not a fixed calendar month).
 * Same month → "during August 2026"; otherwise → "between … and …".
 */
export function formatCampaignPeriodPhrase(
  startAt: string,
  endAt: string,
): string {
  const start = parseUtcDate(startAt);
  const end = parseUtcDate(endAt);
  if (!start || !end) return "during this promotion";

  const s = utcDateParts(start);
  const e = utcDateParts(end);

  if (s.year === e.year && s.month === e.month) {
    const monthName = start.toLocaleDateString(undefined, {
      month: "long",
      timeZone: "UTC",
    });
    return `during ${monthName} ${s.year}`;
  }

  return `between ${formatCampaignDeadline(startAt)} and ${formatCampaignDeadline(endAt)}`;
}
