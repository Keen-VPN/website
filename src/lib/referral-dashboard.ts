export interface ReferralRow {
  id: string;
  status: string;
  refereeName: string;
  /** Full referee account email (API always sends string; missing → "" from coercion). */
  refereeEmail: string;
  signedUpAt: string | null;
  trialStartedAt: string | null;
  subscribedAt: string | null;
  rewardedAt: string | null;
}

export interface ReferralCampaign {
  id: string;
  rewardMonths: number;
  startAt: string;
  endAt: string;
  active: boolean;
}

export interface ReferralDashboardPayload {
  referralUrl: string;
  token: string;
  totalReferrals: number;
  rewardsEarned: number;
  pendingReferrals: number;
  rewardsAwaitingSubscription: number;
  canReceiveRewards: boolean;
  referrals: ReferralRow[];
  referralsHasMore: boolean;
  standardRewardMonths?: number;
  campaign?: ReferralCampaign | null;
}

export const REFERRALS_PAGE_SIZE = 20;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function coerceIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

/** Accept only real booleans so loaders stay consistent (ignore "false"/1). */
export function coerceBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Normalize dashboard `referrals` items from JSON (typed as loose records upstream). */
function coerceReferralRow(raw: unknown): ReferralRow | null {
  if (!isPlainObject(raw)) return null;
  const id = coerceString(raw["id"]);
  if (!id) return null;
  return {
    id,
    status: coerceString(raw["status"]),
    refereeName: coerceString(raw["refereeName"]),
    refereeEmail: coerceString(raw["refereeEmail"]),
    signedUpAt: coerceIsoOrNull(raw["signedUpAt"]),
    trialStartedAt: coerceIsoOrNull(raw["trialStartedAt"]),
    subscribedAt: coerceIsoOrNull(raw["subscribedAt"]),
    rewardedAt: coerceIsoOrNull(raw["rewardedAt"]),
  };
}

export function coerceCampaign(raw: unknown): ReferralCampaign | null {
  if (!isPlainObject(raw)) return null;
  const id = coerceString(raw["id"]);
  const rewardMonths = raw["rewardMonths"];
  const startAt = coerceString(raw["startAt"]);
  const endAt = coerceString(raw["endAt"]);
  if (
    !id ||
    typeof rewardMonths !== "number" ||
    !Number.isInteger(rewardMonths) ||
    rewardMonths < 1 ||
    !startAt ||
    !endAt ||
    raw["active"] !== true
  ) {
    return null;
  }
  return {
    id,
    rewardMonths,
    startAt,
    endAt,
    active: true,
  };
}

export function normalizeReferralRows(value: unknown): ReferralRow[] {
  if (!Array.isArray(value)) return [];
  const out: ReferralRow[] = [];
  for (const item of value) {
    const row = coerceReferralRow(item);
    if (row) out.push(row);
  }
  return out;
}

export function appendReferralRows(
  existing: ReferralRow[],
  incoming: ReferralRow[],
): ReferralRow[] {
  const seen = new Set(existing.map((r) => r.id));
  const extra: ReferralRow[] = [];
  for (const row of incoming) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    extra.push(row);
  }
  return [...existing, ...extra];
}
