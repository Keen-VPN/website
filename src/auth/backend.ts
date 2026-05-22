import type { ApiPlan } from "@/lib/pricing";
import { BackendAuthResponse, SubscriptionData, TrialData } from "./types";
import {
  getReferralTokenFromStorage,
  clearReferralTokenStorage,
} from "./referral-token";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "/api";

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

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Wire shape from backend before normalization (fields may be missing or named differently). */
export interface RawSubscription {
  status?: string;
  endDate?: string;
  currentPeriodEnd?: string;
  currentPeriodStart?: string;
  subscriptionStartedAt?: string;
  daysSinceSubscriptionStart?: number;
  showAnnualUpgradePrompt?: boolean;
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

/**
 * Normalizes a raw backend auth response into a typed `BackendAuthResponse`.
 *
 * Key behaviour:
 * - Subscription fields are renamed/coerced (e.g. `currentPeriodEnd` → `endDate`).
 * - Only subscriptions with an actionable status (`active`, `trialing`, `past_due`)
 *   are surfaced; all others are coerced to `null`. This keeps CTA label logic
 *   consistent across every auth path (sign-in, session verify, and status refresh)
 *   so pages never flicker between labels due to stale non-active subscription data.
 * - Trial data is normalised from snake_case backend fields to camelCase frontend types.
 */
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
  if (rawSubscription.currentPeriodStart !== undefined) {
    normalizedSubscription.currentPeriodStart = rawSubscription.currentPeriodStart;
  }
  if (rawSubscription.currentPeriodEnd !== undefined) {
    normalizedSubscription.currentPeriodEnd = rawSubscription.currentPeriodEnd;
  }
  if (rawSubscription.subscriptionStartedAt !== undefined) {
    normalizedSubscription.subscriptionStartedAt =
      rawSubscription.subscriptionStartedAt;
  }
  if (rawSubscription.daysSinceSubscriptionStart !== undefined) {
    normalizedSubscription.daysSinceSubscriptionStart =
      rawSubscription.daysSinceSubscriptionStart;
  }
  if (rawSubscription.showAnnualUpgradePrompt !== undefined) {
    normalizedSubscription.showAnnualUpgradePrompt =
      rawSubscription.showAnnualUpgradePrompt;
  }

  // Only surface subscriptions with actionable statuses so that all auth
  // paths (sign-in and background status-session refresh) are consistent.
  // Non-active statuses (e.g. "canceled", "incomplete") are treated as null
  // to prevent stale data from showing the wrong CTA label on initial load.
  const isActionable = activeSubscriptionStatuses.has(normalizedSubscription.status);

  return {
    ...responseWithoutRawTrial,
    subscription: isActionable ? normalizedSubscription : null,
    ...(data.trial !== undefined ? { trial: normalizedTrial } : {}),
  };
}

export interface SubscriptionStatusResult {
  success: boolean;
  hasActiveSubscription?: boolean;
  subscription: SubscriptionData | null;
  trial: TrialData | null;
  annualSavings?: {
    savingsPercent: number;
    yearlySavingsAmount: number;
    annualMonthlyEquivalent: number;
  } | null;
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
    const referralToken = getReferralTokenFromStorage();
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        ...(provider ? { provider } : {}),
        ...(referralToken ? { referralToken } : {}),
      }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(data, "Login failed"));
    }
    // Backend /auth/login doesn't currently include `success` (unlike /auth/apple/signin).
    // Default to true only when absent so a future explicit `success: false` is respected.
    const normalized = normalizeBackendAuthResponse(data as RawBackendAuthResponse);
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
    }
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
    const referralToken = getReferralTokenFromStorage();
    const endpoint =
      provider === "apple" ? "/auth/apple/signin" : "/auth/google/signin";
    const body =
      provider === "apple"
        ? {
            identityToken: accessToken,
            userIdentifier: additionalData?.userIdentifier,
            email: additionalData?.email,
            fullName: additionalData?.fullName,
            ...(referralToken ? { referralToken } : {}),
          }
        : {
            idToken: accessToken, // Backend expects 'idToken' parameter for Google
            ...(referralToken ? { referralToken } : {}),
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

    // Some provider responses may omit `success`; treat missing as success on HTTP 200.
    const normalized = normalizeBackendAuthResponse(data as RawBackendAuthResponse);
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
    }
    return { ...normalized, success: normalized.success ?? true };
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

