import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
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
        };
        if (cancelled) return;
        if (!res.ok || !data.valid) {
          setError("This invitation is invalid or has expired.");
          setLoading(false);
          return;
        }
        setInviteEmail(data.inviteeEmail ?? null);
        setOwnerEmail(data.ownerEmail ?? null);
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

  async function handleAccept() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await acceptMembershipInvite(sessionToken, token);
      if (!res.ok) {
        setError(res.error ?? "Could not accept invitation.");
        return;
      }
      setAccepted(true);
    } finally {
      setLoading(false);
    }
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
              You now have premium access through this shared membership.
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
            <Button onClick={() => void handleAccept()} disabled={loading}>
              Accept invitation
            </Button>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
