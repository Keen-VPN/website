import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Gift, Link2, Loader2, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionToken, fetchReferralDashboard } from "@/auth";
import {
  formatReferralRewardLabel,
} from "@/lib/referral-campaign-copy";
import {
  REFERRALS_PAGE_SIZE,
  appendReferralRows,
  coerceBoolean,
  coerceCampaign,
  normalizeReferralRows,
  type ReferralDashboardPayload,
} from "@/lib/referral-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string, email: string) {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: string) {
  switch (status) {
    case "REWARDED":
    case "SUBSCRIBED":
      return { text: "Subscribed", className: "bg-[#e6f9f0] text-[#1a9e5a]" };
    case "TRIALING":
      return { text: "Free trial", className: "bg-[#f0ebff] text-[#6b46c1]" };
    case "EXPIRED":
      return { text: "Expired", className: "bg-[#f0f3f8] text-[#627086]" };
    default:
      return { text: "Pending", className: "bg-[#fff4e5] text-[#c27803]" };
  }
}

export default function DashboardReferrals() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<ReferralDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const dataRef = useRef<ReferralDashboardPayload | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (authLoading) return;
    const session = getSessionToken();
    if (!user || !session) {
      // Preview mode without auth — show empty shell
      setLoading(false);
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    void fetchReferralDashboard(session, {
      offset: 0,
      limit: REFERRALS_PAGE_SIZE,
    }).then((res) => {
      if (cancelled) return;
      if (res.success && res.referralUrl) {
        setData({
          referralUrl: res.referralUrl,
          token: res.token ?? "",
          totalReferrals: res.totalReferrals ?? 0,
          rewardsEarned: res.rewardsEarned ?? 0,
          pendingReferrals: res.pendingReferrals ?? 0,
          rewardsAwaitingSubscription: res.rewardsAwaitingSubscription ?? 0,
          canReceiveRewards: coerceBoolean(res.canReceiveRewards),
          referrals: normalizeReferralRows(res.referrals),
          referralsHasMore: Boolean(res.referralsHasMore),
          standardRewardMonths:
            typeof res.standardRewardMonths === "number"
              ? res.standardRewardMonths
              : 1,
          campaign: coerceCampaign(res.campaign),
        });
        setFetchError(null);
      } else {
        setData(null);
        setFetchError(
          res.error?.trim()
            ? res.error
            : "Unable to load referral data. Please try again.",
        );
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadKey]);

  const loadMore = async () => {
    const session = getSessionToken();
    const snap = dataRef.current;
    if (!session || !snap?.referralsHasMore || loadingMore) return;
    setLoadingMore(true);
    const res = await fetchReferralDashboard(session, {
      offset: snap.referrals.length,
      limit: REFERRALS_PAGE_SIZE,
    });
    setLoadingMore(false);
    if (!res.success) {
      toast({
        title: "Could not load more",
        description: res.error?.trim() || "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalReferrals: res.totalReferrals ?? prev.totalReferrals,
        rewardsEarned: res.rewardsEarned ?? prev.rewardsEarned,
        pendingReferrals: res.pendingReferrals ?? prev.pendingReferrals,
        referrals: appendReferralRows(
          prev.referrals,
          normalizeReferralRows(res.referrals),
        ),
        referralsHasMore: Boolean(res.referralsHasMore),
      };
    });
  };

  const copyLink = async () => {
    if (!data?.referralUrl) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      toast({ title: "Copied", description: "Referral link copied." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Copy the link manually.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-5 p-4 sm:p-6 lg:p-7">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-36 w-full rounded-[15px]" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-[13px]" />
          <Skeleton className="h-24 rounded-[13px]" />
          <Skeleton className="h-24 rounded-[13px]" />
        </div>
      </div>
    );
  }

  const promoMonths =
    data?.campaign?.rewardMonths ?? data?.standardRewardMonths ?? 3;
  const promoLabel = formatReferralRewardLabel(promoMonths);
  const hasSession = Boolean(user && getSessionToken());

  if (!data) {
    if (!hasSession) {
      return (
        <div className="p-4 sm:p-6 md:p-10 xl:p-12">
          <div className="mx-auto max-w-[1320px] space-y-5">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#071f3f] md:text-[32px]">
                Refer a friend
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] text-[#6b7890] md:text-[16px]">
                Sign in to view your referral link and rewards.
              </p>
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="mt-4 rounded-[8px] bg-[#0f2040] px-4 py-2 text-[13px] font-semibold text-white"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 md:p-10 xl:p-12">
        <div className="mx-auto max-w-[1320px] space-y-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#071f3f] md:text-[32px]">
              Refer a friend
            </h1>
            <p className="mt-2 max-w-3xl text-[15px] text-[#6b7890] md:text-[16px]">
              Share KeenVPN with your friends and earn free months when they
              subscribe.
            </p>
          </div>
          <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <p>{fetchError ?? "Unable to load referral data."}</p>
            <button
              type="button"
              className="mt-3 font-semibold text-[#0f2040] underline"
              onClick={() => {
                setLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const referralUrl = data.referralUrl;

  return (
    <div className="p-4 sm:p-6 md:p-10 xl:p-12">
      <div className="mx-auto max-w-[1320px] space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#071f3f] md:text-[32px]">
            Refer a friend and get{" "}
            <span className="text-[#ed7d36]">{promoLabel}</span>
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] text-[#6b7890] md:text-[16px]">
            Share KeenVPN with your friends and you&apos;ll both get {promoLabel}{" "}
            when they subscribe to any paid plan.
          </p>
        </div>

        {data.rewardsAwaitingSubscription > 0 && !data.canReceiveRewards ? (
          <div className="flex flex-col gap-3 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">
              {data.rewardsAwaitingSubscription === 1
                ? "A friend subscribed. Start or resume KeenVPN and your referral reward will apply automatically."
                : `${data.rewardsAwaitingSubscription} friends subscribed. Start or resume KeenVPN and your referral rewards will apply automatically.`}
            </p>
            <button
              type="button"
              onClick={() => navigate("/subscription?tab=plans")}
              className="shrink-0 rounded-[8px] bg-[#0f2040] px-4 py-2 text-[13px] font-semibold text-white"
            >
              View plans
            </button>
          </div>
        ) : null}

        {/* Referral link card */}
        <div className="grid overflow-hidden rounded-[15px] border border-[#e3e8f0] bg-white shadow-[0px_3px_10px_rgba(15,32,64,0.06)] md:grid-cols-[minmax(0,1fr)_350px]">
          <div className="p-6 md:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[15px] bg-[#fff1e5]">
                <Link2 className="h-7 w-7 text-[#ff7900]" />
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-bold text-[#0f2040]">
                  Your referral link
                </p>
                <p className="mt-1 text-[15px] leading-6 text-[#627086]">
                  Anyone who signs up with this link is attributed to you. You can
                  share it even before they subscribe.
                </p>
              </div>
            </div>
            <div className="mt-5 flex overflow-hidden rounded-[10px] border border-[#dfe5ef] bg-[#fbfcff]">
              <p className="min-w-0 flex-1 truncate px-4 py-3 text-[15px] font-semibold tracking-[0.3px] text-[#405276]">
                {referralUrl}
              </p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex shrink-0 items-center gap-2 border-l border-[#e3e8f0] bg-white px-5 text-[15px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f7f9fc]"
              >
                <Copy className="h-5 w-5 text-[#ff7900]" />
                Copy link
              </button>
            </div>
          </div>
          <div className="flex min-h-[210px] items-end justify-center border-t border-[#e3e8f0] bg-white px-5 pt-4 md:border-l md:border-t-0">
            <img
              src="/dashboard/referral-gift.png"
              alt="Friends sharing a gift"
              className="h-[190px] w-auto max-w-full object-contain object-bottom"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid overflow-hidden rounded-[15px] border border-[#e3e8f0] bg-white shadow-[0px_3px_10px_rgba(15,32,64,0.06)] sm:grid-cols-3 sm:divide-x sm:divide-[#e3e8f0]">
          {[
            {
              icon: <Users className="h-6 w-6 text-[#3b6ae8]" />,
              bg: "bg-[#eef3ff]",
              title: "Invites",
              value: data.totalReferrals,
              label: "Total friends invited",
            },
            {
              icon: <Gift className="h-6 w-6 text-[#17ab66]" />,
              bg: "bg-[#e6f9f0]",
              title: "Rewards",
              value: data.rewardsEarned,
              label: "Free months earned",
            },
            {
              icon: <Clock className="h-6 w-6 text-[#f3ad00]" />,
              bg: "bg-[#fff4e5]",
              title: "Pending",
              value: data.pendingReferrals,
              label: "Friends yet to subscribe",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-5 px-7 py-7 first:border-b first:border-[#e3e8f0] sm:first:border-b-0"
            >
              <div
                className={`flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[15px] ${stat.bg}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-[17px] text-[#627086]">{stat.title}</p>
                <p className="mt-0.5 text-[32px] font-bold leading-none text-[#071f3f]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[15px] text-[#8c9ab3]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Referrals + How it works */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_378px]">
          <div className="overflow-hidden rounded-[15px] border border-[#e3e8f0] bg-white shadow-[0px_3px_10px_rgba(15,32,64,0.06)]">
            <div className="px-6 pb-4 pt-6">
              <h2 className="text-[17px] font-bold text-[#071f3f]">
                Your referrals
              </h2>
              <p className="mt-1 text-[15px] text-[#627086]">
                Invitees appear as Pending until they start a trial and subscribe.
              </p>
            </div>

            <div className="overflow-x-auto border-t border-[#e3e8f0]">
              <table className="w-full min-w-[480px] text-left text-[14px]">
                <thead className="text-[#71809a]">
                  <tr className="border-b border-[#e3e8f0] text-[#a0aabb]">
                    <th className="px-6 py-3 font-medium">Friend</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-10 text-center text-[#627086]"
                      >
                        No referrals yet. Share your link to get started.
                      </td>
                    </tr>
                  ) : (
                    data.referrals.map((row) => {
                      const badge = statusLabel(row.status);
                      const date =
                        row.subscribedAt ||
                        row.trialStartedAt ||
                        row.signedUpAt;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-[#eef2f7] last:border-0"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7efff] text-[12px] font-semibold text-[#3b6ae8]">
                                {initials(row.refereeName, row.refereeEmail)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#0f2040]">
                                  {row.refereeName || "Friend"}
                                </p>
                                <p className="truncate text-[#627086]">
                                  {row.refereeEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.text}
                            </span>
                            {date ? (
                              <p className="mt-1 text-[12px] text-[#627086]">
                                {formatDate(date)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-medium text-[#0f2040]">
                              {promoLabel}
                            </p>
                            {row.rewardedAt ? (
                              <span className="mt-1 inline-flex rounded-full bg-[#e6f9f0] px-2 py-0.5 text-[11px] font-semibold text-[#1a9e5a]">
                                Reward applied
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {data?.referralsHasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="m-6 flex items-center gap-2 text-[13px] font-semibold text-[#ed7d36]"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Load more
              </button>
            ) : null}
          </div>

          {/* How it works */}
          <div className="rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-[0px_3px_10px_rgba(15,32,64,0.06)]">
            <h2 className="mb-5 text-[16px] font-bold text-[#071f3f]">
              How it works
            </h2>
            <ol className="relative space-y-6 border-l-2 border-[#ffe0c8] pl-6">
              {[
                {
                  title: "Invite a friend",
                  desc: "Share your referral link with friends via any channel.",
                },
                {
                  title: "They subscribe",
                  desc: "Your friend starts a paid subscription.",
                },
                {
                  title: "You both get rewards",
                  desc: `You and your friend each get ${promoLabel}.`,
                },
              ].map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="absolute -left-[33px] flex h-7 w-7 items-center justify-center rounded-full bg-[#ed7d36] text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-[14px] font-semibold text-[#0f2040]">
                    {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
