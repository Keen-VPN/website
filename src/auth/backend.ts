import type { ApiPlan } from "@/lib/pricing";
import { BackendAuthResponse, SubscriptionData, TrialData } from "./types";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://vpnkeen.netlify.app/api";

function extractBackendErrorMessage(
  data: unknown,
  fallback: string,
): string {
  if (!data || typeof data !== "object") return fallback;

  // Common shapes:
  // - { error: "..." }
  // - { error: { message: "..." } }
  // - { message: "..." }
  const record = data as Record<string, unknown>;
  const errorValue = record["error"];
  if (typeof errorValue === "string" && errorValue.trim()) return errorValue;
  if (errorValue && typeof errorValue === "object") {
    const errorRecord = errorValue as Record<string, unknown>;
    const message = errorRecord["message"];
    if (typeof message === "string" && message.trim()) return message;
  }
  const messageValue = record["message"];
  if (typeof messageValue === "string" && messageValue.trim()) return messageValue;

  return fallback;
}

/** Wire shape from backend before normalization (fields may be missing or named differently). */
export interface RawSubscription {
  status?: string;
  endDate?: string;
  currentPeriodEnd?: string;
  customerId?: string;
  plan?: string;
  planName?: string;
  cancelAtPeriodEnd?: boolean;
  subscriptionType?: string;
}

export interface RawTrial {
  active?: boolean;
  trialActive?: boolean;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  daysRemaining?: number | null;
  isPaid?: boolean;
  tier?: string | null;
}

export interface RawBackendAuthResponse
  extends Omit<BackendAuthResponse, "subscription" | "trial"> {
  subscription?: RawSubscription | null;
  trial?: RawTrial | null;
}

const activeSubscriptionStatuses = new Set(["active", "trialing", "past_due"]);

function normalizeTrial(rawTrial: RawTrial | null | undefined): TrialData | null {
  if (!rawTrial) return null;

  return {
    active: Boolean(rawTrial.active ?? rawTrial.trialActive),
    endsAt: rawTrial.endsAt ?? rawTrial.trialEndsAt ?? null,
    daysRemaining: rawTrial.daysRemaining ?? null,
    isPaid: rawTrial.isPaid,
    tier: rawTrial.tier ?? null,
  };
}

function normalizeBackendAuthResponse(
  data: RawBackendAuthResponse,
): BackendAuthResponse {
  const rawSubscription = data.subscription;
  const normalizedTrial = normalizeTrial(data.trial);
  const responseWithoutRawTrial = {
    ...data,
  } as Omit<RawBackendAuthResponse, "trial">;
  delete (responseWithoutRawTrial as RawBackendAuthResponse).trial;

  if (!rawSubscription) {
    return {
      ...(responseWithoutRawTrial as BackendAuthResponse),
      ...(data.trial !== undefined ? { trial: normalizedTrial } : {}),
    };
  }

  const normalizedSubscription: SubscriptionData = {
    status: (rawSubscription.status ?? "").toLowerCase(),
    endDate:
      rawSubscription.endDate ?? rawSubscription.currentPeriodEnd ?? "",
    plan: rawSubscription.plan ?? rawSubscription.planName,
  };
  if (rawSubscription.customerId !== undefined) {
    normalizedSubscription.customerId = rawSubscription.customerId;
  }
  if (rawSubscription.cancelAtPeriodEnd !== undefined) {
    normalizedSubscription.cancelAtPeriodEnd = rawSubscription.cancelAtPeriodEnd;
  }
  if (rawSubscription.subscriptionType !== undefined) {
    normalizedSubscription.subscriptionType = rawSubscription.subscriptionType;
  }

  return {
    ...responseWithoutRawTrial,
    subscription: normalizedSubscription,
    ...(data.trial !== undefined ? { trial: normalizedTrial } : {}),
  };
}

export interface SubscriptionStatusResult {
  success: boolean;
  hasActiveSubscription?: boolean;
  subscription: SubscriptionData | null;
  trial: TrialData | null;
  error?: string;
  unauthorized?: boolean;
}

// ============================================================================
// Backend Authentication
// ============================================================================