export async function fetchReferralDashboard(
  sessionToken: string,
  options?: { offset?: number; limit?: number },
): Promise<{
  success: boolean;
  referralUrl?: string;
  token?: string;
  totalReferrals?: number;
  rewardsEarned?: number;
  pendingReferrals?: number;
  referrals?: Record<string, unknown>[];
  referralsOffset?: number;
  referralsLimit?: number;
  referralsHasMore?: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (options?.offset !== undefined && options.offset >= 0) {
      params.set("offset", String(options.offset));
    }
    if (options?.limit !== undefined && options.limit > 0) {
      params.set("limit", String(options.limit));
    }
    const query = params.toString();
    const url = `${BACKEND_URL}/referral/dashboard${query ? `?${query}` : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to load referrals"),
      };
    }
    const payload =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    return { ...payload, success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load referrals",
    };
  }
}

/**
 * Verify session token with the backend.
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

export async function requestMagicLink(
  email: string,
): Promise<{ success: boolean; message?: string; error?: string; rateLimited?: boolean }> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to send magic link"),
        rateLimited: response.status === 429,
      };
    }
    const record = data as { message?: string };
    return { success: true, message: record.message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send magic link",
    };
  }
}

export async function verifyMagicLink(
  token: string,
): Promise<BackendAuthResponse> {
  try {
    const referralToken = getReferralTokenFromStorage();
    const response = await fetch(`${BACKEND_URL}/auth/magic/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        ...(referralToken ? { referralToken } : {}),
      }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Magic link verification failed"),
        unauthorized: response.status === 401,
      };
    }
    const normalized = normalizeBackendAuthResponse({
      ...(data as RawBackendAuthResponse),
      success: true,
    });
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
    }
    return normalized;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Magic link verification failed",
      unauthorized: false,
    };
  }
}

export interface ContactEmailStatusResponse {
  success: boolean;
  shouldPrompt: boolean;
  contactEmail: string | null;
  isVerified: boolean;
  error?: string;
}

export async function getContactEmailStatus(
  sessionToken: string,
): Promise<ContactEmailStatusResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/user/contact-email-status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        shouldPrompt: false,
        contactEmail: null,
        isVerified: false,
        error: extractBackendErrorMessage(data, "Failed to fetch contact email status"),
      };
    }
    return data as ContactEmailStatusResponse;
  } catch (error) {
    return {
      success: false,
      shouldPrompt: false,
      contactEmail: null,
      isVerified: false,
      error: error instanceof Error ? error.message : "Failed to fetch contact email status",
    };
  }
}

export async function requestEmailOtp(
  email: string,
): Promise<{
  success: boolean;
  message?: string;
  expiresInMinutes?: number;
  error?: string;
  rateLimited?: boolean;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to send sign-in code"),
        rateLimited: response.status === 429,
      };
    }
    const record = data as { message?: string; expiresInMinutes?: number };
    return {
      success: true,
      message: record.message,
      expiresInMinutes: record.expiresInMinutes,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send sign-in code",
    };
  }
}

export async function saveContactEmail(
  sessionToken: string,
  email: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/user/contact-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: extractBackendErrorMessage(data, "Failed to save contact email") };
    }
    return data as { success: boolean; message?: string };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save contact email" };
  }
}

