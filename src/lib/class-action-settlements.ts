import type {
  EmailCategoryPreferencesResponse,
  PerkDetail,
  PerkItem,
  SettlementStatus,
} from "@/auth/backend";
import { isSafeHttpUrl } from "@/lib/safe-url";

export const CLASS_ACTION_CATEGORY = "class_action";

export type ClassActionFilter = "all" | "closing_soon" | "no_docs" | "closed";

export const CLASS_ACTION_FILTERS: readonly ClassActionFilter[] = [
  "all",
  "closing_soon",
  "no_docs",
  "closed",
];

export function parseClassActionFilter(
  value: string | null | undefined,
): ClassActionFilter {
  return CLASS_ACTION_FILTERS.includes(value as ClassActionFilter)
    ? (value as ClassActionFilter)
    : "all";
}

/**
 * `settlementStatus` is the only open/closed signal. The claim deadline prefers
 * the settlement record over `endsAt`, so a perk can be in its window and closed.
 */
export function isSettlementClaimable(
  perk: Pick<PerkItem, "settlementStatus">,
): boolean {
  return (
    perk.settlementStatus === "open" || perk.settlementStatus === "closing_soon"
  );
}

export function isSettlementClosed(
  perk: Pick<PerkItem, "settlementStatus">,
): boolean {
  return perk.settlementStatus === "closed";
}

const STATUS_LABELS: Record<SettlementStatus, string> = {
  open: "Open",
  closing_soon: "Closing soon",
  closed: "Closed",
};

export function settlementStatusLabel(status: SettlementStatus | undefined): string {
  return STATUS_LABELS[status ?? "open"];
}

/** Claiming is off: closed, or the API disabled the primary claim button. */
export function isClaimWindowClosed(
  perk: Pick<PerkDetail, "settlementStatus" | "cta">,
): boolean {
  return isSettlementClosed(perk) || perk.cta?.primaryDisabled === true;
}

export function filterSettlements(
  perks: PerkItem[],
  filter: ClassActionFilter,
): PerkItem[] {
  switch (filter) {
    case "closing_soon":
      return perks.filter((perk) => perk.settlementStatus === "closing_soon");
    case "no_docs":
      return perks.filter(
        (perk) => isSettlementClaimable(perk) && perk.docsNeeded === false,
      );
    case "closed":
      return perks.filter(isSettlementClosed);
    case "all":
    default:
      return perks.filter(isSettlementClaimable);
  }
}

function deadlineTime(perk: Pick<PerkItem, "claimDeadline">): number | null {
  if (!perk.claimDeadline) return null;
  const time = Date.parse(perk.claimDeadline);
  return Number.isNaN(time) ? null : time;
}

/** Open rows: soonest deadline first. Closed rows: newest first. Nulls last. */
export function sortSettlements(
  perks: PerkItem[],
  filter: ClassActionFilter,
): PerkItem[] {
  const direction = filter === "closed" ? -1 : 1;
  return [...perks].sort((a, b) => {
    const at = deadlineTime(a);
    const bt = deadlineTime(b);
    if (at === null && bt === null) return a.title.localeCompare(b.title);
    if (at === null) return 1;
    if (bt === null) return -1;
    if (at === bt) return a.title.localeCompare(b.title);
    return (at - bt) * direction;
  });
}

export interface SettlementStats {
  openNow: number;
  closingSoon: number;
  noDocumentsNeeded: number;
  closed: number;
}

/** Stats from the member's own list, not the API `summary` (which ignores targeting). */
export function settlementStats(perks: PerkItem[]): SettlementStats {
  return {
    openNow: filterSettlements(perks, "all").length,
    closingSoon: filterSettlements(perks, "closing_soon").length,
    noDocumentsNeeded: filterSettlements(perks, "no_docs").length,
    closed: filterSettlements(perks, "closed").length,
  };
}

const ANALYST_TITLE_PREFIX = /^class action:\s*/i;

