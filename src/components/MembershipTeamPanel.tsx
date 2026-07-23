import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMembershipSharing } from "@/hooks/use-membership-sharing";
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
  sessionToken: string;
  /** compact = subscription card; full = workspace panel styling */
  variant?: "compact" | "full";
  className?: string;
}

export function MembershipTeamPanel({
  sessionToken,
  variant = "compact",
  className,
}: MembershipTeamPanelProps) {
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
    updateSeats,
    canInvite,
    seatFloor,
    currentSeatLimit,
    effectiveDraftSeats,
    seatsChanged,
    MAX_BUSINESS_SEATS,
  } = useMembershipSharing(sessionToken);

  const isCompact = variant === "compact";
  const shellClass = isCompact
    ? "space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4"
    : "space-y-4";

  if (loading) {
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
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    if (!error) return null;
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (dashboard.role === "member" && dashboard.membership) {
    return (
      <div className={cn(shellClass, className)}>
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Shared membership</p>
            <p className="text-xs text-muted-foreground">
              Premium access through {dashboard.membership.ownerEmail}
              {dashboard.membership.planName
                ? ` (${dashboard.membership.planName})`
                : ""}
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard.eligible) {
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-sm text-muted-foreground">
          Upgrade to Business to invite teammates with their own logins.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link to="/pricing">View Business plan</Link>
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
    priceAmount: dashboard.priceAmount,
    billingPeriod: dashboard.billingPeriod,
    priceCurrency: dashboard.priceCurrency,
    currentPeriodStart: dashboard.currentPeriodStart,
    currentPeriodEnd: dashboard.currentPeriodEnd,
  };
  const acceptChargeCopy = chargeOnAccept
    ? subscriptionTrialing
      ? formatTrialSeatBillingCopy(billingCopyInput)
      : nextAcceptanceWillCharge
        ? formatChargeOnAcceptInviteCopy(billingCopyInput)
        : formatChargeAfterPrepaidSeatsCopy(billingCopyInput)
    : null;

  return (
    <div className={cn(shellClass, className)}>
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Invite your team</p>
          <p className="text-xs text-muted-foreground">
            {chargeOnAccept
              ? prepaidAvailableSeats > 0
                ? `${prepaidAvailableSeats} ${
                    subscriptionTrialing ? "included trial" : "already-paid"
                  } ${
                    prepaidAvailableSeats === 1 ? "seat" : "seats"
                  } available. Accepted teammates use ${
                    prepaidAvailableSeats === 1 ? "it" : "them"
                  } before any additional charge.`
                : subscriptionTrialing
                  ? "Send invites for free. Accepted teammates are added during the trial and billing begins when the trial ends."
                  : "Send invites for free. You are billed when a teammate accepts and joins — not when you send the invite."
              : seats
                ? `${seats.activeSeats} of ${seats.seatLimit} seats in use · ${seats.availableSeats} available`
                : "Invite teammates by email. Each person gets their own login."}
          </p>
        </div>
      </div>

      {acceptChargeCopy ? (
        <p className="text-xs text-muted-foreground">{acceptChargeCopy}</p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {dashboard.canManageSeats && seats ? (
        <div className="space-y-2 rounded-md border border-border/80 bg-background/80 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Pre-paid seats
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={submitting || effectiveDraftSeats <= seatFloor}
              onClick={() =>
                setDraftSeatCount((count) =>
                  Math.max(seatFloor, (count ?? currentSeatLimit) - 1),
                )
              }
            >
              −
            </Button>
            <span className="min-w-[2rem] text-center text-lg font-semibold">
              {effectiveDraftSeats}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
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
            className="text-sm font-medium"
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
            />
            <Button
              onClick={async () => {
                const email = inviteEmail.trim();
                if (!email) return;
                const ok = await invite(email);
                if (ok) setInviteEmail("");
              }}
              disabled={submitting || !inviteEmail.trim()}
            >
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {chargeOnAccept
            ? "Maximum team size reached."
            : "All seats are in use. Remove a member, cancel a pending invite, or add more seats."}
        </p>
      )}

      {dashboard.members.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Active members</h3>
          <ul className="space-y-2">
            {dashboard.members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-col gap-2 rounded-lg border border-border/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(member.joinedAt)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
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

      {dashboard.pendingInvites.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Pending invites
            {chargeOnAccept ? (
              <span className="ml-1 font-normal text-muted-foreground">
                (free until they accept)
              </span>
            ) : null}
          </h3>
          <ul className="space-y-2">
            {dashboard.pendingInvites.map((pending) => (
              <li
                key={pending.id}
                className="flex flex-col gap-2 rounded-lg border border-border/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{pending.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDate(pending.expiresAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void resendInvite(pending.id)}
                    disabled={submitting}
                  >
                    Resend
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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
    </div>
  );
}
