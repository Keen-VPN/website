import { useRef, useState } from "react";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const PRICE_CHANGE_NOTICE_COPY =
  "Prices may change in the future, but we will always notify you by email before any changes take effect.";

interface PricingNoticeTooltipProps {
  copy?: string;
  className?: string;
}

const PricingNoticeTooltip = ({
  copy = PRICE_CHANGE_NOTICE_COPY,
  className,
}: PricingNoticeTooltipProps) => {
  const [open, setOpen] = useState(false);
  const pointerTriggeredFocusRef = useRef(false);
  const hoverOpenRef = useRef(false);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Pricing change notice"
            aria-expanded={open}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              className,
            )}
            onClick={(event) => {
              event.preventDefault();
              if (!hoverOpenRef.current) {
                setOpen((current) => !current);
              }
            }}
            onPointerDown={() => {
              pointerTriggeredFocusRef.current = true;
              window.setTimeout(() => {
                pointerTriggeredFocusRef.current = false;
              }, 0);
            }}
            onMouseEnter={() => {
              hoverOpenRef.current = true;
              setOpen(true);
            }}
            onMouseLeave={() => {
              hoverOpenRef.current = false;
              setOpen(false);
            }}
            onFocus={() => {
              if (!pointerTriggeredFocusRef.current) {
                setOpen(true);
              }
            }}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={8}
          collisionPadding={16}
          className="max-w-[min(20rem,calc(100vw-2rem))] px-4 py-3 text-left leading-relaxed"
        >
          {copy}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PricingNoticeTooltip;
