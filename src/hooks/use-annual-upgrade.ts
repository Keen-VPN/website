import { useCallback } from "react";
import {
  getSessionToken,
  recordSubscriptionProductEvent,
  upgradeSubscriptionToAnnual,
} from "@/auth";
import { useScheduledPlanChange } from "@/hooks/use-scheduled-plan-change";
import {
  trackAnnualSubscriptionEvent,
  type AnnualSubscriptionEventName,
} from "@/lib/product-analytics";

export function useAnnualUpgrade() {
  const trackAnnualEvent = useCallback(
    async (eventName: AnnualSubscriptionEventName, source?: string) => {
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

  const { changing: upgrading, runChange } = useScheduledPlanChange<
    [],
    AnnualSubscriptionEventName
  >({
    perform: upgradeSubscriptionToAnnual,
    trackEvent: trackAnnualEvent,
    clickedEvent: "annual_upgrade_clicked",
    completedEvent: "annual_upgrade_completed",
    copy: ANNUAL_UPGRADE_COPY,
  });

  const upgradeToAnnual = useCallback(
    (source = "upgrade_cta") => runChange(source),
    [runChange],
  );

  return { upgrading, upgradeToAnnual, trackAnnualEvent };
}

const ANNUAL_UPGRADE_COPY = {
  signInDescription: "Please sign in to upgrade your subscription.",
  successTitle: "Upgrade scheduled",
  successDescription:
    "Your plan will switch to annual billing at the start of your next billing cycle.",
  failureTitle: "Upgrade failed",
  failureDescription: "Please try again.",
} as const;
