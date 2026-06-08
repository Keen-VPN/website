export interface IsoWeek {
  isoYear: number;
  isoWeek: number;
}

export function dateToIsoWeek(date: Date): IsoWeek {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return { isoYear, isoWeek };
}

export function currentIsoWeek(): IsoWeek & { label: string } {
  const { isoYear, isoWeek } = dateToIsoWeek(new Date());
  return {
    isoYear,
    isoWeek,
    label: formatIsoWeekLabel(isoYear, isoWeek),
  };
}

export function isoWeeksInYear(isoYear: number): number {
  const dec28 = new Date(Date.UTC(isoYear, 11, 28));
  if (isoYear >= 0 && isoYear < 100) dec28.setUTCFullYear(isoYear);
  const { isoYear: weekYear, isoWeek } = dateToIsoWeek(dec28);
  return weekYear === isoYear ? isoWeek : 52;
}

export function formatIsoWeekLabel(isoYear: number, isoWeek: number): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

export function parseWeekInput(value: string): IsoWeek | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);
  if (isoWeek < 1 || isoWeek > isoWeeksInYear(isoYear)) return null;
  return { isoYear, isoWeek };
}

export function compareIsoWeek(a: IsoWeek, b: IsoWeek): number {
  if (a.isoYear !== b.isoYear) return a.isoYear - b.isoYear;
  return a.isoWeek - b.isoWeek;
}

export function weekStartDate(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
  const weekStart = new Date(week1Monday);
  weekStart.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return weekStart;
}

export function dateToWeekLabel(date: Date): string {
  const { isoYear, isoWeek } = dateToIsoWeek(date);
  return formatIsoWeekLabel(isoYear, isoWeek);
}

export function trendWindowStart(
  isoYear: number,
  isoWeek: number,
  span = 8,
): string {
  const start = weekStartDate(isoYear, isoWeek);
  start.setUTCDate(start.getUTCDate() - (span - 1) * 7);
  return dateToWeekLabel(start);
}

export function trendWindowEnd(isoYear: number, isoWeek: number): string {
  return formatIsoWeekLabel(isoYear, isoWeek);
}
