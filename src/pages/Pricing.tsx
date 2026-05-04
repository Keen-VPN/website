import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, HelpCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactSalesDialog } from "@/components/ContactSalesForm";
import { enterprisePlan, featureComparison, faqs } from "@/constants/pricing";
import { fetchSubscriptionPlans, getSessionToken, createBillingPortalSession } from "@/auth/backend";
import { transformApiPlans } from "@/lib/pricing";

import { PricingPlan } from "@/lib/pricing";
import SEOHead from "@/components/SEOHead";
import { canStartFreeTrial } from "@/lib/subscription-cta";
import type { TrialData } from "@/auth/types";
import { MembershipTransferDialog } from "@/components/MembershipTransferDialog";

const pricingSEOProps = {
  title: "KeenVPN Pricing — Affordable VPN Plans for iOS & macOS",
  description: "Choose a KeenVPN plan that fits your needs. Simple, transparent pricing with monthly and annual options. Start with a free trial today.",
  canonical: "https://vpnkeen.com/pricing",
} as const;

/** Hero, plan cards, and bottom CTA: which primary action to show based on auth + subscription. */
export type PricingCtaKind =
  | "loading"
  | "start_free_trial"
  | "manage_account"
  | "subscribe";

export function getPricingCtaKind(
  authLoading: boolean,
  user: unknown,
  subscriptionStatus: string | undefined,
  trial?: TrialData | null,
): PricingCtaKind {
  if (authLoading) return "loading";
  const s = (subscriptionStatus ?? "").toLowerCase();
  if (s === "active" || s === "trialing" || s === "past_due") {
    return "manage_account";
  }
  return canStartFreeTrial(user, s, trial)
    ? "start_free_trial"
    : "subscribe";
}

