import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import {
  fetchReceivedMembershipInvites,
  type ReceivedMembershipInvite,
} from "@/auth/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resetAuthenticationForReauth } from "@/auth/reauth";
import { buildSignInUrlForCurrentLocation } from "@/auth/post-login-redirect";

interface ReceivedMembershipInviteBannerProps {
  sessionToken: string;
}

function inviteSender(invite: ReceivedMembershipInvite): string {
  return invite.ownerName?.trim() || invite.ownerEmail;
}

function inviteDescription(invite: ReceivedMembershipInvite): string {
  const description = `${inviteSender(invite)} invited you to join their KeenVPN Business account.`;
  const expiresAt = new Date(invite.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return description;
  return `${description} This invitation expires on ${expiresAt.toLocaleDateString(undefined, { timeZone: "UTC" })}.`;
}

export function ReceivedMembershipInviteBanner({
  sessionToken,
}: ReceivedMembershipInviteBannerProps) {
  const [invites, setInvites] = useState<ReceivedMembershipInvite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setReauthRequired(false);
    setInvites([]);

    void fetchReceivedMembershipInvites(sessionToken).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setInvites(result.data ?? []);
        return;
      }
      if (result.status === 401) {
        setInvites([]);
        setReauthRequired(true);
        setError(
          "Your session expired. Sign in again to load team invitations.",
        );
        return;
      }
      setInvites([]);
      setError(result.error ?? "Could not load team invitations.");
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount, sessionToken]);

  const reauthenticate = useCallback(async () => {
    setReauthenticating(true);
    const reset = await resetAuthenticationForReauth();
    if (!reset) {
      setError(
        "Could not sign you out automatically. Please sign out, then sign in again.",
      );
      setReauthenticating(false);
      return;
    }
    window.location.href = buildSignInUrlForCurrentLocation();
  }, []);

  if (error) {
    return (
      <Card className="mb-8 border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">
              Team invitations could not be loaded
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={reauthenticating}
            onClick={reauthRequired ? reauthenticate : retry}
          >
            {reauthenticating
              ? "Signing out…"
              : reauthRequired
                ? "Sign in again"
                : "Try again"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) return null;

  return (
    <section className="mb-8 space-y-3" aria-label="Pending team invitations">
      {invites.map((invite) => (
        <Card
          key={invite.id}
          className="border-primary/50 bg-primary/5 shadow-glow"
        >
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/15 p-2 text-primary">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  You have a team invitation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {inviteDescription(invite)}
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link
                to={`/account/membership-sharing/accept?inviteId=${encodeURIComponent(invite.id)}`}
              >
                Review invitation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