export function displaySettlementTitle(title: string): string {
  const stripped = title.replace(ANALYST_TITLE_PREFIX, "").trim();
  return stripped || title;
}

const LOGO_FALLBACK_INITIALS = "CA";

/** Uppercase one character, keeping it as-is when uppercasing expands it (ß → SS). */
function upperInitial(char: string): string {
  const upper = char.toLocaleUpperCase();
  return [...upper].length === 1 ? upper : char;
}

/**
 * Exactly two uppercase letters for the logo fallback: the first letter of each
 * of the first two words, or the first two letters of a single-word name.
 * Uses the partner name, else the display title.
 */
export function settlementInitials(
  partnerName: string | null | undefined,
  title: string,
): string {
  for (const source of [partnerName, displaySettlementTitle(title)]) {
    // NFC so a decomposed "É" (E + accent mark) stays one letter in one word.
    const words = (source ?? "").normalize("NFC").match(/[\p{L}\p{N}]+/gu) ?? [];
    if (words.length === 0) continue;
    const letters =
      words.length >= 2
        ? [[...words[0]][0], [...words[1]][0]]
        : [...words[0]].slice(0, 2);
    if (letters.length === 2) return letters.map(upperInitial).join("");
  }
  return LOGO_FALLBACK_INITIALS;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatSettlementDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // Manual so every ICU build renders "Sep" (en-GB short months can be "Sept").
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** First value that is not null, undefined, empty or whitespace, trimmed. */
export function firstNonBlank(
  ...values: (string | null | undefined)[]
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Days left for list and detail alike: the detail glance value when present,
 * else the perk's own. Both come from the same claim deadline on the backend.
 */
export function settlementDaysRemaining(
  perk: Pick<PerkDetail, "daysRemaining" | "atAGlance">,
): number | null {
  return perk.atAGlance?.daysRemaining ?? perk.daysRemaining ?? null;
}

export function formatDaysLeft(days: number | null | undefined): string | null {
  if (days === null || days === undefined || days < 0) return null;
  if (days === 0) return "Closes today";
  return days === 1 ? "1 day left" : `${days} days left`;
}

export function claimHost(url: string | null | undefined): string | null {
  if (!url || !isSafeHttpUrl(url)) return null;
  return new URL(url).hostname.replace(/^www\./i, "");
}

export interface SettlementClaimActions {
  /** Safe claim URL, or null when missing or not http(s). */
  claimUrl: string | null;
  /** Primary "Open the official claim form" can be used. */
  canClaim: boolean;
  /**
   * Show "Check an existing claim" (closed settlements, or when the API asks).
   * Never for members who cannot access the perk; the claim-site link follows this too.
   */
  showCheckExisting: boolean;
}

export function resolveClaimActions(
  perk: Pick<
    PerkDetail,
    "settlementStatus" | "claimUrl" | "cta" | "accessible"
  >,
): SettlementClaimActions {
  const raw = perk.claimUrl?.trim() ?? "";
  const claimUrl = raw && isSafeHttpUrl(raw) ? raw : null;
  const closed = isClaimWindowClosed(perk);
  const accessible = perk.accessible !== false;
  return {
    claimUrl,
    canClaim: Boolean(claimUrl) && accessible && !closed,
    showCheckExisting:
      Boolean(claimUrl) && accessible && (closed || Boolean(perk.cta?.secondary)),
  };
}

/**
 * Whether the member already gets `perks_offers` email. Missing rows and failed
 * lookups count as subscribed, so the signup button only shows on an explicit opt-out.
 */
export function isSubscribedToPerkOffers(
  response: EmailCategoryPreferencesResponse | null | undefined,
): boolean {
  if (!response?.success) return true;
  if (response.unsubscribedFromAll) return false;
  const row = response.preferences?.find(
    (pref) => pref.category === "perks_offers",
  );
  return row ? row.subscribed : true;
}
