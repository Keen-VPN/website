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
} from "@/auth/backend";
import { enterprisePlan } from "@/constants/pricing";

const Subscribe = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | ApiPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, subscription } = useAuth();

  const planIdParam = searchParams.get("planId");

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
      const priceId = "priceId" in selectedPlan
        ? selectedPlan.priceId
        : (selectedPlan.monthlyPriceId || selectedPlan.annualPriceId);
      const sessionToken = getSessionToken();
      if (!sessionToken || !user.email) throw new Error("Missing session data");

      const { success, url, error } = await createCheckoutSession(sessionToken, user.email, priceId);
      if (!success) throw new Error(error || "Checkout creation failed");
      if (url) window.location.href = url;
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
      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Benefits & Trust */}
            <div className="lg:col-span-7 space-y-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/10 border border-secondary/20 mb-6">
                  <Banknote className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-black text-secondary uppercase tracking-widest">ROI Confirmed</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 tracking-tighter">
                  Secure Your <br/><span className="text-primary italic">Sovereignty.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg font-medium">
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
                  <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-card/30 border border-border/50">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase tracking-tight">{item.title}</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Subscription Card */}
            <div className="lg:col-span-5">
              <Card className="border-secondary/30 bg-slate-900 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-[2.5rem] p-4 md:p-8 overflow-hidden sticky top-32">
                <CardHeader className="text-center pb-8 border-b border-white/5">
                  <CardTitle className="text-2xl font-black uppercase tracking-tight text-secondary">{planDisplay?.name}</CardTitle>
                  <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-500 mt-2">{planDisplay?.description}</CardDescription>
                  
                  <div className="mt-8 flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-black tracking-tighter text-white">{planDisplay?.price}</span>
                      <span className="text-slate-500 font-bold text-lg">{planDisplay?.period.split(',')[0]}</span>
                    </div>
                    {planDisplay?.period.includes('billed annually') && (
                      <span className="mt-2 text-xs font-black uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1 rounded-full">Billed Annually</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-8 space-y-8">
                  <ul className="space-y-4">
                    {planDisplay?.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="p-1 rounded-full bg-secondary/20">
                          <Check className="h-3.5 w-3.5 text-secondary" />
                        </div>
                        <span className="text-sm font-bold text-slate-300 uppercase tracking-tighter">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {!user ? (
                    <Button
                      onClick={handleSignIn}
                      variant="glow"
                      size="xl"
                      className="w-full bg-white text-slate-950 hover:bg-slate-50"
                    >
                      Sign In to Subscribe
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubscribe}
                      disabled={checkoutLoading}
                      variant="emerald"
                      size="xl"
                      className="w-full"
                    >
                      {checkoutLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Complete Secure Checkout"}
                    </Button>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest">
                      <LayoutGrid className="h-4 w-4 mr-2" /> Change Plan
                    </Button>
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 text-center leading-relaxed">
                    Secure 256-Bit SSL Encryption<br/>
                    30-Day Money Back Guarantee
                  </p>
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
