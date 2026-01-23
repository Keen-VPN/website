import { getSessionToken } from '@/auth';

// Types based on the API documentation
export interface SubscriptionEvent {
  id: string;
  eventDate: string;
  eventType: 'purchase' | 'renewal' | 'cancellation' | 'plan_change' | 'trial_start' | 'trial_end';
  provider: 'stripe' | 'apple_iap';
  planName: string;
  amount?: number;
  currency: string;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  periodStart?: string;
  periodEnd?: string;
  description: string;
}

export interface SubscriptionEventDetail extends SubscriptionEvent {
  providerActions: {
    manageSubscription?: string;
    appStoreManage?: boolean;
  };
  additionalDetails: {
    // Stripe specific
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    // Apple IAP specific
    transactionId?: string;
    originalTransactionId?: string;
    environment?: string;
    productId?: string;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SubscriptionHistoryResponse {
  success: boolean;
  data: {
    events: SubscriptionEvent[];
    pagination: PaginationInfo;
  };
  error?: string;
}

export interface SubscriptionEventDetailResponse {
  success: boolean;
  data: {
    event: SubscriptionEventDetail;
  };
  error?: string;
}

export interface HistoryFilters {
  page?: number;
  limit?: number;
  provider?: 'stripe' | 'apple_iap';
  dateFrom?: string;
  dateTo?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://vpnkeen.netlify.app/api';

// Simple in-memory cache for ETag support
interface CacheEntry {
  data: SubscriptionHistoryResponse;
  etag: string;
  timestamp: number;
}

class SubscriptionHistoryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly MAX_AGE = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 50; // Limit memory usage
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Cleanup every minute
  }

  private getCacheKey(filters: HistoryFilters): string {
    // Create a stable key by sorting object properties
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key as keyof HistoryFilters];
        return result;
      }, {} as HistoryFilters);
    return JSON.stringify(sortedFilters);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.MAX_AGE) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // If still too many entries, remove oldest ones
    if (this.cache.size > this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_ENTRIES);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  get(filters: HistoryFilters): CacheEntry | null {
    const key = this.getCacheKey(filters);
    const entry = this.cache.get(key);
    
    if (entry && Date.now() - entry.timestamp < this.MAX_AGE) {
      // Move to end (LRU behavior)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }

  set(filters: HistoryFilters, data: SubscriptionHistoryResponse, etag: string): void {
    const key = this.getCacheKey(filters);
    
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      etag,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

const cache = new SubscriptionHistoryCache();

/**
 * Sanitize and validate filter inputs for security
 */
function sanitizeFilters(filters: HistoryFilters): HistoryFilters {
  const sanitized: HistoryFilters = {};
  
  // Validate and sanitize page
  if (filters.page !== undefined) {
    const page = Math.max(1, Math.floor(Number(filters.page) || 1));
    if (page <= 1000) { // Reasonable upper limit
      sanitized.page = page;
    } else {
      sanitized.page = 1;
    }
  }
  
  // Validate and sanitize limit
  if (filters.limit !== undefined) {
    const limit = Math.max(1, Math.min(100, Math.floor(Number(filters.limit) || 25)));
    sanitized.limit = limit;
  }
  
  // Validate provider
  if (filters.provider && ['stripe', 'apple_iap'].includes(filters.provider)) {
    sanitized.provider = filters.provider;
  }
  
  // Validate and sanitize dates
  if (filters.dateFrom) {
    try {
      const date = new Date(filters.dateFrom);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= new Date().getFullYear() + 1) {
        sanitized.dateFrom = date.toISOString();
      }
    } catch (error) {
      console.warn('Invalid dateFrom filter:', filters.dateFrom);
    }
  }
  
  if (filters.dateTo) {
    try {
      const date = new Date(filters.dateTo);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= new Date().getFullYear() + 1) {
        sanitized.dateTo = date.toISOString();
      }
    } catch (error) {
      console.warn('Invalid dateTo filter:', filters.dateTo);
    }
  }
  
  return sanitized;
}

/**
 * Redact sensitive information from event data for logging/debugging
 */
function redactSensitiveData(event: SubscriptionEvent): Partial<SubscriptionEvent> {
  return {
    id: event.id.replace(/([a-zA-Z0-9]{4})[a-zA-Z0-9]*([a-zA-Z0-9]{4})/, '$1...$2'),
    eventType: event.eventType,
    provider: event.provider,
    status: event.status,
    eventDate: event.eventDate,
    // Omit potentially sensitive fields like amounts, plan names, etc.
  };
}

/**
 * Fetch subscription history with ETag caching support
 */
export async function fetchSubscriptionHistory(
  filters: HistoryFilters = {}
): Promise<SubscriptionHistoryResponse> {
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      console.warn('⚠️ No session token available for subscription history request');
      return {
        success: false,
        error: 'Authentication required',
        data: { events: [], pagination: { page: 1, limit: 25, total: 0, hasNextPage: false, hasPreviousPage: false } }
      };
    }

    // Validate and sanitize filters
    const sanitizedFilters = sanitizeFilters(filters);

    // Check cache first
    const cachedEntry = cache.get(sanitizedFilters);
    
    // Build query parameters
    const params = new URLSearchParams();
    if (sanitizedFilters.page) params.append('page', sanitizedFilters.page.toString());
    if (sanitizedFilters.limit) params.append('limit', sanitizedFilters.limit.toString());
    if (sanitizedFilters.provider) params.append('provider', sanitizedFilters.provider);
    if (sanitizedFilters.dateFrom) params.append('dateFrom', sanitizedFilters.dateFrom);
    if (sanitizedFilters.dateTo) params.append('dateTo', sanitizedFilters.dateTo);

    const url = `${BACKEND_URL}/subscription/history${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Set up headers
    const headers: HeadersInit = {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    };

    // Add ETag header if we have cached data
    if (cachedEntry) {
      headers['If-None-Match'] = cachedEntry.etag;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    // Handle 304 Not Modified
    if (response.status === 304 && cachedEntry) {
      return cachedEntry.data;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        data: { events: [], pagination: { page: 1, limit: 25, total: 0, hasNextPage: false, hasPreviousPage: false } }
      };
    }

    const data: SubscriptionHistoryResponse = await response.json();
    
    // Cache the response with ETag
    const etag = response.headers.get('ETag');
    if (etag && data.success) {
      cache.set(sanitizedFilters, data, etag);
    }

    return data;
  } catch (error) {
    // Log error without exposing sensitive information
    console.error('Error fetching subscription history:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      filters: redactSensitiveData({ id: 'filter-request' } as SubscriptionEvent)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subscription history',
      data: { events: [], pagination: { page: 1, limit: 25, total: 0, hasNextPage: false, hasPreviousPage: false } }
    };
  }
}

/**
 * Fetch detailed information for a specific subscription event
 */
export async function fetchSubscriptionEventDetail(
  eventId: string
): Promise<SubscriptionEventDetailResponse> {
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      console.warn('⚠️ No session token available for event detail request');
      return {
        success: false,
        error: 'Authentication required',
        data: { event: {} as SubscriptionEventDetail }
      };
    }

    // Sanitize event ID to prevent injection attacks
    const sanitizedEventId = eventId.replace(/[^a-zA-Z0-9:_-]/g, '');
    if (sanitizedEventId !== eventId) {
      console.warn('⚠️ Event ID contained invalid characters:', eventId);
      return {
        success: false,
        error: 'Invalid event ID format',
        data: { event: {} as SubscriptionEventDetail }
      };
    }

    const response = await fetch(`${BACKEND_URL}/subscription/history/${encodeURIComponent(sanitizedEventId)}/details`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        data: { event: {} as SubscriptionEventDetail }
      };
    }

    return await response.json();
  } catch (error) {
    // Log error without exposing sensitive information
    console.error('Error fetching event details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      eventId: eventId.replace(/([a-zA-Z0-9]{4})[a-zA-Z0-9]*([a-zA-Z0-9]{4})/, '$1...$2')
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch event details',
      data: { event: {} as SubscriptionEventDetail }
    };
  }
}

/**
 * Alternative POST endpoint for compatibility (session token in body)
 */
export async function fetchSubscriptionHistoryPost(
  filters: HistoryFilters = {}
): Promise<SubscriptionHistoryResponse> {
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return {
        success: false,
        error: 'No session token available',
        data: { events: [], pagination: { page: 1, limit: 25, total: 0, hasNextPage: false, hasPreviousPage: false } }
      };
    }

    const response = await fetch(`${BACKEND_URL}/subscription/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionToken,
        ...filters
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        data: { events: [], pagination: { page: 1, limit: 25, total: 0, hasNextPage: false, hasPreviousPage: false } }
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription history (POST):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subscription history',
      data: { events: [], pagination: { page: 1, limit: 25, total: 0, hasNextPage: false, hasPreviousPage: false } }
    };
  }
}

