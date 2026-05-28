import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  LogOut,
  Shield,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  History,
  ArrowUpCircle,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  deleteAccount,
  getSessionToken,
  getContactEmailStatus,
  saveContactEmail,
  sendContactEmailVerification,
  skipContactEmailPrompt,
} from "@/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LinkedAccounts } from "@/components/LinkedAccounts";
import { EmailPreferencesCard } from "@/components/EmailPreferencesCard";
import { SubscriptionCancellationControls } from "@/components/SubscriptionCancellationControls";
import { isAppDeepLinkSupported, getUnsupportedDeviceName } from "@/lib/device-detection";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import {
  getAppDownloadButtonLabel,
  openAppOrAppStore,
} from "@/lib/open-app-or-store";
import { useSubscriptionBillingActions } from "@/hooks/use-subscription-billing-actions";
import { useAnnualUpgrade } from "@/hooks/use-annual-upgrade";
import {
  ANNUAL_UPGRADE_BANNER_DISMISS_KEY,
  AnnualUpgradeBanner,
} from "@/components/AnnualUpgradeBanner";
import { AppleIapSubscriptionsCta } from "@/components/AppleIapSubscriptionsCta";
import {
  canUpgradeAppleIapToAnnual,
  canUpgradeStripeToAnnual,
  getSubscriptionCtaLabel,
  hasManageableSubscription,
  isStripeSubscription,
  shouldShowAnnualUpgradeOffer,
} from "@/lib/subscription-cta";
import {
  PAYMENT_SUCCESS_DEEP_LINK,
  RETURN_TO_APP_LABEL,
  clearStripeCheckoutReturn,
  dismissStripePostCheckoutUi,
  markStripeAutoOpenDone,
  isStripeCheckoutReturn,
  markStripeCheckoutReturn,
  returnToKeenVpnAppAfterPayment,
  shouldAutoOpenAppAfterStripeCheckout,
  shouldShowStripePostCheckoutUi,
} from "@/lib/keenvpn-deep-links";

