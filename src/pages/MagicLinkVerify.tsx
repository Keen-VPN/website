import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { storeSessionToken, verifyMagicLink } from "@/auth";

const MagicLinkVerify = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = React.useState<"loading" | "success" | "expired" | "error">(
    "loading",
  );
  const [message, setMessage] = React.useState<string>("Verifying your secure link...");

  const token = searchParams.get("token") || "";

  React.useEffect(() => {
    const run = async () => {
      if (!token) {
        setState("error");
        setMessage("Missing magic link token.");
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
  }, [token]);

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
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MagicLinkVerify;
