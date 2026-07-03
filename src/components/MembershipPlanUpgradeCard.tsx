import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import type { SubscriptionData } from "@/auth/types";
import { canUpgradeStripeMembershipPlan } from "@/lib/subscription-cta";

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

  return (
    <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Share KeenVPN with your team
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade to Business to invite members with their own logins.
            You'll choose how many seats to buy in the billing portal.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border/80 bg-background/80 p-3">
        <p className="text-sm font-medium">Business</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Buy seats for your whole team · 5 connected devices per seat
        </p>
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
            Opening billing…
          </>
        ) : (
          "Upgrade to Business"
        )}
      </Button>
    </div>
  );
}
