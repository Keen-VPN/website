import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  HelpCircle,
  ArrowUpCircle,
  Loader2,
  Gift,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PricingNoticeTooltip from "@/components/PricingNoticeTooltip";
import {
  featureComparison,
  featureComparisonValueForPlan,
  faqs,
} from "@/constants/pricing";
import { fetchSubscriptionPlans } from "@/auth/backend";
import { useAnnualUpgrade } from "@/hooks/use-annual-upgrade";
import {
  annualHeroPriceDisplay,
  formatAnnualBillingDetail,
  formatAnnualComparisonPrice,
  transformApiPlans,
} from "@/lib/pricing";
import { DEFAULT_ANNUAL_SAVINGS_LABEL } from "@/lib/subscription-pricing";

import { PricingPlan } from "@/lib/pricing";
import SEOHead from "@/components/SEOHead";
import {
  canStartFreeTrial,
  canUpgradeToBusinessPlan,
  canUpgradeStripeToAnnual,
  resolveMembershipPlanTier,
} from "@/lib/subscription-cta";
import { useSubscriptionBillingActions } from "@/hooks/use-subscription-billing-actions";
import type { TrialData } from "@/auth/types";
import { MembershipTransferDialog } from "@/components/MembershipTransferDialog";
import {
  hasMembershipTransferQuery,
  isSwitchPageMembershipTransfer,
  MEMBERSHIP_TRANSFER_QUERY_KEY,
  MEMBERSHIP_TRANSFER_SOURCE_KEY,
  MEMBERSHIP_TRANSFER_SOURCE_SWITCH,
  setPendingMembershipTransfer,
} from "@/auth/membership-transfer-flow";

const pricingSEOProps = {
  title: "KeenVPN Pricing — Affordable VPN Plans for iOS & macOS",
  description:
    "Choose a KeenVPN plan that fits your needs. Simple, transparent pricing with monthly and annual options. Start with a free trial today.",
  canonical: "https://vpnkeen.com/pricing",
} as const;

