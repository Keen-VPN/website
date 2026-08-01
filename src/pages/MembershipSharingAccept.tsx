import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  acceptMembershipInvite,
  acceptReceivedMembershipInvite,
  BACKEND_URL,
  fetchReceivedMembershipInvite,
  getSessionToken,
} from "@/auth/backend";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import {
  OPEN_APP_DEEP_LINK,
  openKeenVpnFromExternalPage,
  resolveNativeAppHandoffDeepLink,
} from "@/lib/keenvpn-deep-links";

const PENDING_ACCEPT_STORAGE_KEY = "keenvpn_membership_invite_pending_accept";

const CONFIRMATION_COPY =
  "I understand that my company will pay for my KeenVPN subscription. I understand that my company can see my membership status but will never get access to my browsing history or data.";

interface PendingAcceptIntent {
  token: string;
  acceptsBusinessBilling: boolean;
  acknowledgesPrivacy: boolean;
}

function inviteIntentMatches(
  intent: PendingAcceptIntent | null,
  token: string,
): boolean {
  return intent?.token === token;
}

function readPendingAcceptIntent(): PendingAcceptIntent | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ACCEPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAcceptIntent;
    if (
      typeof parsed?.token !== "string" ||
      parsed.acceptsBusinessBilling !== true ||
      parsed.acknowledgesPrivacy !== true
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storePendingAcceptIntent(intent: PendingAcceptIntent): void {
  sessionStorage.setItem(PENDING_ACCEPT_STORAGE_KEY, JSON.stringify(intent));
}

function clearPendingAcceptIntent(): void {
  sessionStorage.removeItem(PENDING_ACCEPT_STORAGE_KEY);
}

export default function MembershipSharingAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const inviteId = searchParams.get("inviteId")?.trim() ?? "";
  const navigate = useNavigate();
  const { user } = useAuth();
  const appStoreUrl = useAppStoreUrl();
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [billingPending, setBillingPending] = useState(false);
  const [creditPending, setCreditPending] = useState(false);
  const [confirmationAccepted, setConfirmationAccepted] = useState(false);
  const [billingDeferredUntil, setBillingDeferredUntil] = useState<
    string | null
  >(null);
  const [requiresAppleCancellation, setRequiresAppleCancellation] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const resumeAcceptAttemptedRef = useRef(false);
  const appOpenCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      appOpenCleanupRef.current?.();
    },
    [],
  );

  useEffect(() => {
    if (!token && !inviteId) {
      navigate("/account");
      return;
    }

    const sessionToken = inviteId ? getSessionToken() : null;
    if (inviteId && !sessionToken) {
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }

    setLoading(true);
    setInviteEmail(null);
    setOwnerEmail(null);
    setBillingPending(false);
    setCreditPending(false);
    setBillingDeferredUntil(null);
    setRequiresAppleCancellation(false);
    setError(null);
    setAccepted(false);
    resumeAcceptAttemptedRef.current = false;

    const pendingIntent = readPendingAcceptIntent();
    if (!inviteId && inviteIntentMatches(pendingIntent, token)) {
      setConfirmationAccepted(true);
    } else {
      setConfirmationAccepted(false);
    }

    let cancelled = false;
    void (async () => {
      try {
        const result =
          inviteId && sessionToken
            ? await fetchReceivedMembershipInvite(sessionToken, inviteId)
            : await fetch(
                `${BACKEND_URL}/membership-sharing/invite/${encodeURIComponent(token)}`,
              ).then(async (res) => ({
                ok: res.ok,
                data: await res.json().catch(() => ({})),
              }));
        const data = result.data;
        if (cancelled) return;
        if (!result.ok || !data?.valid) {
          clearPendingAcceptIntent();
          setError("This invitation is invalid or has expired.");
          setLoading(false);
          return;
        }
        setInviteEmail(data.inviteeEmail ?? null);
        setOwnerEmail(data.ownerEmail ?? null);
        setBillingPending(data.billingPending === true);
        setRequiresAppleCancellation(data.requiresAppleCancellation === true);
        if (data.creditPending === true) {
          clearPendingAcceptIntent();
          setCreditPending(true);
          setBillingDeferredUntil(data.billingDeferredUntil ?? null);
          setAccepted(true);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load invitation details.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteId, navigate, token]);

  const acceptWithSessionToken = useCallback(
    async (
      sessionToken: string,
      confirmations?: {
        acceptsBusinessBilling: boolean;
        acknowledgesPrivacy: boolean;
      },
    ) => {
      const confirmed =
        confirmations?.acceptsBusinessBilling === true &&
        confirmations?.acknowledgesPrivacy === true
          ? true
          : confirmationAccepted;
      if (!confirmed) {
        setError("Confirm the checkbox before accepting.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const confirmations = {
          acceptsBusinessBilling: true,
          acknowledgesPrivacy: true,
        };
        const res = inviteId
          ? await acceptReceivedMembershipInvite(
              sessionToken,
              inviteId,
              confirmations,
            )
          : await acceptMembershipInvite(sessionToken, token, confirmations);
        if (!res.ok) {
          setError(res.error ?? "Could not accept invitation.");
          return;
        }
        clearPendingAcceptIntent();
        setBillingDeferredUntil(res.billingDeferredUntil ?? null);
        setRequiresAppleCancellation(res.requiresAppleCancellation === true);
        setCreditPending(res.pending === true);
        setAccepted(true);
      } finally {
        setLoading(false);
      }
    },
    [confirmationAccepted, inviteId, token],
  );

  async function handleAccept() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      if (!inviteId) {
        storePendingAcceptIntent({
          token,
          acceptsBusinessBilling: true,
          acknowledgesPrivacy: true,
        });
      }
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    await acceptWithSessionToken(sessionToken);
  }

  function handleDecline() {
    clearPendingAcceptIntent();
    navigate("/account", { replace: true });
  }

  useEffect(() => {
    if (
      loading ||
      accepted ||
      error ||
      resumeAcceptAttemptedRef.current ||
      !token
    ) {
      return;
    }

    const pendingIntent = readPendingAcceptIntent();
    if (!pendingIntent || !inviteIntentMatches(pendingIntent, token)) {
      return;
    }

    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    // Wait until invite identity is known, then only auto-accept for the
    // invited email. Keep the intent if a different account signed in.
    const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
    const inviteEmailNormalized = inviteEmail?.trim().toLowerCase() ?? null;
    if (!inviteEmailNormalized || !signedInEmail) return;
    if (signedInEmail !== inviteEmailNormalized) return;

    resumeAcceptAttemptedRef.current = true;
    void acceptWithSessionToken(sessionToken, {
      acceptsBusinessBilling: pendingIntent.acceptsBusinessBilling,
      acknowledgesPrivacy: pendingIntent.acknowledgesPrivacy,
    });
  }, [
    acceptWithSessionToken,
    accepted,
    error,
    inviteEmail,
    loading,
    token,
    user?.email,
  ]);

  const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
  const inviteEmailNormalized = inviteEmail?.trim().toLowerCase() ?? null;
  const signedInAsInvitee =
    Boolean(signedInEmail) &&
    Boolean(inviteEmailNormalized) &&
    signedInEmail === inviteEmailNormalized;

  const openKeenVpnApp = () => {
    appOpenCleanupRef.current?.();
    appOpenCleanupRef.current = openKeenVpnFromExternalPage(
      resolveNativeAppHandoffDeepLink(getSessionToken(), OPEN_APP_DEEP_LINK),
      appStoreUrl,
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 pt-28 pb-16 text-center sm:pt-32">
        <h1 className="text-3xl font-semibold">Membership Invitation</h1>
        {loading ? <p className="mt-4 text-slate-400">Loading…</p> : null}
        {!loading && accepted ? (
          <div className="mt-6 w-full max-w-md space-y-4">
            <p className="text-slate-300">
              {creditPending && billingDeferredUntil
                ? `Your transfer is confirmed. Your existing subscription stays active through ${new Date(
                    billingDeferredUntil,
                  ).toLocaleDateString()}. After that, your company pays for your KeenVPN access.`
                : creditPending
                  ? "Your transfer is confirmed. Your current paid KeenVPN access stays in place until your company takes over billing."
                  : "You now have KeenVPN access through your company account."}
            </p>
            {requiresAppleCancellation ? (
              <p className="rounded-md border border-amber-700/60 bg-amber-950/40 p-3 text-sm text-amber-100">
                {billingDeferredUntil
                  ? "Turn off App Store auto renewal before that date. Apple does not allow KeenVPN to cancel it for you."
                  : "Turn off App Store auto renewal to avoid being billed twice. Apple does not allow KeenVPN to cancel it for you."}
              </p>
            ) : null}
            <Button type="button" onClick={openKeenVpnApp}>
              Open KeenVPN App
            </Button>
          </div>
        ) : null}
        {!loading && !accepted && error ? (
          <p className="mt-4 text-red-300">{error}</p>
        ) : null}
        {!loading && !accepted && !error ? (
          <div className="mt-6 w-full max-w-md space-y-4 text-slate-300">
            <p>
              {ownerEmail
                ? `${ownerEmail} invited you to use KeenVPN on their company account.`
                : "You have been invited to use KeenVPN on a company account."}
            </p>
            {inviteEmail ? (
              <p className="text-sm text-slate-400">
                {signedInAsInvitee ? (
                  <>
                    You are signed in as <strong>{inviteEmail}</strong>.
                  </>
                ) : signedInEmail ? (
                  <>
                    Sign in with <strong>{inviteEmail}</strong> to accept. You
                    are currently signed in as <strong>{signedInEmail}</strong>.
                  </>
                ) : (
                  <>
                    Sign in with <strong>{inviteEmail}</strong> to accept.
                  </>
                )}
              </p>
            ) : null}
            <div className="rounded-md border border-slate-700 bg-slate-900 p-4 text-left text-sm">
              <label
                htmlFor="accept-company-membership"
                className="flex items-start gap-3"
              >
                <Checkbox
                  id="accept-company-membership"
                  checked={confirmationAccepted}
                  onCheckedChange={(checked) =>
                    setConfirmationAccepted(checked === true)
                  }
                  className="mt-0.5"
                />
                <span>{CONFIRMATION_COPY}</span>
              </label>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button type="button" variant="outline" onClick={handleDecline}>
                Decline for now
              </Button>
              <Button
                onClick={() => void handleAccept()}
                disabled={loading || !confirmationAccepted}
              >
                {billingPending ? "Complete invitation" : "Accept invitation"}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Declining for now does not cancel the invitation. You can use the
              link in your email to review and accept it before it expires.
            </p>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