export async function skipContactEmailPrompt(
  sessionToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/user/contact-email/skip`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "not_now" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: extractBackendErrorMessage(data, "Failed to skip for now") };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to skip for now" };
  }
}

export async function sendContactEmailVerification(
  sessionToken: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/verify-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: extractBackendErrorMessage(data, "Failed to send verification email") };
    }
    return data as { success: boolean; message?: string };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send verification email" };
  }
}

export async function confirmContactEmailVerification(
  token: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/verify-email/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: extractBackendErrorMessage(data, "Verification link is invalid or expired") };
    }
    return data as { success: boolean; message?: string };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Verification link is invalid or expired" };
  }
}

export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<BackendAuthResponse> {
  try {
    const referralToken = getReferralTokenFromStorage();
    const response = await fetch(`${BACKEND_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        ...(referralToken ? { referralToken } : {}),
      }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Code verification failed"),
        unauthorized: response.status === 401,
      };
    }
    const normalized = normalizeBackendAuthResponse({
      ...(data as RawBackendAuthResponse),
      success: true,
    });
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
    }
    return { ...normalized, success: normalized.success ?? true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Code verification failed",
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

    const annualSavings =
      data && typeof data === "object" && "annualSavings" in data
        ? (data as { annualSavings?: SubscriptionStatusResult["annualSavings"] })
            .annualSavings ?? null
        : null;

    return {
      success: normalized.success,
      hasActiveSubscription: Boolean(normalized.subscription),
      subscription: normalized.subscription ?? null,
      trial: normalized.trial ?? null,
      annualSavings,
      error: normalized.error,
      unauthorized: normalized.unauthorized,
    };
  } catch (error) {
    return {
      success: false,
      subscription: null,
      trial: null,
      annualSavings: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch subscription status",
      unauthorized: false,
    };
  }
}

export async function recordSubscriptionProductEvent(
  sessionToken: string,
  eventName: "annual_plan_viewed" | "annual_upgrade_clicked" | "annual_upgrade_completed",
  payload?: { platform?: string; source?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        eventName,
        platform: payload?.platform ?? "web",
        source: payload?.source,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(data, "Failed to record event"));
    }
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record event",
    };
  }
}

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

interface PreviewRetentionWinbackOfferResult {
  success: boolean;
  subscriptionType?: string;
  requiresAppleSettings?: boolean;
  offerExpiresAt?: string;
  invalidToken?: boolean;
  /** When true, remove retention token from sessionStorage so /signin is not hijacked. */
  discardStoredOffer?: boolean;
  error?: string;
}

interface ReactivateRetentionWinbackOfferResult {
  success: boolean;
  message?: string;
  requiresAppleSettings?: boolean;
  alreadyRedeemed?: boolean;
  invalidToken?: boolean;
  /** When true, remove retention token from sessionStorage so /signin is not hijacked. */
  discardStoredOffer?: boolean;
  error?: string;
}

/** Matches Nest `RetentionService.reactivateOffer` when `rewardGrantedAt` is set. */
const WINBACK_ALREADY_REDEEMED_MESSAGE =
  "Your 30 extra days free were already applied.";

function messageIfNonEmpty(record: Record<string, unknown>): string | undefined {
  const raw = record.message;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : undefined;
}

export async function previewRetentionWinbackOffer(
  token: string,
): Promise<PreviewRetentionWinbackOfferResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/retention/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = extractBackendErrorMessage(data, "Invalid win-back offer");
      const invalidToken =
        response.status === 404 ||
        (response.status === 400 && /invalid|expired/i.test(error));
      const discardStoredOffer =
        invalidToken || response.status === 400 || response.status === 404;
      return {
        success: false,
        error,
        invalidToken,
        discardStoredOffer,
      };
    }
    const parsed = isJsonObject(data) ? data : null;
    if (!parsed || Object.keys(parsed).length === 0) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Unexpected server response.",
        ),
      };
    }
    if (parsed.success === false) {
      return { ...parsed, success: false } as PreviewRetentionWinbackOfferResult;
    }
    if (parsed.success === true) {
      return { ...parsed, success: true } as PreviewRetentionWinbackOfferResult;
    }
    const hasPreviewPayload =
      typeof parsed.subscriptionType === "string" ||
      parsed.requiresAppleSettings === true ||
      typeof parsed.offerExpiresAt === "string";
    if (!hasPreviewPayload) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          parsed,
          "Unexpected server response.",
        ),
      };
    }
    return { ...parsed, success: true } as PreviewRetentionWinbackOfferResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid win-back offer",
    };
  }
}

