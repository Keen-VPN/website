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
  isMembershipInviteDetails,
} from "@/auth/backend";
import {
  clearMatchingPendingMembershipInviteAcceptIntent,
  inviteAcceptIntentMatches,
  readPendingMembershipInviteAcceptIntent,
  storePendingMembershipInviteAcceptIntent,
} from "@/auth/membership-invite-accept-intent";
import { resetAuthenticationForReauth } from "@/auth/reauth";
import { buildSignInUrlForCurrentLocation } from "@/auth/post-login-redirect";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import {
  OPEN_APP_DEEP_LINK,
  openKeenVpnFromExternalPage,
  resolveNativeAppHandoffDeepLink,
} from "@/lib/keenvpn-deep-links";

const CONFIRMATION_COPY =
  "I understand that my company will pay for my KeenVPN subscription. I understand that my company can see my membership status but will never get access to my browsing history or data.";

type ReauthReason = "expired_session" | "wrong_account";

export default function MembershipSharingAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const inviteId = searchParams.get("inviteId")?.trim() ?? "";
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    isAuthenticating,
    hasSessionToken,
    refreshSubscription,
  } = useAuth();
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
  const [reauthReason, setReauthReason] = useState<ReauthReason | null>(null);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [loadRetryAvailable, setLoadRetryAvailable] = useState(false);
  const [acceptRetryAvailable, setAcceptRetryAvailable] = useState(false);
  const [loadRetryCount, setLoadRetryCount] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [receivedInviteSessionToken, setReceivedInviteSessionToken] = useState<
    string | null
  >(() => getSessionToken());
  const resumeAcceptAttemptedRef = useRef(false);
  const appOpenCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      appOpenCleanupRef.current?.();
    },
    [],
  );

  useEffect(() => {
    const currentToken = getSessionToken();
    setReceivedInviteSessionToken(currentToken);
    if (
      currentToken ||
      (!authLoading && !isAuthenticating && !hasSessionToken)
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextToken = getSessionToken();
      if (nextToken) {
        setReceivedInviteSessionToken(nextToken);
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [authLoading, hasSessionToken, isAuthenticating]);

  useEffect(() => {
    setLoading(true);
    setInviteEmail(null);
    setOwnerEmail(null);
    setBillingPending(false);
    setCreditPending(false);
    setBillingDeferredUntil(null);
    setRequiresAppleCancellation(false);
    setError(null);
    setReauthReason(null);
    setReauthenticating(false);
    setLoadRetryAvailable(false);
    setAcceptRetryAvailable(false);
    setAccepted(false);
    setConfirmationAccepted(false);
    resumeAcceptAttemptedRef.current = false;

    if (token && inviteId) {
      setError(
        "This invitation link is invalid. Open one invitation at a time.",
      );
      setLoading(false);
      return;
    }

    if (!token && !inviteId) {
      navigate("/account");
      return;
    }

    const sessionToken = inviteId ? receivedInviteSessionToken : null;
    if (inviteId && !sessionToken) {
      if (authLoading || isAuthenticating || hasSessionToken) {
        return;
      }
      navigate(buildSignInUrlForCurrentLocation());
      return;
    }

    const pendingIntent = readPendingMembershipInviteAcceptIntent();
    if (inviteAcceptIntentMatches(pendingIntent, token, inviteId)) {
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
              ).then(async (res) => {
                const raw: unknown = await res.json().catch(() => undefined);
                return {
                  ok: res.ok,
                  status: res.status,
                  data: isMembershipInviteDetails(raw) ? raw : undefined,
                  error:
                    raw === undefined
                      ? "The invitation service returned an unreadable response."
                      : undefined,
                };
              });
        const data = result.data;
        if (cancelled) return;
        if (inviteId && (result.status === 401 || result.status === 403)) {
          const wrongAccount = result.status === 403;
          setReauthReason(wrongAccount ? "wrong_account" : "expired_session");
          setError(
            wrongAccount
              ? "Sign in with the invited account to review this invitation."
              : "Your session expired. Sign in again to review this invitation.",
          );
          setLoading(false);
          return;
        }
        if (
          data?.valid === false ||
          result.status === 404 ||
          result.status === 410
        ) {
          clearMatchingPendingMembershipInviteAcceptIntent(token, inviteId);
          setError("This invitation is invalid or has expired.");
          setLoading(false);
          return;
        }
        if (!result.ok || data?.valid !== true) {
          setLoadRetryAvailable(true);
          setError(
            result.error ??
              "Could not load invitation details. Please try again.",
          );
          setLoading(false);
          return;
        }
        setInviteEmail(data.inviteeEmail ?? null);
        setOwnerEmail(data.ownerEmail ?? null);
        setBillingPending(data.billingPending === true);
        setRequiresAppleCancellation(data.requiresAppleCancellation === true);
        if (data.creditPending === true) {
          clearMatchingPendingMembershipInviteAcceptIntent(token, inviteId);
          setCreditPending(true);
          setBillingDeferredUntil(data.billingDeferredUntil ?? null);
          setAccepted(true);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadRetryAvailable(true);
          setError("Could not load invitation details.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    hasSessionToken,
    inviteId,
    isAuthenticating,
    loadRetryCount,
    navigate,
    receivedInviteSessionToken,
    token,
  ]);

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
      setAcceptRetryAvailable(false);
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
          if (res.status === 401 || res.status === 403) {
            // Stale session (401) or wrong account (403: the backend asks the
            // user to sign in with the invited email). Keep the consented
            // intent so the accept resumes after re-auth, mirroring the load
            // path's 401 handling.
            storePendingMembershipInviteAcceptIntent({
              ...(inviteId ? { inviteId } : { token }),
              acceptsBusinessBilling: true,
              acknowledgesPrivacy: true,
            });
            const wrongAccount = res.status === 403;
            setReauthReason(wrongAccount ? "wrong_account" : "expired_session");
            setError(
              wrongAccount
                ? "Sign in with the invited account to continue."
                : "Your session expired. Sign in again to continue.",
            );
            return;
          }
          setAcceptRetryAvailable(true);
          setError(res.error ?? "Could not accept invitation.");
          return;
        }
        clearMatchingPendingMembershipInviteAcceptIntent(token, inviteId);
        setBillingDeferredUntil(res.billingDeferredUntil ?? null);
        setRequiresAppleCancellation(res.requiresAppleCancellation === true);
        setCreditPending(res.pending === true);
        setAccepted(true);
        await refreshSubscription();
      } finally {
        setLoading(false);
      }
    },
    [confirmationAccepted, inviteId, refreshSubscription, token],
  );

  async function handleAccept() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      // Account banners start authenticated, but the session can expire after
      // this page loads. Preserve only an explicit, consented Accept click.
      storePendingMembershipInviteAcceptIntent({
        ...(inviteId ? { inviteId } : { token }),
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: true,
      });
      navigate(buildSignInUrlForCurrentLocation());
      return;
    }
    await acceptWithSessionToken(sessionToken);
  }

  function handleDecline() {
    clearMatchingPendingMembershipInviteAcceptIntent(token, inviteId);
    navigate("/account", { replace: true });
  }

  function handleRetryLoad() {
    setLoadRetryCount((count) => count + 1);
  }

  async function handleReauthenticate() {
    setReauthenticating(true);
    setError(null);
    const reset = await resetAuthenticationForReauth();
    if (!reset) {
      setError(
        "Could not sign you out automatically. Please sign out, then sign in with the invited account.",
      );
      setReauthenticating(false);
      return;
    }
    window.location.href = buildSignInUrlForCurrentLocation();
  }

  useEffect(() => {
    if (
      loading ||
      accepted ||
      error ||
      resumeAcceptAttemptedRef.current ||
      (!token && !inviteId)
    ) {
      return;
    }

    const pendingIntent = readPendingMembershipInviteAcceptIntent();
    if (
      !pendingIntent ||
      !inviteAcceptIntentMatches(pendingIntent, token, inviteId)
    ) {
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
    inviteId,
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

  const brandButtonClass =
    "inline-flex h-10 items-center justify-center rounded-[8px] bg-[#0f2040] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0f2040]/90 disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb] text-[#0f2040]">
      <Header />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pt-28 pb-16 text-center sm:pt-32">
        <h1 className="text-3xl font-semibold tracking-[-0.4px] text-[#0f2040]">
          Membership Invitation
        </h1>
        {loading ? <p className="mt-4 text-[#627086]">Loading…</p> : null}
        {!loading && accepted ? (
          <div className="mt-6 w-full max-w-md space-y-4">
            <p className="text-[#43516a]">
              {creditPending && billingDeferredUntil
                ? `Your transfer is confirmed. Your existing subscription stays active through ${new Date(
                    billingDeferredUntil,
                  ).toLocaleDateString()}. After that, your company pays for your KeenVPN access.`
                : creditPending
                  ? "Your transfer is confirmed. Your current paid KeenVPN access stays in place until your company takes over billing."
                  : "You now have KeenVPN access through your company account."}
            </p>
            {requiresAppleCancellation ? (
              <p className="rounded-[10px] border border-[#f0d9a8] bg-[#fffaf0] p-3 text-sm text-[#8a5a00]">
                {billingDeferredUntil
                  ? "Turn off App Store auto renewal before that date. Apple does not allow KeenVPN to cancel it for you."
                  : "Turn off App Store auto renewal to avoid being billed twice. Apple does not allow KeenVPN to cancel it for you."}
              </p>
            ) : null}
            <button
              type="button"
              className={brandButtonClass}
              onClick={openKeenVpnApp}
            >
              Open KeenVPN App
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[#0f2040]/25 bg-white px-4 text-sm font-medium text-[#0f2040] transition-colors hover:bg-[#f5f7fb]"
              onClick={() => navigate("/dashboard", { replace: true })}
            >
              Go to dashboard
            </button>
          </div>
        ) : null}
        {!loading && !accepted && error ? (
          <div className="mt-4 space-y-4">
            <p className="text-[#b42318]">{error}</p>
            {reauthReason ? (
              <Button
                type="button"
                className="h-10 rounded-[8px] bg-[#0f2040] text-white hover:bg-[#0f2040]/90"
                onClick={handleReauthenticate}
                disabled={reauthenticating}
              >
                {reauthenticating
                  ? "Signing out…"
                  : reauthReason === "wrong_account"
                    ? "Switch account"
                    : "Sign in again"}
              </Button>
            ) : acceptRetryAvailable ? (
              <Button
                type="button"
                className="h-10 rounded-[8px] bg-[#0f2040] text-white hover:bg-[#0f2040]/90"
                onClick={() => void handleAccept()}
              >
                Try accepting again
              </Button>
            ) : loadRetryAvailable ? (
              <Button
                type="button"
                className="h-10 rounded-[8px] bg-[#0f2040] text-white hover:bg-[#0f2040]/90"
                onClick={handleRetryLoad}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
        {!loading && !accepted && !error ? (
          <div className="mt-6 w-full max-w-md space-y-4 text-[#43516a]">
            <p>
              {ownerEmail
                ? `${ownerEmail} invited you to use KeenVPN on their company account.`
                : "You have been invited to use KeenVPN on a company account."}
            </p>
            {inviteEmail ? (
              <p className="text-sm text-[#627086]">
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
            <div className="rounded-[10px] border border-[#e3e8f0] bg-white p-4 text-left text-sm text-[#0f2040] shadow-[0px_3px_4px_rgba(15,32,64,0.03)]">
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
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[8px] border-[#0f2040]/25 bg-white text-[#0f2040] hover:bg-[#f5f7fb] hover:text-[#0f2040]"
                onClick={handleDecline}
              >
                Decline for now
              </Button>
              <Button
                className="h-10 rounded-[8px] bg-[#0f2040] text-white hover:bg-[#0f2040]/90"
                onClick={() => void handleAccept()}
                disabled={loading || !confirmationAccepted}
              >
                {billingPending ? "Complete invitation" : "Accept invitation"}
              </Button>
            </div>
            <p className="text-xs text-[#627086]">
              Declining for now does not cancel the invitation. You can use the
              link in your email to review and accept it before it expires.
            </p>
          </div>
        ) : null}
      </main>
      <Footer className="mt-auto border-[#1a3055] bg-[#0f2040] text-white [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-[#b8c4d9] [&_.text-xl]:text-white [&_a:hover]:text-white" />
    </div>
  );
}
