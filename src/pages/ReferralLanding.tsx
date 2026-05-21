import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BACKEND_URL } from "@/auth/backend";
import {
  clearReferralTokenStorage,
  setReferralTokenStorage,
} from "@/auth/referral-token";

const ReferralLanding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** `true` once we get explicit `valid: false` */
  const [inviteInvalid, setInviteInvalid] = useState(false);
  /** Network failure, non-OK HTTP, or malformed resolve body (no usable `valid` boolean). */
  const [resolveFailed, setResolveFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setReferrerName(null);
    setInviteInvalid(false);
    setResolveFailed(false);
    setLoading(true);

    let cancelled = false;

    void fetch(`${BACKEND_URL}/referral/resolve/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          referrerName?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setResolveFailed(true);
          setLoading(false);
          return;
        }
        if (typeof data.valid !== "boolean") {
          setResolveFailed(true);
          setLoading(false);
          return;
        }
        if (data.valid === false) {
          clearReferralTokenStorage();
          setInviteInvalid(true);
        } else {
          setReferralTokenStorage(token);
          if (data.referrerName) {
            setReferrerName(data.referrerName);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setResolveFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, navigate, retryNonce]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-gradient-hero py-20">
        <Card className="w-full max-w-lg border-accent/50 text-center shadow-glow">
          <CardHeader>
            <CardTitle className="text-2xl">
              {inviteInvalid
                ? "This invite isn't available"
                : resolveFailed
                  ? "Couldn't verify this invite"
                  : referrerName
                    ? `${referrerName} invited you to KeenVPN`
                    : "You've been invited to KeenVPN"}
            </CardTitle>
            <CardDescription className="text-base">
              {inviteInvalid ? (
                <span className="block font-medium text-destructive">
                  This invite link could not be validated. It may be invalid, expired,
                  or referrals may be unavailable.
                </span>
              ) : resolveFailed ? (
                <span className="block text-muted-foreground">
                  We couldn&apos;t reach KeenVPN to validate this link (or the response was incomplete).
                  Retry in a moment — your invite isn&apos;t saved until validation succeeds.
                </span>
              ) : (
                <>
                  Create an account with the same browser session to connect this invite.
                  When you subscribe, your friend can earn 1 free month.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteInvalid ? (
              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                type="button"
                onClick={() => navigate("/")}
              >
                Go home
              </Button>
            ) : resolveFailed ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full flex-1"
                  size="lg"
                  type="button"
                  onClick={() => setRetryNonce((n) => n + 1)}
                >
                  Try again
                </Button>
                <Button
                  className="w-full flex-1"
                  size="lg"
                  variant="outline"
                  type="button"
                  onClick={() => navigate("/")}
                >
                  Go home
                </Button>
              </div>
            ) : (
              <Button className="w-full" size="lg" type="button" onClick={() => navigate("/signin")}>
                Sign up or sign in
              </Button>
            )}
            {!inviteInvalid && !resolveFailed ? (
              <p className="text-sm text-muted-foreground">
                After you subscribe on a paid plan, rewards apply per program terms.
              </p>
            ) : inviteInvalid ? (
              <p className="text-sm text-muted-foreground">
                You can still use KeenVPN — use the sign-in flow from the homepage when you&apos;re ready.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ReferralLanding;
