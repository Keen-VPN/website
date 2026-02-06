import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchSubscriptionHistory,
  clearSubscriptionHistoryCache,
  type SubscriptionEvent,
  type PaginationInfo,
  type HistoryFilters
} from '@/lib/subscription-history-api';

interface UseSubscriptionHistoryResult {
  events: SubscriptionEvent[];
  pagination: PaginationInfo;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: HistoryFilters) => void;
  filters: HistoryFilters;
}

export function useSubscriptionHistory(
  initialFilters: HistoryFilters = {}
): UseSubscriptionHistoryResult {
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<HistoryFilters>({
    page: 1,
    limit: 25,
    ...initialFilters
  });

  // Performance optimizations
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<string>('');
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (newFilters?: HistoryFilters, append = false) => {
    const currentFilters = newFilters || filters;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Debounce rapid requests
    const requestKey = JSON.stringify(currentFilters);
    if (requestKey === lastFetchRef.current && !append) {
      return; // Duplicate request, skip
    }
    lastFetchRef.current = requestKey;
    
    if (!append) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchSubscriptionHistory(currentFilters);
      
      if (response.success) {
        if (append) {
          // For pagination - append new events
          setEvents(prev => [...prev, ...response.data.events]);
        } else {
          // For new search/filter - replace events
          setEvents(response.data.events);
        }
        setPagination(response.data.pagination);
      } else {
        setError(response.error || 'Failed to fetch subscription history');
        if (!append) {
          setEvents([]);
          setPagination({
            page: 1,
            limit: 25,
            total: 0,
            hasNextPage: false,
            hasPreviousPage: false
          });
        }
      }
    } catch (err) {
      // Don't set error if request was aborted (user navigated away or new request started)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (!append) {
        setEvents([]);
        setPagination({
          page: 1,
          limit: 25,
          total: 0,
          hasNextPage: false,
          hasPreviousPage: false
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [filters]);

  const refetch = useCallback(async () => {
    await fetchData(filters, false);
  }, [fetchData, filters]);

  const loadMore = useCallback(async () => {
    if (!pagination.hasNextPage || loading) {
      return;
    }

    const nextPageFilters = {
      ...filters,
      page: pagination.page + 1
    };

    await fetchData(nextPageFilters, true);
  }, [fetchData, filters, pagination.hasNextPage, pagination.page, loading]);

  const setFilters = useCallback((newFilters: HistoryFilters) => {
    const updatedFilters = {
      ...newFilters,
      page: 1 // Reset to first page when filters change
    };
    setFiltersState(updatedFilters);
    
    // Clear retry timeout when filters change
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    fetchData(updatedFilters, false);
  }, [fetchData]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    events,
    pagination,
    loading,
    error,
    refetch,
    loadMore,
    setFilters,
    filters
  };
}
