import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
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
 * Branded dashboard modal: bottom sheet on mobile (slide-up), centered on desktop.
 * Mobile uses Radix Sheet semantics for a reliable draw-up animation.
 */
export function DashboardSlideDialog({
  open,
  onOpenChange,
  children,
  ariaLabelledBy,
  className,
}: DashboardSlideDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <SheetPrimitive.Content
            aria-labelledby={ariaLabelledBy}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[101] flex w-full min-w-0 flex-col bg-white shadow-2xl outline-none",
              "max-h-[90dvh] rounded-t-[16px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
              "data-[state=closed]:duration-300 data-[state=open]:duration-500",
              className,
            )}
          >
            {children}
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "fixed left-1/2 top-1/2 z-[101] flex w-full min-w-0 -translate-x-1/2 -translate-y-1/2 flex-col bg-white shadow-2xl outline-none",
            "max-h-[min(92dvh,900px)] max-w-[606px] rounded-[16px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:duration-200 data-[state=open]:duration-200",
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
