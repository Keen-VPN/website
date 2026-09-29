import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Gavel, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyEmailCategoryPreferences,
  fetchPerks,
  getSessionToken,
  updateMyEmailCategoryPreferences,
  type PerkItem,
} from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EyebrowLabel,
  HowThisPageWorks,
  SettlementCard,
  SettlementLogo,
  SettlementPartnerLine,
} from "@/components/dashboard/class-action/SettlementParts";
import {
  CLASS_ACTION_CATEGORY,
  displaySettlementTitle,
  filterSettlements,
  formatDaysLeft,
  isSettlementClosed,
  isSubscribedToPerkOffers,
  parseClassActionFilter,
  settlementClaimDeadline,
  settlementDaysRemaining,
  settlementStats,
  sortSettlements,
  type ClassActionFilter,
} from "@/lib/class-action-settlements";
import { cn } from "@/lib/utils";

const PAGE_PADDING = "px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10";

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[140px] flex-1 rounded-[14px] border border-[#e7edf5] bg-white px-4 py-3.5 sm:flex-none">
      <EyebrowLabel>{label}</EyebrowLabel>
      <p
        className={cn(
          "mt-1 text-[28px] font-bold leading-none",
          accent ? "text-[#b24a14]" : "text-[#0f2040]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-[10px] border px-4 py-2 text-[14px] font-medium transition-colors",
        active
          ? "border-[#0f2040] bg-[#0f2040] text-white"
          : "border-[#e7edf5] bg-white text-[#0f2040] hover:bg-[#f0f3f8]",
      )}
    >
      {children}
    </button>
  );
}

