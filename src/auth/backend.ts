import { BackendAuthResponse, SubscriptionData } from "./types";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://vpnkeen.netlify.app/api";
// export const BACKEND_URL = 'http://localhost:3003/api';

// ============================================================================
// Backend Authentication
// ============================================================================

/**
 * Authenticate with backend using Google OAuth access token
 * Backend will verify token, create/update user, and return session token
 */
export async function authenticateWithBackend(
  accessToken: string,
  provider: "google" | "apple" = "google",
  additionalData?: {
    userIdentifier?: string;
    email?: string;
    fullName?: string;
  }
): Promise<BackendAuthResponse> {
  try {
    const endpoint =
      provider === "apple" ? "/auth/apple/signin" : "/auth/google/signin";
    const body =
      provider === "apple"
        ? {
            identityToken: accessToken,
            userIdentifier:
              additionalData?.userIdentifier || accessToken.substring(0, 20),
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Backend authentication failed");
    }

    return data;
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
 * Verify session token with backend
 */
export async function verifySessionToken(
  sessionToken: string
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Session verification failed");
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to verify session",
    };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  sessionToken: string
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

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(
  sessionToken: string,
  email: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/subscription/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken,
          email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create checkout session");
    }

    return data;
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
  email: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/delete-account`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        userId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete account");
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
  plans?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/plans`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch subscription plans");
    }

    return {
      success: true,
      plans: data.data?.plans || [],
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
  plan?: any;
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
