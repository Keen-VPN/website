import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { AppleIapSubscriptionsCta } from "@/components/AppleIapSubscriptionsCta";
import { isApplePlatform } from "@/lib/device-detection";
import type { SubscriptionData } from "@/auth/types";
import {
  canCancelStripeOnWebsite,
  hasManageableSubscription,
  isStripeSubscription,
} from "@/lib/subscription-cta";
import { formatSubscriptionEndDate } from "@/lib/format-subscription-date";

interface SubscriptionCancellationControlsProps {
  subscription: SubscriptionData;
  cancelling: boolean;
  onCancel: () => boolean | undefined | Promise<boolean | undefined>;
  onManageBilling?: () => void | Promise<void>;
  portalLoading?: boolean;
  showManageBilling?: boolean;
  showCancelButton?: boolean;
}

/**
 * Stripe: turn off auto-renewal via POST /subscription/cancel.
 * Apple IAP: directions to system subscription settings (cannot cancel on web).
 */
export function SubscriptionCancellationControls({
  subscription,
  cancelling,
  onCancel,
  onManageBilling,
  portalLoading = false,
  showManageBilling = true,
  showCancelButton = true,
}: SubscriptionCancellationControlsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isStripe = isStripeSubscription(subscription);
  const canCancelStripe = canCancelStripeOnWebsite(subscription);
  const isApple = subscription.subscriptionType === "apple_iap";
  const manageable = hasManageableSubscription(subscription);
  const endLabel = formatSubscriptionEndDate(subscription.endDate);

  const handleConfirmCancel = async () => {
    const result = await Promise.resolve(onCancel());
    if (result !== false) {
      setConfirmOpen(false);
    }
  };

  const autoRenewalOffNotice = (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-950/30">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Auto-renewal is off
          </p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300/90">
            Your subscription stays active until <strong>{endLabel}</strong>.
            {isApple
              ? isApplePlatform()
                ? " Manage or re-enable renewal in Apple Subscriptions."
                : " Manage or re-enable renewal on your iPhone, iPad, or Mac (Settings → Subscriptions)."
              : " You will not be charged again unless you turn renewal back on."}
          </p>
        </div>
      </div>
    </div>
  );

  if (isApple && manageable) {
    if (subscription.cancelAtPeriodEnd) {
      return (
        <div className="space-y-3">
          {autoRenewalOffNotice}
          <AppleIapSubscriptionsCta />
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">
          App Store subscription
        </p>
        <p className="text-xs text-muted-foreground">
          KeenVPN subscriptions purchased through Apple must be cancelled in
          Apple&apos;s subscription settings. The website cannot turn off
          App Store auto-renewal.
        </p>
        <AppleIapSubscriptionsCta />
      </div>
    );
  }

  if (subscription.cancelAtPeriodEnd && manageable && isStripe) {
    return (
      <div className="space-y-3">
        {autoRenewalOffNotice}
        {showManageBilling && onManageBilling ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void onManageBilling()}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening billing…
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        ) : null}
      </div>
    );
  }

  if (canCancelStripe && showCancelButton) {
    return (
      <div className="space-y-3">
        {showManageBilling && onManageBilling ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void onManageBilling()}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening billing…
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        ) : null}
        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!cancelling) {
              setConfirmOpen(open);
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full rounded-[8px] bg-[#d14343] text-white hover:bg-[#d14343]/90"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Turn off auto-renewal
            </Button>
          </AlertDialogTrigger>
          {/* Branded light surface — matches dashboard / new marketing UI */}
          <AlertDialogContent className="dashboard-surface gap-5 border-[#e3e8f0] bg-white p-6 text-[#0f2040] shadow-[0px_16px_40px_rgba(15,32,64,0.16)] sm:rounded-[16px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-[18px] font-semibold text-[#0f2040]">
                <AlertTriangle className="mr-2 h-5 w-5 shrink-0 text-[#ed7d36]" />
                Cancel subscription?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-left text-[14px] leading-relaxed text-[#43516a]">
                  <p>
                    This turns off auto-renewal for your KeenVPN subscription.
                    You keep access until the end of your current period.
                  </p>
                  <p className="font-semibold text-[#0f2040]">What happens:</p>
                  <ul className="list-inside list-disc space-y-1 text-[#43516a]">
                    <li>
                      Access continues until{" "}
                      <strong className="font-semibold text-[#0f2040]">
                        {endLabel}
                      </strong>
                    </li>
                    <li>You will not be charged again</li>
                    <li>
                      To subscribe again later, use the website or KeenVPN app
                    </li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
              <AlertDialogCancel
                disabled={cancelling}
                className="mt-0 h-9 rounded-[8px] border-[#dbe2ec] bg-white text-[13px] font-semibold text-[#0f2040] hover:bg-[#f5f7fb] hover:text-[#0f2040]"
              >
                Keep subscription
              </AlertDialogCancel>
              <Button
                type="button"
                disabled={cancelling}
                onClick={() => void handleConfirmCancel()}
                className="h-9 rounded-[8px] bg-[#d14343] text-[13px] font-semibold text-white hover:bg-[#d14343]/90"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  "Yes, cancel at period end"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
