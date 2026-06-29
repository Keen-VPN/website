import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import type { SubscriptionData } from "@/auth/types";
import {
  canUpgradeStripeMembershipPlan,
  canUpgradeStripeToBusinessPlan,
  canUpgradeStripeToFamilyPlan,
  resolveMembershipPlanTier,
} from "@/lib/subscription-cta";

interface MembershipPlanUpgradeCardProps {
  subscription: SubscriptionData;
  portalLoading?: boolean;
  onUpgradePlan: () => void | Promise<void>;
}

export function MembershipPlanUpgradeCard({
  subscription,
  portalLoading = false,
  onUpgradePlan,
}: MembershipPlanUpgradeCardProps) {
  if (!canUpgradeStripeMembershipPlan(subscription)) {
    return null;
  }

  const tier = resolveMembershipPlanTier(subscription);
  const showFamilyOption =
    canUpgradeStripeToFamilyPlan(subscription) || tier === "individual";
  const showBusinessOption =
    canUpgradeStripeToBusinessPlan(subscription) || tier === "individual";
  const portalOptionsCopy =
    tier === "family"
      ? "Stripe will show the Business upgrade option."
      : "Stripe will show Family and Business options you can switch to.";

  return (
    <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Share KeenVPN with others
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade your plan to invite members with their own logins.{" "}
            {portalOptionsCopy}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {showFamilyOption ? (
          <div className="rounded-md border border-border/80 bg-background/80 p-3">
            <p className="text-sm font-medium">Family</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to 5 seats · invite by email
            </p>
          </div>
        ) : null}
        {showBusinessOption ? (
          <div className="rounded-md border border-border/80 bg-background/80 p-3">
            <p className="text-sm font-medium">Business</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to 10 seats · for teams
            </p>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() => void onUpgradePlan()}
        disabled={portalLoading}
      >
        {portalLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening Stripe…
          </>
        ) : tier === "family" ? (
          "Upgrade to Business"
        ) : (
          "Upgrade plan"
        )}
      </Button>
    </div>
  );
}
