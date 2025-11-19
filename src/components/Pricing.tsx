import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
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

  const defaultFeatures = [
    "Access to all server locations",
    "Unlimited bandwidth",
    "Military-grade encryption",
    "Multi-device support",
    "24/7 customer support",
    "No-log policy guaranteed",
    "Advanced security features",
    "Kill switch protection",
  ];

  const transformPlan = (apiPlan: any): Plan => {
    return {
      name: apiPlan.name || "KeenVPN Premium",
      price: `$${apiPlan.price || 100}`,
      period: "/month",
      description:
        apiPlan.description || "Complete VPN protection for the entire year",
      features:
        apiPlan.features
          ?.filter((f: any) => f.included)
          ?.map((f: any) => f.name) || defaultFeatures,
      buttonText: "Get KeenVPN",
      planId: apiPlan.id,
    };
  };

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        const response = await fetchSubscriptionPlans();

        if (response.success && response.plans && response.plans.length > 0) {
          // Find annual and monthly plans
          const foundAnnualPlan = response.plans.find(
            (p: any) =>
              p.period === "year" ||
              p.billingPeriod === "year" ||
              p.interval === "year"
          );

          const foundMonthlyPlan = response.plans.find(
            (p: any) =>
              p.period === "month" ||
              p.billingPeriod === "month" ||
              p.interval === "month"
          );

          if (foundAnnualPlan) {
            setAnnualPlan(transformPlan(foundAnnualPlan));
          } else {
            // Fallback to default annual plan
            setAnnualPlan({
              name: "KeenVPN Premium",
              price: "$100",
              period: "/year",
              description: "Complete VPN protection for the entire year",
              features: defaultFeatures,
              buttonText: "Get KeenVPN",
            });
          }

          if (foundMonthlyPlan) {
            setMonthlyPlan(transformPlan(foundMonthlyPlan));
          } else {
            // Fallback to default monthly plan
            setMonthlyPlan({
              name: "KeenVPN Premium",
              price: "$10",
              period: "/month",
              description: "Complete VPN protection month to month",
              features: defaultFeatures,
              buttonText: "Get KeenVPN",
            });
          }
        } else {
          setError(response.error || "Failed to load plans");
          // Fallback to default plans
          setAnnualPlan({
            name: "KeenVPN Premium",
            price: "$100",
            period: "/year",
            description: "Complete VPN protection for the entire year",
            features: defaultFeatures,
            buttonText: "Get KeenVPN",
          });
          setMonthlyPlan({
            name: "KeenVPN Premium",
            price: "$10",
            period: "/month",
            description: "Complete VPN protection month to month",
            features: defaultFeatures,
            buttonText: "Get KeenVPN",
          });
        }
      } catch (err) {
        setError("Failed to load plans");
        // Fallback to default plans
        setAnnualPlan({
          name: "KeenVPN Premium",
          price: "$100",
          period: "/year",
          description: "Complete VPN protection for the entire year",
          features: defaultFeatures,
          buttonText: "Get KeenVPN",
        });
        setMonthlyPlan({
          name: "KeenVPN Premium",
          price: "$10",
          period: "/month",
          description: "Complete VPN protection month to month",
          features: defaultFeatures,
          buttonText: "Get KeenVPN",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const renderPlanCard = (plan: Plan, isAnnual: boolean) => {
    const monthlyEquivalent = isAnnual ? `billed annually` : null;

    return (
      <div
        key={plan.period}
        className="relative p-8 bg-gradient-card rounded-xl border border-accent/50 shadow-glow transition-all duration-300 max-w-md w-full hover:border-accent/70 hover:shadow-xl"
      >
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
            {isAnnual ? "Annual Plan" : "Monthly Plan"}
          </span>
        </div>

        <div className="text-center mb-8 mt-4">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {plan.name}
          </h3>
          <p className="text-muted-foreground mb-4">{plan.description}</p>

          <div className="mb-4">
            <span className="text-4xl font-bold text-foreground">
              {isAnnual
                ? "$" +
                  (parseFloat(plan.price.replace("$", "")) / 12).toFixed(2)
                : plan.price}
            </span>
            <span className="text-muted-foreground">
              {plan.period} " "
              {monthlyEquivalent && (
                <span className="text-sm text-muted-foreground mt-1">
                  {monthlyEquivalent}
                </span>
              )}
            </span>
          </div>
        </div>

        <ul className="space-y-4 mb-8">
          {plan.features.map((feature, featureIndex) => (
            <li key={featureIndex} className="flex items-start space-x-3">
              <div className="p-1 bg-primary/20 rounded-full">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              </div>
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() =>
            navigate(
              plan.planId ? `/subscribe?planId=${plan.planId}` : "/subscribe"
            )
          }
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-semibold text-lg transition-all hover:scale-105"
          size="lg"
        >
          {plan.buttonText}
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading plans...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!monthlyPlan && !annualPlan) {
    return (
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {error || "No plans available"}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that works for you. Get complete VPN protection with
            flexible billing options.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-8 max-w-5xl mx-auto">
          {monthlyPlan && renderPlanCard(monthlyPlan, false)}
          {annualPlan && renderPlanCard(annualPlan, true)}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Simple pricing, powerful protection. Get started with KeenVPN today.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
