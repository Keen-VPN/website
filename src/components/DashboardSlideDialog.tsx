import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DashboardSlideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Optional aria-labelledby target inside the dialog. */
  ariaLabelledBy?: string;
  className?: string;
}

/**
 * Branded dashboard modal without Radix scroll-lock.
 * Radix body[data-scroll-locked] can apply a bogus margin-right and break
 * mobile layout; this portal uses a simple overflow lock instead.
 */
export function DashboardSlideDialog({
  open,
  onOpenChange,
  children,
  ariaLabelledBy,
  className,
}: DashboardSlideDialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[201] flex max-h-[90dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-[16px] bg-white shadow-2xl outline-none",
          "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[min(92dvh,900px)] md:w-full md:max-w-[606px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[16px]",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
