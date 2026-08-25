import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReferralDashboard, getSessionToken } from "@/auth";
import { coerceCampaign } from "@/lib/referral-dashboard";

/** Module cache so desktop + mobile sidebar mounts share one request. */
let cachedPromoMonths: number | null = null;
let inflight: Promise<number> | null = null;

async function loadPromoMonths(session: string): Promise<number> {
  const res = await fetchReferralDashboard(session, { offset: 0, limit: 1 });
  if (!res.success) return 1;
  const campaign = coerceCampaign(res.campaign);
  const months =
    campaign?.rewardMonths ??
    (typeof res.standardRewardMonths === "number"
      ? res.standardRewardMonths
      : 1);
  return Math.max(1, Math.floor(months));
}

/** Active campaign reward months (falls back to 1). Cached across remounts. */
export function useReferralPromoMonths(): number {
  const { user } = useAuth();
  const [months, setMonths] = useState(cachedPromoMonths ?? 1);

  useEffect(() => {
    const session = getSessionToken();
    if (!user || !session) return;

    if (cachedPromoMonths != null) {
      setMonths(cachedPromoMonths);
      return;
    }

    let cancelled = false;
    if (!inflight) {
      inflight = loadPromoMonths(session)
        .then((value) => {
          cachedPromoMonths = value;
          return value;
        })
        .finally(() => {
          inflight = null;
        });
    }

    void inflight.then((value) => {
      if (!cancelled) setMonths(value);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return months;
}
