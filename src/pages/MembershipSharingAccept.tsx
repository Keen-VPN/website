import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  acceptMembershipInvite,
  BACKEND_URL,
  getSessionToken,
} from "@/auth/backend";
import { useAuth } from "@/contexts/AuthContext";

const PENDING_ACCEPT_STORAGE_KEY = "keenvpn_membership_invite_pending_accept";

interface PendingAcceptIntent {
  token: string;
  acceptsBusinessBilling: boolean;
  acknowledgesPrivacy: boolean;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null,
  );
  const [chargeOnAccept, setChargeOnAccept] = useState(false);
  const [prepaidAvailableSeats, setPrepaidAvailableSeats] = useState(0);
  const [nextAcceptanceWillCharge, setNextAcceptanceWillCharge] =
    useState(false);
  const [billingPending, setBillingPending] = useState(false);
  const [creditPending, setCreditPending] = useState(false);
  const [acceptsBusinessBilling, setAcceptsBusinessBilling] = useState(false);
  const [acknowledgesPrivacy, setAcknowledgesPrivacy] = useState(false);
  const [billingDeferredUntil, setBillingDeferredUntil] = useState<
    string | null
  >(null);
  const [requiresAppleCancellation, setRequiresAppleCancellation] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const resumeAcceptAttemptedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate("/account");
      return;
    }

    setLoading(true);
    setInviteEmail(null);
    setOwnerEmail(null);
    setSubscriptionStatus(null);
    setChargeOnAccept(false);
    setPrepaidAvailableSeats(0);
    setNextAcceptanceWillCharge(false);
    setBillingPending(false);
    setCreditPending(false);
    setBillingDeferredUntil(null);
    setRequiresAppleCancellation(false);
    setError(null);
    setAccepted(false);
    resumeAcceptAttemptedRef.current = false;

    const pendingIntent = readPendingAcceptIntent();
    if (pendingIntent?.token === token) {
      setAcceptsBusinessBilling(true);
      setAcknowledgesPrivacy(true);
    } else {
      setAcceptsBusinessBilling(false);
      setAcknowledgesPrivacy(false);
    }

    let cancelled = false;
    void fetch(
      `${BACKEND_URL}/membership-sharing/invite/${encodeURIComponent(token)}`,
    )
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          inviteeEmail?: string;
          ownerEmail?: string;
          subscriptionStatus?: string;
          chargeOnAccept?: boolean;
          billingPending?: boolean;
          creditPending?: boolean;
          billingDeferredUntil?: string | null;
          requiresAppleCancellation?: boolean;
          prepaidAvailableSeats?: number | null;
          nextAcceptanceWillCharge?: boolean;
        };
        if (cancelled) return;
        if (!res.ok || !data.valid) {
          clearPendingAcceptIntent();
          setError("This invitation is invalid or has expired.");
          setLoading(false);
          return;
        }
        setInviteEmail(data.inviteeEmail ?? null);
        setOwnerEmail(data.ownerEmail ?? null);
        setSubscriptionStatus(data.subscriptionStatus ?? null);
        setChargeOnAccept(data.chargeOnAccept === true);
        setBillingPending(data.billingPending === true);
        setRequiresAppleCancellation(data.requiresAppleCancellation === true);
        if (data.creditPending === true) {
          clearPendingAcceptIntent();
          setCreditPending(true);
          setBillingDeferredUntil(data.billingDeferredUntil ?? null);
          setAccepted(true);
        }
        setPrepaidAvailableSeats(
          typeof data.prepaidAvailableSeats === "number"
            ? Math.max(0, data.prepaidAvailableSeats)
            : 0,
        );
        setNextAcceptanceWillCharge(
          data.nextAcceptanceWillCharge ??
            !(
              typeof data.prepaidAvailableSeats === "number" &&
              Math.max(0, data.prepaidAvailableSeats) > 0
            ),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load invitation details.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  const acceptWithSessionToken = useCallback(
    async (
      sessionToken: string,
      confirmations?: {
        acceptsBusinessBilling: boolean;
        acknowledgesPrivacy: boolean;
      },
    ) => {
      const billingOk =
        confirmations?.acceptsBusinessBilling ?? acceptsBusinessBilling;
      const privacyOk =
        confirmations?.acknowledgesPrivacy ?? acknowledgesPrivacy;
      if (!billingOk || !privacyOk) {
        setError("Confirm both checkboxes before accepting.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await acceptMembershipInvite(sessionToken, token, {
          acceptsBusinessBilling: billingOk,
          acknowledgesPrivacy: privacyOk,
        });
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
    [acceptsBusinessBilling, acknowledgesPrivacy, token],
  );

  async function handleAccept() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      storePendingAcceptIntent({
        token,
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: true,
      });
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    await acceptWithSessionToken(sessionToken);
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
    if (!pendingIntent || pendingIntent.token !== token) return;

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="mx-auto max-w-xl px-4 pt-28 pb-16 sm:pt-32">
        <h1 className="text-3xl font-semibold">Membership invitation</h1>
        {loading ? <p className="mt-4 text-slate-400">Loading…</p> : null}
        {!loading && accepted ? (
          <div className="mt-6 space-y-4">
            <p className="text-slate-300">
              {creditPending && billingDeferredUntil
                ? `Your transfer is confirmed. Your existing subscription stays active through ${new Date(
                    billingDeferredUntil,
                  ).toLocaleDateString()}. After that, the Business account pays for your KeenVPN access.`
                : creditPending
                  ? "Your transfer is confirmed. Your current paid KeenVPN access stays in place until the Business account takes over billing."
                  : "You now have premium access through this shared membership."}
            </p>
            {requiresAppleCancellation ? (
              <p className="rounded-md border border-amber-700/60 bg-amber-950/40 p-3 text-sm text-amber-100">
                {billingDeferredUntil
                  ? "Turn off App Store auto renewal before that date. Apple does not allow KeenVPN to cancel it for you."
                  : "Turn off App Store auto renewal to avoid being billed twice. Apple does not allow KeenVPN to cancel it for you."}
              </p>
            ) : null}
            <p className="text-sm text-slate-400">
              The Business payer can see your membership status, but KeenVPN
              never shares your browsing history with them.
            </p>
            <Button asChild>
              <Link to="/account?tab=team">Go to account</Link>
            </Button>
          </div>
        ) : null}
        {!loading && !accepted && error ? (
          <p className="mt-4 text-red-300">{error}</p>
        ) : null}
        {!loading && !accepted && !error ? (
          <div className="mt-6 space-y-4 text-slate-300">
            <p>
              {ownerEmail
                ? `${ownerEmail} invited you to share their KeenVPN Premium membership.`
                : "You have been invited to share a KeenVPN Premium membership."}
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
            <p className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-400">
              {billingPending
                ? "Your KeenVPN account is already linked to this invitation. Finish accepting to confirm billing and turn on shared access. Trying again will not create a duplicate charge."
                : !chargeOnAccept
                  ? "Accepting uses one of the membership owner's existing seats."
                  : subscriptionStatus?.toLowerCase() === "trialing"
                    ? "Accepting adds you to the Business plan now with no extra seat charge during the trial. The owner is billed for active seats when the trial ends."
                    : nextAcceptanceWillCharge
                      ? "No paid Business seat is free right now. If you already pay for KeenVPN, that time is used first. Otherwise, after you accept, the owner is charged a prorated seat for the rest of this billing period. If that charge cannot be completed, the invite stays pending and you do not get access yet."
                      : `This membership has ${prepaidAvailableSeats} paid ${
                          prepaidAvailableSeats === 1 ? "seat" : "seats"
                        } ready, so accepting should not add a new charge. Seat availability is checked again when you accept.`}
            </p>
            <div className="space-y-3 rounded-md border border-slate-700 bg-slate-900 p-4 text-sm">
              <label
                htmlFor="accept-business-billing"
                className="flex items-start gap-3"
              >
                <Checkbox
                  id="accept-business-billing"
                  checked={acceptsBusinessBilling}
                  onCheckedChange={(checked) =>
                    setAcceptsBusinessBilling(checked === true)
                  }
                  className="mt-0.5"
                />
                <span>
                  I understand that the Business account will pay for my KeenVPN
                  access after any time I already paid for has been used.
                </span>
              </label>
              <label
                htmlFor="acknowledge-business-privacy"
                className="flex items-start gap-3"
              >
                <Checkbox
                  id="acknowledge-business-privacy"
                  checked={acknowledgesPrivacy}
                  onCheckedChange={(checked) =>
                    setAcknowledgesPrivacy(checked === true)
                  }
                  className="mt-0.5"
                />
                <span>
                  I understand the payer can see my membership status. KeenVPN
                  will never share my browsing history with them.
                </span>
              </label>
            </div>
            <Button
              onClick={() => void handleAccept()}
              disabled={
                loading || !acceptsBusinessBilling || !acknowledgesPrivacy
              }
            >
              {billingPending ? "Complete invitation" : "Accept invitation"}
            </Button>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
