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
import { cn } from "@/lib/utils";

interface ReceivedMembershipInviteBannerProps {
  sessionToken: string;
  variant?: "default" | "dashboard";
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

const VARIANT = {
  default: {
    shell: "mb-8 space-y-3",
    errorCard: "mb-8 border-amber-500/40 bg-amber-500/5",
    errorTitle: "font-semibold text-foreground",
    errorBody: "mt-1 text-sm text-muted-foreground",
    errorBtn: "",
    inviteCard: "border-primary/50 bg-primary/5 shadow-glow",
    inviteIconWrap: "rounded-full bg-primary/15 p-2 text-primary",
    inviteTitle: "font-semibold text-foreground",
    inviteBody: "mt-1 text-sm text-muted-foreground",
    inviteBtn: "shrink-0",
  },
  dashboard: {
    shell: "mb-5 space-y-3 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-7 lg:pt-7",
    errorCard:
      "mb-0 rounded-[13px] border border-[#f0d9a8] bg-[#fffaf0] px-4 py-4 sm:px-5",
    errorTitle: "text-[15px] font-semibold text-[#0f2040]",
    errorBody: "mt-1 text-[13px] text-[#627086]",
    errorBtn:
      "h-9 rounded-[8px] border-[#0f2040]/25 bg-white text-[#0f2040] hover:bg-[#f5f7fb] hover:text-[#0f2040]",
    inviteCard:
      "rounded-[13px] border border-[#e3e8f0] bg-white px-4 py-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:px-5",
    inviteIconWrap: "rounded-full bg-[#f0f3f8] p-2 text-[#0f2040]",
    inviteTitle: "text-[15px] font-semibold text-[#0f2040]",
    inviteBody: "mt-1 text-[13px] text-[#627086]",
    inviteBtn:
      "h-9 shrink-0 rounded-[8px] bg-[#0f2040] text-[13px] font-semibold text-white hover:bg-[#0f2040]/90",
  },
} as const;

function ErrorBanner({
  variant,
  error,
  reauthRequired,
  reauthenticating,
  onRetry,
  onReauth,
}: {
  variant: "default" | "dashboard";
  error: string;
  reauthRequired: boolean;
  reauthenticating: boolean;
  onRetry: () => void;
  onReauth: () => void;
}) {
  const styles = VARIANT[variant];
  const actionLabel = reauthenticating
    ? "Signing out…"
    : reauthRequired
      ? "Sign in again"
      : "Try again";
  const onAction = reauthRequired ? onReauth : onRetry;

  if (variant === "dashboard") {
    return (
      <div className={styles.errorCard}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={styles.errorTitle}>
              Team invitations could not be loaded
            </h2>
            <p className={styles.errorBody}>{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={styles.errorBtn}
            disabled={reauthenticating}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={styles.errorCard}>
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={styles.errorTitle}>
            Team invitations could not be loaded
          </h2>
          <p className={styles.errorBody}>{error}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={reauthenticating}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function InviteRow({
  invite,
  variant,
}: {
  invite: ReceivedMembershipInvite;
  variant: "default" | "dashboard";
}) {
  const styles = VARIANT[variant];
  const acceptUrl = `/account/membership-sharing/accept?inviteId=${encodeURIComponent(invite.id)}`;

  if (variant === "dashboard") {
    return (
      <div className={styles.inviteCard}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={styles.inviteIconWrap}>
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className={styles.inviteTitle}>You have a team invitation</h2>
              <p className={styles.inviteBody}>{inviteDescription(invite)}</p>
            </div>
          </div>
          <Button asChild className={styles.inviteBtn}>
            <Link to={acceptUrl}>Review invitation</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={styles.inviteCard}>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={styles.inviteIconWrap}>
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.inviteTitle}>You have a team invitation</h2>
            <p className={styles.inviteBody}>{inviteDescription(invite)}</p>
          </div>
        </div>
        <Button asChild className={styles.inviteBtn}>
          <Link to={acceptUrl}>Review invitation</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ReceivedMembershipInviteBanner({
  sessionToken,
  variant = "default",
}: ReceivedMembershipInviteBannerProps) {
  const [invites, setInvites] = useState<ReceivedMembershipInvite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setReauthRequired(false);
    setInvites([]);

    void fetchReceivedMembershipInvites(sessionToken).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setInvites(result.data ?? []);
      } else if (result.status === 401) {
        setInvites([]);
        setReauthRequired(true);
        setError(
          "Your session expired. Sign in again to load team invitations.",
        );
      } else {
        setInvites([]);
        setError(result.error ?? "Could not load team invitations.");
      }
      setReady(true);
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

  if (!ready) return null;
  if (!error && invites.length === 0) return null;

  const styles = VARIANT[variant];

  return (
    <section
      className={cn(styles.shell)}
      aria-label="Pending team invitations"
    >
      {error ? (
        <ErrorBanner
          variant={variant}
          error={error}
          reauthRequired={reauthRequired}
          reauthenticating={reauthenticating}
          onRetry={retry}
          onReauth={reauthenticate}
        />
      ) : (
        invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} variant={variant} />
        ))
      )}
    </section>
  );
}
