import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import {
  armBusinessInviteNoticeReleaseOnUnmount,
  clearBusinessInviteAutoAcceptedNotice,
  peekBusinessInviteAutoAcceptedNotice,
  type BusinessInviteAutoAcceptedNotice,
} from "@/auth/business-invite-auto-accepted";
import { formatScheduledAnnualBillingDate } from "@/lib/scheduled-annual-billing";

function noticeBody(notice: BusinessInviteAutoAcceptedNotice): string {
  const plan =
    notice.planName?.trim() || "your company's KeenVPN Business plan";
  if (notice.pending) {
    const until = notice.billingDeferredUntil
      ? formatScheduledAnnualBillingDate(notice.billingDeferredUntil)
      : null;
    return until
      ? `You've joined ${plan}. Company billing starts after your current plan ends on ${until}.`
      : `You've joined ${plan}. Company billing starts after your current plan ends.`;
  }
  return `You've been added to ${plan}. Your company covers VPN access on this account.`;
}

export function BusinessInviteAutoAcceptedBanner() {
  // Read only during init — do not mutate sessionStorage in render.
  const [notice, setNotice] = useState<BusinessInviteAutoAcceptedNotice | null>(
    () => peekBusinessInviteAutoAcceptedNotice(),
  );

  useEffect(() => {
    // Consume once: durable storage cleared now; active display lock released
    // on unmount via a timer that is never cancelled (ordinary remounts after
    // it fires do not re-show; Strict Mode remount peeks before it fires).
    return armBusinessInviteNoticeReleaseOnUnmount();
  }, []);

  if (!notice) return null;

  return (
    <div
      role="status"
      className="mx-4 mb-4 overflow-hidden rounded-[13px] bg-[#eef8f2] px-4 py-4 sm:mx-6 sm:px-5 lg:mx-7"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#159653]/15">
          <CheckCircle2 className="h-4 w-4 text-[#159653]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#0f2040]">
                You&apos;re on the company plan
              </h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#43516a]">
                {noticeBody(notice)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#627086] hover:bg-white/70 hover:text-[#0f2040]"
              onClick={() => {
                clearBusinessInviteAutoAcceptedNotice();
                setNotice(null);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
