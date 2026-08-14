import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  changeSubscriptionPlan,
  getSessionToken,
  recordSubscriptionProductEvent,
} from "@/auth";
import {
  trackTwoYearSubscriptionEvent,
  type TwoYearSubscriptionEventName,
} from "@/lib/product-analytics";

/** Switching an existing Stripe subscription to the 2-year term at the next billing date. */
export function useTwoYearPlanChange() {
  const { refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [changing, setChanging] = useState(false);

  const trackTwoYearEvent = useCallback(
    async (eventName: TwoYearSubscriptionEventName, source?: string) => {
      trackTwoYearSubscriptionEvent(eventName, { source: source ?? "web" });
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

  const switchToTwoYear = useCallback(
    async (planId: string, source = "two_year_cta") => {
      const token = getSessionToken();
      if (!token) {
        toast({
          title: "Sign in required",
          description: "Please sign in to change your subscription.",
          variant: "destructive",
        });
        return { success: false as const, needsAuth: true };
      }

      try {
        setChanging(true);
        await trackTwoYearEvent("two_year_switch_clicked", source);
        const result = await changeSubscriptionPlan(token, planId);

        if (result.success) {
          await trackTwoYearEvent("two_year_switch_completed", source);
          toast({
            title: "Plan change scheduled",
            description:
              result.message ??
              "Your plan switches to the 2-year term at the start of your next billing cycle.",
          });
          await refreshSubscription();
          return { success: true as const, needsAuth: false };
        }

        throw new Error(result.error || "Plan change failed");
      } catch (error) {
        toast({
          title: "Plan change failed",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        return { success: false as const, needsAuth: false };
      } finally {
        setChanging(false);
      }
    },
    [refreshSubscription, toast, trackTwoYearEvent],
  );

  return { changing, switchToTwoYear, trackTwoYearEvent };
}
