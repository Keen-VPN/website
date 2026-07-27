import { useEffect, useState } from "react";
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

export default function MembershipSharingAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const navigate = useNavigate();
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
  const [acceptsBusinessBilling, setAcceptsBusinessBilling] = useState(false);
  const [acknowledgesPrivacy, setAcknowledgesPrivacy] = useState(false);
  const [billingDeferredUntil, setBillingDeferredUntil] = useState<
    string | null
  >(null);
  const [requiresAppleCancellation, setRequiresAppleCancellation] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/account");
      return;
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
          prepaidAvailableSeats?: number | null;
          nextAcceptanceWillCharge?: boolean;
        };
        if (cancelled) return;
        if (!res.ok || !data.valid) {
          setError("This invitation is invalid or has expired.");
          setLoading(false);
          return;
        }
        setInviteEmail(data.inviteeEmail ?? null);
        setOwnerEmail(data.ownerEmail ?? null);
        setSubscriptionStatus(data.subscriptionStatus ?? null);
        setChargeOnAccept(data.chargeOnAccept === true);
        setBillingPending(data.billingPending === true);
        if (data.creditPending === true) {
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

  async function acceptWithSessionToken(sessionToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await acceptMembershipInvite(sessionToken, token, {
        acceptsBusinessBilling,
        acknowledgesPrivacy,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not accept invitation.");
        return;
      }
      setBillingDeferredUntil(res.billingDeferredUntil ?? null);
      setRequiresAppleCancellation(res.requiresAppleCancellation === true);
      setAccepted(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    await acceptWithSessionToken(sessionToken);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Membership invitation</h1>
        {loading ? <p className="mt-4 text-slate-400">Loading…</p> : null}
        {!loading && accepted ? (
          <div className="mt-6 space-y-4">
            <p className="text-slate-300">
              {billingDeferredUntil
                ? `Your transfer is confirmed. Your existing subscription remains active through ${new Date(
                    billingDeferredUntil,
                  ).toLocaleDateString()}; after that, the Business account will pay for your KeenVPN access.`
                : "You now have premium access through this shared membership."}
            </p>
            {requiresAppleCancellation ? (
              <p className="rounded-md border border-amber-700/60 bg-amber-950/40 p-3 text-sm text-amber-100">
                Turn off App Store auto-renewal before that date. Apple does not
                allow KeenVPN to cancel it for you.
              </p>
            ) : null}
            <p className="text-sm text-slate-400">
              The Business payer can see your membership status, but KeenVPN
              never shares your browsing history with them.
            </p>
            <Button asChild>
              <Link to="/account">Go to account</Link>
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
                Sign in with <strong>{inviteEmail}</strong> to accept.
              </p>
            ) : null}
            <p className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-400">
              {billingPending
                ? "Your KeenVPN account is already associated with this invitation. Complete the invitation to confirm billing and activate your shared membership; retrying will not create a duplicate seat charge."
                : !chargeOnAccept
                  ? "Accepting uses one of the membership owner's existing seats."
                  : subscriptionStatus?.toLowerCase() === "trialing"
                    ? "Accepting adds you to the Business subscription now, with no additional seat charge during the trial. The membership owner is billed for active seats when the trial ends."
                    : nextAcceptanceWillCharge
                      ? "No already-paid seat is currently available. Accepting adds a paid Business seat and immediately charges the membership owner a prorated amount for the rest of the current billing period. If their payment cannot be completed, the invitation remains pending and no access is granted."
                      : `The membership currently has ${prepaidAvailableSeats} already-paid ${
                          prepaidAvailableSeats === 1 ? "seat" : "seats"
                        } available, so accepting is not expected to create an additional charge. Seat availability is confirmed again when you accept.`}
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
                loading ||
                !acceptsBusinessBilling ||
                !acknowledgesPrivacy
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