/**
 * Login with Firebase ID token. Use this when you have a Firebase user and need
 * a backend session (e.g. from onAuthStateChanged). Works for any provider (Google/Apple).
 * Do not send Firebase token to /auth/apple/signin — that endpoint expects an Apple identity token.
 */
export async function loginWithFirebaseToken(
  idToken: string,
  provider?: 'google' | 'apple',
): Promise<BackendAuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, ...(provider ? { provider } : {}) }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(data, "Login failed"));
    }
    // Backend /auth/login doesn't currently include `success` (unlike /auth/apple/signin).
    // Default to true only when absent so a future explicit `success: false` is respected.
    const normalized = normalizeBackendAuthResponse(data as RawBackendAuthResponse);
    return { ...normalized, success: normalized.success ?? true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to authenticate",
    };
  }
}

/**
 * Authenticate with backend using provider-specific token:
 * - Google: pass Firebase ID token (backend /auth/google/signin).
 * - Apple: pass Apple identity token (backend /auth/apple/signin). Do not pass Firebase token.
 */
export async function authenticateWithBackend(
  accessToken: string,
  provider: "google" | "apple" = "google",
  additionalData?: {
    userIdentifier?: string;
    email?: string;
    fullName?: string;
  },
): Promise<BackendAuthResponse> {
  try {
    const endpoint =
      provider === "apple" ? "/auth/apple/signin" : "/auth/google/signin";
    const body =
      provider === "apple"
        ? {
            identityToken: accessToken,
            userIdentifier: additionalData?.userIdentifier,
            email: additionalData?.email,
            fullName: additionalData?.fullName,
          }
        : {
            idToken: accessToken, // Backend expects 'idToken' parameter for Google
          };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        extractBackendErrorMessage(data, "Backend authentication failed"),
      );
    }

    return normalizeBackendAuthResponse(data as RawBackendAuthResponse);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to authenticate with backend",
    };
  }
}

/**
 * Verify session token with backend.
 * Returns unauthorized: true when the backend explicitly rejects the token
 * (HTTP 401, or 200 with { success: false, unauthorized: true } in the body),
 * so callers can clear the session. On network errors we return success: false without unauthorized.
 */
export async function verifySessionToken(
  sessionToken: string,
): Promise<BackendAuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionToken,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      if (data?.success === false) {
        return {
          ...data,
          success: false,
          unauthorized: data?.unauthorized === true,
          error: data?.error ?? "Session verification failed",
        };
      }
      return normalizeBackendAuthResponse({ ...data, success: data.success ?? true });
    }
    return {
      success: false,
      error: data?.error || "Session verification failed",
      unauthorized: response.status === 401,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to verify session",
      unauthorized: false,
    };
  }
}

export async function fetchSubscriptionStatusWithSession(
  sessionToken: string,
): Promise<SubscriptionStatusResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/status-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        subscription: null,
        trial: null,
        error: data?.error || "Failed to fetch subscription status",
        unauthorized: response.status === 401,
      };
    }

    const normalized = normalizeBackendAuthResponse({
      ...(data as RawBackendAuthResponse),
      success: data?.success ?? true,
    });
    const status = normalized.subscription?.status?.toLowerCase();
    const subscription =
      status && activeSubscriptionStatuses.has(status)
        ? normalized.subscription ?? null
        : null;

    return {
      success: normalized.success,
      hasActiveSubscription: Boolean(data?.hasActiveSubscription),
      subscription,
      trial: normalized.trial ?? null,
      error: normalized.error,
      unauthorized: normalized.unauthorized,
    };
  } catch (error) {
    return {
      success: false,
      subscription: null,
      trial: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch subscription status",
      unauthorized: false,
    };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  sessionToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to cancel subscription");
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
    };
  }
}

/** Sentinel error code when checkout fails due to expired/invalid session (e.g. 401). */
export const CHECKOUT_ERROR_SESSION_EXPIRED = "SESSION_EXPIRED" as const;

export type CreateCheckoutResult =
  | { success: true; url: string }
  | {
      success: false;
      error: string;
      errorCode?: typeof CHECKOUT_ERROR_SESSION_EXPIRED;
    };

