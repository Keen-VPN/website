import React from "react";
import { Link } from "react-router-dom";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Apple, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  consumePendingMembershipTransfer,
  consumePendingMembershipTransferReturnUrl,
} from "@/auth/membership-transfer-flow";
import {
  capturePostLoginRedirectFromSearch,
  clearPostLoginRedirect,
  clearRetentionWinbackTokenStorage,
  consumePostLoginRedirect,
  requestEmailOtp,
  RETENTION_WINBACK_TOKEN_STORAGE_KEY,
  storeSessionToken,
  useDebounce,
  verifyEmailOtp,
} from "@/auth";
import { recordSignupStarted } from "@/auth/backend";
import GoogleIcon from "@/components/ui/google-icon";
import AuthProductPreview from "@/components/auth/AuthProductPreview";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";

const sanitizeOtpCode = (value: string) => value.replace(/\D/g, "").slice(0, 6);

const SignIn = () => {
  const {
    signIn,
    loading: authLoading,
    isAuthenticating,
    user,
    subscription,
    hasSessionToken,
  } = useAuth();
  const { toast } = useToast();
  const [otpEmail, setOtpEmail] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpMessage, setOtpMessage] = React.useState("");
  const [otpLoading, setOtpLoading] = React.useState(false);

  const emailForOtp = otpEmail.trim().toLowerCase();

  const isASWebSession = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return (
      urlParams.get("asweb") === "1" ||
      sessionStorage.getItem("asweb_session") === "1"
    );
  }, []);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("asweb") === "1") {
      sessionStorage.setItem("asweb_session", "1");
    }
    capturePostLoginRedirectFromSearch(window.location.search);
  }, []);

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
      clearPostLoginRedirect();
      return "/account?asweb=1";
    }
    if (sessionStorage.getItem(RETENTION_WINBACK_TOKEN_STORAGE_KEY)) {
      return "/reactivate";
    }
    const transferUrl = consumePendingMembershipTransferReturnUrl();
    if (transferUrl) {
      return transferUrl;
    }
    const redirectUrl = consumePostLoginRedirect();
    if (redirectUrl) {
      return redirectUrl;
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
            "🔐 ASWebSession detected - redirecting logged-in user to account page",
          );
          window.location.href = "/account?asweb=1";
          return;
        }

        // Wait for the backend session before leaving /signin so invite accept
        // (and similar redirects) can call authenticated APIs immediately.
        if (!hasSessionToken) return;

        // Redirect was captured on mount. Do not call capture again here —
        // OAuth return URLs often omit ?redirect=, which would clear storage.
        const redirectUrl = consumePostLoginRedirect();
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      }
    }
  }, [user, authLoading, subscription, hasSessionToken]);

  // Debounce sign-in to prevent double-clicks
  const [handleGoogleSignIn, isGoogleDebouncing] = useDebounce(async () => {
    await recordSignupStarted();
    await signIn("google");
  }, 2000);

  const [handleAppleSignIn, isAppleDebouncing] = useDebounce(async () => {
    await recordSignupStarted();
    await signIn("apple");
  }, 2000);

  const providerLoading =
    authLoading || isGoogleDebouncing || isAppleDebouncing || isAuthenticating;
  const isLoading = providerLoading || otpLoading;

  const sendOtp = async () => {
    if (!emailForOtp) return;

    setOtpLoading(true);
    setOtpMessage("");
    await recordSignupStarted();
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
        : (result.message ?? "Code sent."),
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

    setOtpCode("");
    storeSessionToken(result.sessionToken);
    localStorage.setItem("auth_provider", "email");
    sessionStorage.setItem("auth_provider", "email");
    window.location.href = postOtpLoginUrl();
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8f3e9] text-[#0f2040] lg:grid lg:grid-cols-[minmax(430px,42%)_minmax(0,58%)]">
      <SEOHead
        title="Sign In — KeenVPN"
        description="Sign in to your KeenVPN account to manage your subscription and settings."
        canonical="https://vpnkeen.com/signin"
        noIndex
      />

      <main className="relative flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-16 2xl:px-20">
        <header>
          <Link
            to="/"
            aria-label="KeenVPN home"
            className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85c04] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f8f3e9]"
          >
            <img src="/logo.png" alt="" className="h-10 w-10 sm:h-11 sm:w-11" />
            <span className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">
              KeenVPN
            </span>
          </Link>
        </header>

        <section className="mx-auto flex w-full max-w-[510px] flex-1 items-center py-10 sm:py-14 lg:py-12">
          <div className="w-full">
            <div className="mb-8 sm:mb-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#e85c04]">
                Secure access starts here
              </p>
              <h1 className="text-4xl font-bold tracking-[-0.045em] text-[#0b1729] sm:text-5xl lg:text-[2.8rem] xl:text-5xl">
                Welcome to KeenVPN
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-[#626a76] sm:text-lg">
                {isASWebSession
                  ? "Sign in securely to continue in the KeenVPN app."
                  : "Get started with fast, private VPN access on all your supported devices."}
              </p>
            </div>

            <form
              onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="email-otp"
                  className="text-sm font-semibold text-[#26354b]"
                >
                  Email
                </Label>
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
                  placeholder="Enter your email"
                  className="h-14 rounded-xl border-[#cfd3da] bg-white px-4 text-base text-[#0f2040] shadow-[0_3px_12px_rgba(15,32,64,0.06)] placeholder:text-[#8a9099] focus-visible:border-[#3a7ca5] focus-visible:ring-[#3a7ca5]/25"
                />
              </div>

              {otpSent ? (
                <div className="space-y-2 rounded-xl border border-[#d8d9d6] bg-white/65 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="email-otp-code"
                      className="text-sm font-semibold text-[#26354b]"
                    >
                      Sign-in code
                    </Label>
                    <span className="text-xs text-[#737985]">
                      Check {emailForOtp}
                    </span>
                  </div>
                  <InputOTP
                    id="email-otp-code"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    pasteTransformer={sanitizeOtpCode}
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(value) => setOtpCode(sanitizeOtpCode(value))}
                    disabled={isLoading}
                    containerClassName="justify-center sm:justify-start"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-11 w-11 border-[#cfd3da] bg-white text-base text-[#0f2040] first:border-l"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              ) : null}

              {otpMessage ? (
                <p
                  role="status"
                  className="rounded-lg bg-[#3a7ca5]/10 px-3 py-2 text-sm text-[#245d80]"
                >
                  {otpMessage}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={
                  isLoading || !emailForOtp || (otpSent && otpCode.length !== 6)
                }
                className="h-14 w-full rounded-xl bg-[#0f2040] text-base font-semibold text-white shadow-[0_12px_30px_rgba(15,32,64,0.18)] hover:bg-[#172f5c]"
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
                  className="h-11 w-full text-[#e85c04] hover:bg-[#e85c04]/10 hover:text-[#c84d00]"
                  onClick={() => void sendOtp()}
                >
                  Resend code
                </Button>
              ) : null}
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#d7d5cf]" />
              </div>
              <div className="relative flex justify-center text-xs font-semibold uppercase tracking-[0.14em]">
                <span className="bg-[#f8f3e9] px-3 text-[#858a91]">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-14 w-full rounded-xl border border-[#cfd3da] bg-white text-base font-semibold text-[#1f2937] shadow-[0_3px_12px_rgba(15,32,64,0.06)] hover:bg-[#f7f8fa]"
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

              {!isASWebSession ? (
                <Button
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                  className="h-14 w-full rounded-xl border border-[#cfd3da] bg-white text-base font-semibold text-[#111827] shadow-[0_3px_12px_rgba(15,32,64,0.06)] hover:bg-[#f7f8fa]"
                  size="lg"
                >
                  {isAppleDebouncing ||
                  (providerLoading && !isGoogleDebouncing) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isAppleDebouncing
                        ? "Please wait..."
                        : "Authenticating..."}
                    </>
                  ) : (
                    <>
                      <Apple className="mr-2 h-5 w-5 fill-current" />
                      Continue with Apple
                    </>
                  )}
                </Button>
              ) : null}
            </div>

            <div className="mt-7 text-center">
              <Link
                to="/signin/magic"
                className="text-sm font-semibold text-[#e85c04] underline-offset-4 hover:text-[#c84d00] hover:underline"
              >
                Prefer a magic link? Send one by email
              </Link>
              <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-[#747b85]">
                By signing in, you agree to our{" "}
                <a
                  href="/terms"
                  className="font-semibold text-[#0f2040] underline-offset-4 hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="font-semibold text-[#0f2040] underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </a>
                . New users receive an account automatically.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#dedbd4] pt-5 text-xs text-[#747b85] sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} KeenVPN. All rights reserved.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="h-3.5 w-3.5 text-[#3a7ca5]" />
            Secure sign-in
          </span>
        </footer>
      </main>

      <AuthProductPreview />
    </div>
  );
};

export default SignIn;
