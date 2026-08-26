import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
 * Branded dashboard modal: bottom sheet on mobile, centered dialog on desktop.
 * Uses one Radix dialog + CSS breakpoints so layout never flips after hydration.
 */
export function DashboardSlideDialog({
  open,
  onOpenChange,
  children,
  ariaLabelledBy,
  className,
}: DashboardSlideDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[200] bg-black/40",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "fixed z-[201] flex w-full min-w-0 max-w-none flex-col bg-white shadow-2xl outline-none",
            "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[16px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:duration-300 data-[state=open]:duration-500",
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[min(92dvh,900px)] md:w-full md:max-w-[606px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[16px]",
            "md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0",
            "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
            "md:data-[state=closed]:duration-200 md:data-[state=open]:duration-200",
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
