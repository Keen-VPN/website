import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Download,
  Mail,
  Copy,
  Check,
  AlertCircle,
  CreditCard,
  Calendar,
  Building,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import {
  fetchSubscriptionEventDetail,
  formatEventDate,
  formatCurrency,
  getEventTypeLabel,
  getStatusInfo,
  getProviderInfo,
  type SubscriptionEvent,
  type SubscriptionEventDetail,
} from "@/lib/subscription-history-api";

interface SubscriptionEventDetailProps {
  event: SubscriptionEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionEventDetail({
  event,
  open,
  onOpenChange,
}: SubscriptionEventDetailProps) {
  const [eventDetail, setEventDetail] = useState<SubscriptionEventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useMobile();

  useEffect(() => {
    if (event && open) {
      fetchEventDetail();
    }
  }, [event, open]);

  const fetchEventDetail = async () => {
    if (!event) return;

    setLoading(true);
    setError(null);
    setEventDetail(null);

    try {
      const response = await fetchSubscriptionEventDetail(event.id);
      
      if (response.success) {
        setEventDetail(response.data.event);
      } else {
        setError(response.error || "Failed to load event details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: `${fieldName} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = () => {
    if (eventDetail?.providerActions.manageSubscription) {
      window.open(eventDetail.providerActions.manageSubscription, "_blank");
    }
  };

  const handleAppStoreManage = () => {
    // Open App Store subscription management
    const appStoreUrl = "https://apps.apple.com/account/subscriptions";
    window.open(appStoreUrl, "_blank");
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Support Request - Event ${event?.id || 'Unknown'}`);
    const body = encodeURIComponent(`Hello KeenVPN Support Team,

I need assistance with my subscription event:

Event ID: ${event?.id || 'Unknown'}
Event Type: ${event ? getEventTypeLabel(event.eventType) : 'Unknown'}
Date: ${event ? formatEventDate(event.eventDate).full : 'Unknown'}

Please describe your issue:
[Your message here]

Thank you!`);
    
    window.open(`mailto:support@vpnkeen.com?subject=${subject}&body=${body}`, "_blank");
  };

  const redactTransactionId = (id: string): string => {
    if (!id || id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  const redactCardInfo = (brand: string, last4: string): string => {
    if (!brand || !last4) return "Card information unavailable";
    return `${brand} •••• ${last4}`;
  };

  const redactCustomerId = (id: string): string => {
    if (!id || id.length <= 8) return id;
    return `${id.slice(0, 3)}...${id.slice(-3)}`;
  };

  const sanitizeForDisplay = (text: string): string => {
    // Remove any potential sensitive patterns
    return text
      .replace(/\b\d{13,19}\b/g, '••••••••••••••••') // Credit card numbers
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '•••-••-••••') // SSN patterns
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (email) => {
        // Only redact if it's not the user's own email or support email
        if (email.includes('vpnkeen.com') || email.includes('support@')) {
          return email;
        }
        const [local, domain] = email.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
      });
  };

  if (!event) return null;

  const dateInfo = formatEventDate(event.eventDate);
  const statusInfo = getStatusInfo(event.status);
  const providerInfo = getProviderInfo(event.provider);

  const Content = () => (
    <div className="space-y-6">
      {/* Event Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {getEventTypeLabel(event.eventType)}
            </h3>
            <p className="text-sm text-muted-foreground">{dateInfo.full}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={providerInfo.className}>
              {providerInfo.label}
            </Badge>
            <Badge className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        
        <p className="text-foreground">{event.description}</p>
      </div>

      <Separator />

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Event Details */}
      {eventDetail && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">{event.planName}</p>
              </div>
              {event.amount && (
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(event.amount, event.currency)}</p>
                </div>
              )}
              {event.periodStart && (
                <div>
                  <p className="text-sm text-muted-foreground">Period Start</p>
                  <p className="font-medium">{formatEventDate(event.periodStart).date}</p>
                </div>
              )}
              {event.periodEnd && (
                <div>
                  <p className="text-sm text-muted-foreground">Period End</p>
                  <p className="font-medium">{formatEventDate(event.periodEnd).date}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Provider-Specific Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Provider Information
            </h4>
            
            {event.provider === 'stripe' && eventDetail.additionalDetails.stripeSubscriptionId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Subscription ID</p>
                    <p className="font-mono text-sm">
                      {redactTransactionId(eventDetail.additionalDetails.stripeSubscriptionId)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      eventDetail.additionalDetails.stripeSubscriptionId!,
                      "Subscription ID"
                    )}
                    aria-label={copiedField === "Subscription ID" ? "Copied to clipboard" : "Copy subscription ID to clipboard"}
                  >
                    {copiedField === "Subscription ID" ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                
                {eventDetail.additionalDetails.cancelAtPeriodEnd !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-Renewal</p>
                    <p className="font-medium">
                      {eventDetail.additionalDetails.cancelAtPeriodEnd ? "Cancelled" : "Active"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {event.provider === 'apple_iap' && eventDetail.additionalDetails.transactionId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">
                      {redactTransactionId(eventDetail.additionalDetails.transactionId)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      eventDetail.additionalDetails.transactionId!,
                      "Transaction ID"
                    )}
                    aria-label={copiedField === "Transaction ID" ? "Copied to clipboard" : "Copy transaction ID to clipboard"}
                  >
                    {copiedField === "Transaction ID" ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                
                {eventDetail.additionalDetails.environment && (
                  <div>
                    <p className="text-sm text-muted-foreground">Environment</p>
                    <p className="font-medium">{eventDetail.additionalDetails.environment}</p>
                  </div>
                )}
                
                {eventDetail.additionalDetails.productId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Product ID</p>
                    <p className="font-mono text-sm">{eventDetail.additionalDetails.productId}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Actions</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Provider Management */}
              {eventDetail.providerActions.manageSubscription && (
                <Button onClick={handleManageSubscription} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Billing Portal
                </Button>
              )}
              
              {eventDetail.providerActions.appStoreManage && (
                <Button onClick={handleAppStoreManage} className="flex-1">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Manage in App Store
                </Button>
              )}

              {/* Support Contact */}
              <Button variant="outline" onClick={handleContactSupport} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>

          {/* Download Receipt/Invoice */}
          {event.provider === 'stripe' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Receipt & Invoice
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Download your receipt or view detailed invoice information through the Stripe billing portal.
                  </p>
                  <Button variant="outline" onClick={handleManageSubscription}>
                    <Download className="h-4 w-4 mr-2" />
                    View Invoice
                  </Button>
                </div>
              </div>
            </>
          )}

          {event.provider === 'apple_iap' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Receipt Information
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Apple controls receipt distribution for App Store purchases. You can view your purchase history and download receipts through your Apple ID account.
                  </p>
                  <Button variant="outline" onClick={handleAppStoreManage}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Apple Receipts
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Event Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto">
            <Content />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}
