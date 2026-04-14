import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { deleteAccount, getSessionToken, cancelSubscription, createBillingPortalSession } from "@/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LinkedAccounts } from "@/components/LinkedAccounts";
import { isAppDeepLinkSupported, getUnsupportedDeviceName } from "@/lib/device-detection";

const Account = () => {
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [initialSubscriptionChecked, setInitialSubscriptionChecked] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading, logout, subscription, refreshSubscription, linkedProviders, refreshLinkedProviders, hasSessionToken, authProvider } =
    useAuth();

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
      if (subscription && !hasStripeSessionId) {
        if (!cancelled) setInitialSubscriptionChecked(true);
        return;
      }

      if (!cancelled) {
        setSubscriptionLoading(true);
      }

      if (stripeSessionId) {
        processedStripeSessionRef.current = stripeSessionId;
      }

      const attempts = hasStripeSessionId ? 3 : 1;
      const timeoutMs = 8000;

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
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }

      if (!cancelled) {
        setSubscriptionLoading(false);
        setInitialSubscriptionChecked(true);

        // Remove Stripe session_id after processing so future loads use normal flow.
        if (hasStripeSessionId) {
          navigate(isASWeb ? "/account?asweb=1" : "/account", { replace: true });
        }
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

  const handleManageBilling = async () => {
    const token = getSessionToken();
    if (!token) {
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPortalLoading(true);
      const result = await createBillingPortalSession(
        token,
        window.location.href,
      );

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast({
          title: "Unable to open billing portal",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const isMonthlyStripe =
    subscription?.status === "active" &&
    subscription?.subscriptionType === "stripe" &&
    subscription?.plan?.toLowerCase().includes("monthly");

  const handleCancelSubscription = async () => {
    if (!user) return;

    try {
      setCancelling(true);

      const token = getSessionToken();
      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const result = await cancelSubscription(token);

      if (result.success) {
        toast({
          title: "Subscription Cancelled",
          description:
            "Your subscription will remain active until the end of your billing period.",
        });
        await refreshSubscription();
      } else {
        throw new Error(result.error || "Failed to cancel subscription");
      }
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

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
                Sign In
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

          {/* ASWebAuthenticationSession fallback — visible "Return to App" button */}
          {isASWeb && (
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
                    {isMonthlyStripe && !subscription.cancelAtPeriodEnd && (
                      <Button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                      >
                        {portalLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Opening billing portal...
                          </>
                        ) : (
                          <>
                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                            Upgrade to Annual (Save 17%)
                          </>
                        )}
                      </Button>
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

                      {subscription.status === "active" ? (
                        <>
                          {!subscription.cancelAtPeriodEnd ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  className="w-full"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Turn Off Auto-Renewal
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                                    Turn Off Auto-Renewal
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to turn off
                                    auto-renewal?
                                    <br />
                                    <br />
                                    <strong>What happens:</strong>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                      <li>
                                        Your subscription will remain active
                                        until{" "}
                                        <strong>
                                          {formatDate(subscription.endDate)}
                                        </strong>
                                      </li>
                                      <li>You will NOT be charged again</li>
                                      <li>
                                        You can re-enable auto-renewal anytime
                                        before this date
                                      </li>
                                      <li>
                                        After this date, you'll need to
                                        subscribe again to continue using
                                        KeenVPN
                                      </li>
                                    </ul>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Keep Auto-Renewal
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCancelSubscription}
                                    disabled={cancelling}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {cancelling ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      "Yes, Turn Off Auto-Renewal"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <>
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                                <div className="flex items-start">
                                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800">
                                      Auto-Renewal Cancelled
                                    </p>
                                    <p className="text-xs text-yellow-700 mt-1">
                                      Your subscription will end on{" "}
                                      <strong>
                                        {formatDate(subscription.endDate)}
                                      </strong>
                                      <br />
                                      You will not be charged again unless you
                                      re-enable auto-renewal.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <Button
                                onClick={() => {
                                  toast({
                                    title: "Re-enable Auto-Renewal",
                                    description:
                                      "Please contact support to re-enable auto-renewal, or subscribe again after your current period ends.",
                                  });
                                }}
                                variant="outline"
                                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Re-enable Auto-Renewal
                              </Button>
                            </>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() =>
                            navigate(subscription ? "/account" : "/subscribe")
                          }
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                        >
                          {subscription
                            ? "Manage Subscription"
                            : "Subscribe Now"}
                        </Button>
                      )}
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
                      Subscribe Now
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