export async function reactivateRetentionWinbackOffer(
  sessionToken: string,
  token: string,
): Promise<ReactivateRetentionWinbackOfferResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/retention/reactivate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = extractBackendErrorMessage(
        data,
        "Could not reactivate offer",
      );
      const record =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};
      const invalidToken =
        response.status === 404 ||
        (response.status === 400 && /invalid|expired/i.test(error));
      // Do not discard on 401: session/auth expired while the win-back JWT may still be valid —
      // keeping it lets sign-in redirects return to /reactivate to retry.
      const discardStoredOffer =
        invalidToken ||
        // Business-rule failures: drop stale offer from session so login redirect stops looping.
        response.status === 400 ||
        response.status === 403 ||
        response.status === 404;
      return {
        success: false,
        error,
        invalidToken,
        discardStoredOffer,
        message:
          typeof record.message === "string" ? record.message : undefined,
        requiresAppleSettings: record.requiresAppleSettings === true,
        alreadyRedeemed: record.alreadyRedeemed === true,
      };
    }
    const parsed = isJsonObject(data) ? data : null;
    if (!parsed || Object.keys(parsed).length === 0) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Could not reactivate offer",
        ),
      };
    }
    if (parsed.success === true) {
      if (parsed.requiresAppleSettings === true) {
        return {
          ...parsed,
          success: false,
          requiresAppleSettings: true,
        } as ReactivateRetentionWinbackOfferResult;
      }
      const alreadyRedeemed = parsed.alreadyRedeemed === true;
      const existingMsg = messageIfNonEmpty(parsed);
      return {
        ...parsed,
        success: true,
        ...(alreadyRedeemed && !existingMsg
          ? { message: WINBACK_ALREADY_REDEEMED_MESSAGE }
          : {}),
      } as ReactivateRetentionWinbackOfferResult;
    }
    if (parsed.success === false) {
      return {
        ...parsed,
        success: false,
      } as ReactivateRetentionWinbackOfferResult;
    }
    if (parsed.alreadyRedeemed === true) {
      return {
        ...parsed,
        success: true,
        message:
          messageIfNonEmpty(parsed) ?? WINBACK_ALREADY_REDEEMED_MESSAGE,
      } as ReactivateRetentionWinbackOfferResult;
    }
    if (parsed.requiresAppleSettings === true) {
      return {
        ...parsed,
        success: false,
      } as ReactivateRetentionWinbackOfferResult;
    }
    return {
      success: false,
      error: extractBackendErrorMessage(
        parsed,
        "Unexpected server response.",
      ),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not reactivate offer",
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
 * Switch a monthly Stripe subscription to annual at the next billing date (or trial end).
 * No upfront annual charge; proration is disabled on the backend.
 */
export async function upgradeSubscriptionToAnnual(
  sessionToken: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/subscription/upgrade-to-annual`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Failed to upgrade to annual plan",
        ),
      };
    }

    if (data?.success) {
      return { success: true, message: data.message };
    }

    return {
      success: false,
      error: data?.error || data?.message || "Upgrade failed",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to upgrade to annual plan",
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
// Membership transfer (competitor VPN → Keen credit)
// ============================================================================

export interface MembershipTransferRequestData {
  id: string;
  provider: string;
  expiryDate: string;
  proofUrl: string;
  hasUploadedProof?: boolean;
  hasS3Proof?: boolean;
  status: string;
  requestedCreditDays: number;
  approvedCreditDays: number | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  // Backward compatibility: older backend responses expose reviewer ID directly.
  reviewedByAdminId?: string | null;
  // New safer shape from backend that avoids leaking admin UUIDs to end users.
  reviewedBySystem?: boolean;
}

export async function fetchMembershipTransferRequest(sessionToken: string): Promise<{
  success: boolean;
  data: MembershipTransferRequestData | null;
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/subscription/transfer-request`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: extractBackendErrorMessage(raw, "Could not load transfer request"),
      };
    }
    const record = raw as { data?: MembershipTransferRequestData | null };
    return { success: true, data: record.data ?? null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export interface MembershipTransferPresignData {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
}

/** Presigned PUT to upload proof bytes to S3 before submitting the transfer request with `proofS3Key`. */
export async function requestMembershipTransferPresignedUpload(
  sessionToken: string,
  contentType: "image/jpeg" | "image/png" | "image/webp",
): Promise<{ success: boolean; data?: MembershipTransferPresignData; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/subscription/transfer-request/presigned-upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType }),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(raw, "Could not start proof upload"),
      };
    }
    const record = raw as { data?: MembershipTransferPresignData };
    if (!record.data?.uploadUrl || !record.data.key) {
      return { success: false, error: "Invalid presign response" };
    }
    return { success: true, data: record.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/** PUT proof image bytes to the presigned URL (S3). */
export async function putMembershipTransferProofToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  headers: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const h = new Headers(headers);
    const response = await fetch(uploadUrl, { method: "PUT", body: file, headers: h });
    if (!response.ok) {
      return { ok: false, error: `Upload failed (${response.status})` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function submitMembershipTransferRequest(
  sessionToken: string,
  payload: {
    provider: string;
    expiryDate: string;
    contactEmail?: string;
    proofUrl?: string;
    proofS3Key?: string;
    proofOriginalFilename?: string;
    /** @deprecated Use presigned S3 flow: requestMembershipTransferPresignedUpload → PUT → submit with proofS3Key */
    proofFile?: File | null;
  },
): Promise<{
  success: boolean;
  data?: MembershipTransferRequestData | null;
  error?: string;
}> {
  try {
    let response: Response;
    if (payload.proofFile && payload.proofFile.size > 0) {
      const ct = payload.proofFile.type;
      const allowed =
        ct === "image/jpeg" || ct === "image/png" || ct === "image/webp"
          ? ct
          : ("image/jpeg" as const);
      const presign = await requestMembershipTransferPresignedUpload(sessionToken, allowed);
      if (!presign.success || !presign.data) {
        return { success: false, error: presign.error ?? "Presign failed" };
      }
      const put = await putMembershipTransferProofToPresignedUrl(
        presign.data.uploadUrl,
        payload.proofFile,
        presign.data.headers,
      );
      if (!put.ok) {
        return { success: false, error: put.error ?? "Upload failed" };
      }
      response = await fetch(`${BACKEND_URL}/subscription/transfer-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: payload.provider,
          expiryDate: payload.expiryDate,
          contactEmail: payload.contactEmail?.trim() || undefined,
          proofUrl: payload.proofUrl?.trim() || undefined,
          proofS3Key: presign.data.key,
          proofOriginalFilename: payload.proofFile?.name || undefined,
        }),
      });
    } else {
      response = await fetch(`${BACKEND_URL}/subscription/transfer-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: payload.provider,
          expiryDate: payload.expiryDate,
          contactEmail: payload.contactEmail?.trim() || undefined,
          proofUrl: payload.proofUrl?.trim() || undefined,
          proofS3Key: payload.proofS3Key,
        }),
      });
    }
    const raw: unknown = await response.json().catch(() => ({}));
    if (response.status === 409) {
      const again = await fetchMembershipTransferRequest(sessionToken);
      return {
        success: false,
        error: "You already have a transfer request.",
        data: again.data,
      };
    }
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(raw, "Submission failed"),
      };
    }
    const record = raw as { data?: MembershipTransferRequestData };
    return { success: true, data: record.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export interface AdminMe {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AdminUserOverview {
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
  month: string;
  filters: {
    min_duration_seconds: number;
    exclude_platforms: string[];
  };
  users: {
    id: string;
    email: string;
    name: string | null;
    longestSessionSeconds: number;
    connectionCount: number;
    createdAt: string;
  }[];
}

export interface AdminIpAddressClickSummary {
  total: number;
  from: string;
  to: string;
  byPlatform: { label: string; count: number }[];
  byConnectionStatus: { label: string; count: number }[];
  topServerLocations: { label: string; count: number }[];
}

export interface AdminMedianMonthlySessionsSummary {
  month: string;
  median_sessions_per_user: number;
  mean_sessions_per_user: number;
  users_with_sessions: number;
  total_sessions: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  filters: {
    min_duration_seconds: number;
    exclude_email_patterns: string[];
    exclude_platforms: string[];
  };
}

export interface AdminMedianMonthlySessionsReport {
  summary: AdminMedianMonthlySessionsSummary;
  histogram: { session_count: number; users: number }[];
  segments: {
    platform: AdminEngagementSegment[];
    subscription_tier: AdminEngagementSegment[];
    acquisition_source: AdminEngagementSegment[];
  };
  month_over_month: {
    previous_month: string;
    median_sessions_per_user: number;
    users_with_sessions: number;
    delta_median: number;
  } | null;
}

export interface AdminEngagementSegment {
  segment: string;
  median_sessions_per_user: number;
  users_with_sessions: number;
  total_sessions: number;
}

export interface AdminSubscriptionListItem {
  id: string;
  status: string;
  planName: string | null;
  subscriptionType: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    joinedAt: string;
  };
}

export interface AdminSubscriptionListResponse {
  items: AdminSubscriptionListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response body from POST /admin/subscription/stripe/retrigger-cancel-at-period-end */
export interface AdminRetriggerStripeCancelResponse {
  success: boolean;
  message: string;
  error: string | null;
  subscriptionId?: string;
  stripeSubscriptionId?: string;
  stripeCancelAtPeriodEnd?: boolean;
  stripeStatus?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
  name: string;
  role: "SUPER_ADMIN" | "SUPPORT_ADMIN" | "BILLING_ADMIN" | "READONLY_ADMIN";
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; admin?: AdminMe; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Login failed"),
      };
    }
    const record = raw as { data?: { admin: AdminMe } };
    return { ok: true, admin: record.data?.admin };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/admin/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* ignore */
  }
}

