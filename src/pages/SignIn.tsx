import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Apple } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/auth";
import GoogleIcon from "@/components/ui/google-icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const SignIn = () => {
  const { signIn, loading: authLoading, isAuthenticating, user, subscription } = useAuth();

  // Redirect logic for logged-in users
  React.useEffect(() => {
    if (!authLoading && user) {
      // Check if this is from ASWebAuthenticationSession (macOS desktop app)
      const urlParams = new URLSearchParams(window.location.search);
      const isASWebSession =
        urlParams.get("asweb") === "1" ||
        sessionStorage.getItem("asweb_session") === "1";

      const currentPath = window.location.pathname;
      if (currentPath === "/signin") {
        if (isASWebSession) {
          // If user is already logged in and visited signin via macOS app, redirect to account
          // The account page will show the deeplink modal
          console.warn(
            "🔐 ASWebSession detected - redirecting logged-in user to account page"
          );
          window.location.href = "/account?asweb=1";
          return;
        }
      }
    }
  }, [user, authLoading, subscription]);

  // Debounce sign-in to prevent double-clicks
  const [handleGoogleSignIn, isGoogleDebouncing] = useDebounce(async () => {
    await signIn("google");
  }, 2000);

  const [handleAppleSignIn, isAppleDebouncing] = useDebounce(async () => {
    await signIn("apple");
  }, 2000);

  const isLoading =
    authLoading || isGoogleDebouncing || isAppleDebouncing || isAuthenticating;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Sign In — KeenVPN"
        description="Sign in to your KeenVPN account to manage your subscription and settings."
        canonical="https://vpnkeen.com/signin"
        noIndex
      />
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center my-4 ">
              <img
                src="/logo-white.png"
                alt="KeenVPN"
                className="h-14 w-14 transition-transform group-hover:scale-105"
              />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to <span className="text-primary">KeenVPN</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Get started with secure VPN access
            </p>
          </div>

          <Card className="border-accent/50 shadow-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Continue with</CardTitle>
              <CardDescription>
                Choose your preferred sign-in method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white text-gray-900 hover:bg-gray-50 border border-gray-300"
                size="lg"
              >
                {isGoogleDebouncing || (isLoading && !isAppleDebouncing) ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isGoogleDebouncing
                      ? "Please wait..."
                      : "Authenticating..."}
                  </>
                ) : (
                  <>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Continue with Google
                  </>
                )}
              </Button>

              <Button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="w-full bg-black text-white hover:bg-gray-800"
                size="lg"
              >
                {isAppleDebouncing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isAppleDebouncing ? "Please wait..." : "Authenticating..."}
                  </>
                ) : (
                  <>
                    <Apple className="mr-2 h-5 w-5" />
                    Continue with Apple
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <div className="mb-3">
                  <Link to="/signin/magic" className="text-sm text-primary hover:underline">
                    Forgot your password? Use a magic link
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  By signing in, you agree to our{" "}
                  <a href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Existing users will be signed in automatically.
              <br />
              New users will have an account created instantly.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SignIn;
