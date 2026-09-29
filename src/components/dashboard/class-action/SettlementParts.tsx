import { useState, type ReactNode } from "react";
import type { SettlementStatus } from "@/auth/backend";
import {
  settlementInitials,
  settlementStatusLabel,
} from "@/lib/class-action-settlements";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<SettlementStatus, string> = {
  open: "bg-[#e6f9f0] text-[#137a45]",
  closing_soon: "bg-[#fff4eb] text-[#b24a14]",
  closed: "bg-[#f0f3f8] text-[#627086]",
};

export function SettlementStatusPill({ status }: { status: SettlementStatus | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
        STATUS_STYLES[status ?? "open"],
      )}
    >
      {settlementStatusLabel(status)}
    </span>
  );
}

const LOGO_SIZES = {
  md: "h-12 w-12 rounded-[12px] text-[16px]",
  lg: "h-14 w-14 rounded-[14px] text-[18px]",
} as const;

/**
 * Fixed-size square logo. Shows the admin-set image when it loads, otherwise
 * two-letter initials from the partner name (or title).
 */
export function SettlementLogo({
  imageUrl,
  partnerName,
  title,
  size = "md",
}: {
  imageUrl: string | null;
  partnerName: string | null;
  title: string;
  size?: keyof typeof LOGO_SIZES;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-[#e7edf5] font-bold tracking-[0.5px]",
        LOGO_SIZES[size],
        showImage ? "bg-white p-1.5" : "bg-[#0f2040] text-white",
      )}
    >
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        settlementInitials(partnerName, title)
      )}
    </div>
  );
}

export function SettlementPartnerLine({
  partnerName,
  status,
}: {
  partnerName: string | null;
  status: SettlementStatus | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {partnerName ? (
        <span className="text-[14px] font-medium text-[#627086]">{partnerName}</span>
      ) : null}
      <SettlementStatusPill status={status} />
    </div>
  );
}

export function SettlementCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-[#e7edf5] bg-white p-5 shadow-[0_2px_8px_rgba(15,32,64,0.04)] sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function EyebrowLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#627086]">
      {children}
    </p>
  );
}

const HOW_IT_WORKS = [
  {
    title: "We find settlements",
    body: "We review settlement administrator notices and list the ones open to the general public.",
  },
  {
    title: "You check the details",
    body: "Every listing shows the payment, deadline, and what you need before you start a claim.",
  },
  {
    title: "You file directly",
    body: "Claims go to the official administrator. KeenVPN never takes a cut of a payout.",
  },
] as const;

export function HowThisPageWorks() {
  return (
    <SettlementCard>
      <h2 className="text-[16px] font-semibold text-[#0f2040]">How this page works</h2>
      <ol className="mt-5 grid gap-5 md:grid-cols-3 md:gap-0">
        {HOW_IT_WORKS.map(({ title, body }, index) => (
          <li
            key={title}
            className="flex gap-3.5 md:flex-col md:gap-3 md:border-l md:border-[#e7edf5] md:px-6 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f2040] text-[14px] font-bold text-white"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#0f2040]">{title}</p>
              <p className="mt-1 text-[14px] leading-[1.6] text-[#627086]">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </SettlementCard>
  );
}