export async function adminFetchMe(): Promise<{
  ok: boolean;
  admin?: AdminMe;
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/auth/me`, {
      credentials: "include",
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Unauthorized"),
      };
    }
    const record = raw as { data?: { admin: AdminMe } };
    return { ok: true, admin: record.data?.admin };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export interface AdminConnectionSession {
  id: string;
  client_session_id: string;
  session_start: string;
  session_end: string | null;
  duration_seconds: number;
  platform: string;
  app_version: string | null;
  server_location: string | null;
  bytes_transferred: number;
  subscription_tier: string | null;
  termination_reason: string;
  disconnect_reason: string | null;
}

export interface AdminUserConnectionSessionsResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    provider: string;
    longestSessionSeconds: number;
    createdAt: string;
  };
  sessions: AdminConnectionSession[];
  total: number;
  limit: number;
  offset: number;
}

export async function adminFetchUserConnectionSessions(
  userId: string,
  params?: { limit?: number; offset?: number; signal?: AbortSignal },
): Promise<{
  ok: boolean;
  data?: AdminUserConnectionSessionsResponse;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    query.set("limit", String(params?.limit ?? 50));
    query.set("offset", String(params?.offset ?? 0));
    const response = await fetch(
      `${BACKEND_URL}/admin/users/${encodeURIComponent(userId)}/connection-sessions?${query.toString()}`,
      {
        credentials: "include",
        signal: params?.signal,
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load connection sessions",
        ),
      };
    }
    const record = raw as { data?: AdminUserConnectionSessionsResponse };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchUsersOverview(params?: {
  page?: number;
  limit?: number;
  search?: string;
  month?: string;
  minDurationSeconds?: number;
  excludePlatforms?: string;
}): Promise<{
  ok: boolean;
  data?: AdminUserOverview;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    if (params?.search?.trim()) query.set("search", params.search.trim());
    if (params?.month) query.set("month", params.month);
    if (params?.minDurationSeconds != null) {
      query.set("min_duration_seconds", String(params.minDurationSeconds));
    }
    if (params?.excludePlatforms) {
      query.set("exclude_platforms", params.excludePlatforms);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${BACKEND_URL}/admin/users/overview${suffix}`, {
      credentials: "include",
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load users overview"),
      };
    }
    const record = raw as { data?: AdminUserOverview };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchMedianMonthlySessions(params?: {
  month?: string;
  minDurationSeconds?: number;
  excludePlatforms?: string;
  includeMom?: boolean;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminMedianMonthlySessionsReport;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", params.month);
    if (params?.minDurationSeconds != null) {
      query.set("min_duration_seconds", String(params.minDurationSeconds));
    }
    if (params?.excludePlatforms) {
      query.set("exclude_platforms", params.excludePlatforms);
    }
    // Omit include_mom unless opting out — backend defaults to true (MoM included).
    // AdminConnectionEngagement never passes includeMom, so month_over_month is always returned.
    if (params?.includeMom === false) {
      query.set("include_mom", "false");
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/connection-engagement/median-monthly-sessions${suffix}`,
      {
        credentials: "include",
        signal: params?.signal,
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load connection engagement",
        ),
      };
    }
    const record = raw as { data?: AdminMedianMonthlySessionsReport };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchIpAddressClickSummary(params?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminIpAddressClickSummary;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${BACKEND_URL}/admin/product-events/ip-address-clicks${suffix}`, {
      credentials: "include",
      signal: params?.signal,
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load IP address clicks"),
      };
    }
    const record = raw as { data?: AdminIpAddressClickSummary };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminCreateUser(
  payload: CreateAdminUserPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/users`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to create admin user"),
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminUpdateOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/users/me/password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to update password"),
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminListTransferRequests(
  status?: string,
): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${BACKEND_URL}/admin/subscription/transfer-requests${q}`, {
    credentials: "include",
  });
  const raw: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      error: extractBackendErrorMessage(raw, "Failed to list requests"),
    };
  }
  const record = raw as { data?: unknown[] };
  return { success: true, data: record.data };
}

