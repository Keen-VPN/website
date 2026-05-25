import React from "react";
import { Link } from "react-router-dom";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Loader2, Apple, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  consumePendingMembershipTransfer,
  consumePendingMembershipTransferReturnUrl,
} from "@/auth/membership-transfer-flow";
import {
  clearRetentionWinbackTokenStorage,
  requestEmailOtp,
  RETENTION_WINBACK_TOKEN_STORAGE_KEY,
  storeSessionToken,
  useDebounce,
  verifyEmailOtp,
} from "@/auth";
import GoogleIcon from "@/components/ui/google-icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";

const sanitizeOtpCode = (value: string) => value.replace(/\D/g, "").slice(0, 6);

const SignIn = () => {
  const { signIn, loading: authLoading, isAuthenticating, user, subscription } = useAuth();
  const { toast } = useToast();
  const [otpEmail, setOtpEmail] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpMessage, setOtpMessage] = React.useState("");
  const [otpLoading, setOtpLoading] = React.useState(false);

  const emailForOtp = otpEmail.trim().toLowerCase();
  const postOtpLoginUrl = React.useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isASWebSession =
      urlParams.get("asweb") === "1" ||
      sessionStorage.getItem("asweb_session") === "1";

    if (isASWebSession) {
      // ASWeb sessions must return to the account page for the app callback.
      // Clear stale web-only win-back token + membership transfer so neither
      // can surprise the user on a later full-browser login.
      consumePendingMembershipTransfer();
      clearRetentionWinbackTokenStorage();
      return "/account?asweb=1";
    }
    if (sessionStorage.getItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY)) {
      return "/reactivate";
    }
    const transferUrl = consumePendingMembershipTransferReturnUrl();
    if (transferUrl) {
      return transferUrl;
    }
    return "/account";
  }, []);

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

  const providerLoading =
    authLoading ||
    isGoogleDebouncing ||
    isAppleDebouncing ||
    isAuthenticating;
  const isLoading = providerLoading || otpLoading;

  const sendOtp = async () => {
    if (!emailForOtp) return;

    setOtpLoading(true);
    setOtpMessage("");
    const result = await requestEmailOtp(emailForOtp);
    setOtpLoading(false);

    if (!result.success) {
      toast({
        title: result.rateLimited ? "Too many code requests" : "Code not sent",
        description: result.error ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }

    setOtpSent(true);
    setOtpCode("");
    setOtpMessage(
      result.expiresInMinutes
        ? `Code sent. It expires in ${result.expiresInMinutes} minutes.`
        : result.message ?? "Code sent.",
    );
  };

  const handleRequestOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendOtp();
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailForOtp || otpCode.length !== 6) return;

    setOtpLoading(true);
    const result = await verifyEmailOtp(emailForOtp, otpCode);
    setOtpLoading(false);

    if (!result.success || !result.sessionToken) {
      setOtpCode("");
      toast({
        title: "Sign-in code failed",
        description: result.error ?? "Please check the code and try again.",
        variant: "destructive",
      });
      return;
    }

    storeSessionToken(result.sessionToken);
    localStorage.setItem("auth_provider", "email");
    sessionStorage.setItem("auth_provider", "email");
    window.location.href = postOtpLoginUrl();
  };

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
                {isGoogleDebouncing ||
                (providerLoading && !isAppleDebouncing) ? (
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
                {isAppleDebouncing ||
                (providerLoading && !isGoogleDebouncing) ? (
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

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or use email
                  </span>
                </div>
              </div>

              <form
                onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="email-otp">Email</Label>
                  <Input
                    id="email-otp"
                    type="email"
                    autoComplete="email"
                    value={otpEmail}
                    onChange={(event) => {
                      setOtpEmail(event.target.value);
                      setOtpSent(false);
                      setOtpCode("");
                      setOtpMessage("");
                    }}
                    disabled={isLoading}
                    placeholder="you@example.com"
                  />
                </div>

                {otpSent ? (
                  <div className="space-y-2">
                    <Label htmlFor="email-otp-code">Code</Label>
                    <InputOTP
                      id="email-otp-code"
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS}
                      pasteTransformer={sanitizeOtpCode}
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(value) => setOtpCode(sanitizeOtpCode(value))}
                      disabled={isLoading}
                      containerClassName="justify-center"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                ) : null}

                {otpMessage ? (
                  <p className="text-sm text-muted-foreground">{otpMessage}</p>
                ) : null}

                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    !emailForOtp ||
                    (otpSent && otpCode.length !== 6)
                  }
                  className="w-full"
                  size="lg"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {otpSent ? "Checking code..." : "Sending code..."}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      {otpSent ? "Sign in with code" : "Send sign-in code"}
                    </>
                  )}
                </Button>

                {otpSent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isLoading}
                    className="w-full"
                    onClick={() => void sendOtp()}
                  >
                    Resend code
                  </Button>
                ) : null}
              </form>

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
