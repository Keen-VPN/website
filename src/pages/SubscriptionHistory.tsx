import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  RefreshCw,
  ChevronRight,
  History,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContextNew";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionHistory } from "@/hooks/useSubscriptionHistory";
import {
  formatEventDate,
  formatCurrency,
  getEventTypeLabel,
  getStatusInfo,
  getProviderInfo,
  type SubscriptionEvent,
} from "@/lib/subscription-history-api";
import { SubscriptionHistoryFilters } from "@/components/SubscriptionHistoryFilters";
import { SubscriptionEventDetail } from "@/components/SubscriptionEventDetail";
import { SubscriptionHistoryEmptyState } from "@/components/SubscriptionHistoryEmptyState";
import { SubscriptionHistoryErrorState } from "@/components/SubscriptionHistoryErrorState";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SubscriptionHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<SubscriptionEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  
  const {
    events,
    pagination,
    loading,
    error,
    refetch,
    loadMore,
    setFilters,
    filters
  } = useSubscriptionHistory();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Refreshed",
        description: "Subscription history has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh subscription history",
        variant: "destructive",
      });
    }
  };

  const handleEventClick = (event: SubscriptionEvent) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  const handleLoadMore = async () => {
    if (pagination.hasNextPage && !loading) {
      await loadMore();
    }
  };

  // Loading state for authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 bg-gradient-hero flex items-center justify-center">
          <Card className="max-w-md w-full text-center border-accent/50 shadow-glow">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You need to sign in to view your subscription history
              </p>
              <Button onClick={() => navigate("/signin")} className="w-full">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const hasActiveFilters = filters.provider || filters.dateFrom || filters.dateTo;

  const clearFilters = () => {
    setFilters({ page: 1, limit: filters.limit || 25 });
  };

  // Empty state
  if (!loading && !error && events.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 bg-gradient-hero">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate("/account")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Account
              </Button>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Subscription <span className="text-primary">History</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                View your complete billing and subscription timeline
              </p>
            </div>

            {/* Filters */}
            <SubscriptionHistoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              loading={loading}
            />

            {/* Empty State */}
            <div className="mt-8">
              <SubscriptionHistoryEmptyState
                hasFilters={hasActiveFilters}
                onClearFilters={hasActiveFilters ? clearFilters : undefined}
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 bg-gradient-hero">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate("/account")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Account
              </Button>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Subscription <span className="text-primary">History</span>
              </h1>
            </div>

            {/* Error State */}
            <SubscriptionHistoryErrorState
              error={error}
              onRetry={handleRefresh}
              onGoHome={() => navigate("/")}
              loading={loading}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero" role="main">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <nav aria-label="Breadcrumb">
              <Button
                variant="ghost"
                onClick={() => navigate("/account")}
                className="mb-4"
                aria-label="Go back to account page"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to Account
              </Button>
            </nav>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" id="page-title">
                  Subscription <span className="text-primary">History</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  View your complete billing and subscription timeline
                </p>
              </div>
              <div className="flex gap-2 sm:flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Sync</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <SubscriptionHistoryFilters
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <Card className="border-accent/50 shadow-glow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <History className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Events</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{pagination.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-accent/50 shadow-glow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Active Subscriptions</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {events.filter(e => e.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-accent/50 shadow-glow sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">This Month</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {events.filter(e => {
                        const eventDate = new Date(e.eventDate);
                        const now = new Date();
                        return eventDate.getMonth() === now.getMonth() && 
                               eventDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events Table */}
          <Card className="border-accent/50 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Billing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && events.length === 0 ? (
                // Loading skeleton
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[80px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event) => {
                          const dateInfo = formatEventDate(event.eventDate);
                          const statusInfo = getStatusInfo(event.status);
                          const providerInfo = getProviderInfo(event.provider);

                          return (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50"
                          onClick={() => handleEventClick(event)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleEventClick(event);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${getEventTypeLabel(event.eventType)} on ${formatEventDate(event.eventDate).date}`}
                        >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{dateInfo.date}</p>
                                  <p className="text-sm text-muted-foreground">{dateInfo.time}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {getEventTypeLabel(event.eventType)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={providerInfo.className}>
                                  {providerInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{event.planName}</span>
                              </TableCell>
                              <TableCell>
                                {event.amount ? (
                                  <span className="font-medium">
                                    {formatCurrency(event.amount, event.currency)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusInfo.className}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {events.map((event) => {
                      const dateInfo = formatEventDate(event.eventDate);
                      const statusInfo = getStatusInfo(event.status);
                      const providerInfo = getProviderInfo(event.provider);

                      return (
                        <Card
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50 transition-colors"
                          onClick={() => handleEventClick(event)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleEventClick(event);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${getEventTypeLabel(event.eventType)} on ${formatEventDate(event.eventDate).date}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">
                                  {getEventTypeLabel(event.eventType)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {dateInfo.full}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={providerInfo.className}>
                                {providerInfo.label}
                              </Badge>
                              <Badge className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground mb-1">{event.planName}</p>
                            {event.amount && (
                              <p className="text-sm font-medium text-foreground">
                                {formatCurrency(event.amount, event.currency)}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Load More Button */}
                  {pagination.hasNextPage && (
                    <div className="mt-6 text-center">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="min-w-[120px]"
                        aria-label={loading ? "Loading more events..." : `Load more events (${pagination.total - events.length} remaining)`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" aria-hidden="true"></div>
                            Loading...
                          </>
                        ) : (
                          <>Load More</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Pagination Info */}
                  <div className="mt-4 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                    Showing {events.length} of {pagination.total} events
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card className="mt-8 border-accent/50 shadow-glow">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Have questions about your billing or need assistance with your subscription?
              </p>
              <Button
                variant="outline"
                onClick={() => window.open("mailto:support@vpnkeen.com?subject=Billing Support Request", "_blank")}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      
      {/* Event Detail Modal */}
      <SubscriptionEventDetail
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
      />
    </div>
  );
};

export default SubscriptionHistory;
