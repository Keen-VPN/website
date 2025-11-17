interface ApiPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  interval: string;
  billingPeriod: string;
  features: Array<{
    name: string;
    included: boolean;
    highlighted?: boolean;
  }>;
  priceId: string;
}

interface TransformedPlan {
  monthlyId?: string;
  annualId?: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceDisplay: string;
  annualPriceDisplay: string;
  annualMonthlyEquivalent: string | null;
  features: Array<{
    name: string;
    included: boolean;
    highlighted?: boolean;
  }>;
  buttonText: string;
  popular: boolean;
  monthlyPriceId?: string;
  annualPriceId?: string;
}

export function transformApiPlans(apiPlans: ApiPlan[]): TransformedPlan[] {
  const plansByType = apiPlans.reduce((acc, plan) => {
    const isPremium = plan.id.toLowerCase().includes("premium");
    const isTeam = plan.id.toLowerCase().includes("team");
    const key = isPremium ? "premium" : isTeam ? "team" : "other";

    if (!acc[key]) {
      acc[key] = { monthly: null, annual: null };
    }

    if (plan.period === "month" || plan.billingPeriod === "month") {
      acc[key].monthly = plan;
    } else if (plan.period === "year" || plan.billingPeriod === "year") {
      acc[key].annual = plan;
    }

    return acc;
  }, {} as Record<string, { monthly: ApiPlan | null; annual: ApiPlan | null }>);

  const transformedPlans: TransformedPlan[] = [];

  Object.entries(plansByType).forEach(([type, { monthly, annual }]) => {
    if (!monthly && !annual) return;

    const isPremium = type === "premium";
    const isTeam = type === "team";
    const monthlyPrice = monthly?.price || annual?.price || 0;
    const annualPrice =
      annual?.price || (monthly?.price ? monthly.price * 12 : 0);
    const annualMonthlyEquivalent =
      annual && annualPrice > 0 ? `$${(annualPrice / 12).toFixed(2)}` : null;

    const features = annual?.features?.length
      ? annual.features
      : monthly?.features?.length
      ? monthly.features
      : [];

    transformedPlans.push({
      monthlyId: monthly?.id,
      annualId: annual?.id,
      name: isPremium ? "Individual" : isTeam ? "Team" : "Premium",
      description: isPremium
        ? "Perfect for personal use"
        : isTeam
        ? "For small teams and organizations (2-50 users)"
        : "Premium VPN service",
      monthlyPrice,
      annualPrice,
      monthlyPriceDisplay: `$${monthlyPrice}`,
      annualPriceDisplay: `$${annualPrice}`,
      annualMonthlyEquivalent,
      features,
      buttonText: "Start Free Trial",
      popular: isTeam,
      monthlyPriceId: monthly?.priceId,
      annualPriceId: annual?.priceId,
    });
  });

  return transformedPlans.sort((a, b) => {
    const order = { Individual: 0, Premium: 0, Team: 1 };
    return (
      (order[a.name as keyof typeof order] || 99) -
      (order[b.name as keyof typeof order] || 99)
    );
  });
}
