import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSessionToken,
  recordSubscriptionProductEvent,
  upgradeSubscriptionToAnnual,
} from "@/auth";
import {
  trackAnnualSubscriptionEvent,
  type AnnualSubscriptionEventName,
} from "@/lib/product-analytics";

export function useAnnualUpgrade() {
  const { refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const trackAnnualEvent = useCallback(
    async (
      eventName: AnnualSubscriptionEventName,
      source?: string,
    ) => {
      trackAnnualSubscriptionEvent(eventName, { source: source ?? "web" });
      const token = getSessionToken();
      if (token) {
        await recordSubscriptionProductEvent(token, eventName, {
          platform: "web",
          source,
        });
      }
    },
    [],
  );

  const upgradeToAnnual = useCallback(
    async (source = "upgrade_cta") => {
      const token = getSessionToken();
      if (!token) {
        toast({
          title: "Sign in required",
          description: "Please sign in to upgrade your subscription.",
          variant: "destructive",
        });
        return { success: false as const, needsAuth: true };
      }

      try {
        setUpgrading(true);
        await trackAnnualEvent("annual_upgrade_clicked", source);
        const result = await upgradeSubscriptionToAnnual(token);

        if (result.success) {
          await trackAnnualEvent("annual_upgrade_completed", source);
          toast({
            title: "Upgrade scheduled",
            description:
              result.message ??
              "Your plan will switch to annual billing at the start of your next billing cycle.",
          });
          await refreshSubscription();
          return { success: true as const, needsAuth: false };
        }

        throw new Error(result.error || "Upgrade failed");
      } catch (error) {
        toast({
          title: "Upgrade failed",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        return { success: false as const, needsAuth: false };
      } finally {
        setUpgrading(false);
      }
    },
    [refreshSubscription, toast, trackAnnualEvent],
  );

  return { upgrading, upgradeToAnnual, trackAnnualEvent };
}
