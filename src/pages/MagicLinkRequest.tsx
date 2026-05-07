import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestMagicLink } from "@/auth";
import { Loader2, MailCheck } from "lucide-react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MagicLinkRequest = () => {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const result = await requestMagicLink(trimmedEmail);
    setLoading(false);

    if (!result.success) {
      setError(
        result.rateLimited
          ? "Too many attempts. Please wait a few minutes and try again."
          : result.error || "We could not send your magic link right now.",
      );
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Send Magic Link — KeenVPN"
        description="Enter your email to receive a secure magic sign-in link."
        canonical="https://vpnkeen.com/signin/magic"
        noIndex
      />
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="border-accent/50 shadow-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Passwordless sign in</CardTitle>
              <CardDescription>
                Enter your email and we will send a secure one-time magic link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {success ? (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <MailCheck className="h-4 w-4" />
                    Check your email
                  </div>
                  <p className="mt-2 text-sm">
                    Check your email for a secure sign-in link.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                  />
                  {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                  ) : null}
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Magic Link"
                    )}
                  </Button>
                </form>
              )}
              <div className="text-center text-sm text-muted-foreground">
                <Link to="/signin" className="text-primary hover:underline">
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MagicLinkRequest;
