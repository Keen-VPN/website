import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History, CreditCard, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubscriptionHistoryEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function SubscriptionHistoryEmptyState({
  hasFilters = false,
  onClearFilters
}: SubscriptionHistoryEmptyStateProps) {
  const navigate = useNavigate();

  if (hasFilters) {
    return (
      <Card className="border-accent/50 shadow-glow text-center py-12">
        <CardContent>
          <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No events found
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            No subscription events match your current filters. Try adjusting your search criteria or clearing filters to see all events.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onClearFilters && (
              <Button variant="outline" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
            <Button onClick={() => navigate("/subscribe")}>
              Subscribe Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/50 shadow-glow text-center py-16">
      <CardContent>
        <div className="max-w-md mx-auto">
          {/* Icon */}
          <div className="relative mb-6">
            <History className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <div className="absolute -top-2 -right-2 bg-primary/10 rounded-full p-2">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-bold text-foreground mb-3">
            No subscription activity yet
          </h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Once you subscribe to KeenVPN, your complete billing history and subscription events will appear here. You'll be able to track purchases, renewals, and manage your subscription.
          </p>

          {/* Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Timeline View</p>
                <p className="text-xs text-muted-foreground">See all events chronologically</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Billing Details</p>
                <p className="text-xs text-muted-foreground">Download receipts & invoices</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={() => navigate("/subscribe")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
            size="lg"
          >
            Get Started with KeenVPN
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
