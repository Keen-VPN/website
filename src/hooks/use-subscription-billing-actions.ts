import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  cancelSubscription,
  createBillingPortalSession,
  getSessionToken,
  upgradeSubscriptionToBusiness,
  upgradeSubscriptionToAnnual,
} from "@/auth";
import type { SubscriptionData } from "@/auth/types";
import { canUpgradeStripeToAnnual } from "@/lib/subscription-cta";

interface UseSubscriptionBillingActionsOptions {
  /** Stripe portal return URL (defaults to current page). */
  returnUrl?: string;
}

function getAnnualUpgradeIneligibleMessage(
  subscription: SubscriptionData | null | undefined,
): string {
  if (subscription?.cancelAtPeriodEnd) {
    return "Re-enable auto-renewal before upgrading to annual.";
  }
  return "This subscription cannot be upgraded to annual right now.";
}

/** Sever opener before navigating to Stripe to prevent reverse tabnabbing. */
function navigateExternalPortalTab(portalWindow: Window, url: string): void {
  try {
    portalWindow.opener = null;
  } catch {
    /* cross-origin or hardened environments may block assignment */
  }
  portalWindow.location.replace(url);
}

/**
 * Shared cancel-at-period-end and Stripe billing portal actions for Account,
 * Subscription History, Pricing, etc.
 */
export function useSubscriptionBillingActions(
  options: UseSubscriptionBillingActionsOptions = {},
) {
  const { refreshSubscription, subscription } = useAuth();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradingToAnnual, setUpgradingToAnnual] = useState(false);
  const [businessUpgradeLoading, setBusinessUpgradeLoading] = useState(false);

  const resolveReturnUrl = useCallback(
    () => options.returnUrl ?? window.location.href,
    [options.returnUrl],
  );

  const requireSessionToken = useCallback((): string | null => {
    const token = getSessionToken();
    if (!token) {
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return null;
    }
    return token;
  }, [toast]);

  const cancelSubscriptionAtPeriodEnd = useCallback(async () => {
    const token = requireSessionToken();
    if (!token) {
      return;
    }

    try {
      setCancelling(true);
      const result = await cancelSubscription(token);

      if (result.success) {
        toast({
          title: "Auto-renewal turned off",
          description:
            "Your subscription stays active until the end of your billing period.",
        });
        await refreshSubscription();
      } else {
        throw new Error(result.error || "Failed to cancel subscription");
      }
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  }, [requireSessionToken, toast, refreshSubscription]);

  const openBillingPortalWithIntent = useCallback(
    async (intent: "default" | "change_plan", token: string) => {
      const portalWindow = window.open("about:blank", "_blank");
      const popupBlocked = portalWindow === null;

      try {
        setPortalLoading(true);
        const result = await createBillingPortalSession(
          token,
          resolveReturnUrl(),
          { intent },
        );

        if (result.success && result.url) {
          if (portalWindow && !portalWindow.closed) {
            navigateExternalPortalTab(portalWindow, result.url);
          } else if (popupBlocked) {
            toast({
              title: "Opening billing portal",
              description:
                "Your browser blocked a new tab. Opening Stripe in this window.",
            });
            window.location.assign(result.url);
          } else {
            window.location.assign(result.url);
          }
        } else {
          portalWindow?.close();
          toast({
            title: "Unable to open billing portal",
            description: result.error || "Please try again.",
            variant: "destructive",
          });
        }
      } catch {
        portalWindow?.close();
        toast({
          title: "Something went wrong",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setPortalLoading(false);
      }
    },
    [resolveReturnUrl, toast],
  );

  const openBillingPortal = useCallback(async () => {
    const token = requireSessionToken();
    if (!token) {
      return;
    }

    await openBillingPortalWithIntent("default", token);
  }, [requireSessionToken, openBillingPortalWithIntent]);

  const openPlanChangePortal = useCallback(async () => {
    const token = requireSessionToken();
    if (!token) {
      return;
    }

    await openBillingPortalWithIntent("change_plan", token);
  }, [requireSessionToken, openBillingPortalWithIntent]);

  const upgradeToAnnualPlan = useCallback(async () => {
    const token = requireSessionToken();
    if (!token) {
      return;
    }

    if (!canUpgradeStripeToAnnual(subscription)) {
      toast({
        title: "Upgrade unavailable",
        description: getAnnualUpgradeIneligibleMessage(subscription),
        variant: "destructive",
      });
      return;
    }

    try {
      setUpgradingToAnnual(true);
      const result = await upgradeSubscriptionToAnnual(token);

      if (result.success) {
        toast({
          title: "Annual plan scheduled",
          description:
            result.message ||
            "You will switch to annual billing at the end of your current period.",
        });
        await refreshSubscription();
      } else {
        throw new Error(result.error || "Failed to upgrade to annual");
      }
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgradingToAnnual(false);
    }
  }, [requireSessionToken, subscription, toast, refreshSubscription]);

  const upgradeToBusinessPlan = useCallback(
    async (planId: string, seatCount: number) => {
      const token = requireSessionToken();
      if (!token) {
        return;
      }

      try {
        setBusinessUpgradeLoading(true);
        const result = await upgradeSubscriptionToBusiness(
          token,
          planId,
          seatCount,
        );

        if (result.success) {
          toast({
            title: "Business plan updated",
            description: `Your subscription now includes ${result.seatLimit ?? seatCount} seats.`,
          });
          await refreshSubscription();
        } else {
          throw new Error(result.error || "Failed to upgrade to Business");
        }
      } catch (error) {
        toast({
          title: "Business upgrade failed",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setBusinessUpgradeLoading(false);
      }
    },
    [requireSessionToken, toast, refreshSubscription],
  );

  return {
    cancelling,
    portalLoading,
    upgradingToAnnual,
    businessUpgradeLoading,
    cancelSubscriptionAtPeriodEnd,
    openBillingPortal,
    openPlanChangePortal,
    upgradeToAnnualPlan,
    upgradeToBusinessPlan,
  };
}
