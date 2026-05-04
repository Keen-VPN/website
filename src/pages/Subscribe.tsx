import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PricingPlan, ApiPlan } from "@/lib/pricing";
import { Check, Loader2, ExternalLink, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  fetchSubscriptionPlanById,
  fetchSubscriptionPlans,
  createCheckoutSession,
  getSessionToken,
  CHECKOUT_ERROR_SESSION_EXPIRED,
} from "@/auth/backend";
import { enterprisePlan } from "@/constants/pricing";
import {
  canStartFreeTrial,
  getSubscriptionCtaLabel,
  hasManageableSubscription,
} from "@/lib/subscription-cta";

const getPlanBillingPeriod = (plan: ApiPlan) =>
  plan.billingPeriod || plan.period;

const isAnnualPlan = (plan: ApiPlan) => getPlanBillingPeriod(plan) === "year";

const getPlanFamily = (plan: ApiPlan) => {
  const id = plan.id.toLowerCase();
  if (id.includes("premium")) return "premium";
  if (id.includes("team")) return "team";
  return id.replace(/[-_]?(monthly|month|annual|yearly|year)$/, "");
};

const sortPlansByBillingPeriod = (plans: ApiPlan[]) => {
  const order = { month: 0, year: 1 };
  return [...plans].sort(
    (a, b) =>
      (order[getPlanBillingPeriod(a) as keyof typeof order] ?? 99) -
      (order[getPlanBillingPeriod(b) as keyof typeof order] ?? 99),
  );
};

const getPlanOptionLabel = (plan: ApiPlan) =>
  isAnnualPlan(plan) ? "Annual" : "Monthly";

const getPlanOptionPrice = (plan: ApiPlan) =>
  isAnnualPlan(plan)
    ? `$${(plan.price / 12).toFixed(2)}/mo`
    : `$${plan.price}/mo`;

const getPlanOptionMeta = (plan: ApiPlan) =>
  isAnnualPlan(plan) ? `$${plan.price}/year` : "Billed monthly";

const matchesRequestedPlan = (plan: ApiPlan, requestedPlanId: string) => {
  if (plan.id === requestedPlanId) return true;
  if (
    requestedPlanId === "premium_annual" ||
    requestedPlanId === "premium_yearly"
  ) {
    return isAnnualPlan(plan) && plan.id.toLowerCase().includes("premium");
  }
  if (requestedPlanId === "premium_monthly") {
    return !isAnnualPlan(plan) && plan.id.toLowerCase().includes("premium");
  }
  return false;
};

interface PlanOptionSelectorProps {
  plans: ApiPlan[];
  selectedPlan: PricingPlan | ApiPlan;
  onSelect: (plan: ApiPlan) => void;
  className?: string;
}

