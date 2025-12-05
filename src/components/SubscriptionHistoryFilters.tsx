import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { HistoryFilters } from "@/lib/subscription-history-api";

interface SubscriptionHistoryFiltersProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  loading?: boolean;
}

export function SubscriptionHistoryFilters({
  filters,
  onFiltersChange,
  loading = false
}: SubscriptionHistoryFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const handleProviderChange = (provider: string) => {
    const newFilters = { ...filters };
    if (provider === "all") {
      delete newFilters.provider;
    } else {
      newFilters.provider = provider as "stripe" | "apple_iap";
    }
    onFiltersChange(newFilters);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    const newFilters = { ...filters };
    if (date) {
      newFilters.dateFrom = date.toISOString();
    } else {
      delete newFilters.dateFrom;
    }
    onFiltersChange(newFilters);
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    const newFilters = { ...filters };
    if (date) {
      // Set to end of day
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      newFilters.dateTo = endOfDay.toISOString();
    } else {
      delete newFilters.dateTo;
    }
    onFiltersChange(newFilters);
    setDateToOpen(false);
  };

  const handleLimitChange = (limit: string) => {
    const newFilters = { ...filters, limit: parseInt(limit), page: 1 };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({ page: 1, limit: filters.limit || 25 });
  };

  const hasActiveFilters = filters.provider || filters.dateFrom || filters.dateTo;
  const activeFilterCount = [filters.provider, filters.dateFrom, filters.dateTo].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
          disabled={loading}
          aria-expanded={isOpen}
          aria-controls="filter-panel"
          aria-label={`${isOpen ? 'Hide' : 'Show'} filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        >
          <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              aria-label={`${activeFilterCount} active filters`}
            >
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="border-accent/50" id="filter-panel" role="region" aria-label="Filter controls">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Provider Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Provider</label>
                <Select
                  value={filters.provider || "all"}
                  onValueChange={handleProviderChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="apple_iap">App Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">From Date</label>
                <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateFrom && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? (
                        format(new Date(filters.dateFrom), "MMM d, yyyy")
                      ) : (
                        "Select date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                      onSelect={handleDateFromChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">To Date</label>
                <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateTo && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? (
                        format(new Date(filters.dateTo), "MMM d, yyyy")
                      ) : (
                        "Select date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                      onSelect={handleDateToChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Items Per Page */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Items per page</label>
                <Select
                  value={(filters.limit || 25).toString()}
                  onValueChange={handleLimitChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-foreground">Active filters:</span>
                  {filters.provider && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Provider: {filters.provider === "stripe" ? "Stripe" : "App Store"}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleProviderChange("all")}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {filters.dateFrom && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      From: {format(new Date(filters.dateFrom), "MMM d, yyyy")}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleDateFromChange(undefined)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      To: {format(new Date(filters.dateTo), "MMM d, yyyy")}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleDateToChange(undefined)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