/**
 * Create Stripe checkout session.
 * Uses the backend session token (from login/Apple sign-in), not the Firebase ID token.
 * Returns errorCode CHECKOUT_ERROR_SESSION_EXPIRED when the backend returns 401.
 */
export async function createCheckoutSession(
  sessionToken: string,
  planId: string,
  successUrl?: string,
  cancelUrl?: string,
): Promise<CreateCheckoutResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/payment/stripe/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        planId,
        successUrl,
        cancelUrl,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      url?: string;
      error?: string;
    };

    if (!response.ok) {
      const errorMessage = data?.error || "Failed to create checkout session";
      const isUnauthorized = response.status === 401;
      return {
        success: false,
        error: errorMessage,
        ...(isUnauthorized && { errorCode: CHECKOUT_ERROR_SESSION_EXPIRED }),
      };
    }

    if (data?.success && data?.url) {
      return { success: true, url: data.url };
    }
    return {
      success: false,
      error: data?.error || "No checkout URL received",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create checkout session",
    };
  }
}

/**
 * Create a Stripe Billing Portal session for the current user.
 * Allows managing subscription (upgrade, downgrade, update payment method, etc.)
 */
export async function createBillingPortalSession(
  sessionToken: string,
  returnUrl: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/payment/stripe/portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ returnUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(data, "Failed to open billing portal"));
    }

    if (data?.url) {
      return { success: true, url: data.url };
    }
    return {
      success: false,
      error: data?.error || "No portal URL received",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create billing portal session",
    };
  }
}

// ============================================================================
// Session Storage
// ============================================================================

const SESSION_TOKEN_KEY = "sessionToken";
const APP_TOKEN_KEY = "token";

export function storeSessionToken(sessionToken: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  // Also store for app deeplink
  localStorage.setItem(APP_TOKEN_KEY, `vpnkeen://auth?token=${sessionToken}`);
}

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(APP_TOKEN_KEY);
  localStorage.removeItem("google_access_token");
}

/**
 * Delete user account
 */
export async function deleteAccount(
  sessionToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/delete-account`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(data, "Failed to delete account"));
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}

/**
 * Fetch subscription plans from backend
 */
export async function fetchSubscriptionPlans(): Promise<{
  success: boolean;
  plans?: ApiPlan[];
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/plans`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      throw new Error(
        extractBackendErrorMessage(data, "Failed to fetch subscription plans"),
      );
    }

    const payload = data as { data?: { plans?: unknown } };
    const rawPlans = payload.data?.plans;
    const plans = Array.isArray(rawPlans) ? (rawPlans as ApiPlan[]) : [];

    return {
      success: true,
      plans,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch subscription plans",
    };
  }
}

/**
 * Fetch a single subscription plan by ID from backend
 */
export async function fetchSubscriptionPlanById(planId: string): Promise<{
  success: boolean;
  plan?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/plan/${planId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch subscription plan");
    }

    return {
      success: true,
      plan: data.data?.plan || null,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch subscription plan",
    };
  }
}

// ============================================================================
// Account Linking
// ============================================================================

export async function linkProvider(
  sessionToken: string,
  provider: 'google' | 'apple',
  firebaseIdToken: string,
): Promise<{ success: boolean; linkedProviders: { google: boolean; apple: boolean } }> {
  const response = await fetch(`${BACKEND_URL}/auth/link-provider`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ provider, firebaseIdToken }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(extractBackendErrorMessage(errorData, `Failed to link provider: ${response.status}`));
  }
  return response.json();
}

export async function unlinkProvider(
  sessionToken: string,
  provider: 'google' | 'apple',
): Promise<{
  success: boolean;
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  };
}> {
  const response = await fetch(`${BACKEND_URL}/auth/unlink-provider`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ provider }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(extractBackendErrorMessage(errorData, `Failed to unlink provider: ${response.status}`));
  }
  return response.json();
}

export async function getLinkedProviders(
  sessionToken: string,
): Promise<{
  success: boolean;
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  };
}> {
  const response = await fetch(`${BACKEND_URL}/user/linked-providers`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(extractBackendErrorMessage(errorData, `Failed to get linked providers: ${response.status}`));
  }
  return response.json();
}