const Account = () => {
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  // true on normal /account (no session_id) — render subscription card immediately;
  // AuthContext usually has subscription already. Stripe return starts false (skeleton until sync).
  const [initialSubscriptionChecked, setInitialSubscriptionChecked] = useState(
    () => !new URLSearchParams(window.location.search).get("session_id"),
  );
  const [deleting, setDeleting] = useState(false);
  const [annualUpgradeBannerDismissed, setAnnualUpgradeBannerDismissed] =
    useState(
      () =>
        typeof window !== "undefined" &&
        localStorage.getItem(ANNUAL_UPGRADE_BANNER_DISMISS_KEY) === "1",
    );
  const {
    cancelling,
    portalLoading,
    cancelSubscriptionAtPeriodEnd,
    openBillingPortal,
  } = useSubscriptionBillingActions();
  const { upgrading, upgradeToAnnual } = useAnnualUpgrade();
  const [showContactEmailModal, setShowContactEmailModal] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactEmailLoading, setContactEmailLoading] = useState(false);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const hasHandledContactEmailPromptRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading, logout, subscription, trial, refreshSubscription, linkedProviders, refreshLinkedProviders, hasSessionToken, authProvider } =
    useAuth();
  const appStoreUrl = useAppStoreUrl();
  const subscriptionCtaLabel = getSubscriptionCtaLabel(
    user,
    subscription,
    trial,
  );

  const isDeepLinkSupported = useMemo(() => isAppDeepLinkSupported(), []);
  const unsupportedDeviceName = useMemo(() => getUnsupportedDeviceName(), []);

  // ASWebAuthenticationSession detection
  const isASWeb = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const detected =
      urlParams.get("asweb") === "1" ||
      sessionStorage.getItem("asweb_session") === "1";
    if (detected && urlParams.get("asweb") === "1") {
      sessionStorage.setItem("asweb_session", "1");
    }
    return detected;
  }, []);
  const hasStripeSessionId = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return Boolean(urlParams.get("session_id"));
  }, [location.search]);
  const stripeSessionId = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("session_id");
  }, [location.search]);
  const processedStripeSessionRef = useRef<string | null>(null);
  const [showPostCheckoutUi, setShowPostCheckoutUi] = useState(() =>
    shouldShowStripePostCheckoutUi(),
  );

  // Mark Stripe return as soon as session_id is present (before auth loading finishes).
  // Otherwise already-signed-in ASWeb users briefly see the auth "Return to App" card instead.
  useEffect(() => {
    if (!hasStripeSessionId) {
      return;
    }
    markStripeCheckoutReturn(stripeSessionId);
    setShowPostCheckoutUi(shouldShowStripePostCheckoutUi());
  }, [hasStripeSessionId, stripeSessionId]);

  // Clear post-checkout markers only when signed out (not while auth is loading).
  useEffect(() => {
    if (loading) return;
    if (!user && !hasSessionToken) {
      clearStripeCheckoutReturn();
      setShowPostCheckoutUi(false);
    }
  }, [user, loading, hasSessionToken]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("email_prefs") !== "unsubscribed") return;
    toast({
      title: "Email preferences updated",
      description: "You are unsubscribed from personalized tips and offers.",
    });
    params.delete("email_prefs");
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, toast]);

  const showPaymentCompleteBanner =
    Boolean(user) && hasSessionToken && showPostCheckoutUi;

  const showReturnToAppCta =
    showPaymentCompleteBanner && isDeepLinkSupported;

  // Intentionally not calling clearStripeCheckoutReturn here — dismiss hides UI via
  // STRIPE_POST_CHECKOUT_UI_DISMISSED_KEY while preserving return/auto-open markers.
  const dismissPostCheckoutUi = () => {
    dismissStripePostCheckoutUi();
    setShowPostCheckoutUi(false);
  };

  useEffect(() => {
    if (!showPostCheckoutUi || !isDeepLinkSupported || isASWeb) {
      return;
    }
    if (!initialSubscriptionChecked || !shouldAutoOpenAppAfterStripeCheckout()) {
      return;
    }

    // Only mark auto-open done — keep banner/buttons if the deep link fails (app not installed).
    const timer = window.setTimeout(() => {
      markStripeAutoOpenDone();
      returnToKeenVpnAppAfterPayment();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    showPostCheckoutUi,
    isDeepLinkSupported,
    isASWeb,
    initialSubscriptionChecked,
  ]);

  // The session token may not be in localStorage yet when Account first mounts
  // (AuthContext is still verifying with the backend). Poll until it arrives.
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    isASWeb ? getSessionToken() : null,
  );
  useEffect(() => {
    if (!isASWeb || sessionToken) return;
    const id = setInterval(() => {
      const token = getSessionToken();
      if (token) {
        setSessionToken(token);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [isASWeb, sessionToken]);

  // On first account view, ensure subscription is hydrated before rendering
  // "No active subscription". This avoids a false empty state that required reload.
  useEffect(() => {
    let cancelled = false;

    const ensureInitialSubscription = async () => {
      if (loading) return;

      // Prevent re-entering the Stripe return refresh path on re-renders.
      // If this session_id was already processed, finalize state and strip it.
      if (
        stripeSessionId &&
        processedStripeSessionRef.current === stripeSessionId
      ) {
        if (!cancelled) {
          setSubscriptionLoading(false);
          setInitialSubscriptionChecked(true);
          navigate(isASWeb ? "/account?asweb=1" : "/account", { replace: true });
        }
        return;
      }

      if (!user || !hasSessionToken) {
        if (!cancelled) {
          setSubscriptionLoading(false);
          setInitialSubscriptionChecked(true);
        }
        return;
      }

      // Normal visit: show account immediately; refresh subscription in background.
      if (!hasStripeSessionId) {
        if (!cancelled) {
          setSubscriptionLoading(false);
          setInitialSubscriptionChecked(true);
          if (!subscription) {
            void refreshSubscription();
          }
        }
        return;
      }

      if (!cancelled) {
        setSubscriptionLoading(true);
      }

      if (stripeSessionId) {
        processedStripeSessionRef.current = stripeSessionId;
      }

      const attempts = 3;
      const timeoutMs = 4000;

      const runRefreshWithTimeout = async () => {
        await Promise.race([
          refreshSubscription(),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, timeoutMs);
          }),
        ]);
      };

      for (let attempt = 0; attempt < attempts && !cancelled; attempt += 1) {
        await runRefreshWithTimeout();
        if (attempt < attempts - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 600));
        }
      }

      if (!cancelled) {
        setSubscriptionLoading(false);
        setInitialSubscriptionChecked(true);
        navigate(isASWeb ? "/account?asweb=1" : "/account", { replace: true });
      }
    };

    void ensureInitialSubscription();
    return () => {
      cancelled = true;
    };
  }, [
    loading,
    user,
    hasSessionToken,
    subscription,
    refreshSubscription,
    hasStripeSessionId,
    stripeSessionId,
    navigate,
    isASWeb,
  ]);

  const handleRefreshSubscription = async () => {
    setSubscriptionLoading(true);
    await refreshSubscription();
    setSubscriptionLoading(false);
  };

  const showStripeUpgradeToAnnual = canUpgradeStripeToAnnual(subscription);
  const showAppleIapUpgradeToAnnual = canUpgradeAppleIapToAnnual(subscription);
  // Banner owns the timed promo; inline card is fallback after dismiss or when no banner.
  const showAnnualUpgradeBanner =
    shouldShowAnnualUpgradeOffer(subscription) &&
    !annualUpgradeBannerDismissed;
  const showStripeUpgradeInCard =
    showStripeUpgradeToAnnual && !showAnnualUpgradeBanner;
  const showAppleIapUpgradeInCard =
    showAppleIapUpgradeToAnnual && !showAnnualUpgradeBanner;
  // Stripe + active/trialing/past_due (not only status==="active") — download + cancel CTAs.
  const isStripeManageable =
    isStripeSubscription(subscription) &&
    hasManageableSubscription(subscription);
  const downloadAppButtonLabel = getAppDownloadButtonLabel(subscription);

  const handleDeleteAccount = async () => {
    if (!user) return;
    const token = getSessionToken();
    if (!token) {
      toast({
        title: "Deletion Failed",
        description: "No session token found. Please sign in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDeleting(true);

      const result = await deleteAccount(token);

      if (result.success) {
        toast({
          title: "Account Deleted",
          description:
            "Your account and all associated data have been permanently deleted.",
        });

        // Sign out and redirect to home
        await logout();
        navigate("/");
      } else {
        throw new Error(result.error || "Failed to delete account");
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (hasHandledContactEmailPromptRef.current) return;
      if (showContactEmailModal) return;
      if (!hasSessionToken) return;
      const token = getSessionToken();
      if (!token) return;
      const result = await getContactEmailStatus(token);
      if (result.success && result.shouldPrompt) {
        setContactEmail(result.contactEmail ?? "");
        setContactEmailError(null);
        hasHandledContactEmailPromptRef.current = true;
        setShowContactEmailModal(true);
        return;
      }
      // Avoid repeated status calls in this session once backend says no prompt is needed
      // (or the request fails), even if auth context dependencies change.
      hasHandledContactEmailPromptRef.current = true;
    };
    void run();
  }, [hasSessionToken, user?.email, showContactEmailModal]);

  const handleSaveContactEmail = async () => {
    const token = getSessionToken();
    if (!token) return;
    const normalized = contactEmail.trim().toLowerCase();
    if (!isValidContactEmail(normalized)) {
      setContactEmailError("Enter a valid email address.");
      return;
    }
    if (isPrivateRelayEmail(normalized)) {
      setContactEmailError("Please enter a real contact email (not Apple private relay).");
      return;
    }
    setContactEmailError(null);
    setContactEmailLoading(true);
    const saved = await saveContactEmail(token, normalized);
    if (!saved.success) {
      toast({
        title: "Could not save email",
        description: saved.error || "Please try again.",
        variant: "destructive",
      });
      setContactEmailLoading(false);
      return;
    }
    const sent = await sendContactEmailVerification(token);
    if (!sent.success) {
      toast({
        title: "Saved, but email was not sent",
        description: sent.error || "Please try again.",
        variant: "destructive",
      });
      setContactEmailLoading(false);
      return;
    }
    toast({
      title: "Check your inbox",
      description: "We sent a verification link to your contact email.",
    });
    hasHandledContactEmailPromptRef.current = true;
    setShowContactEmailModal(false);
    setContactEmailLoading(false);
  };

  const isPrivateRelayEmail = (email: string) =>
    email.endsWith("@privaterelay.appleid.com");

  const isValidContactEmail = (email: string) =>
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

  const handleSkipContactEmail = async () => {
    const token = getSessionToken();
    if (token) {
      await skipContactEmailPrompt(token);
    }
    hasHandledContactEmailPromptRef.current = true;
    setShowContactEmailModal(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-gray-500";
      case "past_due":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "past_due":
        return "Past Due";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 bg-gradient-hero">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                My <span className="text-primary">Account</span>
              </h1>
              <Skeleton className="h-6 w-80" />
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Account Info Skeleton */}
              <Card className="border-accent/50 shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Skeleton className="h-3 w-10 mb-2" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-14 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-md" />
                </CardContent>
              </Card>

              {/* Subscription Status Skeleton */}
              <Card className="border-accent/50 shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Subscription Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-10 mb-2" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </CardContent>
              </Card>
            </div>

            {/* Linked Accounts Skeleton */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Linked Accounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 bg-gradient-hero flex items-center justify-center">
          <Card className="max-w-md w-full text-center border-accent/50 shadow-glow">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to view your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/subscribe")} className="w-full">
                {subscriptionCtaLabel}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Dialog open={showContactEmailModal} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stay in the loop</DialogTitle>
            <DialogDescription>
              Add your email to receive important updates about your account, subscription, and security.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                if (contactEmailError) setContactEmailError(null);
              }}
              placeholder="you@example.com"
            />
            {contactEmailError ? (
              <p className="text-sm text-red-500">{contactEmailError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipContactEmail} disabled={contactEmailLoading}>
              Skip for now
            </Button>
            <Button onClick={handleSaveContactEmail} disabled={contactEmailLoading}>
              {contactEmailLoading ? "Saving..." : "Save Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              My <span className="text-primary">Account</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage your KeenVPN subscription and account settings
            </p>
          </div>

          {/* Post-Stripe checkout — auto-opens app on iOS/macOS; primary CTA below */}
          {showPaymentCompleteBanner ? (
            <Card className="mb-8 border-primary/50 shadow-glow bg-primary/5">
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    Payment complete
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thanks for trying KeenVPN. Your subscription is active.{" "}
                    {isDeepLinkSupported
                      ? "Return to the app and connect to KeenVPN."
                      : `Install KeenVPN on your ${unsupportedDeviceName} to connect.`}
                  </p>
                </div>
                {isDeepLinkSupported ? (
                  <>
                    <Button
                      asChild
                      className="w-full max-w-sm bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                      size="lg"
                    >
                      <a
                        href={PAYMENT_SUCCESS_DEEP_LINK}
                        onClick={(event) => {
                          event.preventDefault();
                          markStripeAutoOpenDone();
                          returnToKeenVpnAppAfterPayment();
                        }}
                      >
                        <Smartphone className="mr-2 h-5 w-5" />
                        {RETURN_TO_APP_LABEL}
                      </a>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {isASWeb
                        ? "Tap the button above to return to KeenVPN. This page stays open until you continue on web."
                        : "If the app did not open automatically, tap the button above."}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={dismissPostCheckoutUi}
                    >
                      Continue on web
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    className="w-full max-w-sm bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    size="lg"
                    onClick={() => openAppOrAppStore(subscription, appStoreUrl)}
                  >
                    {downloadAppButtonLabel}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* ASWeb auth return — not during Stripe checkout return (payment banner uses vpnkeen://success) */}
          {isASWeb &&
            !showPostCheckoutUi &&
            !hasStripeSessionId &&
            !isStripeCheckoutReturn() && (
            <Card className="mb-8 border-primary/50 shadow-glow bg-primary/5">
              <CardContent className="flex flex-col items-center gap-4 py-6">
                {isDeepLinkSupported ? (
                  sessionToken ? (
                    <>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-foreground">
                          Authentication Successful
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click below to return to the KeenVPN app
                        </p>
                      </div>
                      <Button
                        asChild
                        className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                        size="lg"
                      >
                        <a href={`vpnkeen://auth?token=${sessionToken}`}>
                          Return to KeenVPN App
                        </a>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Preparing your session...
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      Your {unsupportedDeviceName} is not currently supported
                    </h3>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Account Info */}
            <Card className="border-accent/50 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium capitalize">
                    {authProvider || 'Unknown'}
                  </p>
                </div>
                <Button onClick={logout} variant="outline" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="border-accent/50 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionLoading || !initialSubscriptionChecked ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-10 mb-2" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ) : subscription ? (
                  <>
                    <AnnualUpgradeBanner
                      source="account_page"
                      onDismiss={() => setAnnualUpgradeBannerDismissed(true)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      <Badge
                        className={`${getStatusColor(
                          subscription.status,
                        )} text-white`}
                      >
                        {getStatusText(subscription.status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium">
                        {subscription.plan || "KeenVPN Premium"}
                      </p>
                    </div>

                    {/* Upgrade to Annual */}
                    {showStripeUpgradeInCard && (
                      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="text-sm text-foreground">
                          Switch to annual billing and save — charged at your next
                          billing date, not today.
                        </p>
                        <Button
                          onClick={() => void upgradeToAnnual("account_upgrade_button")}
                          disabled={upgrading}
                          variant="outline"
                          className="w-full border-primary text-primary hover:bg-primary/10"
                        >
                          {upgrading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Upgrading...
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="h-4 w-4 mr-2" />
                              Upgrade to annual subscription
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {showAppleIapUpgradeInCard && (
                      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="text-sm text-foreground">
                          You subscribed through the App Store. Switch to annual
                          billing there — Apple manages your subscription.
                        </p>
                        <AppleIapSubscriptionsCta
                          label="Upgrade to annual in App Store"
                          variant="outline"
                          buttonClassName="border-primary text-primary hover:bg-primary/10"
                        />
                      </div>
                    )}

                    {/* Auto-Renewal Status */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Auto-Renewal</p>
                        <p className="text-xs text-muted-foreground">
                          {subscription.cancelAtPeriodEnd
                            ? "Cancelled - subscription ends on billing date"
                            : "Active - automatically renews each period"}
                        </p>
                      </div>
                      {subscription.cancelAtPeriodEnd ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Off
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          On
                        </Badge>
                      )}
                    </div>

                    {subscription.endDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {subscription.cancelAtPeriodEnd
                              ? "Subscription Ends"
                              : "Next Billing"}
                          </p>
                          <p className="font-medium">
                            {formatDate(subscription.endDate)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {showReturnToAppCta ? (
                        <Button
                          asChild
                          className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                          size="lg"
                        >
                          <a
                            href={PAYMENT_SUCCESS_DEEP_LINK}
                            onClick={(event) => {
                              event.preventDefault();
                              markStripeAutoOpenDone();
                              returnToKeenVpnAppAfterPayment();
                            }}
                          >
                            <Smartphone className="mr-2 h-5 w-5" />
                            {RETURN_TO_APP_LABEL}
                          </a>
                        </Button>
                      ) : isStripeManageable ? (
                        <Button
                          onClick={() =>
                            openAppOrAppStore(subscription, appStoreUrl)
                          }
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                        >
                          {downloadAppButtonLabel}
                        </Button>
                      ) : null}

                      <Button
                        onClick={() =>
                          navigate("/account/subscription-history")
                        }
                        variant="outline"
                        className="w-full"
                      >
                        <History className="h-4 w-4 mr-2" />
                        View Billing History
                      </Button>

                      <Button
                        onClick={handleRefreshSubscription}
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={subscriptionLoading}
                      >
                        {subscriptionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          "Refresh Status"
                        )}
                      </Button>

                      <SubscriptionCancellationControls
                        subscription={subscription}
                        cancelling={cancelling}
                        onCancel={() => void cancelSubscriptionAtPeriodEnd()}
                        onManageBilling={() => void openBillingPortal()}
                        portalLoading={portalLoading}
                        showManageBilling={!showStripeUpgradeToAnnual}
                      />

                      {!hasManageableSubscription(subscription) ? (
                        <Button
                          onClick={() => navigate("/subscribe")}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                        >
                          {subscriptionCtaLabel}
                        </Button>
                      ) : null}
                    </div>
                    <div className="pt-4 mt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        For refund request, please send an email to our support
                        team via{" "}
                        <a
                          href="mailto:support@vpnkeen.com"
                          className="text-primary hover:underline"
                        >
                          support@vpnkeen.com
                        </a>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-center py-4">
                      No active subscription found
                    </p>
                    <Button
                      onClick={() => navigate("/account/subscription-history")}
                      variant="outline"
                      className="w-full"
                    >
                      <History className="h-4 w-4 mr-2" />
                      Manage Subscriptions
                    </Button>
                    <Button
                      onClick={() => navigate("/subscribe")}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                    >
                      {subscriptionCtaLabel}
                    </Button>
                    <div className="pt-4 mt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        For refund request, please send an email to our support
                        team via{" "}
                        <a
                          href="mailto:support@vpnkeen.com"
                          className="text-primary hover:underline"
                        >
                          support@vpnkeen.com
                        </a>
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Linked Accounts */}
          {hasSessionToken && (
            <div className="mt-8">
              <LinkedAccounts
                sessionToken={getSessionToken() ?? ''}
                currentProvider={authProvider ?? undefined}
                providers={linkedProviders}
                onUpdate={() => { refreshLinkedProviders(); refreshSubscription(); }}
              />
            </div>
          )}

          {hasSessionToken && (
            <div className="mt-8">
              <EmailPreferencesCard sessionToken={getSessionToken() ?? ""} />
            </div>
          )}

          {/* Support Section */}
          <Card className="mt-8 border-accent/50 shadow-glow">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Contact our support team for assistance with your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:support@vpnkeen.com?subject=Support Request&body=Hello KeenVPN Support Team,%0D%0A%0D%0AI need assistance with:%0D%0A%0D%0A[Please describe your issue here]%0D%0A%0D%0AThank you!"
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Contact Support
              </a>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="mt-8 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center text-destructive">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                      This action <strong>cannot be undone</strong>. Your account and all associated usage data will be permanently deleted from our servers. Please note that no refunds will be issued.
                      </p>
                      <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                        <p className="text-sm font-medium text-destructive">
                          This will delete:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                          <li>Your account and profile information</li>
                          <li>All subscription data</li>
                          <li>All associated preferences and settings</li>
                        </ul>
                      </div>
                      {subscription && subscription.status === "active" && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <p className="text-sm font-medium text-yellow-800">
                            ⚠️ You have an active subscription
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Please cancel your subscription before deleting your
                            account to avoid future charges.
                          </p>
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