export async function adminListSubscriptions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}): Promise<{
  ok: boolean;
  data?: AdminSubscriptionListResponse;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 50));
    if (params?.search?.trim()) query.set("search", params.search.trim());
    if (params?.status?.trim()) query.set("status", params.status.trim());
    if (params?.type?.trim()) query.set("type", params.type.trim());
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/subscriptions?${query.toString()}`,
      {
        credentials: "include",
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load subscriptions"),
      };
    }
    const record = raw as { data?: Partial<AdminSubscriptionListResponse> };
    return {
      ok: true,
      data: {
        items: record.data?.items ?? [],
        page: record.data?.page ?? 1,
        limit: record.data?.limit ?? (params?.limit ?? 50),
        total: record.data?.total ?? 0,
        totalPages: record.data?.totalPages ?? 1,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** Admin: re-apply Stripe `cancel_at_period_end` for a subscription row (legacy DB-only cancel fix). */
export async function adminRetriggerStripeCancelAtPeriodEnd(params: {
  subscriptionId: string;
}): Promise<{
  ok: boolean;
  data?: AdminRetriggerStripeCancelResponse;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/stripe/retrigger-cancel-at-period-end`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: params.subscriptionId }),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Request failed"),
      };
    }
    return { ok: true, data: raw as AdminRetriggerStripeCancelResponse };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchTransferProofBlob(
  requestId: string,
): Promise<{ ok: boolean; blob?: Blob; contentType?: string }> {
  const response = await fetch(
    `${BACKEND_URL}/admin/subscription/transfer-requests/${encodeURIComponent(requestId)}/proof`,
    { credentials: "include" },
  );
  if (!response.ok) return { ok: false };
  const blob = await response.blob();
  const contentType = response.headers.get("Content-Type") ?? undefined;
  return { ok: true, blob, contentType };
}

export type AdminTransferProofViewData =
  | { kind: "presigned"; viewUrl: string }
  | { kind: "public"; viewUrl: string }
  | { kind: "legacy_blob"; viewUrl: null; binaryPath: string };

export async function adminFetchTransferProofView(
  requestId: string,
): Promise<{ ok: boolean; data?: AdminTransferProofViewData; error?: string }> {
  const response = await fetch(
    `${BACKEND_URL}/admin/subscription/transfer-requests/${encodeURIComponent(requestId)}/proof-view`,
    { credentials: "include" },
  );
  const raw: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      error: extractBackendErrorMessage(raw, "Could not load proof view"),
    };
  }
  const record = raw as { data?: AdminTransferProofViewData };
  if (!record.data) {
    return { ok: false, error: "Invalid response" };
  }
  return { ok: true, data: record.data };
}

export async function adminApproveTransferRequest(
  requestId: string,
  body: { approvedCreditDays: number; adminNote?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/transfer-requests/${encodeURIComponent(requestId)}/approve`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(raw, "Approve failed"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function adminRejectTransferRequest(
  requestId: string,
  body: { adminNote: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/transfer-requests/${encodeURIComponent(requestId)}/reject`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(raw, "Reject failed"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
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
