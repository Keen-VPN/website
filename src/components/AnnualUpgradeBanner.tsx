import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAnnualUpgrade } from "@/hooks/use-annual-upgrade";
import { AppleIapSubscriptionsCta } from "@/components/AppleIapSubscriptionsCta";
import { computeAnnualSavings, formatSavingsPercent } from "@/lib/subscription-pricing";
import { fetchSubscriptionPlans } from "@/auth/backend";
import {
  canUpgradeAppleIapToAnnual,
  canUpgradeStripeToAnnual,
  shouldShowAnnualUpgradeOffer,
} from "@/lib/subscription-cta";
import { useState } from "react";

const DISMISS_KEY = "keen_annual_upgrade_banner_dismissed";

interface AnnualUpgradeBannerProps {
  source?: string;
  onDismiss?: () => void;
}

export function AnnualUpgradeBanner({
  source = "account_banner",
  onDismiss,
}: AnnualUpgradeBannerProps) {
  const { subscription } = useAuth();
  const { upgrading, upgradeToAnnual, trackAnnualEvent } = useAnnualUpgrade();
  const [savingsPercent, setSavingsPercent] = useState(37.5);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1",
  );

  useEffect(() => {
    void trackAnnualEvent("annual_plan_viewed", source);
    void (async () => {
      const res = await fetchSubscriptionPlans();
      if (res.success && res.plans) {
        const monthly = res.plans.find((p) => p.billingPeriod === "month");
        const annual = res.plans.find((p) => p.billingPeriod === "year");
        if (monthly && annual) {
          setSavingsPercent(
            computeAnnualSavings(monthly.price, annual.price).savingsPercent,
          );
        }
      }
    })();
  }, [source, trackAnnualEvent]);

  const isStripe = canUpgradeStripeToAnnual(subscription);
  const isAppleIap = canUpgradeAppleIapToAnnual(subscription);

  if (dismissed || !shouldShowAnnualUpgradeOffer(subscription)) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
      <button
        type="button"
        aria-label="Dismiss upgrade offer"
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Thanks for subscribing to KeenVPN. Save{" "}
            <span className="font-semibold">
              {formatSavingsPercent(savingsPercent)}%
            </span>{" "}
            on your subscription by upgrading to an annual subscription, charged
            next month. For $30 a year, you can access KeenVPN&apos;s growing VPN
            as well as get access to private money making opportunities online.
          </p>
          <p className="text-xs text-muted-foreground">
            {isStripe
              ? "Your annual plan starts at your next billing date. No charge until then — your current monthly period rolls over automatically."
              : "Switch to annual billing in the App Store. Apple manages App Store subscriptions."}
          </p>
          {isStripe ? (
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground"
              disabled={upgrading}
              onClick={() => void upgradeToAnnual(source)}
            >
              {upgrading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upgrading...
                </>
              ) : (
                "Upgrade to annual subscription"
              )}
            </Button>
          ) : isAppleIap ? (
            <AppleIapSubscriptionsCta
              label="Upgrade to annual in App Store"
              variant="default"
              buttonClassName="bg-gradient-primary text-primary-foreground hover:opacity-90"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
