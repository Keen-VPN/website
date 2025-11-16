import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContextNew";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  BACKEND_URL as BACKEND_URL_AUTH,
  fetchSubscriptionPlanById,
} from "@/auth/backend";
import { enterprisePlan } from "@/constants/pricing";

const BACKEND_URL = BACKEND_URL_AUTH || "https://vpnkeen.netlify.app/api";

const Subscribe = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, subscription } = useAuth();

  // Get URL parameters
  const planIdParam = searchParams.get("planId");

  // Fetch the specific plan by ID
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setPlanLoading(true);

        if (!planIdParam) {
          // No planId provided, use Premium yearly plan as fallback
          setSelectedPlan("premium_yearly");
          return;
        }

        const response = await fetchSubscriptionPlanById(planIdParam);

        if (response.success && response.plan) {
          // Use the plan directly from API - no transformation needed
          setSelectedPlan(response.plan);
        } else {
          console.error("Failed to load plan:", response.error);
          // Fallback to enterprise plan
          setSelectedPlan(enterprisePlan);
        }
      } catch (err) {
        console.error("Failed to load plan:", err);
        // Fallback to enterprise plan
        setSelectedPlan(enterprisePlan);
      } finally {
        setPlanLoading(false);
      }
    };

    loadPlan();
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

    // Check if user already has active subscription
    if (subscription && subscription.status === "active") {
      toast({
        title: "Already subscribed",
        description: "You already have an active subscription",
      });
      navigate("/account");
      return;
    }

    try {
      setCheckoutLoading(true);

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Create checkout session
      const response = await fetch(
        `${BACKEND_URL}/subscription/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken,
            email: user.email,
            planId: selectedPlan.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
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
        price: `$${selectedPlan.price || 0}`,
        period:
          selectedPlan.period === "year" ? "/month billed annually" : "/month",
        description:
          selectedPlan.description ||
          `${selectedPlan.name} - Complete VPN protection`,
        features:
          selectedPlan.features
            ?.filter((f) => f.included)
            ?.map((f) => f.name) || [],
      }
    : null;

  if (loading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          {loading ? "Loading..." : "Loading plans..."}
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
              Subscribe to {planDisplay.name}
            </h1>
            <p className="text-xl text-muted-foreground">
              {planDisplay.description}
            </p>
          </div>

          {!user ? (
            <Card className="border-primary/50 shadow-glow">
              <CardHeader>
                <CardTitle>Sign In to Continue</CardTitle>
                <CardDescription>
                  You need to sign in before subscribing to KeenVPN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
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
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/50 shadow-glow">
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
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
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
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Button
                    onClick={handleSubscribe}
                    disabled={checkoutLoading}
                    className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                    size="lg"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to checkout...
                      </>
                    ) : (
                      "Subscribe Now"
                    )}
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
