import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReferralDashboard, getSessionToken } from "@/auth";
import { coerceCampaign } from "@/lib/referral-dashboard";

/** Soft TTL so SPA sessions pick up campaign changes without refetching every drawer open. */
const CACHE_TTL_MS = 5 * 60 * 1000;

type PromoCache = {
  months: number;
  fetchedAt: number;
};

/** Module cache so desktop + mobile sidebar mounts share one successful request. */
let cachedPromo: PromoCache | null = null;
let inflight: Promise<number> | null = null;

function cacheIsFresh(cache: PromoCache): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

async function loadPromoMonths(
  session: string,
): Promise<{ ok: boolean; months: number }> {
  const res = await fetchReferralDashboard(session, { offset: 0, limit: 1 });
  if (!res.success) return { ok: false, months: 1 };
  const campaign = coerceCampaign(res.campaign);
  const months =
    campaign?.rewardMonths ??
    (typeof res.standardRewardMonths === "number"
      ? res.standardRewardMonths
      : 1);
  return { ok: true, months: Math.max(1, Math.floor(months)) };
}

/** Active campaign reward months (falls back to 1). Caches successful responses only. */
export function useReferralPromoMonths(): number {
  const { user } = useAuth();
  const [months, setMonths] = useState(cachedPromo?.months ?? 1);

  useEffect(() => {
    const session = getSessionToken();
    if (!user || !session) return;

    let cancelled = false;

    const apply = (value: number) => {
      if (!cancelled) setMonths(value);
    };

    if (cachedPromo && cacheIsFresh(cachedPromo)) {
      apply(cachedPromo.months);
      return;
    }

    // Stale-while-revalidate: show last success immediately, then refresh.
    if (cachedPromo) {
      apply(cachedPromo.months);
    }

    if (!inflight) {
      inflight = loadPromoMonths(session)
        .then((result) => {
          if (result.ok) {
            cachedPromo = { months: result.months, fetchedAt: Date.now() };
            return result.months;
          }
          // Do not cache failures — keep prior success if any.
          return cachedPromo?.months ?? result.months;
        })
        .finally(() => {
          inflight = null;
        });
    }

    void inflight.then(apply);

    return () => {
      cancelled = true;
    };
  }, [user]);

  return months;
}
