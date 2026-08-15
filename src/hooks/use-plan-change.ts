import { useCallback } from "react";
import {
  changeSubscriptionPlan,
  getSessionToken,
  recordSubscriptionProductEvent,
} from "@/auth";
import { useScheduledPlanChange } from "@/hooks/use-scheduled-plan-change";
import {
  trackTwoYearSubscriptionEvent,
  type TwoYearSubscriptionEventName,
} from "@/lib/product-analytics";

/** Switching an existing Stripe subscription to the 2-year term at the next billing date. */
export function useTwoYearPlanChange() {
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

  const { changing, runChange } = useScheduledPlanChange<
    [planId: string],
    TwoYearSubscriptionEventName
  >({
    perform: changeSubscriptionPlan,
    trackEvent: trackTwoYearEvent,
    clickedEvent: "two_year_switch_clicked",
    completedEvent: "two_year_switch_completed",
    copy: TWO_YEAR_CHANGE_COPY,
  });

  const switchToTwoYear = useCallback(
    (planId: string, source = "two_year_cta") => runChange(source, planId),
    [runChange],
  );

  return { changing, switchToTwoYear, trackTwoYearEvent };
}

const TWO_YEAR_CHANGE_COPY = {
  signInDescription: "Please sign in to change your subscription.",
  successTitle: "Plan change scheduled",
  successDescription:
    "Your plan switches to the 2-year term at the start of your next billing cycle.",
  failureTitle: "Plan change failed",
  failureDescription: "Please try again.",
} as const;
