import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { APPLE_SUBSCRIPTIONS_MANAGE_URL } from "@/constants/apple-subscriptions";
import { isApplePlatform } from "@/lib/device-detection";
import { cn } from "@/lib/utils";

interface AppleIapSubscriptionsCtaProps {
  label?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
  buttonClassName?: string;
}

/**
 * Apple IAP subscribers: open Apple's subscription page on iOS/macOS;
 * on other platforms, show Settings / App Store steps (web cannot manage IAP).
 */
export function AppleIapSubscriptionsCta({
  label = "Open Apple Subscriptions",
  variant = "outline",
  className,
  buttonClassName,
}: AppleIapSubscriptionsCtaProps) {
  if (isApplePlatform()) {
    return (
      <Button
        asChild
        variant={variant}
        className={cn("w-full", buttonClassName, className)}
      >
        <a
          href={APPLE_SUBSCRIPTIONS_MANAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {label}
        </a>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-border bg-muted/40 p-4",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">
        Manage on an iPhone, iPad, or Mac
      </p>
      <p className="text-xs text-muted-foreground">
        App Store subscriptions cannot be changed from this browser. Use one of
        your Apple devices:
      </p>
      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
        <li>
          <strong>iPhone / iPad:</strong> Settings → [your name] → Subscriptions
          → KeenVPN
        </li>
        <li>
          <strong>Mac:</strong> App Store → [your name] → Account Settings →
          Subscriptions → KeenVPN
        </li>
      </ul>
    </div>
  );
}
