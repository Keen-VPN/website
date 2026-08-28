import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { SubscriptionData } from "@/auth/types";
import {
  canCancelStripeOnWebsite,
  hasManageableSubscription,
  isStripeSubscription,
} from "@/lib/subscription-cta";
import { formatSubscriptionEndDate } from "@/lib/format-subscription-date";

interface SubscriptionAutoRenewSwitchProps {
  subscription: SubscriptionData;
  cancelling: boolean;
  portalLoading?: boolean;
  onCancel: () => boolean | undefined | Promise<boolean | undefined>;
  onManageBilling?: () => void | Promise<void>;
}

export function SubscriptionAutoRenewSwitch({
  subscription,
  cancelling,
  portalLoading = false,
  onCancel,
  onManageBilling,
}: SubscriptionAutoRenewSwitchProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const autoRenewOn = !subscription.cancelAtPeriodEnd;
  const canTurnOff = canCancelStripeOnWebsite(subscription);
  const canShowSwitch =
    isStripeSubscription(subscription) &&
    subscription.canManageBilling === true &&
    hasManageableSubscription(subscription);
  const endLabel = formatSubscriptionEndDate(subscription.endDate);

  if (!canShowSwitch) {
    return null;
  }

  const handleCheckedChange = (checked: boolean) => {
    if (checked) {
      if (!autoRenewOn && onManageBilling) {
        void onManageBilling();
      }
      return;
    }
    if (autoRenewOn && canTurnOff) {
      setConfirmOpen(true);
    }
  };

  const handleConfirmCancel = async () => {
    const result = await Promise.resolve(onCancel());
    if (result !== false) {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Switch
        checked={autoRenewOn}
        onCheckedChange={handleCheckedChange}
        disabled={
          cancelling ||
          portalLoading ||
          (!autoRenewOn && !onManageBilling)
        }
        aria-label="Auto-renew subscription"
        className="h-[22px] w-[40px] shrink-0 border-0 data-[state=checked]:bg-[#159653] data-[state=unchecked]:bg-[#dbe2ec] [&>span]:h-[18px] [&>span]:w-[18px] [&>span]:bg-white [&>span]:shadow-none [&>span]:data-[state=checked]:translate-x-[18px] [&>span]:data-[state=unchecked]:translate-x-0"
      />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!cancelling) {
            setConfirmOpen(open);
          }
        }}
      >
        <AlertDialogContent className="dashboard-surface gap-5 border-[#e3e8f0] bg-white p-6 text-[#0f2040] shadow-[0px_16px_40px_rgba(15,32,64,0.16)] sm:rounded-[16px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-[18px] font-semibold text-[#0f2040]">
              <AlertTriangle className="mr-2 h-5 w-5 shrink-0 text-[#ed7d36]" />
              Turn off auto-renewal?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-[14px] leading-relaxed text-[#43516a]">
                <p>
                  Your KeenVPN access continues until{" "}
                  <strong className="font-semibold text-[#0f2040]">
                    {endLabel}
                  </strong>
                  . You will not be charged again unless you turn auto-renewal
                  back on.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel
              disabled={cancelling}
              className="mt-0 h-9 rounded-[8px] border-[#dbe2ec] bg-white text-[13px] font-semibold text-[#0f2040] hover:bg-[#f5f7fb] hover:text-[#0f2040]"
            >
              Keep auto-renewal on
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
                  Turning off…
                </>
              ) : (
                "Turn off auto-renewal"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
