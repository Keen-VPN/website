import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  acceptFriendInvitation,
  BACKEND_URL,
  getSessionToken,
} from "@/auth/backend";

export default function FriendsAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requesterLabel, setRequesterLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const autoAcceptAttemptedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate("/friends");
      return;
    }

    let cancelled = false;
    void fetch(
      `${BACKEND_URL}/friends/invite/${encodeURIComponent(token)}`,
    )
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          requesterDisplayLabel?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.valid) {
          setError("This invitation is invalid or has expired.");
          setLoading(false);
          return;
        }
        setRequesterLabel(data.requesterDisplayLabel ?? null);
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
      const res = await acceptFriendInvitation(sessionToken, { token });
      if (!res.ok) {
        setError(res.error ?? "Could not accept invitation.");
        return;
      }
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

  useEffect(() => {
    if (loading || accepted || error || autoAcceptAttemptedRef.current) return;

    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    autoAcceptAttemptedRef.current = true;
    void acceptWithSessionToken(sessionToken);
  }, [accepted, error, loading]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-24">
        <h1 className="text-3xl font-semibold">Friend invitation</h1>
        {loading ? <p className="mt-4 text-muted-foreground">Loading…</p> : null}
        {!loading && accepted ? (
          <div className="mt-6 space-y-4">
            <p className="text-muted-foreground">
              You are now connected in a Private Value Network on KeenVPN.
            </p>
            <Button asChild>
              <Link to="/friends">Go to Friends</Link>
            </Button>
          </div>
        ) : null}
        {!loading && !accepted && error ? (
          <p className="mt-4 text-destructive">{error}</p>
        ) : null}
        {!loading && !accepted && !error ? (
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              {requesterLabel
                ? `${requesterLabel} invited you to join their KeenVPN Friends Network.`
                : "You have been invited to join a KeenVPN Friends Network."}
            </p>
            <p className="text-sm">
              Nothing is shared by default. You control what you share with
              friends.
            </p>
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
