import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import {
  workspaceEmptyState,
  workspaceListRow,
  workspaceSectionSurface,
} from "@/components/workspace/workspace-ui";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";
import {
  fetchMembershipSharingDashboard,
  inviteMembershipMember,
  resendMembershipInvite,
  revokeMembershipInvite,
  revokeMembershipMember,
  updateMembershipSeatCount,
} from "@/auth/backend";
import { MIN_BUSINESS_SEATS, MAX_BUSINESS_SEATS } from "@/constants/pricing";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MembershipSharingCardProps {
  sessionToken: string;
}

interface DashboardMember {
  userId: string;
  email: string;
  displayName?: string | null;
  joinedAt: string;
}

interface DashboardPendingInvite {
  id: string;
  email: string;
  invitedAt: string;
  expiresAt: string;
}

interface DashboardRevokedInvite {
  id: string;
  email: string;
  revokedAt?: string | null;
}

interface DashboardData {
  role: string;
  eligible: boolean;
  canManageSeats?: boolean;
  minSeats?: number;
  seats?: {
    seatLimit: number;
    activeSeats: number;
    availableSeats: number;
    pendingInvites: number;
  } | null;
  membership?: {
    ownerEmail: string;
    ownerName?: string | null;
    planName?: string | null;
  } | null;
  members: DashboardMember[];
  pendingInvites: DashboardPendingInvite[];
  revokedInvites?: DashboardRevokedInvite[];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSeatCount, setDraftSeatCount] = useState<number | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    try {
      const res = await fetchMembershipSharingDashboard(sessionToken);
      if (!isCurrentRequest()) return;
      if (!res.ok) {
        if (res.error?.includes("not enabled")) {
          setDashboard(null);
          return;
        }
        setError(res.error ?? "Could not load membership sharing.");
        return;
      }
      const data = res.data as DashboardData;
      setDashboard(data);
      setDraftSeatCount(data.seats?.seatLimit ?? null);
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await inviteMembershipMember(sessionToken, email);
      if (!res.ok) {
        setError(res.error ?? "Could not send invite.");
        return;
      }
      setInviteEmail("");
      setDashboard(res.data as DashboardData);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeMember(userId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await revokeMembershipMember(sessionToken, userId);
      if (!res.ok) {
        setError(res.error ?? "Could not remove member.");
        return;
      }
      setDashboard(res.data as DashboardData);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendInvite(inviteId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await resendMembershipInvite(sessionToken, inviteId);
      if (!res.ok) {
        setError(res.error ?? "Could not resend invite.");
        return;
      }
      setDashboard(res.data as DashboardData);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await revokeMembershipInvite(sessionToken, inviteId);
      if (!res.ok) {
        setError(res.error ?? "Could not cancel invite.");
        return;
      }
      setDashboard(res.data as DashboardData);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateSeats() {
    if (draftSeatCount == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await updateMembershipSeatCount(
        sessionToken,
        draftSeatCount,
      );
      if (!res.ok) {
        setError(res.error ?? "Could not update seat count.");
        return;
      }
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <WorkspacePanel title="Membership sharing" icon={Users}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading membership sharing…
        </div>
      </WorkspacePanel>
    );
  }

  if (!dashboard) {
    if (!error) return null;
    return (
      <WorkspacePanel title="Membership sharing" icon={Users}>
        <p className="text-sm text-destructive">{error}</p>
      </WorkspacePanel>
    );
  }

  if (dashboard.role === "member" && dashboard.membership) {
    return (
      <WorkspacePanel
        title="Shared membership"
        icon={Users}
        description={`Premium access through ${dashboard.membership.ownerEmail}${
          dashboard.membership.planName
            ? ` (${dashboard.membership.planName})`
            : ""
        }.`}
      />
    );
  }

  if (!dashboard.eligible) {
    return (
      <WorkspacePanel
        title="Membership sharing"
        icon={Users}
        description="Invite team members to share your KeenVPN Business subscription. Available on the Business plan."
      >
        <p className={cn(workspaceEmptyState, "text-sm text-muted-foreground")}>
          Upgrade to a Business plan to invite members with their own login
          credentials.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/pricing">View Business plan</Link>
        </Button>
      </WorkspacePanel>
    );
  }

  const seats = dashboard.seats;
  const hasAvailableSeats = (seats?.availableSeats ?? 0) > 0;
  const occupiedSeats =
    (seats?.activeSeats ?? 0) + (seats?.pendingInvites ?? 0);
  const seatFloor = Math.max(
    dashboard.minSeats ?? MIN_BUSINESS_SEATS,
    occupiedSeats,
  );
  const currentSeatLimit = seats?.seatLimit ?? seatFloor;
  const effectiveDraftSeats = Math.max(
    seatFloor,
    draftSeatCount ?? currentSeatLimit,
  );
  const seatsChanged = effectiveDraftSeats !== currentSeatLimit;

  return (
    <WorkspacePanel
      title="Membership sharing"
      icon={Users}
      description={
        seats
          ? `${seats.activeSeats} of ${seats.seatLimit} seats used · ${seats.availableSeats} available`
          : "Invite others to share your subscription."
      }
    >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {dashboard.canManageSeats && seats ? (
          <div className={workspaceSectionSurface}>
            <h3 className="text-sm font-medium">Manage seats</h3>
            <p className="text-xs text-muted-foreground">
              Add or remove seats on your Business subscription. Stripe prorates
              changes immediately.
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
                onClick={() => void handleUpdateSeats()}
                disabled={submitting || !seatsChanged}
                size="sm"
              >
                {submitting ? "Updating…" : "Update seats"}
              </Button>
            </div>
            {effectiveDraftSeats <= occupiedSeats ? (
              <p className="text-xs text-muted-foreground">
                Remove members or cancel pending invites before reducing below{" "}
                {occupiedSeats} seats.
              </p>
            ) : null}
          </div>
        ) : null}

        {hasAvailableSeats ? (
          <div className="space-y-2">
            <label
              htmlFor="membership-invite-email"
              className="text-sm font-medium"
            >
              Invite by email
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="membership-invite-email"
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={submitting}
              />
              <Button
                onClick={() => void handleInvite()}
                disabled={submitting || !inviteEmail.trim()}
              >
                {submitting ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
        ) : (
          <p className={cn(workspaceEmptyState, "text-sm text-muted-foreground")}>
            {currentSeatLimit <= 1
              ? "Membership sharing is not enabled on this subscription. Upgrade to Business to invite team members."
              : "All seats are currently used. Remove a member, cancel a pending invite, or add more seats."}
          </p>
        )}

        {dashboard.members.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Members</h3>
            <ul className="space-y-2">
              {dashboard.members.map((member) => (
                <li
                  key={member.userId}
                  className={cn(
                    workspaceListRow,
                    "flex flex-col gap-2 rounded-lg border border-border/80 sm:flex-row sm:items-center sm:justify-between",
                  )}
                >
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(member.joinedAt)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleRevokeMember(member.userId)}
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
            <h3 className="text-sm font-medium">Pending invites</h3>
            <ul className="space-y-2">
              {dashboard.pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className={cn(
                    workspaceListRow,
                    "flex flex-col gap-2 rounded-lg border border-border/80 sm:flex-row sm:items-center sm:justify-between",
                  )}
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleResendInvite(invite.id)}
                      disabled={submitting}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCancelInvite(invite.id)}
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

        {(dashboard.revokedInvites?.length ?? 0) > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recently revoked invites
            </h3>
            <ul className="space-y-2">
              {dashboard.revokedInvites?.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
                >
                  {invite.email}
                  {invite.revokedAt
                    ? ` · revoked ${formatDate(invite.revokedAt)}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
    </WorkspacePanel>
  );
}
