import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPerk,
  getSessionToken,
  recordPerkEvent,
  type PerkDetail,
} from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EyebrowLabel,
  SettlementCard,
  SettlementLogo,
  SettlementPartnerLine,
} from "@/components/dashboard/class-action/SettlementParts";
import {
  CLASS_ACTION_CATEGORY,
  claimHost,
  displaySettlementTitle,
  firstNonBlank,
  formatDaysLeft,
  formatSettlementDate,
  isSettlementClosed,
  resolveClaimActions,
  settlementDaysRemaining,
  settlementStatusLabel,
} from "@/lib/class-action-settlements";
import { cn } from "@/lib/utils";

const PAGE_PADDING = "px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; perk: PerkDetail }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SettlementCard>
      <h2 className="text-[18px] font-semibold text-[#0f2040]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-[#43516a]">
        {children}
      </div>
    </SettlementCard>
  );
}

function BackLink({ closed }: { closed: boolean }) {
  return (
    <Link
      to={closed ? "/class-action?filter=closed" : "/class-action"}
      className="inline-flex items-center gap-2 text-[15px] font-medium text-[#43516a] hover:text-[#0f2040]"
    >
      <ArrowLeft className="h-4 w-4" />
      {closed ? "Closed settlements" : "All Class Actions"}
    </Link>
  );
}

function GlanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-[14px] text-[#627086]">{label}</dt>
      <dd className="text-right text-[14px] font-semibold text-[#0f2040]">{value}</dd>
    </div>
  );
}

