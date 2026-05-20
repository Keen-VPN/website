import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  cancelSubscription,
  createBillingPortalSession,
  getSessionToken,
} from "@/auth";

type UseSubscriptionBillingActionsOptions = {
  /** Stripe portal return URL (defaults to current page). */
  returnUrl?: string;
};

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

    try {
      setPortalLoading(true);
      const result = await createBillingPortalSession(token, resolveReturnUrl());

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast({
          title: "Unable to open billing portal",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  }, [requireSessionToken, resolveReturnUrl, toast]);

  return {
    cancelling,
    portalLoading,
    cancelSubscriptionAtPeriodEnd,
    openBillingPortal,
  };
}
