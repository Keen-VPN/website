import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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
function formatDate(dateString: string | undefined): string {
  if (!dateString) return "the end of your billing period";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface SubscriptionCancellationControlsProps {
  subscription: SubscriptionData;
  cancelling: boolean;
  onCancel: () => void | Promise<void>;
  onManageBilling?: () => void | Promise<void>;
  portalLoading?: boolean;
  showManageBilling?: boolean;
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
}: SubscriptionCancellationControlsProps) {
  const isStripe = isStripeSubscription(subscription);
  const canCancelStripe = canCancelStripeOnWebsite(subscription);
  const isApple = subscription.subscriptionType === "apple_iap";
  const manageable = hasManageableSubscription(subscription);
  const endLabel = formatDate(subscription.endDate);

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
                Opening Stripe billing…
              </>
            ) : (
              "Manage billing in Stripe"
            )}
          </Button>
        ) : null}
      </div>
    );
  }

  if (canCancelStripe) {
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
                Opening Stripe billing…
              </>
            ) : (
              "Manage billing in Stripe"
            )}
          </Button>
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Stripe subscription
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                Cancel subscription?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    This turns off auto-renewal for your KeenVPN subscription
                    billed through Stripe. You keep access until the end of your
                    current period.
                  </p>
                  <p className="font-medium text-foreground">What happens:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>
                      Access continues until{" "}
                      <strong>{endLabel}</strong>
                    </li>
                    <li>You will not be charged again</li>
                    <li>
                      To subscribe again later, use the website or KeenVPN app
                    </li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep subscription</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void onCancel()}
                disabled={cancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  "Yes, cancel at period end"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
