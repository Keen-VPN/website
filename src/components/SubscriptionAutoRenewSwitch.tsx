import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Loader2 } from "lucide-react";
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

interface SubscriptionAutoRenewSwitchProps {
  subscription: SubscriptionData;
  cancelling: boolean;
  portalLoading?: boolean;
  onCancel: () => void | Promise<void>;
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
  const endLabel = formatDate(subscription.endDate);

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

  return (
    <>
      <Switch
        checked={autoRenewOn}
        onCheckedChange={handleCheckedChange}
        disabled={cancelling || portalLoading}
        aria-label="Auto-renew subscription"
        className="mt-1 data-[state=checked]:bg-[#159653] data-[state=unchecked]:bg-[#dbe2ec]"
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="gap-5 border-[#e3e8f0] bg-white p-6 text-[#0f2040] shadow-[0px_16px_40px_rgba(15,32,64,0.16)] sm:rounded-[16px]">
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
            <AlertDialogCancel className="mt-0 h-9 rounded-[8px] border-[#dbe2ec] bg-white text-[13px] font-semibold text-[#0f2040] hover:bg-[#f5f7fb] hover:text-[#0f2040]">
              Keep auto-renewal on
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void onCancel();
              }}
              disabled={cancelling}
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
