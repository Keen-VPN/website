import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fetchSubscriptionPlans } from "@/auth/backend";
import { useMembershipSharingContext } from "@/contexts/MembershipSharingContext";
import { useAuth } from "@/contexts/AuthContext";
import { workspacePanelSurface } from "@/components/workspace/workspace-ui";
import {
  formatChargeAfterPrepaidSeatsCopy,
  formatChargeOnAcceptInviteCopy,
  formatTrialSeatBillingCopy,
} from "@/lib/business-seat-billing-copy";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface MembershipTeamPanelProps {
  /** Kept for call-site compatibility; dashboard state comes from context. */
  sessionToken?: string;
  /** compact = subscription card; full = workspace panel; dashboard = new home UI */
  variant?: "compact" | "full" | "dashboard";
  className?: string;
  /** When true, render nothing for users who are not on Business / team access. */
  hideIfIneligible?: boolean;
}

export function MembershipTeamPanel({
  variant = "compact",
  className,
  hideIfIneligible = false,
}: MembershipTeamPanelProps) {
  const { refreshSubscription } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const {
    dashboard,
    loading,
    submitting,
    error,
    sharingDisabled,
    setDraftSeatCount,
    invite,
    revokeMember,
    resendInvite,
    cancelInvite,
    leaveMembership,
    updateSeats,
    canInvite,
    seatFloor,
    currentSeatLimit,
    effectiveDraftSeats,
    seatsChanged,
    MAX_BUSINESS_SEATS,
  } = useMembershipSharingContext();
  const [catalogSeatPrice, setCatalogSeatPrice] = useState<{
    amount: number;
    period: "month" | "year";
  } | null>(null);

  const handleLeaveMembership = async () => {
    const left = await leaveMembership();
    if (left) {
      await refreshSubscription();
    }
  };

  useEffect(() => {
    let ignore = false;
    setCatalogSeatPrice(null);
    void fetchSubscriptionPlans().then((res) => {
      if (ignore || !res.success || !res.plans) return;
      const billingPeriod =
        dashboard?.billingPeriod === "year" ? "year" : "month";
      const match =
        res.plans.find((plan) => {
          const id = plan.id.toLowerCase();
          const isBusiness =
            plan.isPerSeat === true ||
            id.includes("team") ||
            id.includes("business");
          if (!isBusiness) return false;
          const period = plan.period ?? plan.billingPeriod;
          return period === billingPeriod;
        }) ?? null;
      if (
        match &&
        typeof match.price === "number" &&
        Number.isFinite(match.price) &&
        match.price > 0
      ) {
        setCatalogSeatPrice({
          amount: match.price,
          period: billingPeriod,
        });
      }
    });
    return () => {
      ignore = true;
    };
  }, [dashboard?.billingPeriod]);

  const isCompact = variant === "compact";
  const isDashboard = variant === "dashboard";
  const shellClass = isDashboard
    ? "space-y-4 rounded-[13px] border border-[#e3e8f0] bg-white p-5 shadow-[0px_3px_4px_rgba(15,32,64,0.03),0px_16px_19px_rgba(15,32,64,0.06)] sm:p-6"
    : isCompact
      ? "space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4"
      : cn(workspacePanelSurface, "space-y-4 px-4 py-4 sm:px-5");

  if (loading) {
    if (hideIfIneligible) return null;
    return (
      <div className={cn(shellClass, className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading team sharing…
        </div>
      </div>
    );
  }

  if (sharingDisabled) {
    if (hideIfIneligible) return null;
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    if (!error) return null;
    if (hideIfIneligible) return null;
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (dashboard.role === "member" && dashboard.membership) {
    return (
      <div className={cn(shellClass, className)}>
        {isDashboard ? (
          <div className="mb-1">
            <h2 className="text-[16px] font-semibold text-[#0f2040]">Team</h2>
            <p className="mt-1 text-[13px] text-[#627086]">
              You have shared Business access.
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              "min-w-0 text-sm",
              isDashboard ? "text-[#627086]" : "text-muted-foreground",
            )}
          >
            Premium access through {dashboard.membership.ownerEmail}.
          </p>
          <Button
            type="button"
            variant={isDashboard ? "outline" : "destructive"}
            size="sm"
            className={cn(
              "shrink-0 self-start sm:self-auto",
              isDashboard &&
                "w-full rounded-[8px] border border-[#f0b4b4] bg-white text-[13px] font-semibold text-[#d14343] hover:bg-[#fff5f5] sm:w-auto",
            )}
            disabled={submitting}
            onClick={() => {
              if (
                !window.confirm(
                  "Leave this team? You will lose shared access immediately.",
                )
              ) {
                return;
              }
              void handleLeaveMembership();
            }}
          >
            {submitting ? "Leaving…" : "Leave team"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (dashboard.role === "transfer_pending" && dashboard.pendingTransfer) {
    const transfer = dashboard.pendingTransfer;
    const statusCopy =
      transfer.status === "billing_pending"
        ? `Finishing setup with ${transfer.ownerEmail}. Shared access turns on once billing completes.`
        : transfer.billingDeferredUntil
          ? `Your current plan stays active through ${formatDate(
              transfer.billingDeferredUntil,
            )}. After that, ${transfer.ownerEmail} covers your KeenVPN access.`
          : `Your current plan stays active until its paid time ends. After that, ${transfer.ownerEmail} covers your KeenVPN access.`;

    return (
      <div className={cn(shellClass, className)}>
        {isDashboard ? (
          <div className="mb-1">
            <h2 className="text-[16px] font-semibold text-[#0f2040]">Team</h2>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p
            className={cn(
              "min-w-0 text-sm",
              isDashboard ? "text-[#627086]" : "text-muted-foreground",
            )}
          >
            {statusCopy}
          </p>
          <Button
            type="button"
            variant={isDashboard ? "outline" : "destructive"}
            size="sm"
            className={cn(
              "shrink-0 self-start sm:self-auto",
              isDashboard &&
                "w-full rounded-[8px] border border-[#f0b4b4] bg-white text-[13px] font-semibold text-[#d14343] hover:bg-[#fff5f5] sm:w-auto",
            )}
            disabled={submitting}
            onClick={() => {
              if (
                !window.confirm(
                  "Cancel joining this team? Your own plan will stay as it is.",
                )
              ) {
                return;
              }
              void handleLeaveMembership();
            }}
          >
            {submitting ? "Leaving…" : "Cancel"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (!dashboard.eligible) {
    if (hideIfIneligible) return null;
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-sm text-muted-foreground">
          Upgrade to Business to invite teammates with their own logins.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link to="/subscription?tab=plans">View Business plan</Link>
        </Button>
      </div>
    );
  }

  const seats = dashboard.seats;
  const chargeOnAccept = dashboard.chargeOnAccept === true;
  const subscriptionTrialing =
    dashboard.subscriptionStatus?.toLowerCase() === "trialing";
  const prepaidAvailableSeats = chargeOnAccept
    ? (seats?.prepaidAvailableSeats ??
      Math.max(0, (seats?.seatLimit ?? 1) - (seats?.activeSeats ?? 1)))
    : 0;
  const nextAcceptanceWillCharge =
    chargeOnAccept &&
    (seats?.nextAcceptanceWillCharge ?? prepaidAvailableSeats === 0);
  const billingCopyInput = {
    priceAmount: catalogSeatPrice?.amount ?? dashboard.priceAmount,
    billingPeriod:
      catalogSeatPrice?.period ?? dashboard.billingPeriod ?? undefined,
    priceCurrency: dashboard.priceCurrency,
  };
  const acceptChargeCopy = chargeOnAccept
    ? subscriptionTrialing
      ? formatTrialSeatBillingCopy(billingCopyInput)
      : nextAcceptanceWillCharge
        ? formatChargeOnAcceptInviteCopy(billingCopyInput)
        : formatChargeAfterPrepaidSeatsCopy(billingCopyInput)
    : null;

  const mutedText = isDashboard ? "text-[#627086]" : "text-muted-foreground";
  const headingText = isDashboard
    ? "text-[14px] font-semibold text-[#0f2040]"
    : "text-sm font-medium";
  const rowCard = isDashboard
    ? "rounded-[10px] border border-[#eef2f7] bg-[#fafbfd] p-3 sm:p-3.5"
    : "rounded-lg border border-border/80 p-3";
  const outlineBtn = isDashboard
    ? "h-9 rounded-[8px] border-[#dbe2ec] bg-white text-[13px] font-semibold text-[#0f2040] hover:bg-[#f5f7fb]"
    : undefined;
  const primaryBtn = isDashboard
    ? "h-9 rounded-[8px] bg-[#0f2040] text-[13px] font-semibold text-white hover:bg-[#0f2040]/90"
    : undefined;
  const dangerBtn = isDashboard
    ? "h-9 rounded-[8px] border border-[#f0b4b4] bg-white text-[13px] font-semibold text-[#d14343] hover:bg-[#fff5f5]"
    : undefined;

  return (
    <div className={cn(shellClass, className)}>
      <div className="flex items-start gap-3">
        <Users
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            isDashboard ? "text-[#ed7d36]" : "text-primary",
          )}
        />
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              isDashboard && "text-[16px] font-semibold text-[#0f2040]",
            )}
          >
            {isDashboard ? "Team members" : "Invite your team"}
          </p>
          <p className={cn("text-xs leading-relaxed", mutedText, isDashboard && "text-[13px]")}>
            {chargeOnAccept
              ? prepaidAvailableSeats > 0
                ? subscriptionTrialing
                  ? `${prepaidAvailableSeats} trial ${
                      prepaidAvailableSeats === 1 ? "seat" : "seats"
                    } available. Accepted teammates use ${
                      prepaidAvailableSeats === 1 ? "it" : "them"
                    } before any additional charge.`
                  : `${prepaidAvailableSeats} paid ${
                      prepaidAvailableSeats === 1 ? "seat" : "seats"
                    } available. Accepted teammates use ${
                      prepaidAvailableSeats === 1 ? "it" : "them"
                    } before any additional charge.`
                : subscriptionTrialing
                  ? "Send invites for free. Accepted teammates join during the trial, and billing begins when the trial ends."
                  : "Send invites for free. Billing starts only after a teammate accepts and has used any KeenVPN time they already paid for."
              : seats
                ? `${seats.activeSeats} of ${seats.seatLimit} seats in use · ${seats.availableSeats} available`
                : "Invite teammates by email. Each person gets their own login."}
          </p>
        </div>
      </div>

      {acceptChargeCopy ? (
        <p className={cn("text-xs leading-relaxed", mutedText)}>{acceptChargeCopy}</p>
      ) : null}

      {error ? <p className="text-sm text-[#d14343]">{error}</p> : null}

      {dashboard.canManageSeats && seats ? (
        <div
          className={cn(
            "space-y-2 p-3",
            isDashboard
              ? "rounded-[10px] border border-[#eef2f7] bg-[#fafbfd]"
              : "rounded-md border border-border/80 bg-background/80",
          )}
        >
          <p className={cn("text-xs font-medium", mutedText)}>Paid seats</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("h-8 w-8", outlineBtn)}
              aria-label="Decrease paid seats"
              disabled={submitting || effectiveDraftSeats <= seatFloor}
              onClick={() =>
                setDraftSeatCount((count) =>
                  Math.max(seatFloor, (count ?? currentSeatLimit) - 1),
                )
              }
            >
              −
            </Button>
            <span
              className={cn(
                "min-w-[2rem] text-center text-lg font-semibold",
                isDashboard && "text-[#0f2040]",
              )}
            >
              {effectiveDraftSeats}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("h-8 w-8", outlineBtn)}
              aria-label="Increase paid seats"
              disabled={submitting || effectiveDraftSeats >= MAX_BUSINESS_SEATS}
              onClick={() =>
                setDraftSeatCount((count) =>
                  Math.min(MAX_BUSINESS_SEATS, (count ?? currentSeatLimit) + 1),
                )
              }
            >
              +
            </Button>
            <Button
              onClick={() => void updateSeats()}
              disabled={submitting || !seatsChanged}
              size="sm"
              className={cn("w-full sm:w-auto", primaryBtn)}
            >
              {submitting ? "Updating…" : "Update seats"}
            </Button>
          </div>
        </div>
      ) : null}

      {canInvite ? (
        <div className="space-y-2">
          <label
            htmlFor={`membership-invite-email-${variant}`}
            className={cn(
              "text-sm font-medium",
              isDashboard && "text-[13px] font-semibold text-[#0f2040]",
            )}
          >
            Invite by email
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`membership-invite-email-${variant}`}
              type="email"
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={submitting}
              className={
                isDashboard
                  ? "h-10 rounded-[8px] border-[#dbe2ec] bg-white"
                  : undefined
              }
            />
            <Button
              onClick={async () => {
                const email = inviteEmail.trim();
                if (!email) return;
                const ok = await invite(email);
                if (ok) setInviteEmail("");
              }}
              disabled={submitting || !inviteEmail.trim()}
              className={cn("w-full shrink-0 sm:w-auto", primaryBtn)}
            >
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>
      ) : (
        <p className={cn("text-sm", mutedText)}>
          {chargeOnAccept
            ? "Maximum team size reached."
            : "All seats are in use. Remove a member, cancel a pending invite, or add more seats."}
        </p>
      )}

      {dashboard.members.length > 0 ? (
        <div className="space-y-2">
          <h3 className={headingText}>Active members</h3>
          <ul className="space-y-2">
            {dashboard.members.map((member) => (
              <li
                key={member.userId}
                className={cn(
                  "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                  rowCard,
                )}
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isDashboard && "text-[#0f2040]",
                    )}
                  >
                    {member.email}
                  </p>
                  <p className={cn("text-xs", mutedText)}>
                    Joined {formatDate(member.joinedAt)}
                  </p>
                </div>
                <Button
                  variant={isDashboard ? "outline" : "destructive"}
                  size="sm"
                  className={cn("w-full sm:w-auto", dangerBtn)}
                  onClick={() => void revokeMember(member.userId)}
                  disabled={submitting}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(() => {
        const openInvites = dashboard.pendingInvites.filter(
          (pending) => !pending.creditPending && !pending.billingPending,
        );
        const confirmedTransfers = dashboard.pendingInvites.filter(
          (pending) => pending.creditPending || pending.billingPending,
        );

        return (
          <>
            {openInvites.length > 0 ? (
              <div className="space-y-2">
                <h3 className={headingText}>
                  Pending invites
                  {chargeOnAccept ? (
                    <span className={cn("ml-1 font-normal", mutedText)}>
                      (sending is free)
                    </span>
                  ) : null}
                </h3>
                <ul className="space-y-2">
                  {openInvites.map((pending) => (
                    <li
                      key={pending.id}
                      className={cn(
                        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                        rowCard,
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isDashboard && "text-[#0f2040]",
                          )}
                        >
                          {pending.email}
                        </p>
                        <p className={cn("text-xs", mutedText)}>
                          Expires {formatDate(pending.expiresAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("w-full sm:w-auto", outlineBtn)}
                          onClick={() => void resendInvite(pending.id)}
                          disabled={submitting}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("w-full sm:w-auto", outlineBtn)}
                          onClick={() => void cancelInvite(pending.id)}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {confirmedTransfers.length > 0 ? (
              <div className="space-y-2">
                <h3 className={headingText}>Confirmed transfers</h3>
                <ul className="space-y-2">
                  {confirmedTransfers.map((pending) => (
                    <li
                      key={pending.id}
                      className={cn(
                        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                        rowCard,
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isDashboard && "text-[#0f2040]",
                          )}
                        >
                          {pending.email}
                        </p>
                        <p className={cn("text-xs", mutedText)}>
                          {pending.billingPending
                            ? "Accepted · completing membership billing"
                            : pending.billingDeferredUntil
                              ? `Accepted · their current plan stays active through ${formatDate(
                                  pending.billingDeferredUntil,
                                )}`
                              : "Accepted · their current paid time is being applied first"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("w-full sm:w-auto", outlineBtn)}
                        onClick={() => void cancelInvite(pending.id)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        );
      })()}

      {dashboard.revokedInvites && dashboard.revokedInvites.length > 0 ? (
        <div className="space-y-2">
          <h3 className={headingText}>Cancelled invites</h3>
          <ul className="space-y-2">
            {dashboard.revokedInvites.map((revoked) => (
              <li key={revoked.id} className={rowCard}>
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    isDashboard && "text-[#0f2040]",
                  )}
                >
                  {revoked.email}
                </p>
                {revoked.revokedAt ? (
                  <p className={cn("text-xs", mutedText)}>
                    Cancelled {formatDate(revoked.revokedAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
