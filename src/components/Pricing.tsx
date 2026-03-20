import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchSubscriptionPlans } from "@/auth/backend";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  planId?: string;
}

const Pricing = () => {
  const navigate = useNavigate();
  const [monthlyPlan, setMonthlyPlan] = useState<Plan | null>(null);
  const [annualPlan, setAnnualPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const defaultFeatures = [
      "Access to all global locations",
      "Unlimited high-speed bandwidth",
      "Elite identity protection",
      "Multi-device secure access",
      "24/7 dedicated support",
      "Guaranteed privacy architecture",
      "Advanced safety features",
      "Active DNS Defense",
    ];

    const transformPlan = (apiPlan: Record<string, unknown>): Plan => {
      return {
        name: (apiPlan.name as string) || "KeenVPN Premium",
        price: `$${apiPlan.price || 100}`,
        period: "/month",
        description:
          (apiPlan.description as string) || "Elite protection and global savings",
        features:
          (apiPlan.features as Record<string, unknown>[])
            ?.filter((f) => f.included)
            ?.map((f) => f.name as string) || defaultFeatures,
        buttonText: "Secure Your Savings",
        planId: apiPlan.id as string,
      };
    };

    const loadPlans = async () => {
      try {
        setLoading(true);
        const response = await fetchSubscriptionPlans();

        if (response.success && response.plans && response.plans.length > 0) {
          const foundAnnualPlan = response.plans.find(
            (p: Record<string, unknown>) =>
              p.period === "year" || p.billingPeriod === "year" || p.interval === "year"
          );

          const foundMonthlyPlan = response.plans.find(
            (p: Record<string, unknown>) =>
              p.period === "month" || p.billingPeriod === "month" || p.interval === "month"
          );

          if (foundAnnualPlan) setAnnualPlan(transformPlan(foundAnnualPlan));
          if (foundMonthlyPlan) setMonthlyPlan(transformPlan(foundMonthlyPlan));
        } else {
          setError(response.error || "Failed to load plans");
        }
      } catch {
        setError("Failed to load plans");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const renderPlanCard = (plan: Plan, isAnnual: boolean) => {
    return (
      <div
        key={plan.period}
        className={`relative p-10 rounded-[3rem] transition-all duration-500 max-w-md w-full flex flex-col group ${
          isAnnual
            ? "bg-slate-900 border-2 border-secondary shadow-[0_32px_64px_-16px_rgba(16,185,129,0.3)] hover:shadow-[0_32px_64px_-16px_rgba(16,185,129,0.5)] hover:-translate-y-2 z-10 md:scale-110"
            : "bg-card border border-border/50 hover:border-primary/30 hover:bg-card/80 hover:shadow-xl mt-8 md:mt-0"
        }`}
      >
        {isAnnual && (
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-full flex justify-center">
            <span className="bg-secondary text-white px-8 py-2 rounded-full text-xs font-black shadow-2xl uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Sovereign's Choice — Save 60%
            </span>
          </div>
        )}

        <div className="text-center mb-10">
          <h3 className={`text-2xl font-black mb-3 uppercase tracking-tighter ${isAnnual ? "text-secondary" : "text-foreground"}`}>
            {plan.name}
          </h3>
          <p className={`${isAnnual ? "text-slate-400" : "text-muted-foreground"} text-sm mb-8 min-h-[40px] font-medium leading-relaxed max-w-[240px] mx-auto`}>
            {isAnnual
              ? "Elite protection & global deal hunting for a full year."
              : "Month-to-month protection. Cancel anytime."}
          </p>

          <div className="mb-4 flex items-baseline justify-center gap-1">
            <span className={`text-7xl font-black tracking-tighter ${isAnnual ? "text-white" : "text-foreground"}`}>
              {isAnnual
                ? "$" + (parseFloat(plan.price.replace("$", "")) / 12).toFixed(2)
                : plan.price}
            </span>
            <span className="text-muted-foreground font-black uppercase text-xs tracking-widest">
              /mo
            </span>
          </div>
          
          <div className="min-h-[32px]">
            {isAnnual ? (
              <div className="inline-flex items-center gap-2 text-[10px] font-black text-secondary bg-secondary/10 px-4 py-2 rounded-xl uppercase tracking-widest border border-secondary/20">
                <TrendingDown className="w-3 h-3" />
                Pays for itself in 1 flight booking
              </div>
            ) : (
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Standard Billing Applied
              </span>
            )}
          </div>
        </div>

        <ul className="space-y-5 mb-12 flex-1">
          {plan.features.map((feature, featureIndex) => (
            <li key={featureIndex} className="flex items-start space-x-4">
              <div className={`p-1.5 rounded-lg mt-0.5 shadow-sm transition-transform duration-500 group-hover:scale-110 ${isAnnual ? "bg-secondary/20" : "bg-primary/10"}`}>
                <Check className={`h-3.5 w-3.5 ${isAnnual ? "text-secondary" : "text-primary"} stroke-[3]`} />
              </div>
              <span className={`${isAnnual ? "text-slate-300" : "text-muted-foreground"} text-sm font-semibold tracking-tight leading-tight`}>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() =>
            navigate(
              plan.planId ? `/subscribe?planId=${plan.planId}` : "/subscribe"
            )
          }
          variant={isAnnual ? "emerald" : "default"}
          size="xl"
          className="w-full shadow-lg"
        >
          {plan.buttonText}
        </Button>
        
        {isAnnual && (
          <p className="text-[9px] font-black uppercase text-center mt-4 text-slate-500 tracking-[0.2em]">
            Billed annually at {plan.price}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="py-32 bg-background flex justify-center items-center min-h-[600px] noise">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Authenticating Plans...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 bg-background relative overflow-hidden noise">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-24 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Sovereign Pricing</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground mb-8 leading-[0.9] tracking-tighter uppercase">
            Simple, <span className="text-primary italic">Transparent</span> Access.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Choose the plan that fits your digital lifestyle. Every subscription includes our full "Church & State" privacy architecture.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-6 lg:gap-12 max-w-6xl mx-auto pb-12">
          {monthlyPlan && renderPlanCard(monthlyPlan, false)}
          {annualPlan && renderPlanCard(annualPlan, true)}
        </div>

        <div className="text-center mt-20 border-t border-border/50 pt-12">
          <div className="inline-flex items-center gap-6 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {/* Trusted payment icons could go here */}
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Secure Encryption · 30-Day Guarantee · Global Nodes</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
