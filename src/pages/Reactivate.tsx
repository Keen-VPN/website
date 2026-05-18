import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, RotateCcw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RETENTION_WINBACK_TOKEN_STORAGE_KEY,
  getSessionToken,
  previewRetentionWinbackOffer,
  reactivateRetentionWinbackOffer,
} from "@/auth";
import { useAuth } from "@/contexts/AuthContext";

const Reactivate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refreshSubscription, hasSessionToken } = useAuth();
  const tokenParam = searchParams.get("token") ?? "";
  const token = React.useMemo(() => {
    if (tokenParam) return tokenParam;
    try {
      return (
        sessionStorage.getItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY) || ""
      );
    } catch {
      return "";
    }
  }, [tokenParam]);
  const [status, setStatus] = React.useState<
    "loading" | "signin" | "ready" | "success" | "apple" | "error"
  >("loading");
  const [message, setMessage] = React.useState("");
  const terminalStateReached = React.useRef(false);
  /** Avoid a second preview round-trip once this token passed validation. */
  const previewValidatedForToken = React.useRef<string | null>(null);
  /** Suppress stale async work after deps change (Firebase user reference refresh, etc.). */
  const flowRunGenerationRef = React.useRef(0);
  /** Single in-flight reactivation per (session, offer) pair to avoid duplicate API calls. */
  const reactivateFlightRef = React.useRef<{
    key: string;
    promise: ReturnType<typeof reactivateRetentionWinbackOffer>;
  } | null>(null);

  React.useEffect(() => {
    if (token) {
      sessionStorage.setItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY, token);
    }
    previewValidatedForToken.current = null;
  }, [token]);

  React.useEffect(() => {
    const myRun = ++flowRunGenerationRef.current;
    let cancelled = false;

    async function run() {
      if (terminalStateReached.current) return;

      if (!token) {
        terminalStateReached.current = true;
        sessionStorage.removeItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY);
        setStatus("error");
        setMessage("This win-back offer link is missing or invalid.");
        return;
      }

      if (loading) return;

      const skipPreview = previewValidatedForToken.current === token;
      const preview = skipPreview
        ? ({ success: true as const } satisfies Awaited<
            ReturnType<typeof previewRetentionWinbackOffer>
          >)
        : await previewRetentionWinbackOffer(token);
      if (cancelled || flowRunGenerationRef.current !== myRun) return;
      if (!preview.success) {
        terminalStateReached.current = true;
        if (preview.discardStoredOffer || preview.invalidToken) {
          sessionStorage.removeItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY);
        }
        setStatus("error");
        setMessage(preview.error ?? "This win-back offer is unavailable.");
        return;
      }
      previewValidatedForToken.current = token;

      if (!user) {
        setStatus("signin");
        return;
      }

      if (!hasSessionToken) {
        // Firebase user exists; backend session may still be established in AuthContext.
        setStatus("loading");
        return;
      }

      setStatus("ready");
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setStatus("loading");
        return;
      }

      const flightKey = `${sessionToken}\0${token}`;
      let flight = reactivateFlightRef.current;
      if (!flight || flight.key !== flightKey) {
        const promise = reactivateRetentionWinbackOffer(
          sessionToken,
          token,
        ).finally(() => {
          if (reactivateFlightRef.current?.key === flightKey) {
            reactivateFlightRef.current = null;
          }
        });
        reactivateFlightRef.current = { key: flightKey, promise };
        flight = reactivateFlightRef.current;
      }

      const result = await flight.promise;
      if (cancelled || flowRunGenerationRef.current !== myRun) return;
      setMessage(result.message ?? result.error ?? "");

      if (result.success) {
        sessionStorage.removeItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY);
        await refreshSubscription();
        if (cancelled || flowRunGenerationRef.current !== myRun) return;
        terminalStateReached.current = true;
        setStatus("success");
      } else if (result.requiresAppleSettings) {
        terminalStateReached.current = true;
        setStatus("apple");
      } else {
        terminalStateReached.current = true;
        if (result.discardStoredOffer || result.invalidToken) {
          sessionStorage.removeItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY);
        }
        setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasSessionToken, loading, refreshSubscription, token, user]);

  const signInForOffer = () => {
    if (token) {
      sessionStorage.setItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY, token);
    }
    navigate("/signin");
  };

  const dismissOfferToAccount = () => {
    sessionStorage.removeItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY);
    navigate("/account");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Reactivate Auto-Renewal - KeenVPN"
        description="Turn KeenVPN auto-renewal back on and redeem your win-back offer."
        canonical="https://vpnkeen.com/reactivate"
        noIndex
      />
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-lg">
          <Card className="border-accent/50 shadow-glow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <RotateCcw className="h-6 w-6" />
              </div>
              <CardTitle>Turn Auto-Renewal Back On</CardTitle>
              <CardDescription>
                Redeem your 30 extra days free after reactivation is confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {status === "loading" || status === "ready" ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Reactivating your subscription...
                  </p>
                </div>
              ) : null}

              {status === "signin" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sign in with the account that received this offer, then we
                    will bring you back here to turn auto-renewal on.
                  </p>
                  <Button onClick={signInForOffer} className="w-full">
                    Sign in to continue
                  </Button>
                </>
              ) : null}

              {status === "success" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {message ||
                      "Auto-renewal is back on and your offer was applied."}
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/account">Go to account</Link>
                  </Button>
                </>
              ) : null}

              {status === "apple" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {message ||
                      "Apple subscriptions must be re-enabled in Apple subscription settings. Once Apple confirms it, your offer will be applied."}
                  </p>
                  <Button asChild className="w-full">
                    <a href="itms-apps://apps.apple.com/account/subscriptions">
                      Open Apple Subscriptions
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You can also open Settings, tap your Apple ID, then
                    Subscriptions, and choose KeenVPN.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={dismissOfferToAccount}
                  >
                    Continue to account without this offer
                  </Button>
                </>
              ) : null}

              {status === "error" ? (
                <>
                  <p className="text-sm text-destructive">
                    {message || "This offer could not be redeemed."}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/account">Open account</Link>
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Reactivate;
