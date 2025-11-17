export const enterprisePlan = {
  name: "Enterprise",
  description: "Custom solutions for large organizations (50+ users)",
  monthlyPrice: null,
  annualPrice: null,
  monthlyPriceDisplay: "Custom",
  annualPriceDisplay: "Custom",
  annualMonthlyEquivalent: null,
  features: [
    { name: "1 month free trial", included: true, highlighted: true },
    { name: "Access to all server locations", included: true },
    { name: "Unlimited bandwidth", included: true },
    { name: "Military-grade encryption", included: true },
    { name: "Unlimited device connections", included: true },
    { name: "24/7 customer support", included: true },
    { name: "No-log policy guaranteed", included: true },
    { name: "Kill switch protection", included: true },
    { name: "Team management dashboard", included: true },
    { name: "Priority support", included: true },
    { name: "Custom solutions", included: true },
  ],
  buttonText: "Contact Sales",
  popular: false,
};

export const faqs = [
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
  {
    question: "How do I get started with Enterprise solutions?",
    answer:
      "For Enterprise solutions with 50+ users, we offer custom pricing and dedicated support. Contact our sales team to discuss your specific requirements and get a personalized quote.",
    isEnterprise: true,
  },
];

export const allFeatures = [
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

export const featureComparison = [
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
