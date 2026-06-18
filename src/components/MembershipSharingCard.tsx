import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";
import {
  fetchMembershipSharingDashboard,
  inviteMembershipMember,
  revokeMembershipInvite,
  revokeMembershipMember,
} from "@/auth/backend";

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

interface DashboardData {
  role: string;
  eligible: boolean;
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMembershipSharingDashboard(sessionToken);
      if (!res.ok) {
        if (res.error?.includes("not enabled")) {
          setDashboard(null);
          return;
        }
        setError(res.error ?? "Could not load membership sharing.");
        return;
      }
      setDashboard(res.data as DashboardData);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading membership sharing…
        </CardContent>
      </Card>
    );
  }

  if (!dashboard) {
    if (!error) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership sharing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (dashboard.role === "member" && dashboard.membership) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shared membership
          </CardTitle>
          <CardDescription>
            Premium access through {dashboard.membership.ownerEmail}
            {dashboard.membership.planName
              ? ` (${dashboard.membership.planName})`
              : ""}
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!dashboard.eligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership sharing
          </CardTitle>
          <CardDescription>
            Invite family or team members to share your KeenVPN Premium
            subscription. Available on Family and Team plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link to="/pricing">View Family &amp; Team plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const seats = dashboard.seats;
  const hasAvailableSeats = (seats?.availableSeats ?? 0) > 0;
  const isSingleSeatSubscription = (seats?.seatLimit ?? 1) <= 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membership sharing
        </CardTitle>
        <CardDescription>
          {seats
            ? `${seats.activeSeats} of ${seats.seatLimit} seats used · ${seats.availableSeats} available`
            : "Invite others to share your subscription."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
                placeholder="family@example.com"
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
          <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {isSingleSeatSubscription
              ? "This subscription has 1 seat. Contact support to add seats for family sharing."
              : "All seats are currently used. Remove a member or cancel a pending invite to free a seat."}
          </p>
        )}

        {dashboard.members.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Members</h3>
            <ul className="space-y-2">
              {dashboard.members.map((member) => (
                <li
                  key={member.userId}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
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
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCancelInvite(invite.id)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
