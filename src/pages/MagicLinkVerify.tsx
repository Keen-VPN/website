import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { storeSessionToken, verifyMagicLink } from "@/auth";

const APP_DEEP_LINK_BASE = "keenvpn://auth/magic";

const MagicLinkVerify = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = React.useState<"loading" | "success" | "expired" | "error">(
    "loading",
  );
  const [message, setMessage] = React.useState<string>("Verifying your secure link...");

  const token = searchParams.get("token") || "";
  const shouldOpenApp = searchParams.get("openApp") === "1";
  const appDeepLink = `${APP_DEEP_LINK_BASE}?token=${encodeURIComponent(token)}`;

  React.useEffect(() => {
    const run = async () => {
      if (!token) {
        setState("error");
        setMessage("Missing magic link token.");
        return;
      }

      // Email clients often block custom URL schemes directly in emails.
      // For openApp=1, we first try opening the installed app from a web page.
      if (shouldOpenApp) {
        setMessage("Opening KeenVPN app...");
        window.location.href = appDeepLink;
        await new Promise((resolve) => {
          window.setTimeout(resolve, 1200);
        });

        // Do not verify on web in the open-app flow, otherwise the one-time token
        // can be consumed by the app first and always fail here.
        setState("success");
        setMessage("If KeenVPN did not open, continue on web below.");
        return;
      }

      const response = await verifyMagicLink(token);
      if (!response.success || !response.sessionToken) {
        const errorMessage = (response.error || "").toLowerCase();
        if (errorMessage.includes("expired")) {
          setState("expired");
          setMessage("This link has expired.");
          return;
        }
        setState("error");
        setMessage(response.error || "Invalid or already used link.");
        return;
      }

      storeSessionToken(response.sessionToken);
      setState("success");
      setMessage("Signed in successfully. Redirecting...");
      window.location.href = "/account";
    };

    void run();
  }, [appDeepLink, shouldOpenApp, token]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Magic Link Sign In — KeenVPN"
        description="Securely sign in with your magic link."
        canonical="https://vpnkeen.com/auth/magic"
        noIndex
      />
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="border-accent/50 shadow-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Secure sign in</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state === "loading" ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : null}

              {state === "success" && shouldOpenApp ? (
                <div className="space-y-3">
                  <Button className="w-full" asChild>
                    <a href={appDeepLink}>Open KeenVPN app again</a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/auth/magic?token=${encodeURIComponent(token)}`}>
                      Continue on web
                    </Link>
                  </Button>
                </div>
              ) : null}

              {state === "expired" ? (
                <div className="space-y-3">
                  <Button className="w-full" asChild>
                    <Link to="/signin/magic">Send a new magic link</Link>
                  </Button>
                </div>
              ) : null}

              {(state === "error" || state === "expired") && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/signin">Back to sign in</Link>
                </Button>
              )}

              {(state === "loading" || state === "expired") && (
                <Button variant="ghost" className="w-full" asChild>
                  <a href={appDeepLink}>Open in KeenVPN app</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MagicLinkVerify;
