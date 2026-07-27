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
  const currentPlanLabel =
    `${subscription.planId ?? ""} ${subscription.plan ?? ""}`.toLowerCase();
  const currentBillingPeriod =
    subscription.billingPeriod === "year" ||
    currentPlanLabel.includes("year") ||
    currentPlanLabel.includes("annual")
      ? "year"
      : "month";
  const selectedPlan =
    currentBillingPeriod === "year"
      ? (annualPlan ?? monthlyPlan)
      : (monthlyPlan ?? annualPlan);
  const isAppleBilling = isAppleIapSubscription(subscription);

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
              ? "Enable Business now and move future billing to Stripe. Your existing Apple paid time is used first."
              : "Enable Business without an upgrade charge. Your current billing period and renewal date stay the same."}
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
              <span className="text-xs capitalize text-muted-foreground">
                {pricePeriod}ly billing
              </span>
            </div>

            {unitPrice !== null ? (
              <p className="text-xs text-muted-foreground">
                Your upgrade costs $0 today. Your owner seat stays at the same
                Individual rate (
                {pricePeriod === "year"
                  ? `$${unitPrice.toFixed(2)}/year`
                  : `$${unitPrice.toFixed(2)}/month`}
                ). Invites are free; an additional seat is billed only after a
                teammate accepts and has used any paid KeenVPN time they already
                have.
              </p>
            ) : null}
          </>
        )}
      </div>

      {isAppleBilling ? (
        <p className="text-xs text-muted-foreground">
          Stripe will collect your payment method but will not bill it until your
          current Apple paid period ends. Turn off App Store auto-renewal to avoid
          future duplicate billing.
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
            {isAppleBilling
              ? "Opening secure setup…"
              : "Enabling Business…"}
          </>
        ) : isAppleBilling ? (
          "Set up future Business billing"
        ) : (
          "Enable Business for free"
        )}
      </Button>
    </div>
  );
}