function SettlementListCard({ perk }: { perk: PerkItem }) {
  const closed = isSettlementClosed(perk);
  const closingSoon = perk.settlementStatus === "closing_soon";
  const deadline = settlementClaimDeadline(perk);
  const daysLeft = closed
    ? null
    : formatDaysLeft(settlementDaysRemaining(perk));
  const detailPath = `/class-action/${encodeURIComponent(perk.id)}`;
  const eligibility = perk.eligibilityTags?.filter(Boolean) ?? [];

  return (
    <article
      className={cn(
        "flex flex-col gap-5 rounded-[18px] border border-[#e7edf5] p-5 shadow-[0_2px_8px_rgba(15,32,64,0.04)] sm:p-6 lg:flex-row lg:items-start lg:justify-between",
        closed ? "bg-[#fbfcfe]" : "bg-white",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-4">
        {/* Fade only the logo; text keeps full contrast on closed cards. */}
        <div className={cn("shrink-0", closed && "opacity-70")}>
          <SettlementLogo
            imageUrl={perk.imageUrl}
            partnerName={perk.partnerName}
            title={perk.title}
          />
        </div>
        <div className="min-w-0 flex-1">
          <SettlementPartnerLine
            partnerName={perk.partnerName}
            status={perk.settlementStatus}
          />
          <h2
            className={cn(
              "mt-2 text-[20px] font-bold leading-snug tracking-[-0.3px]",
              closed ? "text-[#43516a]" : "text-[#0f2040]",
            )}
          >
            <Link to={detailPath} className="hover:underline">
              {displaySettlementTitle(perk.title)}
            </Link>
          </h2>
          {perk.description ? (
            <p className="mt-2 line-clamp-2 max-w-[680px] text-[15px] leading-[1.55] text-[#627086]">
              {perk.description}
            </p>
          ) : null}
          {!closed && (eligibility.length > 0 || perk.docsNeededLabel) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {eligibility.length > 0 ? (
                <span className="max-w-full truncate rounded-[8px] border border-[#e7edf5] bg-[#f7f9fc] px-3 py-1 text-[13px] text-[#43516a]">
                  <span className="font-semibold text-[#0f2040]">
                    Eligibility:{" "}
                  </span>
                  {eligibility.join(" · ")}
                </span>
              ) : null}
              {perk.docsNeededLabel ? (
                <span className="max-w-full truncate rounded-[8px] border border-[#e7edf5] bg-[#f7f9fc] px-3 py-1 text-[13px] text-[#43516a]">
                  {perk.docsNeededLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-[320px] lg:shrink-0">
        <div
          className={cn(
            "rounded-[12px] border px-4 py-3",
            closingSoon
              ? "border-[#f6d3b8] bg-[#fff8f2]"
              : "border-[#e7edf5] bg-[#f7f9fc]",
          )}
        >
          <EyebrowLabel>
            {closed ? "Claim window closed" : "Claim by"}
          </EyebrowLabel>
          <p
            className={cn(
              "mt-0.5 text-[22px] font-bold leading-tight",
              closingSoon
                ? "text-[#b24a14]"
                : closed
                  ? "text-[#8390a5]"
                  : "text-[#0f2040]",
            )}
          >
            {deadline ?? "No deadline listed"}
          </p>
          {daysLeft ? (
            <p
              className={cn(
                "text-[13px]",
                closingSoon ? "text-[#b24a14]" : "text-[#627086]",
              )}
            >
              {daysLeft}
            </p>
          ) : null}
        </div>

        {!closed && perk.potentialPayment ? (
          <div className="px-1">
            <EyebrowLabel>Potential payment</EyebrowLabel>
            <p className="mt-0.5 line-clamp-2 text-[16px] font-semibold text-[#0f2040]">
              {perk.potentialPayment}
            </p>
          </div>
        ) : null}

        {closed ? (
          <>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-[10px] border border-[#e7edf5] bg-[#f0f3f8] py-3 text-[15px] font-semibold text-[#8390a5]"
            >
              Claim window closed
            </button>
            <Link
              to={detailPath}
              className="text-center text-[14px] text-[#627086] hover:text-[#0f2040] hover:underline"
            >
              View details
            </Link>
          </>
        ) : (
          <Link
            to={detailPath}
            className="w-full rounded-[10px] bg-[#0f2040] py-3 text-center text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  );
}

function EmptyOpenState({
  closedCount,
  onViewClosed,
  subscribed,
  subscribing,
  onSubscribe,
}: {
  closedCount: number;
  onViewClosed: () => void;
  subscribed: boolean;
  subscribing: boolean;
  onSubscribe: () => void;
}) {
  return (
    <SettlementCard className="px-6 py-12 text-center sm:py-16">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#fff4eb]">
        <Gavel className="h-6 w-6 text-[#ed7d36]" strokeWidth={2.25} />
      </div>
      <h2 className="mt-5 text-[22px] font-bold text-[#0f2040]">
        No new Class Actions right now
      </h2>
      <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-[1.6] text-[#627086]">
        We&apos;ll add new opportunities here as they become available.
        {subscribed
          ? null
          : " You can also turn on Class Actions & Perks emails so you hear about a settlement while there is still time to file."}
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {subscribed ? null : (
          <button
            type="button"
            onClick={onSubscribe}
            disabled={subscribing}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#0f2040] px-5 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Email me about Class Actions &amp; Perks
          </button>
        )}
        {closedCount > 0 ? (
          <button
            type="button"
            onClick={onViewClosed}
            className="rounded-[10px] border border-[#e7edf5] bg-white px-5 py-3 text-[15px] font-semibold text-[#0f2040] hover:bg-[#f0f3f8]"
          >
            View {closedCount} closed settlement{closedCount === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>
    </SettlementCard>
  );
}

export default function DashboardClassAction() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseClassActionFilter(searchParams.get("filter"));

  const [perks, setPerks] = useState<PerkItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [perksOffersSubscribed, setPerksOffersSubscribed] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const session = getSessionToken();
    if (!user || !session) {
      setPerks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPerks(session, {
      category: CLASS_ACTION_CATEGORY,
      status: "all",
    }).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setPerks(res.data.perks);
      } else {
        setPerks(null);
        setError(res.error?.trim() || "Unable to load Class Actions.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadKey]);

  const stats = useMemo(() => settlementStats(perks ?? []), [perks]);
  const visible = useMemo(
    () => sortSettlements(filterSettlements(perks ?? [], filter), filter),
    [perks, filter],
  );
  const noOpenSettlements = perks !== null && stats.openNow === 0;

  // Only the empty state needs the email preference. Keyed on the member so a
  // different account never inherits the previous member's subscription state.
  useEffect(() => {
    setPerksOffersSubscribed(true);
    if (!noOpenSettlements || !user) return;
    const session = getSessionToken();
    if (!session) return;
    let cancelled = false;
    void fetchMyEmailCategoryPreferences(session).then((res) => {
      if (!cancelled) setPerksOffersSubscribed(isSubscribedToPerkOffers(res));
    });
    return () => {
      cancelled = true;
    };
  }, [noOpenSettlements, user]);

  const setFilter = (next: ClassActionFilter) => {
    setSearchParams(next === "all" ? {} : { filter: next }, { replace: true });
  };

  const subscribe = async () => {
    const session = getSessionToken();
    if (!session || subscribing) return;
    setSubscribing(true);
    const res = await updateMyEmailCategoryPreferences(session, {
      perks_offers: true,
    });
    setSubscribing(false);
    if (res.success) {
      setPerksOffersSubscribed(true);
      toast({
        title: "You're subscribed",
        description: "We'll email you about new Class Actions and Perks.",
      });
    } else {
      toast({
        title: "Could not update email preferences",
        description: res.error?.trim() || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className={PAGE_PADDING}>
        <div className="mx-auto w-full max-w-[1140px] space-y-5">
          <Skeleton className="h-10 w-full max-w-[420px]" />
          <Skeleton className="h-5 w-full max-w-[640px]" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-[10px]" />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-[18px]" />
          ))}
        </div>
      </div>
    );
  }

  const showingClosed = filter === "closed";
  const showStats = !(filter === "all" && noOpenSettlements);

  return (
    <div className={PAGE_PADDING}>
      <div className="mx-auto w-full max-w-[1140px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-[720px]">
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-[#0f2040] sm:text-[34px]">
              {showingClosed
                ? "Closed settlements"
                : "Settlements you may qualify for"}
            </h1>
            <p className="mt-2 text-[15px] leading-[1.6] text-[#627086] sm:text-[16px]">
              {showingClosed
                ? "These claim windows have passed, so nothing new can be filed. They stay here for your records — if you filed in time, you can still check your claim status with the administrator."
                : "We track public class-action settlements and show the ones most likely to match KeenVPN customers. Check the eligibility details before you file — only you can confirm whether a settlement applies to you."}
            </p>
          </div>
          {showStats && !error ? (
            <div className="flex gap-3">
              <StatTile label="Open now" value={stats.openNow} />
              <StatTile
                label="Closing in 30 days"
                value={stats.closingSoon}
                accent
              />
            </div>
          ) : null}
        </div>

        {error ? (
          <SettlementCard className="mt-8 text-center">
            <p className="text-[16px] font-semibold text-[#0f2040]">
              We couldn&apos;t load Class Actions
            </p>
            <p className="mt-1 text-[14px] text-[#627086]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-[10px] bg-[#0f2040] px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
            >
              Try again
            </button>
          </SettlementCard>
        ) : filter === "all" && noOpenSettlements ? (
          <div className="mt-8 space-y-5">
            <EmptyOpenState
              closedCount={stats.closed}
              onViewClosed={() => setFilter("closed")}
              subscribed={perksOffersSubscribed}
              subscribing={subscribing}
              onSubscribe={() => void subscribe()}
            />
            <HowThisPageWorks />
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <FilterChip
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  All ({stats.openNow})
                </FilterChip>
                <FilterChip
                  active={filter === "closing_soon"}
                  onClick={() => setFilter("closing_soon")}
                >
                  Closing soon
                </FilterChip>
                <FilterChip
                  active={filter === "no_docs"}
                  onClick={() => setFilter("no_docs")}
                >
                  No documents needed
                </FilterChip>
                <FilterChip
                  active={filter === "closed"}
                  onClick={() => setFilter("closed")}
                >
                  Closed ({stats.closed})
                </FilterChip>
              </div>
              <p className="hidden shrink-0 text-[14px] text-[#627086] md:block">
                Sorted by deadline
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {visible.length === 0 ? (
                <SettlementCard className="py-10 text-center">
                  <p className="text-[16px] font-semibold text-[#0f2040]">
                    No settlements match this filter
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-2 text-[14px] font-medium text-[#ed7d36] hover:underline"
                  >
                    Show all open settlements
                  </button>
                </SettlementCard>
              ) : (
                visible.map((perk) => (
                  <SettlementListCard key={perk.id} perk={perk} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
