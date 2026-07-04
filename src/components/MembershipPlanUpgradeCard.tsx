import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, Users } from "lucide-react";
import { fetchSubscriptionPlans } from "@/auth/backend";
import type { SubscriptionData } from "@/auth/types";
import type { ApiPlan } from "@/lib/pricing";
import { canUpgradeStripeMembershipPlan } from "@/lib/subscription-cta";
import {
  DEFAULT_BUSINESS_SEATS,
  MAX_BUSINESS_SEATS,
  resolvePlanDefaultSeats,
  resolvePlanMinSeats,
} from "@/constants/pricing";

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
  const [seatCount, setSeatCount] = useState(DEFAULT_BUSINESS_SEATS);

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
  const minSeats = resolvePlanMinSeats(selectedPlan);
  const defaultSeats = resolvePlanDefaultSeats(selectedPlan);
  const hasBothPeriods = Boolean(monthlyPlan && annualPlan);

  useEffect(() => {
    if (!selectedPlan) return;
    setSeatCount((current) =>
      Math.max(minSeats, Math.min(MAX_BUSINESS_SEATS, current || defaultSeats)),
    );
  }, [defaultSeats, minSeats, selectedPlan]);

  useEffect(() => {
    if (billingPeriod === "year" && !annualPlan && monthlyPlan) {
      setBillingPeriod("month");
    }
  }, [annualPlan, billingPeriod, monthlyPlan]);

  if (!canUpgradeStripeMembershipPlan(subscription)) {
    return null;
  }
  if (!plansLoading && !selectedPlan) {
    return null;
  }

  const totalPrice =
    selectedPlan && Number.isFinite(selectedPlan.price)
      ? selectedPlan.price * seatCount
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
            Upgrade to Business to invite members with their own logins. Choose
            seats here, then Stripe updates your subscription.
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
                  Pay per seat · 5 connected devices per seat
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

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                Seats
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={seatCount <= minSeats || upgrading}
                  onClick={() =>
                    setSeatCount((count) => Math.max(minSeats, count - 1))
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">
                  {seatCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={seatCount >= MAX_BUSINESS_SEATS || upgrading}
                  onClick={() =>
                    setSeatCount((count) =>
                      Math.min(MAX_BUSINESS_SEATS, count + 1),
                    )
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {totalPrice !== null ? (
              <p className="text-xs text-muted-foreground">
                ${totalPrice.toFixed(2)}/{pricePeriod} for {seatCount} seats
              </p>
            ) : null}
          </>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() =>
          selectedPlan
            ? void onUpgradePlan(selectedPlan.id, seatCount)
            : undefined
        }
        disabled={plansLoading || !selectedPlan || upgrading}
      >
        {upgrading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating subscription…
          </>
        ) : (
          "Upgrade to Business"
        )}
      </Button>
    </div>
  );
}
