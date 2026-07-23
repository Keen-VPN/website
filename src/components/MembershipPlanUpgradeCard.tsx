import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { fetchSubscriptionPlans } from "@/auth/backend";
import type { SubscriptionData } from "@/auth/types";
import type { ApiPlan } from "@/lib/pricing";
import {
  canUpgradeToBusinessPlan,
  isAppleIapSubscription,
} from "@/lib/subscription-cta";

interface MembershipPlanUpgradeCardProps {
  subscription: SubscriptionData;
  upgrading?: boolean;
  onUpgradePlan: (planId: string, seatCount: number) => void | Promise<void>;
}

export function MembershipPlanUpgradeCard({
  subscription,
  upgrading = false,
  onUpgradePlan,
}: MembershipPlanUpgradeCardProps) {
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("year");

  useEffect(() => {
    let ignore = false;

    async function loadBusinessPlans() {
      setPlansLoading(true);
      const res = await fetchSubscriptionPlans();
      if (!ignore && res.success && res.plans) {
        setPlans(
          res.plans.filter((plan) => {
            const id = plan.id.toLowerCase();
            return (
              plan.isPerSeat === true ||
              id.includes("team") ||
              id.includes("business") ||
              id.includes("family_plus") ||
              id.includes("familyplus")
            );
          }),
        );
      }
      if (!ignore) {
        setPlansLoading(false);
      }
    }

    void loadBusinessPlans();
    return () => {
      ignore = true;
    };
  }, []);

  const monthlyPlan = useMemo(
    () =>
      plans.find(
        (plan) => plan.period === "month" || plan.billingPeriod === "month",
      ) ?? null,
    [plans],
  );
  const annualPlan = useMemo(
    () =>
      plans.find(
        (plan) => plan.period === "year" || plan.billingPeriod === "year",
      ) ?? null,
    [plans],
  );
  const selectedPlan =
    billingPeriod === "year"
      ? (annualPlan ?? monthlyPlan)
      : (monthlyPlan ?? annualPlan);
  const hasBothPeriods = Boolean(monthlyPlan && annualPlan);
  const isAppleBilling = isAppleIapSubscription(subscription);

  useEffect(() => {
    if (billingPeriod === "year" && !annualPlan && monthlyPlan) {
      setBillingPeriod("month");
    }
  }, [annualPlan, billingPeriod, monthlyPlan]);

  if (!canUpgradeToBusinessPlan(subscription)) {
    return null;
  }
  if (!plansLoading && !selectedPlan) {
    return null;
  }

  const unitPrice =
    selectedPlan && Number.isFinite(selectedPlan.price)
      ? selectedPlan.price
      : null;
  const pricePeriod =
    selectedPlan?.billingPeriod === "year" || selectedPlan?.period === "year"
      ? "year"
      : "month";

  return (
    <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Share KeenVPN with your team
          </p>
          <p className="text-xs text-muted-foreground">
            {isAppleBilling
              ? "Switch billing to Stripe to enable Business and invite teammates. You are only charged for teammates when they accept."
              : "Upgrade to Business, then invite teammates below. You are only charged per person when they accept and join."}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border/80 bg-background/80 p-3">
        {plansLoading || !selectedPlan ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Business plan…
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Business</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pay per active member · 5 connected devices per seat
                </p>
              </div>
              {hasBothPeriods ? (
                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
                  <Button
                    type="button"
                    variant={billingPeriod === "month" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setBillingPeriod("month")}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={billingPeriod === "year" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setBillingPeriod("year")}
                  >
                    Annual
                  </Button>
                </div>
              ) : null}
            </div>

            {unitPrice !== null ? (
              <p className="text-xs text-muted-foreground">
                Checkout covers you only (1 seat). When teammates accept, your card
                is charged about one seat (
                {pricePeriod === "year"
                  ? `$${unitPrice.toFixed(2)}/seat/year`
                  : `$${unitPrice.toFixed(2)}/seat/month`}
                , prorated for the rest of the billing period). Invites are free
                until someone accepts.
              </p>
            ) : null}
          </>
        )}
      </div>

      {isAppleBilling ? (
        <p className="text-xs text-muted-foreground">
          After checkout, cancel your App Store subscription to avoid being billed
          twice.
        </p>
      ) : null}

      <Button
        type="button"
        className="w-full"
        onClick={() =>
          selectedPlan ? void onUpgradePlan(selectedPlan.id, 1) : undefined
        }
        disabled={plansLoading || !selectedPlan || upgrading}
      >
        {upgrading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isAppleBilling ? "Opening Stripe checkout…" : "Updating subscription…"}
          </>
        ) : isAppleBilling ? (
          "Continue with Stripe"
        ) : (
          "Upgrade to Business"
        )}
      </Button>
    </div>
  );
}