const Pricing = () => {

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, subscription, trial, loading: authLoading } = useAuth();

  const ctaKind = useMemo(
    () => getPricingCtaKind(authLoading, user, subscription?.status, trial),
    [authLoading, user, subscription?.status, trial],
  );

  const isMonthlyStripeUpgradeEligible =
    subscription?.status === "active" &&
    subscription?.subscriptionType === "stripe" &&
    (subscription?.plan ?? "").toLowerCase().includes("monthly");

  const [portalLoading, setPortalLoading] = useState(false);
  const [membershipTransferOpen, setMembershipTransferOpen] = useState(false);

  const handleUpgradeToAnnual = async () => {
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
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "annual",
  );
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        const response = await fetchSubscriptionPlans();

        if (response.success && response.plans) {
          const transformedPlans = transformApiPlans(response.plans);
          setPlans([...transformedPlans, enterprisePlan]);
        } else {
          setError(response.error || "Failed to load plans");
          setPlans([enterprisePlan]);
        }
      } catch {
        setError("Failed to load plans");
        setPlans([enterprisePlan]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead {...pricingSEOProps} />
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 text-center">
            <div className="text-xl text-muted-foreground">
              Loading plans...
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...pricingSEOProps} />
      <Header />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Choose Your Protection Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Get complete online privacy and security with KeenVPN. All plans
            include a 1 month free trial, unlimited bandwidth, and our no-log
            guarantee.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-gradient-card p-2 rounded-full border border-border">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-full transition-all ${
                billingPeriod === "monthly"
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-full transition-all relative ${
                billingPeriod === "annual"
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-2 text-sm">(Save 17%)</span>
            </button>
          </div>

          <div className="max-w-2xl mx-auto mt-10 rounded-xl border border-border bg-card/80 px-6 py-5 text-left">
            <p className="text-sm text-muted-foreground mb-3">
              Already have a VPN? Switch to KeenVPN today and we&apos;ll transfer your remaining
              membership time for free.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMembershipTransferOpen(true)}
            >
              Request Membership Transfer
            </Button>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <section className="container mx-auto px-4 mb-8">
            <div className="max-w-4xl mx-auto bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-center">
              <p className="text-destructive">
                {error}. Showing available plans.
              </p>
            </div>
          </section>
        )}

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto items-stretch">
            {plans.map((plan, index) => {
              const isAnnual = billingPeriod === "annual";
              const price = isAnnual
                ? plan.annualPriceDisplay || plan.monthlyPriceDisplay
                : plan.monthlyPriceDisplay;
              const period =
                plan.monthlyPrice === null
                  ? ""
                  : isAnnual
                    ? "/month, billed annually"
                    : "/month";
              const monthlyEquivalent =
                isAnnual && plan.annualMonthlyEquivalent
                  ? plan.annualMonthlyEquivalent
                  : null;

              return (
                <div
                  key={index}
                  className={`relative p-8 rounded-xl border transition-all duration-300 flex flex-col h-full ${
                    plan.popular
                      ? "bg-gradient-card border-primary shadow-glow scale-105 md:scale-110"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-glow">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {plan.name === "Enterprise"
                        ? plan.description
                        : isAnnual
                          ? "Complete VPN protection for the entire year"
                          : "Complete VPN protection with monthly flexibility"}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.name === "Enterprise"
                          ? "Custom"
                          : isAnnual
                            ? monthlyEquivalent
                            : price}
                      </span>
                      {period && (
                        <span className="text-muted-foreground">{period}</span>
                      )}
                    </div>
                  </div>

                  {plan.name === "Enterprise" ? (
                    <ContactSalesDialog>
                      <Button
                        className={`w-full mb-6 ${
                          plan.popular
                            ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                            : "border-primary/50 hover:bg-primary/10"
                        }`}
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                      >
                        {plan.buttonText}
                      </Button>
                    </ContactSalesDialog>
                  ) : ctaKind === "manage_account" &&
                    isMonthlyStripeUpgradeEligible &&
                    isAnnual ? (
                    <Button
                      onClick={handleUpgradeToAnnual}
                      disabled={portalLoading}
                      className="w-full mb-6 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                      size="lg"
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
                  ) : ctaKind === "manage_account" ? (
                    <Button
                      onClick={() => navigate("/account")}
                      className={`w-full mb-6 ${
                        plan.popular
                          ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                          : "border-primary/50 hover:bg-primary/10"
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      Manage account
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (ctaKind === "loading") return;
                        const queryParams = new URLSearchParams({
                          planId: isAnnual
                            ? plan.annualId || ""
                            : plan.monthlyId || "",
                        });
                        navigate(`/subscribe?${queryParams.toString()}`);
                      }}
                      disabled={ctaKind === "loading"}
                      className={`w-full mb-6 ${
                        plan.popular
                          ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                          : "border-primary/50 hover:bg-primary/10"
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      {ctaKind === "loading" ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </span>
                      ) : ctaKind === "subscribe" ? (
                        "Subscribe"
                      ) : (
                        "Start free trial"
                      )}
                    </Button>
                  )}

                  <ul className="space-y-3 flex-grow mb-6">
                    {plan.features
                      .filter((f) => f.included)
                      .map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start gap-3"
                        >
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span
                            className={`text-sm ${
                              feature.highlighted
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="container mx-auto px-4 mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8 md:mb-12">
            Compare Plans
          </h2>

          <div className="max-w-6xl md:mx-auto overflow-x-auto -mx-4 px-4 md:px-0">
            <div className="min-w-[600px] bg-gradient-card rounded-xl border border-border p-4 md:p-6">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-border">
                <div className="text-muted-foreground font-medium text-sm md:text-base">
                  Features
                </div>
                {plans.map((plan, index) => (
                  <div key={index} className="text-center">
                    <div className="text-foreground font-bold text-sm md:text-base">
                      {plan.name}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
                      {plan.monthlyPrice === null
                        ? "Custom"
                        : billingPeriod === "annual"
                          ? `${plan.annualMonthlyEquivalent} / month, billed annually`
                          : `${plan.monthlyPriceDisplay} / month`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                      {plan.monthlyPrice === null
                        ? "Custom"
                        : billingPeriod === "annual"
                          ? plan.annualMonthlyEquivalent
                          : plan.monthlyPriceDisplay}
                    </div>
                    {plan.name === "Enterprise" && (
                      <ContactSalesDialog>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs hidden md:inline-flex"
                        >
                          Contact Sales
                        </Button>
                      </ContactSalesDialog>
                    )}
                  </div>
                ))}
              </div>

              {/* Table Body */}
              {featureComparison.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-3 gap-2 md:gap-4 py-3 md:py-4 border-b border-border/50 last:border-0"
                >
                  <div className="text-foreground text-xs md:text-sm lg:text-base">
                    {row.feature}
                  </div>
                  <div className="text-center text-muted-foreground">
                    {typeof row.individual === "boolean" ? (
                      row.individual ? (
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-primary inline-block" />
                      ) : (
                        <X className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground/50 inline-block" />
                      )
                    ) : (
                      <span className="text-xs md:text-sm">
                        {row.individual}
                      </span>
                    )}
                  </div>

                  <div className="text-center text-muted-foreground">
                    {typeof row.enterprise === "boolean" ? (
                      row.enterprise ? (
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-primary inline-block" />
                      ) : (
                        <X className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground/50 inline-block" />
                      )
                    ) : (
                      <span className="text-xs md:text-sm">
                        {row.enterprise}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
            <div className="p-6 bg-gradient-card rounded-xl border border-border">
              <div className="text-3xl font-bold text-primary mb-2">
                256-bit
              </div>
              <div className="text-foreground font-medium mb-1">
                AES Encryption
              </div>
              <div className="text-sm text-muted-foreground">
                Military-grade security
              </div>
            </div>
            <div className="p-6 bg-gradient-card rounded-xl border border-border">
              <div className="text-3xl font-bold text-primary mb-2">Zero</div>
              <div className="text-foreground font-medium mb-1">Logs Kept</div>
              <div className="text-sm text-muted-foreground">
                Complete privacy
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-center mb-12">
              Have questions? We've got answers.
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item - ${index}`}
                  className="bg-gradient-card rounded-xl border border-border px-6"
                >
                  <AccordionTrigger className="text-left hover:text-primary">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-medium text-foreground">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pl-8">
                    {faq.answer
                      .split(/(support@vpnkeen\.com)/)
                      .map((part, i) =>
                        part === "support@vpnkeen.com" ? (
                          <a
                            key={i}
                            href="mailto:support@vpnkeen.com"
                            className="text-primary hover:underline"
                          >
                            {part}
                          </a>
                        ) : (
                          <span key={i}>{part}</span>
                        ),
                      )}
                    {"isEnterprise" in faq &&
                      (faq as { isEnterprise: boolean }).isEnterprise && (
                        <div className="mt-4">
                          <ContactSalesDialog>
                            <Button variant="outline" size="sm">
                              Contact Sales Team
                            </Button>
                          </ContactSalesDialog>
                        </div>
                      )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-card rounded-xl border border-primary/50 p-12 shadow-glow">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {ctaKind === "manage_account"
                ? "Your KeenVPN account"
                : "Ready to protect your privacy?"}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {ctaKind === "manage_account"
                ? "Manage billing, plan details, and settings in one place."
                : ctaKind === "subscribe"
                  ? "Choose a plan and subscribe to get full protection."
                  : "Start your 1 month free trial today"}
            </p>
            <Button
              onClick={() => {
                if (ctaKind === "loading") return;
                if (ctaKind === "manage_account") {
                  navigate("/account");
                  return;
                }
                navigate("/subscribe");
              }}
              disabled={ctaKind === "loading"}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              size="lg"
            >
              {ctaKind === "loading" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </span>
              ) : ctaKind === "manage_account" ? (
                "Manage account"
              ) : ctaKind === "subscribe" ? (
                "Subscribe"
              ) : (
                "Start free trial"
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              {ctaKind === "manage_account"
                ? "Questions? We are here to help."
                : "30-day money-back guarantee • Cancel anytime"}
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <MembershipTransferDialog
        open={membershipTransferOpen}
        onOpenChange={setMembershipTransferOpen}
      />
    </div>
  );
};

export default Pricing;
