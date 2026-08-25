import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReferralDashboard, getSessionToken } from "@/auth";
import { coerceCampaign } from "@/lib/referral-dashboard";

/** Soft TTL so SPA sessions pick up campaign changes without refetching every drawer open. */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface PromoCache {
  months: number;
  fetchedAt: number;
  /** Session token that produced this value — never reuse across users. */
  sessionKey: string;
}

/** Module cache so desktop + mobile sidebar mounts share one successful request. */
let cachedPromo: PromoCache | null = null;
let inflightKey: string | null = null;
let inflight: Promise<number> | null = null;

function cacheIsFresh(cache: PromoCache, sessionKey: string): boolean {
  return (
    cache.sessionKey === sessionKey &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  );
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

function readCachedMonths(sessionKey: string): number | null {
  if (!cachedPromo || cachedPromo.sessionKey !== sessionKey) return null;
  return cachedPromo.months;
}

/**
 * Active campaign reward months (falls back to 1).
 * Caches successful responses per session with a TTL, and revalidates while mounted.
 */
export function useReferralPromoMonths(): number {
  const { user } = useAuth();
  const session = user ? getSessionToken() : null;
  const [months, setMonths] = useState(() =>
    session ? (readCachedMonths(session) ?? 1) : 1,
  );

  useEffect(() => {
    if (!user || !session) {
      setMonths(1);
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (value: number) => {
      if (!cancelled) setMonths(value);
    };

    const fetchAndCache = (): Promise<number> => {
      if (inflight && inflightKey === session) {
        return inflight;
      }

      inflightKey = session;
      inflight = loadPromoMonths(session)
        .then((result) => {
          if (result.ok) {
            cachedPromo = {
              months: result.months,
              fetchedAt: Date.now(),
              sessionKey: session,
            };
            return result.months;
          }
          // Do not cache failures — keep prior success for this session if any.
          return readCachedMonths(session) ?? result.months;
        })
        .finally(() => {
          if (inflightKey === session) {
            inflight = null;
            inflightKey = null;
          }
        });

      return inflight;
    };

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      const cache = cachedPromo;
      const delay =
        cache && cache.sessionKey === session
          ? Math.max(0, CACHE_TTL_MS - (Date.now() - cache.fetchedAt)) ||
            CACHE_TTL_MS
          : CACHE_TTL_MS;

      refreshTimer = setTimeout(() => {
        void fetchAndCache().then((value) => {
          apply(value);
          if (!cancelled) scheduleRefresh();
        });
      }, delay);
    };

    if (cachedPromo && cacheIsFresh(cachedPromo, session)) {
      apply(cachedPromo.months);
      scheduleRefresh();
      return () => {
        cancelled = true;
        if (refreshTimer) clearTimeout(refreshTimer);
      };
    }

    // Stale-while-revalidate for the same session only.
    const prior = readCachedMonths(session);
    if (prior != null) apply(prior);

    void fetchAndCache().then((value) => {
      apply(value);
      if (!cancelled) scheduleRefresh();
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [user, session]);

  return months;
}
