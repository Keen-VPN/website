import type { SubscriptionData } from "@/auth/types";
import { getScheduledAnnualBillingCopy } from "@/lib/scheduled-annual-billing";

export function ScheduledAnnualBillingNotice({
  subscription,
  className = "rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground",
}: {
  subscription: SubscriptionData | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm text-foreground">
        {getScheduledAnnualBillingCopy(subscription)}
      </p>
    </div>
  );
}