const PlanOptionSelector = ({
  plans,
  selectedPlan,
  onSelect,
  className = "",
}: PlanOptionSelectorProps) => {
  if (plans.length <= 1) return null;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((plan) => {
          const isSelected =
            "id" in selectedPlan && selectedPlan.id === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan)}
              className={`rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-background hover:border-primary/50"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">
                    {getPlanOptionLabel(plan)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getPlanOptionMeta(plan)}
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5 text-primary" />}
              </div>
              <div className="mt-3 text-2xl font-bold text-foreground">
                {getPlanOptionPrice(plan)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Subscribe = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    PricingPlan | ApiPlan | null
  >(null);
  const [planOptions, setPlanOptions] = useState<ApiPlan[]>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    user,
    loading,
    isAuthenticating,
    signIn,
    logout,
    subscription,
    trial,
    refreshSubscription,
  } = useAuth();
  const [sessionInvalidHandled, setSessionInvalidHandled] = useState(false);
  const [initialStatusChecked, setInitialStatusChecked] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const subscriptionCtaLabel = getSubscriptionCtaLabel(
    user,
    subscription,
    trial,
  );
  const hasTrialHistory = Boolean(trial?.active || trial?.endsAt);
  const subscribePageTitle = canStartFreeTrial(user, subscription, trial)
    ? "Start Free VPN Trial"
    : hasTrialHistory && !subscription
      ? "Subscribe to Keen VPN"
      : "Re-subscribe to Keen VPN";
  const isManageableSubscription = hasManageableSubscription(subscription);

  // True while we are waiting for the first confirmed-fresh subscription status.
  // Guards the redirect effect so a stale "active" value in AuthContext state
  // (e.g. from a previous navigation within the SPA) can never trigger a premature
  // redirect before we have verified the current state from the backend.
  const initialStatusLoading = Boolean(user) && !initialStatusChecked;
  const subscriptionLoading =
    loading || isAuthenticating || statusRefreshing || initialStatusLoading;

  useEffect(() => {
    if (loading || !user || initialStatusChecked) return;
    if (!getSessionToken()) {
      setInitialStatusChecked(true);
      return;
    }

    // We need an explicit refresh here even though AuthContext fires a
    // fire-and-forget fetchSubscriptionFromBackend after verifySessionToken.
    // That background refresh only runs on page load — when the user navigates
    // to /subscribe within the SPA, AuthContext's loading is already false and
    // no new refresh is triggered, leaving subscription state potentially stale.
    let cancelled = false;
    const refreshStatus = async () => {
      setStatusRefreshing(true);
      try {
        await refreshSubscription();
      } finally {
        if (!cancelled) {
          setStatusRefreshing(false);
          setInitialStatusChecked(true);
        }
      }
    };

    void refreshStatus();

    return () => {
      cancelled = true;
    };
  }, [user, loading, initialStatusChecked, refreshSubscription]);

  // If user already has manageable access, don't show subscribe UI.
  // Guard on both initialStatusLoading and statusRefreshing so we never
  // redirect based on state that hasn't been confirmed fresh yet.
  useEffect(() => {
    if (loading || initialStatusLoading || statusRefreshing) return;
    if (user && isManageableSubscription) {
      navigate("/account", { replace: true });
    }
  }, [
    user,
    isManageableSubscription,
    loading,
    initialStatusLoading,
    statusRefreshing,
    navigate,
  ]);

  // Get URL parameters
  const planIdParam = searchParams.get("planId");

  // Single place for "session expired" flow: show one toast and attempt logout without rethrowing,
  // so the outer catch never runs and we avoid double toasts.
  const handleSessionExpiredAndLogout = useCallback(async (): Promise<void> => {
    toast({
      title: "Session expired",
      description: "Please sign in again to continue to checkout.",
      variant: "destructive",
    });
    try {
      await logout();
    } catch {
      toast({
        title: "Sign out failed",
        description: "Please try again or refresh the page.",
        variant: "destructive",
      });
    }
  }, [toast, logout]);

  // If user is signed in (Firebase) but has no backend session token, sign them out
  // so the sign-in card is shown and they can re-authenticate to get a fresh session.
  // Skip while sign-in is in progress (isAuthenticating). After redirect (Apple/Google),
  // the backend call (apple/signin or login) can take several seconds (e.g. Apple key fetch),
  // so we wait long enough before treating "no token" as expired to avoid logging out mid-sign-in.
  // Also skip when we have subscription: we just got a valid session (login/verify), so token
  // may not be visible yet due to timing; never log out in that case.
  const SESSION_EXPIRED_CHECK_DELAY_MS = 10_000;
  useEffect(() => {
    if (
      loading ||
      isAuthenticating ||
      !user ||
      sessionInvalidHandled ||
      subscription
    )
      return;
    if (!getSessionToken()) {
      const timeoutId = window.setTimeout(() => {
        if (!getSessionToken() && !subscription) {
          const runLogout = async () => {
            await handleSessionExpiredAndLogout();
            setSessionInvalidHandled(true);
          };
          runLogout();
        }
      }, SESSION_EXPIRED_CHECK_DELAY_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [
    user,
    loading,
    isAuthenticating,
    sessionInvalidHandled,
    subscription,
    handleSessionExpiredAndLogout,
  ]);

  // Reset so we can run the invalid-session flow again if they later end up without a token.
  useEffect(() => {
    if (user && getSessionToken()) {
      setSessionInvalidHandled(false);
    }
  }, [user]);

  // Fetch available subscription plans. The subscribe page should show both
  // monthly and annual options, while still respecting a planId from /pricing.
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setPlanLoading(true);
        setPlanOptions([]);

        const response = await fetchSubscriptionPlans();

        if (response.success && response.plans && response.plans.length > 0) {
          const requestedReturnedPlan = planIdParam
            ? response.plans.find((plan) =>
                matchesRequestedPlan(plan, planIdParam),
              )
            : null;
          const premiumPlans = sortPlansByBillingPeriod(
            response.plans.filter((plan) => getPlanFamily(plan) === "premium"),
          );
          const options = requestedReturnedPlan
            ? sortPlansByBillingPeriod(
                response.plans.filter(
                  (plan) =>
                    getPlanFamily(plan) ===
                    getPlanFamily(requestedReturnedPlan),
                ),
              )
            : premiumPlans.length > 0
              ? premiumPlans
              : sortPlansByBillingPeriod(response.plans);
          const requestedPlan = planIdParam
            ? options.find((plan) => matchesRequestedPlan(plan, planIdParam))
            : null;
          const defaultPlan =
            requestedPlan ||
            options.find((plan) => getPlanBillingPeriod(plan) === "month") ||
            options[0];

          if (!defaultPlan) {
            setSelectedPlan(enterprisePlan);
            return;
          }

          setPlanOptions(options);
          setSelectedPlan(defaultPlan);
        } else {
          console.error("Failed to load plan:", response.error);
          if (planIdParam) {
            const planResponse = await fetchSubscriptionPlanById(planIdParam);
            setSelectedPlan(
              planResponse.success && planResponse.plan
                ? (planResponse.plan as unknown as ApiPlan)
                : enterprisePlan,
            );
          } else {
            setSelectedPlan(enterprisePlan);
          }
        }
      } catch (err) {
        console.error("Failed to load plan:", err);
        setSelectedPlan(enterprisePlan);
      } finally {
        setPlanLoading(false);
      }
    };

    loadPlans();
  }, [planIdParam]);

  const handleSignIn = async () => {
    const result = await signIn();
    if (result.success && result.shouldRedirect) {
      navigate(result.shouldRedirect);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "No plan selected",
        description: "Please select a plan to subscribe",
        variant: "destructive",
      });
      return;
    }

    // Check if user already has subscription access that should be managed.
    if (isManageableSubscription) {
      toast({
        title: "Already subscribed",
        description: "You already have a subscription to manage",
      });
      navigate("/account");
      return;
    }

    try {
      setCheckoutLoading(true);

      // Determine plan ID based on plan type
      const planId =
        "id" in selectedPlan
          ? selectedPlan.id
          : selectedPlan.monthlyId || selectedPlan.annualId;

      if (!planId) {
        throw new Error("Plan ID is required");
      }

      const sessionToken = getSessionToken();

      if (!sessionToken) {
        await handleSessionExpiredAndLogout();
        setCheckoutLoading(false);
        return;
      }

      const successUrl = `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/pricing`;

      const result = await createCheckoutSession(
        sessionToken,
        planId,
        successUrl,
        cancelUrl,
      );

      if (!result.success) {
        if (result.errorCode === CHECKOUT_ERROR_SESSION_EXPIRED) {
          await handleSessionExpiredAndLogout();
          setCheckoutLoading(false);
          return;
        }
        throw new Error(result.error || "Failed to create checkout session");
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setCheckoutLoading(false);
    }
  };

  // Create plan display object from selectedPlan
  const planDisplay = selectedPlan
    ? {
        name:
          selectedPlan.name === "Enterprise"
            ? "KeenVPN Enterprise"
            : selectedPlan.name || "KeenVPN Premium",
        price:
          "period" in selectedPlan
            ? isAnnualPlan(selectedPlan)
              ? `$${(selectedPlan.price / 12).toFixed(2)}`
              : `$${selectedPlan.price}`
            : selectedPlan.monthlyPriceDisplay, // Fallback for PricingPlan (Enterprise)
        period:
          "period" in selectedPlan
            ? isAnnualPlan(selectedPlan)
              ? "/month, billed annually"
              : "/month"
            : "/month", // Default
        description:
          selectedPlan.description ||
          `${selectedPlan.name} - Complete VPN protection`,
        features:
          selectedPlan.features
            ?.filter((f) => f.included)
            ?.map((f) => f.name) || [],
      }
    : null;

  if (loading || planLoading || initialStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          {loading
            ? "Loading..."
            : initialStatusLoading
              ? "Checking subscription status..."
              : "Loading plans..."}
        </span>
      </div>
    );
  }

  if (!selectedPlan || !planDisplay) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No plan selected</p>
          <Button onClick={() => navigate("/pricing")}>Back to Pricing</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {subscribePageTitle}
            </h1>
          </div>

          {!user ? (
            <Card className="border-accent/50 shadow-glow">
              <CardHeader>
                <CardTitle>Sign In to Continue</CardTitle>
                <CardDescription>
                  You need to sign in before subscribing to KeenVPN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PlanOptionSelector
                    plans={planOptions}
                    selectedPlan={selectedPlan}
                    onSelect={setSelectedPlan}
                    className="pb-3"
                  />

                  <Button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in with Google"
                    )}
                  </Button>

                  <Button
                    onClick={() => navigate("/pricing")}
                    variant="outline"
                    className="w-full"
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    View All Plans
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-accent/50 shadow-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {planDisplay.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {planDisplay.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {planDisplay.price}
                  </span>
                  <span className="text-muted-foreground">
                    {planDisplay.period}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <PlanOptionSelector
                  plans={planOptions}
                  selectedPlan={selectedPlan}
                  onSelect={setSelectedPlan}
                  className="mb-6"
                />

                <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Signed in as:
                    </span>{" "}
                    {user.email}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {planDisplay.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="p-1 bg-primary/20 rounded-full mt-0.5">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Button
                    onClick={handleSubscribe}
                    disabled={checkoutLoading || subscriptionLoading}
                    className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                    size="lg"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to checkout...
                      </>
                    ) : subscriptionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking subscription status...
                      </>
                    ) : (
                      subscriptionCtaLabel
                    )}
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => navigate("/pricing")}
                      variant="outline"
                      className="w-full"
                    >
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      View All Plans
                    </Button>

                    <Button
                      onClick={() => navigate("/account")}
                      variant="outline"
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Account
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  You will be redirected to Stripe's secure checkout page
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscribe;
