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
import { Check, Loader2, ExternalLink, LayoutGrid, ShieldCheck, Lock, Banknote, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  fetchSubscriptionPlanById,
  createCheckoutSession,
  getSessionToken,
  CHECKOUT_ERROR_SESSION_EXPIRED,
} from "@/auth/backend";
import { enterprisePlan } from "@/constants/pricing";

const Subscribe = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | ApiPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, isAuthenticating, signIn, logout, subscription } = useAuth();
  const [sessionInvalidHandled, setSessionInvalidHandled] = useState(false);

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
    if (loading || isAuthenticating || !user || sessionInvalidHandled || subscription) return;
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
  }, [user, loading, isAuthenticating, sessionInvalidHandled, subscription, handleSessionExpiredAndLogout]);

  // Reset so we can run the invalid-session flow again if they later end up without a token.
  useEffect(() => {
    if (user && getSessionToken()) {
      setSessionInvalidHandled(false);
    }
  }, [user]);

  // Fetch the specific plan by ID
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setPlanLoading(true);
        const planToFetch = planIdParam || "premium_monthly";
        const response = await fetchSubscriptionPlanById(planToFetch);
        if (response.success && response.plan) {
          setSelectedPlan(response.plan as unknown as ApiPlan);
        } else {
          setSelectedPlan(enterprisePlan);
        }
      } catch (err) {
        setSelectedPlan(enterprisePlan);
      } finally {
        setPlanLoading(false);
      }
    };
    loadPlan();
  }, [planIdParam]);

  const handleSignIn = async () => {
    await signIn();
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({ title: "Auth Required", description: "Sign in to continue.", variant: "destructive" });
      return;
    }
    if (!selectedPlan) return;
    if (subscription?.status === "active") {
      navigate("/account");
      return;
    }

    try {
      setCheckoutLoading(true);

      // Determine plan ID based on plan type
      const planId = "id" in selectedPlan
        ? selectedPlan.id
        : (selectedPlan.monthlyId || selectedPlan.annualId);

      if (!planId) {
        throw new Error("Plan ID is required");
      }

      const sessionToken = getSessionToken();
      if (!sessionToken || !user.email) {
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
        cancelUrl
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
      toast({ title: "Checkout Error", description: "Could not initiate payment. Try again.", variant: "destructive" });
      setCheckoutLoading(false);
    }
  };

  const planDisplay = selectedPlan
    ? {
      name: selectedPlan.name === "Enterprise" ? "Enterprise" : selectedPlan.name || "Premium",
      price: "period" in selectedPlan
          ? selectedPlan.period === "year" ? `$${(selectedPlan.price / 12).toFixed(2)}` : `$${selectedPlan.price}`
          : selectedPlan.monthlyPriceDisplay,
      period: "period" in selectedPlan
          ? selectedPlan.period === "year" ? "/mo, billed annually" : "/mo"
          : "/mo",
      description: selectedPlan.description || "Uncompromised sovereignty.",
      features: selectedPlan.features?.filter((f) => f.included)?.map((f) => f.name) || [],
    }
    : null;

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Zap className="h-10 w-10 text-primary animate-pulse mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Initializing Secure Checkout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-24 font-sans">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Benefits & Trust */}
            <div className="lg:col-span-7 space-y-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/10 border border-secondary/20 mb-6">
                  <Banknote className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-black text-secondary uppercase tracking-widest">ROI Confirmed</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 tracking-tighter uppercase italic leading-[0.9]">
                  Secure Your <br/><span className="text-primary italic">Sovereignty.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg font-medium italic">
                  You're one step away from 10Gbps speeds, global price parity, and absolute zero-knowledge privacy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: ShieldCheck, title: "No-Logs", desc: "Military-grade AES-256." },
                  { icon: Zap, title: "Ultra Fast", desc: "10Gbps WireGuard nodes." },
                  { icon: Banknote, title: "Save Money", desc: "Unlock regional deals." },
                  { icon: Lock, title: "Secure", desc: "Church & State model." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start p-6 rounded-[2rem] bg-card/30 border border-border/50 shadow-sm group hover:border-primary/30 transition-all">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase tracking-tight italic">{item.title}</div>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Subscription Card */}
            <div className="lg:col-span-5">
              <Card className="border-secondary/30 bg-slate-900 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-[3rem] p-6 md:p-10 overflow-hidden sticky top-32 relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/20 to-transparent"></div>
                
                <CardHeader className="text-center pb-10 border-b border-white/5">
                  <CardTitle className="text-3xl font-black uppercase tracking-widest text-secondary italic">{planDisplay?.name}</CardTitle>
                  <CardDescription className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-3">{planDisplay?.description}</CardDescription>
                  
                  <div className="mt-10 flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-7xl font-black tracking-tighter text-white font-mono">{planDisplay?.price}</span>
                      <span className="text-slate-500 font-black italic uppercase text-sm tracking-widest">{planDisplay?.period.split(',')[0]}</span>
                    </div>
                    {planDisplay?.period.includes('billed annually') && (
                      <span className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/10 px-4 py-1.5 rounded-full border border-secondary/20">Billed Annually</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-10 space-y-10">
                  <ul className="space-y-5">
                    {planDisplay?.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-4 group/item">
                        <div className="p-1 rounded-full bg-secondary/20 border border-secondary/20 group-hover/item:scale-110 transition-transform">
                          <Check className="h-4 w-4 text-secondary stroke-[3]" />
                        </div>
                        <span className="text-xs font-black text-slate-300 uppercase tracking-widest italic">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {!user ? (
                    <Button
                      onClick={handleSignIn}
                      variant="glow"
                      size="xl"
                      className="w-full h-16 bg-white text-slate-950 hover:bg-slate-50 font-black uppercase tracking-widest text-xs shadow-2xl rounded-2xl"
                    >
                      Sign In to Subscribe
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubscribe}
                      disabled={checkoutLoading}
                      variant="emerald"
                      size="xl"
                      className="w-full h-16 font-black uppercase tracking-widest text-xs shadow-xl shadow-secondary/20 rounded-2xl active:scale-95 transition-all"
                    >
                      {checkoutLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Complete Secure Checkout"}
                    </Button>
                  )}

                  <div className="flex flex-col gap-4">
                    <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] transition-colors">
                      <LayoutGrid className="h-4 w-4 mr-2" /> Change Selection
                    </Button>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-center leading-relaxed max-w-[200px] mx-auto italic">
                      Secure 256-Bit SSL Encryption<br/>
                      30-Day Money Back Guarantee
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscribe;
