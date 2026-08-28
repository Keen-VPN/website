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
  /** After in-place Business upgrade, land here instead of auto-detect. */
  businessSuccessPath?: string;
}

function isDashboardRoute(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/downloads") ||
    pathname.startsWith("/referrals") ||
    pathname.startsWith("/class-action")
  );
}

function buildBusinessUpgradeSuccessPath(
  billingIntervalChange?: {
    to: "month" | "year" | "2year";
    effectiveAt: string;
  },
  explicitPath?: string,
): string {
  const basePath =
    explicitPath ??
    (typeof window !== "undefined" &&
    isDashboardRoute(window.location.pathname)
      ? "/dashboard"
      : "/account");

  const url = new URL(basePath, window.location.origin);
  url.searchParams.set("business", "upgraded");
  if (basePath === "/account") {
    url.searchParams.set("tab", "team");
  }

  if (billingIntervalChange) {
    const { to, effectiveAt } = billingIntervalChange;
    if (to === "month" || to === "year" || to === "2year") {
      url.searchParams.set("billing", to);
    }
    if (typeof effectiveAt === "string" && effectiveAt.trim().length > 0) {
      url.searchParams.set("billingEffectiveAt", effectiveAt);
    }
  }

  return `${url.pathname}${url.search}`;
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
  const { refreshSubscription, patchSubscription } = useAuth();
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

  const cancelSubscriptionAtPeriodEnd = useCallback(async (): Promise<boolean> => {
    const token = requireSessionToken();
    if (!token) {
      return false;
    }

    try {
      setCancelling(true);
      const result = await cancelSubscription(token);

      if (result.success) {
        patchSubscription({ cancelAtPeriodEnd: true });
        toast({
          title: "Auto-renewal turned off",
          description:
            "Your subscription stays active until the end of your billing period.",
        });
        let updated = await refreshSubscription();
        for (
          let attempt = 0;
          attempt < 2 && updated && !updated.cancelAtPeriodEnd;
          attempt += 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          updated = await refreshSubscription();
        }
        if (updated && !updated.cancelAtPeriodEnd) {
          patchSubscription({ cancelAtPeriodEnd: true });
        }
        return true;
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
      return false;
    } finally {
      setCancelling(false);
    }
  }, [requireSessionToken, toast, refreshSubscription, patchSubscription]);

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

      const origin = window.location.origin;
      const onDashboard =
        typeof window !== "undefined" &&
        isDashboardRoute(window.location.pathname);
      const successPath =
        options.businessSuccessPath ??
        (onDashboard ? "/dashboard" : "/account");
      const successUrl = new URL(successPath, origin);
      successUrl.searchParams.set("business", "upgraded");
      if (successPath === "/account") {
        successUrl.searchParams.set("tab", "team");
      }
      // Stripe only substitutes the literal {CHECKOUT_SESSION_ID}; URLSearchParams
      // would percent-encode the braces and break post-checkout hydration.
      const successUrlWithSession = `${successUrl.toString()}${
        successUrl.search ? "&" : "?"
      }session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = onDashboard
        ? `${origin}/subscription?tab=plans`
        : `${origin}/account`;

      try {
        setBusinessUpgradeLoading(true);
        const result = await upgradeSubscriptionToBusiness(
          token,
          planId,
          seatCount,
          {
            successUrl: successUrlWithSession,
            cancelUrl,
          },
        );

        if (result.success) {
          if (result.mode === "checkout") {
            if (!result.url) {
              throw new Error("No checkout URL received");
            }
            window.location.href = result.url;
            return;
          }

          await refreshSubscription();
          window.location.href = buildBusinessUpgradeSuccessPath(
            result.billingIntervalChange,
            successPath,
          );
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
    [
      options.businessSuccessPath,
      requireSessionToken,
      refreshSubscription,
      toast,
    ],
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