/**
 * Clear the subscription history cache
 */
export function clearSubscriptionHistoryCache(): void {
  cache.clear();
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number | undefined, currency: string): string {
  if (typeof amount !== 'number') {
    return '';
  }
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

/**
 * Format date for display in user's local timezone
 */
export function formatEventDate(dateString: string): {
  date: string;
  time: string;
  full: string;
} {
  const date = new Date(dateString);
  
  return {
    date: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    full: date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  };
}

/**
 * Get display-friendly event type labels
 */
export function getEventTypeLabel(eventType: SubscriptionEvent['eventType']): string {
  const labels: Record<SubscriptionEvent['eventType'], string> = {
    purchase: 'Purchase',
    renewal: 'Renewal', 
    cancellation: 'Cancellation',
    plan_change: 'Plan Change',
    trial_start: 'Trial Started',
    trial_end: 'Trial Ended'
  };
  
  return labels[eventType] || eventType;
}

/**
 * Get status display information
 */
export function getStatusInfo(status: SubscriptionEvent['status']): {
  label: string;
  className: string;
} {
  const statusMap: Record<SubscriptionEvent['status'], { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-green-500 text-white'
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-500 text-white'
    },
    expired: {
      label: 'Expired',
      className: 'bg-gray-500 text-white'
    },
    trialing: {
      label: 'Trialing',
      className: 'bg-blue-500 text-white'
    }
  };
  
  return statusMap[status] || { label: status, className: 'bg-gray-500 text-white' };
}

/**
 * Get provider display information
 */
export function getProviderInfo(provider: SubscriptionEvent['provider']): {
  label: string;
  className: string;
} {
  const providerMap: Record<SubscriptionEvent['provider'], { label: string; className: string }> = {
    stripe: {
      label: 'Stripe',
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    apple_iap: {
      label: 'App Store',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  };
  
  return providerMap[provider] || { label: provider, className: 'bg-gray-100 text-gray-800 border-gray-200' };
}
