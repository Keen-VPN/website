import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  BACKEND_URL,
  getSessionToken,
  joinFriendNetworkViaLink,
} from "@/auth/backend";

export default function FriendsJoin() {
  const { token = "" } = useParams<{ token: string }>();
  const trimmedToken = token.trim();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requesterLabel, setRequesterLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const autoJoinAttemptedRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setJoined(false);
    setRequesterLabel(null);
    autoJoinAttemptedRef.current = false;

    if (!trimmedToken) {
      navigate("/friends");
      return;
    }

    let cancelled = false;
    void fetch(
      `${BACKEND_URL}/friends/join/${encodeURIComponent(trimmedToken)}`,
    )
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          requesterDisplayLabel?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.valid) {
          setError("This invite link is invalid.");
          setLoading(false);
          return;
        }
        setRequesterLabel(data.requesterDisplayLabel ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load invite link.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, trimmedToken]);

  const joinWithSessionToken = useCallback(async (sessionToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await joinFriendNetworkViaLink(sessionToken, trimmedToken);
      if (!res.ok) {
        setError(res.error ?? "Could not join network.");
        return;
      }
      setJoined(true);
    } finally {
      setLoading(false);
    }
  }, [trimmedToken]);

  async function handleJoin() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    await joinWithSessionToken(sessionToken);
  }

  useEffect(() => {
    if (loading || joined || error || autoJoinAttemptedRef.current) return;

    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    autoJoinAttemptedRef.current = true;
    void joinWithSessionToken(sessionToken);
  }, [error, joined, joinWithSessionToken, loading]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-24">
        <h1 className="text-3xl font-semibold">Join Friends Network</h1>
        {loading ? <p className="mt-4 text-muted-foreground">Loading…</p> : null}
        {!loading && joined ? (
          <div className="mt-6 space-y-4">
            <p className="text-muted-foreground">
              You have a pending invitation. Open your Friends page to accept and
              connect.
            </p>
            <Button asChild>
              <Link to="/friends">Go to Friends</Link>
            </Button>
          </div>
        ) : null}
        {!loading && !joined && error ? (
          <p className="mt-4 text-destructive">{error}</p>
        ) : null}
        {!loading && !joined && !error ? (
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              {requesterLabel
                ? `${requesterLabel} invited you to join their Private Value Network on KeenVPN.`
                : "You have been invited to join a KeenVPN Friends Network."}
            </p>
            <Button onClick={() => void handleJoin()} disabled={loading}>
              Continue
            </Button>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
