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
  getSessionToken,
  previewRetentionWinbackOffer,
  reactivateRetentionWinbackOffer,
} from "@/auth";
import { useAuth } from "@/contexts/AuthContext";

const RETENTION_TOKEN_KEY = "retention_winback_token";

const Reactivate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refreshSubscription } = useAuth();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [token] = React.useState(
    () => tokenFromUrl || sessionStorage.getItem(RETENTION_TOKEN_KEY) || ""
  );
  const [status, setStatus] = React.useState<
    "loading" | "signin" | "ready" | "success" | "apple" | "error"
  >("loading");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (token) {
      sessionStorage.setItem(RETENTION_TOKEN_KEY, token);
    }
  }, [token]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("This win-back offer link is missing or invalid.");
        return;
      }

      const preview = await previewRetentionWinbackOffer(token);
      if (cancelled) return;
      if (!preview.success) {
        setStatus("error");
        setMessage(preview.error ?? "This win-back offer is unavailable.");
        return;
      }

      if (loading) return;
      if (!user) {
        setStatus("signin");
        return;
      }

      setStatus("ready");
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setStatus("signin");
        return;
      }

      const result = await reactivateRetentionWinbackOffer(sessionToken, token);
      if (cancelled) return;
      setMessage(result.message ?? result.error ?? "");

      if (result.success) {
        sessionStorage.removeItem(RETENTION_TOKEN_KEY);
        await refreshSubscription();
        setStatus("success");
      } else if (result.requiresAppleSettings) {
        setStatus("apple");
      } else {
        setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, refreshSubscription, token, user]);

  const signInForOffer = () => {
    if (token) {
      sessionStorage.setItem(RETENTION_TOKEN_KEY, token);
    }
    navigate("/signin");
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
