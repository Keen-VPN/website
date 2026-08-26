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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Branded dashboard modal without Radix scroll-lock (avoids broken body
 * margin-right on mobile). Implements focus trap + restore manually.
 *
 * Focus lifecycle depends only on `open` so parent re-renders (e.g. typing in
 * AuthEmailCard) do not steal focus mid-keystroke.
 */
export function DashboardSlideDialog({
  open,
  onOpenChange,
  children,
  ariaLabelledBy,
  className,
}: DashboardSlideDialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const onOpenChangeRef = React.useRef(onOpenChange);

  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitial = () => {
      const root = contentRef.current;
      if (!root) return;
      // Prefer an editable field (e.g. new email) over Close / Cancel buttons.
      const preferred =
        root.querySelector<HTMLElement>(
          'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])',
        ) ??
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[0] ??
        root;
      preferred.focus();
    };
    const focusTimer = window.setTimeout(focusInitial, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }
      if (event.key !== "Tab") return;

      const root = contentRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChangeRef.current(false)}
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
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
