import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  cancelSubscription,
  createBillingPortalSession,
  getSessionToken,
  upgradeSubscriptionToAnnual,
} from "@/auth";

interface UseSubscriptionBillingActionsOptions {
  /** Stripe portal return URL (defaults to current page). */
  returnUrl?: string;
}

/**
 * Shared cancel-at-period-end and Stripe billing portal actions for Account,
 * Subscription History, Pricing, etc.
 */
export function useSubscriptionBillingActions(
  options: UseSubscriptionBillingActionsOptions = {},
) {
  const { refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradingToAnnual, setUpgradingToAnnual] = useState(false);

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

  const openBillingPortal = useCallback(async () => {
    const token = requireSessionToken();
    if (!token) {
      return;
    }

    // Open a tab synchronously on click so Safari does not block the portal URL
    // after the async session fetch. Do not pass "noopener" — it returns null.
    const portalWindow = window.open("about:blank", "_blank");
    const popupBlocked = portalWindow === null;

    try {
      setPortalLoading(true);
      const result = await createBillingPortalSession(token, resolveReturnUrl());

      if (result.success && result.url) {
        if (portalWindow && !portalWindow.closed) {
          portalWindow.location.replace(result.url);
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
  }, [requireSessionToken, resolveReturnUrl, toast]);

  const upgradeToAnnualPlan = useCallback(async () => {
    const token = requireSessionToken();
    if (!token) {
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
  }, [requireSessionToken, toast, refreshSubscription]);

  return {
    cancelling,
    portalLoading,
    upgradingToAnnual,
    cancelSubscriptionAtPeriodEnd,
    openBillingPortal,
    upgradeToAnnualPlan,
  };
}