/** Hero, plan cards, and bottom CTA: which primary action to show based on auth + subscription. */
export type PricingCtaKind =
  "loading" | "start_free_trial" | "manage_account" | "subscribe";

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
  return canStartFreeTrial(user, s, trial) ? "start_free_trial" : "subscribe";
}

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, subscription, trial, loading: authLoading } = useAuth();

  const ctaKind = useMemo(
    () => getPricingCtaKind(authLoading, user, subscription?.status, trial),
    [authLoading, user, subscription?.status, trial],
  );

  const isMonthlyStripeUpgradeEligible = canUpgradeStripeToAnnual(subscription);

  const showMembershipPlanUpgrade = canUpgradeToBusinessPlan(subscription);
  const membershipTier = resolveMembershipPlanTier(subscription);

  const { businessUpgradeLoading, upgradeToBusinessPlan } =
    useSubscriptionBillingActions({
      returnUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/pricing`
          : undefined,
    });

  const { upgrading, upgradeToAnnual, trackAnnualEvent } = useAnnualUpgrade();
  // annual_plan_viewed: once per page visit (default billing is annual on mount).
  // Toggling monthly → annual again does not re-fire; avoids inflated toggle counts.
  const annualViewTrackedRef = useRef(false);
  const [membershipTransferOpen, setMembershipTransferOpen] = useState(false);
  const [membershipTransferFromSwitch, setMembershipTransferFromSwitch] =
    useState(false);

  useEffect(() => {
    if (authLoading || !hasMembershipTransferQuery(searchParams)) {
      return;
    }

    if (isSwitchPageMembershipTransfer(searchParams)) {
      setMembershipTransferFromSwitch(true);
    } else {
      setMembershipTransferFromSwitch(false);
    }

    if (!user) {
      setPendingMembershipTransfer(
        isSwitchPageMembershipTransfer(searchParams)
          ? MEMBERSHIP_TRANSFER_SOURCE_SWITCH
          : undefined,
      );
      navigate("/signin", { replace: true });
      return;
    }

    setMembershipTransferOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete(MEMBERSHIP_TRANSFER_QUERY_KEY);
    next.delete(MEMBERSHIP_TRANSFER_SOURCE_KEY);
    setSearchParams(next, { replace: true });
  }, [authLoading, user, searchParams, navigate, setSearchParams]);

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "annual",
  );
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const premiumPlan = useMemo(
    () => plans.find((p) => p.name === "Individual" || p.name === "Premium"),
    [plans],
  );
  const businessPlan = useMemo(() => plans.find((p) => p.isPerSeat), [plans]);
  const annualSavingsLabel =
    premiumPlan?.annualSavingsLabel ?? DEFAULT_ANNUAL_SAVINGS_LABEL;

  useEffect(() => {
    if (billingPeriod !== "annual" || annualViewTrackedRef.current) {
      return;
    }
    annualViewTrackedRef.current = true;
    void trackAnnualEvent("annual_plan_viewed", "pricing_page");
  }, [billingPeriod, trackAnnualEvent]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        const response = await fetchSubscriptionPlans();

        if (response.success && response.plans && response.plans.length > 0) {
          const transformedPlans = transformApiPlans(response.plans);
          if (transformedPlans.length > 0) {
            setError(null);
            setPlans(transformedPlans);
          } else {
            setError(response.error || "Failed to load plans");
            setPlans([]);
          }
        } else {
          setError(response.error || "Failed to load plans");
          setPlans([]);
        }
      } catch {
        setError("Failed to load plans");
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleBusinessUpgrade = useCallback(
    async (plan?: PricingPlan | null) => {
      const selectedPlanId =
        billingPeriod === "annual"
          ? (plan?.annualId ?? plan?.monthlyId)
          : (plan?.monthlyId ?? plan?.annualId);
      if (!selectedPlanId) {
        return;
      }
      await upgradeToBusinessPlan(selectedPlanId, 1);
    },
    [billingPeriod, upgradeToBusinessPlan],
  );

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
              <span className="ml-2 text-sm">({annualSavingsLabel})</span>
            </button>
          </div>

          <div className="max-w-2xl mx-auto mt-10 rounded-xl border border-border bg-card/80 px-6 py-5 text-left">
            <p className="text-sm text-muted-foreground mb-3">
              Already have a VPN? Switch to KeenVPN today and we&apos;ll
              transfer your remaining membership time for free.
            </p>
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!user) {
                    setPendingMembershipTransfer();
                    navigate("/signin");
                    return;
                  }
                  setMembershipTransferFromSwitch(false);
                  setMembershipTransferOpen(true);
                }}
              >
                Request Membership Transfer
              </Button>
            </div>
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
        <section
          id="plans"
          className="container mx-auto px-4 mt-16 md:mt-20 mb-20"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto items-stretch">
            {plans.map((plan, index) => {
              const isAnnual = billingPeriod === "annual";
              const period =
                plan.monthlyPrice === null
                  ? ""
                  : isAnnual
                    ? plan.annualMonthlyEquivalent
                      ? "/month, billed annually"
                      : "/year"
                    : "/month";
              const annualBillingDetail = isAnnual
                ? formatAnnualBillingDetail(plan)
                : null;
              const showBusinessPlanUpgrade =
                ctaKind === "manage_account" &&
                plan.name === "Business" &&
                membershipTier !== "business" &&
                showMembershipPlanUpgrade;
              const businessUpgradePlanId =
                billingPeriod === "annual"
                  ? (plan.annualId ?? plan.monthlyId)
                  : (plan.monthlyId ?? plan.annualId);

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
                      {isAnnual
                        ? "Complete VPN protection for the entire year"
                        : "Complete VPN protection with monthly flexibility"}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-4xl font-bold text-foreground">
                        {annualHeroPriceDisplay(plan, isAnnual)}
                      </span>
                      {period && (
                        <span className="text-muted-foreground">
                          {period}
                          {plan.isPerSeat ? " per seat" : ""}
                        </span>
                      )}
                      <PricingNoticeTooltip />
                    </div>
                    {isAnnual && plan.annualSavingsLabel && (
                      <p className="mt-2 text-sm font-medium text-primary">
                        {plan.annualSavingsLabel}
                        {plan.annualYearlySavingsDisplay
                          ? ` · ${plan.annualYearlySavingsDisplay} saved per year`
                          : ""}
                      </p>
                    )}
                    {annualBillingDetail && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {annualBillingDetail}
                      </p>
                    )}
                    {plan.isPerSeat &&
                    plan.monthlyPrice !== null &&
                    !showBusinessPlanUpgrade ? (
                      <div className="mt-4 space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
                        <p className="text-sm font-medium text-foreground">
                          Per-seat pricing
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Starts with you — add teammates later; each member is
                          billed when they accept your invite.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From $
                          {(
                            (isAnnual ? plan.annualPrice : plan.monthlyPrice) ??
                            0
                          ).toFixed(2)}
                          {isAnnual ? "/year" : "/month"} for your seat
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {showBusinessPlanUpgrade ? (
                    <Button
                      onClick={() => void handleBusinessUpgrade(plan)}
                      disabled={
                        businessUpgradeLoading || !businessUpgradePlanId
                      }
                      className={`w-full mb-6 ${
                        plan.popular
                          ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                          : "border-primary/50 hover:bg-primary/10"
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      {businessUpgradeLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating subscription…
                        </>
                      ) : (
                        "Upgrade to Business"
                      )}
                    </Button>
                  ) : ctaKind === "manage_account" &&
                    isMonthlyStripeUpgradeEligible &&
                    isAnnual ? (
                    <Button
                      onClick={() => void upgradeToAnnual("pricing_card")}
                      disabled={upgrading}
                      className="w-full mb-6 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                      size="lg"
                    >
                      {upgrading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Upgrading...
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                          Upgrade to Annual (
                          {plan.annualSavingsLabel ??
                            DEFAULT_ANNUAL_SAVINGS_LABEL}
                          )
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
              <div
                className="grid gap-2 md:gap-4 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-border"
                style={{
                  gridTemplateColumns: `minmax(8rem, 1.4fr) repeat(${plans.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="text-muted-foreground font-medium text-sm md:text-base">
                  Features
                </div>
                {plans.map((plan, index) => (
                  <div key={index} className="text-center">
                    <div className="text-foreground font-bold text-sm md:text-base">
                      {plan.name}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
                      {billingPeriod === "annual"
                        ? formatAnnualComparisonPrice(plan)
                        : plan.monthlyPrice === null
                          ? "Custom"
                          : `${plan.monthlyPriceDisplay} / month`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                      {billingPeriod === "annual"
                        ? formatAnnualComparisonPrice(plan)
                        : plan.monthlyPrice === null
                          ? "Custom"
                          : plan.monthlyPriceDisplay}
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Body */}
              {featureComparison.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-2 md:gap-4 py-3 md:py-4 border-b border-border/50 last:border-0"
                  style={{
                    gridTemplateColumns: `minmax(8rem, 1.4fr) repeat(${plans.length}, minmax(0, 1fr))`,
                  }}
                >
                  <div className="text-foreground text-xs md:text-sm lg:text-base">
                    {row.feature}
                  </div>
                  {plans.map((plan) => {
                    const value = featureComparisonValueForPlan(plan.name, row);
                    return (
                      <div
                        key={plan.name}
                        className="text-center text-muted-foreground"
                      >
                        {typeof value === "boolean" ? (
                          value ? (
                            <Check className="h-4 w-4 md:h-5 md:w-5 text-primary inline-block" />
                          ) : (
                            <X className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground/50 inline-block" />
                          )
                        ) : (
                          <span className="text-xs md:text-sm">{value}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Included With Every Membership */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <Gift className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-primary font-medium">
                Member Benefits
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Included With Every Membership
            </h2>
            <p className="text-muted-foreground mb-8">
              Every KeenVPN plan includes more than just VPN protection.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
              {[
                "Global VPN access",
                "Unlimited secure browsing",
                "Exclusive partner discounts",
                "Cashback opportunities",
                "Member rewards",
                "Future perks marketplace access",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
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
                ? showMembershipPlanUpgrade
                  ? "Upgrade to Business to buy seats and invite your team."
                  : "Manage billing, plan details, and settings in one place."
                : ctaKind === "subscribe"
                  ? "Choose a plan and subscribe to get full protection."
                  : "Start your 1 month free trial today"}
            </p>
            {ctaKind === "manage_account" && showMembershipPlanUpgrade ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => void handleBusinessUpgrade(businessPlan)}
                  disabled={businessUpgradeLoading || !businessPlan}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                  size="lg"
                >
                  {businessUpgradeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating subscription…
                    </>
                  ) : (
                    "Upgrade plan"
                  )}
                </Button>
                <Button
                  onClick={() => navigate("/account")}
                  variant="outline"
                  size="lg"
                >
                  Manage account
                </Button>
              </div>
            ) : (
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
            )}
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
        onOpenChange={(open) => {
          setMembershipTransferOpen(open);
          if (!open) {
            setMembershipTransferFromSwitch(false);
          }
        }}
        analyticsSource={
          membershipTransferFromSwitch ? "switch_page" : undefined
        }
      />
    </div>
  );
};

export default Pricing;