function SettlementDetailView({ perk }: { perk: PerkDetail }) {
  // Page state follows settlementStatus, like the list, filters and back link.
  // A disabled primary CTA is handled by resolveClaimActions for the buttons only.
  const closed = isSettlementClosed(perk);
  const closingSoon = perk.settlementStatus === "closing_soon";
  const actions = resolveClaimActions(perk);
  const host = claimHost(actions.claimUrl);
  // Glance first, like settlementDaysRemaining, so "Claim by" and days left
  // always come from the same record. formatSettlementDate returns null for
  // blank or invalid dates, so each source is tried in turn.
  const deadline =
    formatSettlementDate(perk.atAGlance?.claimBy) ??
    formatSettlementDate(perk.claimDeadline);
  const payment =
    firstNonBlank(perk.potentialPayment, perk.atAGlance?.expectedPayout) ??
    "See claim details";
  const daysLeft = closed
    ? null
    : formatDaysLeft(settlementDaysRemaining(perk));

  const claim = () => {
    if (!actions.canClaim || !actions.claimUrl) return;
    // Open first so the popup blocker keeps the user gesture. Never call
    // claimPerk here: it triggers friend discovery sharing of a legal claim.
    openInNewTab(actions.claimUrl);
    const session = getSessionToken();
    if (session) {
      void recordPerkEvent(session, "perk_clicked", {
        perkId: perk.id,
        source: "class_action_page",
      });
    }
  };

  const checkExisting = () => {
    if (actions.claimUrl) openInNewTab(actions.claimUrl);
  };

  const disabledLabel = closed
    ? "Claim window closed"
    : !actions.claimUrl
      ? "Claim link unavailable"
      : perk.cta?.primaryDisabled
        ? perk.cta.primary
        : perk.ctaLabel;

  const claimButton =
    actions.canClaim ? (
      <button
        type="button"
        onClick={claim}
        className="w-full rounded-[12px] bg-[#0f2040] px-5 py-3.5 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Open the official claim form
      </button>
    ) : (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-[12px] border border-[#e7edf5] bg-[#f0f3f8] px-5 py-3.5 text-[16px] font-semibold text-[#8390a5]"
      >
        {disabledLabel}
      </button>
    );

  return (
    <div className="mx-auto w-full max-w-[1140px]">
      <BackLink closed={closed} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <SettlementCard className="lg:col-start-1 lg:row-start-1">
          <div className="flex gap-4">
            <SettlementLogo
              imageUrl={perk.imageUrl}
              partnerName={perk.partnerName}
              title={perk.title}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <SettlementPartnerLine
                partnerName={perk.partnerName}
                status={perk.settlementStatus}
              />
              <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.5px] text-[#0f2040] sm:text-[32px]">
                {displaySettlementTitle(perk.title)}
              </h1>
              {perk.caseLabel ? (
                <p className="mt-2 text-[14px] text-[#627086]">{perk.caseLabel}</p>
              ) : null}
            </div>
          </div>
        </SettlementCard>

        <aside className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <SettlementCard
            className={cn(closingSoon && "border-[#f6d3b8]")}
          >
            <EyebrowLabel>{closed ? "Claim window closed" : "Claim by"}</EyebrowLabel>
            <p
              className={cn(
                "mt-1 text-[28px] font-bold leading-tight",
                closingSoon ? "text-[#b24a14]" : closed ? "text-[#8390a5]" : "text-[#0f2040]",
              )}
            >
              {deadline ?? "No deadline listed"}
            </p>
            {closed && deadline ? (
              <p className="text-[15px] text-[#627086]">Deadline passed {deadline}</p>
            ) : daysLeft ? (
              <p className={cn("text-[15px]", closingSoon ? "text-[#b24a14]" : "text-[#627086]")}>
                {daysLeft}
              </p>
            ) : null}

            <div className="my-5 h-px bg-[#e7edf5]" />

            <EyebrowLabel>Potential payment</EyebrowLabel>
            <p className="mt-1 text-[24px] font-bold leading-tight text-[#0f2040]">
              {closed
                ? "Closed — no longer claimable"
                : payment}
            </p>
            {closed ? (
              <p className="mt-4 text-[15px] leading-[1.6] text-[#627086]">
                This claim window has closed. Kept here for your records.
              </p>
            ) : null}

            <div className="mt-5 space-y-3">
              {claimButton}
              {actions.showCheckExisting ? (
                <button
                  type="button"
                  onClick={checkExisting}
                  className="w-full rounded-[12px] border border-[#e7edf5] bg-white px-5 py-3.5 text-[16px] font-semibold text-[#0f2040] hover:bg-[#f7f9fc]"
                >
                  Check an existing claim
                </button>
              ) : null}
            </div>
          </SettlementCard>

          <SettlementCard>
            <h2 className="text-[17px] font-semibold text-[#0f2040]">At a glance</h2>
            <dl className="mt-2">
              <GlanceRow label="Status" value={settlementStatusLabel(perk.settlementStatus)} />
              <GlanceRow
                label="Proof needed"
                value={perk.docsNeededLabel ?? perk.atAGlance?.proof ?? "See claim details"}
              />
              {perk.atAGlance?.paymentMethod ? (
                <GlanceRow label="Payment method" value={perk.atAGlance.paymentMethod} />
              ) : null}
              <GlanceRow label="Claim by" value={deadline ?? "No deadline listed"} />
            </dl>
          </SettlementCard>
        </aside>

        <div className="space-y-5 lg:col-start-1 lg:row-start-2">
          {perk.whatHappened ? (
            <Section title="What happened">
              <p>{perk.whatHappened}</p>
            </Section>
          ) : null}

          {perk.whoMayQualify ? (
            <Section title="Who may qualify">
              <p>{perk.whoMayQualify}</p>
              {closed ? (
                <p className="rounded-[12px] border border-[#e7edf5] bg-[#f5f7fb] px-4 py-3 text-[14px] text-[#627086]">
                  The claim deadline has passed, so new claims can no longer be filed.
                </p>
              ) : null}
            </Section>
          ) : null}

          <Section title="What you may need">
            {perk.docsNeededLabel ? (
              <div>
                <span className="inline-block rounded-[10px] border border-[#e7edf5] bg-[#f7f9fc] px-3.5 py-2 text-[14px] text-[#43516a]">
                  {perk.docsNeededLabel}
                </span>
              </div>
            ) : null}
            <p>
              {closed
                ? "Nothing to do here. If you filed before the deadline, check your status on the administrator’s site."
                : perk.whatYouMayNeed}
            </p>
          </Section>

          <Section title="How to claim">
            {perk.howToClaim ? <p>{perk.howToClaim}</p> : null}
            {!closed ? (
              <div className="pt-2">
                {claimButton}
                {actions.canClaim && host ? (
                  <p className="mt-3 text-[14px] text-[#627086]">Opens {host} in a new tab</p>
                ) : null}
              </div>
            ) : null}
          </Section>

          <SettlementCard>
            <h2 className="text-[18px] font-semibold text-[#0f2040]">Source</h2>
            {host && actions.claimUrl && (actions.canClaim || actions.showCheckExisting) ? (
              <dl className="mt-3 grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[14px]">
                <dt className="text-[#627086]">Claim site</dt>
                <dd className="min-w-0">
                  <a
                    href={actions.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-semibold text-[#ed7d36] hover:underline"
                  >
                    {host}
                  </a>
                </dd>
              </dl>
            ) : null}
            <p className="mt-4 border-t border-[#e7edf5] pt-4 text-[13px] leading-[1.6] text-[#627086]">
              KeenVPN summarises public settlement notices for convenience. It is
              not legal advice, and the official settlement website is always the
              authority on eligibility and deadlines.
            </p>
          </SettlementCard>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClassActionDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    const session = getSessionToken();
    if (!user || !session || !id.trim()) {
      setState({ kind: "not_found" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    void fetchPerk(session, id.trim()).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setState(
          res.data.category === CLASS_ACTION_CATEGORY
            ? { kind: "ready", perk: res.data }
            : { kind: "not_found" },
        );
      } else if (res.notFound) {
        setState({ kind: "not_found" });
      } else {
        setState({
          kind: "error",
          message: res.error?.trim() || "Unable to load this settlement.",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, reloadKey]);

  if (authLoading || state.kind === "loading") {
    return (
      <div className={PAGE_PADDING}>
        <div className="mx-auto grid w-full max-w-[1140px] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-36 w-full rounded-[16px]" />
            <Skeleton className="h-48 w-full rounded-[16px]" />
          </div>
          <Skeleton className="h-80 w-full rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (state.kind === "ready") {
    return (
      <div className={PAGE_PADDING}>
        <SettlementDetailView perk={state.perk} />
      </div>
    );
  }

  return (
    <div className={PAGE_PADDING}>
      <div className="mx-auto w-full max-w-[1140px]">
        <BackLink closed={false} />
        <SettlementCard className="mt-5 py-10 text-center">
          <p className="text-[18px] font-semibold text-[#0f2040]">
            {state.kind === "not_found"
              ? "This settlement isn’t available"
              : "We couldn’t load this settlement"}
          </p>
          <p className="mt-1 text-[14px] text-[#627086]">
            {state.kind === "not_found"
              ? "It may have been removed, or it isn’t listed for your account."
              : state.message}
          </p>
          {state.kind === "error" ? (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-[10px] bg-[#0f2040] px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
            >
              Try again
            </button>
          ) : null}
        </SettlementCard>
      </div>
    </div>
  );
}
