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
import { Apple, Loader2, Mail } from "lucide-react";
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
import { peekPendingMembershipInviteAcceptRedirect } from "@/auth/membership-invite-accept-intent";
import { recordSignupStarted } from "@/auth/backend";
import GoogleIcon from "@/components/ui/google-icon";
import AuthProductPreview from "@/components/auth/AuthProductPreview";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { marketingSiteUrl } from "@/lib/site-urls";

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
    const pendingInviteAcceptUrl = peekPendingMembershipInviteAcceptRedirect();
    if (pendingInviteAcceptUrl) {
      return pendingInviteAcceptUrl;
    }
    return "/dashboard";
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
          return;
        }
        const pendingInviteAcceptUrl =
          peekPendingMembershipInviteAcceptRedirect();
        if (pendingInviteAcceptUrl) {
          window.location.href = pendingInviteAcceptUrl;
          return;
        }
        window.location.href = "/dashboard";
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
    <div className="min-h-[100dvh] bg-[#faf6ec] text-[#0f2040] lg:grid lg:grid-cols-[44.4%_55.6%]">
      <SEOHead
        title="Sign In — KeenVPN"
        description="Sign in to your KeenVPN account to manage your subscription and settings."
        canonical="https://vpnkeen.com/signin"
        noIndex
      />

      <main className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14 lg:pb-10 xl:px-20 2xl:px-24">
        <div className="mx-auto w-full max-w-[480px] lg:pt-8 xl:pt-10">
          <a
            href={marketingSiteUrl()}
            aria-label="KeenVPN home"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85c04] focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf6ec]"
          >
            <img src="/logo.png" alt="" className="h-10 w-10" />
            <span className="text-xl font-bold tracking-[-0.035em]">
              KeenVPN
            </span>
          </a>

          <section className="mt-10 w-full sm:mt-12 lg:mt-14">
            <div className="mb-8 lg:mb-9">
              <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.04em] text-[#111827] lg:text-[2.7rem]">
                Welcome to KeenVPN
              </h1>
              <p className="mt-4 text-lg leading-7 text-[#6c7077] sm:text-xl">
                {isASWebSession
                  ? "Sign in to continue in the KeenVPN app"
                  : "Get started with secure VPN access"}
              </p>
            </div>

            <form
              onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="email-otp"
                  className="text-base font-semibold text-[#4a4f57]"
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
                  className="h-[3.7rem] rounded-[0.7rem] border-[#d1d4d8] bg-white px-5 text-lg md:text-lg text-[#0f2040] shadow-[0_2px_8px_rgba(15,32,64,0.06)] placeholder:text-[#8b8f96] focus-visible:border-[#3a7ca5] focus-visible:ring-[#3a7ca5]/20"
                />
              </div>

              {otpSent ? (
                <div className="space-y-2 rounded-xl border border-[#d8d9d6] bg-white/65 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="email-otp-code"
                      className="text-sm font-semibold text-[#4a4f57]"
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
                className="h-16 w-full cursor-pointer rounded-[0.7rem] bg-[#10244a] text-lg font-medium text-white shadow-none hover:bg-[#172f5c] disabled:cursor-not-allowed disabled:bg-[#10244a] disabled:text-white disabled:opacity-100 disabled:pointer-events-auto"
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

            <div className="mt-5 space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-[3.7rem] w-full rounded-[0.7rem] border border-[#d1d4d8] bg-white text-lg font-medium text-[#252a32] shadow-[0_2px_8px_rgba(15,32,64,0.05)] hover:bg-[#f8f8f7]"
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
                  className="h-[3.7rem] w-full rounded-[0.7rem] border border-[#d1d4d8] bg-white text-lg font-medium text-[#252a32] shadow-[0_2px_8px_rgba(15,32,64,0.05)] hover:bg-[#f8f8f7]"
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

            <div className="mt-11 text-center text-base text-[#484d55]">
              <span>Forgot password? </span>
              <Link
                to="/signin/magic"
                className="font-medium text-[#e85c04] underline-offset-4 hover:text-[#c84d00] hover:underline"
              >
                Use a magic link
              </Link>
            </div>
          </section>
        </div>

        <footer className="mx-auto mt-14 w-full max-w-[480px] pt-2 text-sm text-[#555a62] lg:mt-auto lg:pt-16">
          © {new Date().getFullYear()} KeenVPN. All rights reserved.
        </footer>
      </main>

      <AuthProductPreview />
    </div>
  );
};

export default SignIn;
