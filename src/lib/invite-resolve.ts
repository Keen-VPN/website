import { BACKEND_URL } from "@/auth/backend";

/**
 * `/r/:token` carries two kinds of link that are indistinguishable by sight.
 *
 * A member referral token lives in `ReferralToken`; a pre-signup affiliate
 * token (KVPN-559) lives in `affiliate_links`, because an affiliate has no
 * account yet and `ReferralToken.userId` is required. They are generated
 * separately into separate tables, so a token is never both — but the landing
 * page cannot tell which it holds, and must ask about both before calling a
 * link dead. The backend already accepts either at signup
 * (`AuthService.maybeAttributeReferral`), so once we store the token the rest
 * of the funnel needs no further branching.
 */
export type InviteKind = "referral" | "affiliate";

export interface ResolvedInvite {
  kind: InviteKind;
  /** The referrer's display name, when the backend chose to expose one. */
  referrerName: string | null;
  /** Months the referrer earns. Falls back to 1 when unstated. */
  rewardMonths: number;
}

export type InviteResolution =
  | { status: "valid"; invite: ResolvedInvite }
  | { status: "invalid" }
  /** Network failure, non-OK HTTP, or a body with no usable `valid` boolean. */
  | { status: "failed" };

export type FetchLike = typeof fetch;

const DEFAULT_REWARD_MONTHS = 1;

function rewardMonthsOrDefault(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : DEFAULT_REWARD_MONTHS;
}

async function readResolveBody(
  res: Response,
): Promise<Record<string, unknown> | null> {
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as unknown;
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  // An absent or non-boolean `valid` means we cannot tell a dead link from a
  // broken response, so it is reported as a failure the visitor can retry —
  // never as an invalid invite, which would send them away for good.
  if (typeof record["valid"] !== "boolean") return null;
  return record;
}

async function resolveMemberReferral(
  token: string,
  fetchImpl: FetchLike,
): Promise<InviteResolution> {
  let body: Record<string, unknown> | null;
  try {
    body = await readResolveBody(
      await fetchImpl(
        `${BACKEND_URL}/referral/resolve/${encodeURIComponent(token)}`,
      ),
    );
  } catch {
    return { status: "failed" };
  }
  if (!body) return { status: "failed" };
  if (body["valid"] === false) return { status: "invalid" };

  const referrerName = body["referrerName"];
  const campaign = body["campaign"] as Record<string, unknown> | null;
  // Campaign months only apply while the campaign is actually running; an
  // inactive one must not inflate the promised reward.
  const campaignMonths =
    campaign && campaign["active"] === true
      ? rewardMonthsOrDefault(campaign["rewardMonths"])
      : DEFAULT_REWARD_MONTHS;

  return {
    status: "valid",
    invite: {
      kind: "referral",
      referrerName:
        typeof referrerName === "string" && referrerName ? referrerName : null,
      rewardMonths: campaignMonths,
    },
  };
}

async function resolveAffiliateLink(
  token: string,
  fetchImpl: FetchLike,
): Promise<InviteResolution> {
  let body: Record<string, unknown> | null;
  try {
    body = await readResolveBody(
      await fetchImpl(
        `${BACKEND_URL}/affiliate-links/resolve/${encodeURIComponent(token)}`,
      ),
    );
  } catch {
    return { status: "failed" };
  }
  if (!body) return { status: "failed" };
  if (body["valid"] === false) return { status: "invalid" };

  const displayName = body["displayName"];
  return {
    status: "valid",
    invite: {
      kind: "affiliate",
      referrerName:
        typeof displayName === "string" && displayName ? displayName : null,
      // Terms are frozen on the link itself, so this is what the affiliate was
      // promised regardless of the campaign's current state.
      rewardMonths: rewardMonthsOrDefault(body["rewardMonths"]),
    },
  };
}

/**
 * Resolve a `/r/:token` invite against both link tables.
 *
 * Member referrals are tried first because they are by far the common case;
 * the affiliate lookup only costs a round-trip on tokens the referral table
 * did not recognise. The invite is only reported invalid when *both* endpoints
 * answered definitively that they do not know the token — if either merely
 * failed, the visitor gets a retryable error rather than losing an invite that
 * may well be good.
 */
export async function resolveInviteToken(
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<InviteResolution> {
  const referral = await resolveMemberReferral(token, fetchImpl);
  if (referral.status === "valid") return referral;

  const affiliate = await resolveAffiliateLink(token, fetchImpl);
  if (affiliate.status === "valid") return affiliate;

  if (referral.status === "failed" || affiliate.status === "failed") {
    return { status: "failed" };
  }
  return { status: "invalid" };
}
