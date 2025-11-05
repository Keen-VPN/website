import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "annual"
  );

  const plans = [
    {
      name: "Individual",
      description: "Perfect for personal use",
      monthlyPrice: 10,
      annualPrice: 100,
      monthlyPriceDisplay: "$10",
      annualPriceDisplay: "$100",
      annualMonthlyEquivalent: "$8.33",
      features: [
        { name: "Access to all server locations", included: true },
        { name: "Unlimited bandwidth", included: true },
        { name: "Military-grade encryption", included: true },
        { name: "24/7 customer support", included: true },
        { name: "No-log policy guaranteed", included: true },
        { name: "Kill switch protection", included: true },
        { name: "1 month free trial", included: true, highlighted: true },
        { name: "Priority support", included: false },
        { name: "Custom solutions", included: false },
      ],
      buttonText: "Start Free Trial",
      popular: false,
    },
    {
      name: "Team",
      description: "For small teams and organizations (2-50 users)",
      monthlyPrice: 15,
      annualPrice: 150,
      monthlyPriceDisplay: "$15",
      annualPriceDisplay: "$150",
      annualMonthlyEquivalent: "$12.50",
      features: [
        { name: "Access to all server locations", included: true },
        { name: "Unlimited bandwidth", included: true },
        { name: "Military-grade encryption", included: true },
        { name: "24/7 customer support", included: true },
        { name: "No-log policy guaranteed", included: true },
        { name: "Kill switch protection", included: true },
        { name: "1 month free trial", included: true, highlighted: true },
        { name: "Team management dashboard", included: true },
        { name: "Priority support", included: true },
        { name: "Custom solutions", included: false },
      ],
      buttonText: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "Custom solutions for large organizations (50+ users)",
      monthlyPrice: null,
      annualPrice: null,
      monthlyPriceDisplay: "Custom",
      annualPriceDisplay: "Custom",
      annualMonthlyEquivalent: null,
      features: [
        { name: "Access to all server locations", included: true },
        { name: "Unlimited bandwidth", included: true },
        { name: "Military-grade encryption", included: true },
        { name: "Unlimited device connections", included: true },
        { name: "24/7 customer support", included: true },
        { name: "No-log policy guaranteed", included: true },
        { name: "Kill switch protection", included: true },
        { name: "1 month free trial", included: true, highlighted: true },
        { name: "Team management dashboard", included: true },
        { name: "Priority support", included: true },
        { name: "Custom solutions", included: true },
      ],
      buttonText: "Contact Sales",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "What's included in the 1 month free trial?",
      answer:
        "All plans include a full-featured 1 month free trial. You'll have access to all premium features including unlimited bandwidth, all server locations, and our military-grade encryption. No credit card required to start.",
    },
    {
      question: "Can I switch plans at any time?",
      answer:
        "Yes! You can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the change will take effect at your next billing cycle.",
    },
    {
      question: "How does billing work for annual plans?",
      answer:
        "Annual plans are billed once per year upfront. You'll save significantly compared to monthly billing - that's equivalent to getting 2 months free on Individual plans and 2.5 months free on Team plans.",
    },
    {
      question: "Do you keep logs of my activity?",
      answer:
        "Absolutely not. We have a strict no-log policy. We don't track, collect, or store any of your browsing activity or connection logs. Your privacy is our top priority.",
    },
    {
      question: "What happens after my trial ends?",
      answer:
        "After your 1 month free trial ends, you'll be automatically enrolled in your selected plan and billing will begin. You can cancel at any time before the trial ends with no charges.",
    },
  ];

  const allFeatures = [
    "Server locations worldwide",
    "Simultaneous device connections",
    "Bandwidth",
    "Military-grade encryption",
    "No-log policy",
    "Kill switch protection",
    "24/7 customer support",
    "Free trial duration",
    "Team management dashboard",
    "Priority support",
    "Custom security solutions",
    "Dedicated account manager",
  ];

  const featureComparison = [
    {
      feature: "Server locations worldwide",
      individual: "50+",
      team: "50+",
      enterprise: "50+ (+ Private servers)",
    },
    {
      feature: "Simultaneous device connections",
      individual: "5",
      team: "10",
      enterprise: "Unlimited",
    },
    {
      feature: "Bandwidth",
      individual: "Unlimited",
      team: "Unlimited",
      enterprise: "Unlimited",
    },
    {
      feature: "Military-grade encryption",
      individual: true,
      team: true,
      enterprise: true,
    },
    {
      feature: "No-log policy",
      individual: true,
      team: true,
      enterprise: true,
    },
    {
      feature: "Kill switch protection",
      individual: true,
      team: true,
      enterprise: true,
    },
    {
      feature: "24/7 customer support",
      individual: true,
      team: true,
      enterprise: true,
    },
    {
      feature: "Free trial duration",
      individual: "1 month",
      team: "1 month",
      enterprise: "1 month",
    },
    {
      feature: "Team management dashboard",
      individual: false,
      team: true,
      enterprise: true,
    },
    {
      feature: "Priority support",
      individual: false,
      team: true,
      enterprise: true,
    },
    {
      feature: "Custom security solutions",
      individual: false,
      team: false,
      enterprise: true,
    },
    {
      feature: "Dedicated account manager",
      individual: false,
      team: false,
      enterprise: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
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
              className={`px-6 py-2 rounded-full transition-all ${
                billingPeriod === "annual"
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-2 text-sm">(Save 17%)</span>
            </button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const price =
                billingPeriod === "annual"
                  ? plan.annualPriceDisplay
                  : plan.monthlyPriceDisplay;
              const period = billingPeriod === "annual" ? "/year" : "/month";
              const monthlyEquivalent =
                billingPeriod === "annual" && plan.annualMonthlyEquivalent;

              return (
                <div
                  key={index}
                  className={`relative p-8 rounded-xl border transition-all duration-300 ${
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
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-foreground">
                        {price}
                      </span>
                      {period && (
                        <span className="text-muted-foreground">{period}</span>
                      )}
                    </div>
                    {monthlyEquivalent && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Just {monthlyEquivalent}/month
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() =>
                      plan.name === "Enterprise"
                        ? navigate("/support")
                        : // TODO: ADD DYNAMIC ROUTE TO SUBSCRIBE PAGE FOR EACH PLAN (/subscribe?plan=individual)
                          navigate("/subscribe")
                    }
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

                  <ul className="space-y-3">
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
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Compare Plans
          </h2>

          <div className="max-w-6xl mx-auto overflow-x-auto">
            <div className="min-w-[640px] bg-gradient-card rounded-xl border border-border p-6">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-border">
                <div className="text-muted-foreground font-medium">
                  Features
                </div>
                <div className="text-center">
                  <div className="text-foreground font-bold">Individual</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {billingPeriod === "annual" ? "$100/year" : "$10/month"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-foreground font-bold">Team</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {billingPeriod === "annual" ? "$150/year" : "$15/month"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-foreground font-bold">Enterprise</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Custom
                  </div>
                </div>
              </div>

              {/* Table Body */}
              {featureComparison.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-4 py-4 border-b border-border/50 last:border-0"
                >
                  <div className="text-foreground">{row.feature}</div>
                  <div className="text-center text-muted-foreground">
                    {typeof row.individual === "boolean" ? (
                      row.individual ? (
                        <Check className="h-5 w-5 text-primary inline-block" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/50 inline-block" />
                      )
                    ) : (
                      row.individual
                    )}
                  </div>
                  <div className="text-center text-muted-foreground">
                    {typeof row.team === "boolean" ? (
                      row.team ? (
                        <Check className="h-5 w-5 text-primary inline-block" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/50 inline-block" />
                      )
                    ) : (
                      row.team
                    )}
                  </div>
                  <div className="text-center text-muted-foreground">
                    {typeof row.enterprise === "boolean" ? (
                      row.enterprise ? (
                        <Check className="h-5 w-5 text-primary inline-block" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/50 inline-block" />
                      )
                    ) : (
                      row.enterprise
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 bg-gradient-card rounded-xl border border-border">
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-foreground font-medium mb-1">
                Server Locations
              </div>
              <div className="text-sm text-muted-foreground">
                Worldwide coverage
              </div>
            </div>
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
                  value={`item-${index}`}
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
                    {faq.answer}
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
              Ready to protect your privacy?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start your 1 month free trial today. No credit card required.
            </p>
            <Button
              onClick={() => navigate("/subscribe")}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              size="lg"
            >
              Start Free Trial
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              30-day money-back guarantee • Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
