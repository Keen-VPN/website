import type { ApiPlan } from "@/lib/pricing";
import { BackendAuthResponse, SubscriptionData, TrialData } from "./types";
import {
  getReferralTokenFromStorage,
  clearReferralTokenStorage,
} from "./referral-token";
import {
  clearUtmAttributionStorage,
  getUtmAttributionAuthPayload,
} from "@/lib/utm-attribution";
import { buildAuthDeepLink } from "@/lib/keenvpn-deep-links";

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api";

function extractBackendErrorMessage(data: unknown, fallback: string): string {
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
  if (typeof messageValue === "string" && messageValue.trim())
    return messageValue;

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
  accessRole?: "owner" | "linked" | "member";
  canManageBilling?: boolean;
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

export interface RawBackendAuthResponse extends Omit<
  BackendAuthResponse,
  "subscription" | "trial"
> {
  subscription?: RawSubscription | null;
  trial?: RawTrial | null;
}

const activeSubscriptionStatuses = new Set(["active", "trialing", "past_due"]);

function normalizeTrial(
  rawTrial: RawTrial | null | undefined,
): TrialData | null {
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
    endDate: rawSubscription.endDate ?? rawSubscription.currentPeriodEnd ?? "",
    plan: rawSubscription.plan ?? rawSubscription.planName,
    canManageBilling: rawSubscription.canManageBilling === true,
  };
  if (rawSubscription.customerId !== undefined) {
    normalizedSubscription.customerId = rawSubscription.customerId;
  }
  if (rawSubscription.cancelAtPeriodEnd !== undefined) {
    normalizedSubscription.cancelAtPeriodEnd =
      rawSubscription.cancelAtPeriodEnd;
  }
  if (rawSubscription.subscriptionType !== undefined) {
    normalizedSubscription.subscriptionType = rawSubscription.subscriptionType;
  }
  if (rawSubscription.accessRole !== undefined) {
    normalizedSubscription.accessRole = rawSubscription.accessRole;
  }
  if (rawSubscription.currentPeriodStart !== undefined) {
    normalizedSubscription.currentPeriodStart =
      rawSubscription.currentPeriodStart;
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
  const isActionable = activeSubscriptionStatuses.has(
    normalizedSubscription.status,
  );

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
  provider?: "google" | "apple",
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
        ...getUtmAttributionAuthPayload(),
      }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(extractBackendErrorMessage(data, "Login failed"));
    }
    // Backend /auth/login doesn't currently include `success` (unlike /auth/apple/signin).
    // Default to true only when absent so a future explicit `success: false` is respected.
    const normalized = normalizeBackendAuthResponse(
      data as RawBackendAuthResponse,
    );
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
      clearUtmAttributionStorage();
    }
    return { ...normalized, success: normalized.success ?? true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to authenticate",
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
    const utmPayload = getUtmAttributionAuthPayload();
    const body =
      provider === "apple"
        ? {
            identityToken: accessToken,
            userIdentifier: additionalData?.userIdentifier,
            email: additionalData?.email,
            fullName: additionalData?.fullName,
            ...(referralToken ? { referralToken } : {}),
            ...utmPayload,
          }
        : {
            idToken: accessToken, // Backend expects 'idToken' parameter for Google
            ...(referralToken ? { referralToken } : {}),
            ...utmPayload,
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
    const normalized = normalizeBackendAuthResponse(
      data as RawBackendAuthResponse,
    );
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
      clearUtmAttributionStorage();
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

export type PerkAccessTier = "free" | "paid" | "annual";

export type PerkCategory =
  | "privacy_security"
  | "ai_productivity"
  | "developer_tools"
  | "startup_growth"
  | "remote_work";

export type PerkRedemptionType =
  | "external_link"
  | "coupon_code"
  | "invite_only";

export type PerkUserTab = "new" | "completed" | "snoozed" | "not_interested";

export type PerkRequestCategory =
  | "finance"
  | "software"
  | "travel"
  | "shopping"
  | "food"
  | "entertainment"
  | "other";

export interface PerkItem {
  id: string;
  title: string;
  partnerName: string | null;
  category: PerkCategory;
  description: string;
  imageUrl: string | null;
  offerText: string;
  redemptionType: PerkRedemptionType;
  accessLevel: "free" | "paid" | "annual";
  isFeatured: boolean;
  accessible: boolean;
  redeemed: boolean;
  ctaLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  daysRemaining: number | null;
  userTab: PerkUserTab;
  /** Present on claimed coupon perks so the code stays visible on the card. */
  couponCode?: string;
  redemptionUrl?: string;
}

export interface PerksListPayload {
  userAccessTier: PerkAccessTier;
  categories: PerkCategory[];
  tab: PerkUserTab | null;
  perks: PerkItem[];
}

export async function fetchPerks(
  sessionToken: string,
  options?: { category?: string; search?: string; tab?: PerkUserTab },
): Promise<{ success: boolean; data?: PerksListPayload; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (options?.category) params.set("category", options.category);
    if (options?.search?.trim()) params.set("search", options.search.trim());
    if (options?.tab) params.set("tab", options.tab);
    const query = params.toString();
    const url = `${BACKEND_URL}/perks${query ? `?${query}` : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to load perks"),
      };
    }
    const payload =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    const inner = payload["data"];
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
      return { success: false, error: "Invalid perks response" };
    }
    return { success: true, data: inner as PerksListPayload };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load perks",
    };
  }
}

export async function claimPerk(
  sessionToken: string,
  perkId: string,
): Promise<{
  success: boolean;
  redemptionType?: PerkRedemptionType;
  redemptionUrl?: string;
  couponCode?: string;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/perks/${encodeURIComponent(perkId)}/claim`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to claim perk"),
      };
    }
    const payload =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    if (payload["success"] === false) {
      const err = payload["error"];
      return {
        success: false,
        error: typeof err === "string" ? err : "Unable to claim this perk",
      };
    }
    return {
      success: true,
      redemptionType: payload["redemptionType"] as
        | PerkRedemptionType
        | undefined,
      redemptionUrl:
        typeof payload["redemptionUrl"] === "string"
          ? payload["redemptionUrl"]
          : undefined,
      couponCode:
        typeof payload["couponCode"] === "string"
          ? payload["couponCode"]
          : undefined,
      message:
        typeof payload["message"] === "string" ? payload["message"] : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim perk",
    };
  }
}

export async function unclaimPerk(
  sessionToken: string,
  perkId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/perks/${encodeURIComponent(perkId)}/unclaim`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to unclaim perk"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unclaim perk",
    };
  }
}

export async function recordPerkEvent(
  sessionToken: string,
  eventName:
    | "perk_viewed"
    | "perk_clicked"
    | "perk_claimed"
    | "perk_restored_to_new"
    | "perk_marked_not_interested"
    | "perk_moved_from_snoozed_to_not_interested"
    | "perk_moved_from_not_interested_to_snoozed",
  payload?: { perkId?: string; platform?: string; source?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/perks/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        eventName,
        perkId: payload?.perkId,
        platform: payload?.platform ?? "web",
        source: payload?.source ?? "perks_page",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to record perk event"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record perk event",
    };
  }
}

export async function snoozePerk(
  sessionToken: string,
  perkId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/perks/${encodeURIComponent(perkId)}/snooze`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to snooze perk"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to snooze perk",
    };
  }
}

export async function dismissPerk(
  sessionToken: string,
  perkId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/perks/${encodeURIComponent(perkId)}/dismiss`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to dismiss perk"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to dismiss perk",
    };
  }
}

export async function restorePerk(
  sessionToken: string,
  perkId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/perks/${encodeURIComponent(perkId)}/restore`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to restore perk"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore perk",
    };
  }
}

export async function submitPerkRequest(
  sessionToken: string,
  payload: {
    serviceName: string;
    websiteUrl?: string;
    category?: PerkRequestCategory;
    notes?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/perks/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Failed to submit perk request",
        ),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit perk request",
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
      return normalizeBackendAuthResponse({
        ...data,
        success: data.success ?? true,
      });
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

export async function requestMagicLink(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  rateLimited?: boolean;
}> {
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
      error:
        error instanceof Error ? error.message : "Failed to send magic link",
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
        ...getUtmAttributionAuthPayload(),
      }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Magic link verification failed",
        ),
        unauthorized: response.status === 401,
      };
    }
    const normalized = normalizeBackendAuthResponse({
      ...(data as RawBackendAuthResponse),
      success: true,
    });
    if (normalized.success ?? true) {
      clearReferralTokenStorage();
      clearUtmAttributionStorage();
    }
    return normalized;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Magic link verification failed",
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
        error: extractBackendErrorMessage(
          data,
          "Failed to fetch contact email status",
        ),
      };
    }
    return data as ContactEmailStatusResponse;
  } catch (error) {
    return {
      success: false,
      shouldPrompt: false,
      contactEmail: null,
      isVerified: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch contact email status",
    };
  }
}

export async function requestEmailOtp(email: string): Promise<{
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
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to save contact email"),
      };
    }
    return data as { success: boolean; message?: string };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save contact email",
    };
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
      return {
        success: false,
        error: extractBackendErrorMessage(data, "Failed to skip for now"),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to skip for now",
    };
  }
}

export interface EmailPreferencesResponse {
  success: boolean;
  contextualEngagementOptIn: boolean;
  contextualEngagementOptInAt: string | null;
  error?: string;
}

export async function getEmailPreferences(
  sessionToken: string,
): Promise<EmailPreferencesResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/user/email-preferences`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        contextualEngagementOptIn: true,
        contextualEngagementOptInAt: null,
        error: extractBackendErrorMessage(
          data,
          "Failed to fetch email preferences",
        ),
      };
    }
    return data as EmailPreferencesResponse;
  } catch (error) {
    return {
      success: false,
      contextualEngagementOptIn: true,
      contextualEngagementOptInAt: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch email preferences",
    };
  }
}

export async function updateEmailPreferences(
  sessionToken: string,
  contextualEngagementOptIn: boolean,
): Promise<EmailPreferencesResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/user/email-preferences`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contextualEngagementOptIn }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        contextualEngagementOptIn: true,
        contextualEngagementOptInAt: null,
        error: extractBackendErrorMessage(
          data,
          "Failed to update email preferences",
        ),
      };
    }
    return data as EmailPreferencesResponse;
  } catch (error) {
    return {
      success: false,
      contextualEngagementOptIn: true,
      contextualEngagementOptInAt: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update email preferences",
    };
  }
}

export interface ProfileQuestionOption {
  value: string;
  label: string;
}

export interface ProfileQuestionShowWhen {
  questionKey: string;
  values: string[];
}

export interface ProfileQuestion {
  key: string;
  label: string;
  category: string;
  options: ProfileQuestionOption[];
  showWhen?: ProfileQuestionShowWhen;
}

export interface UserProfileInformationResponse {
  success: boolean;
  questions: ProfileQuestion[];
  answers: Record<string, string>;
  isComplete: boolean;
  completedAt: string | null;
  updatedAt: string | null;
  error?: string;
}

export async function getUserProfileInformation(
  sessionToken: string,
): Promise<UserProfileInformationResponse> {
  const empty: UserProfileInformationResponse = {
    success: false,
    questions: [],
    answers: {},
    isComplete: false,
    completedAt: null,
    updatedAt: null,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/user/profile-information`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...empty,
        error: extractBackendErrorMessage(
          data,
          "Failed to fetch profile information",
        ),
      };
    }
    return data as UserProfileInformationResponse;
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch profile information",
    };
  }
}

export async function updateUserProfileInformation(
  sessionToken: string,
  answers: Record<string, string>,
  entrySource = "web",
): Promise<UserProfileInformationResponse> {
  const empty: UserProfileInformationResponse = {
    success: false,
    questions: [],
    answers: {},
    isComplete: false,
    completedAt: null,
    updatedAt: null,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/user/profile-information`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answers, platform: "web", entrySource }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...empty,
        error: extractBackendErrorMessage(
          data,
          "Failed to update profile information",
        ),
      };
    }
    return data as UserProfileInformationResponse;
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update profile information",
    };
  }
}

export interface SignupSourceOption {
  value: string;
  label: string;
}

export interface SignupSourceStatusResponse {
  success: boolean;
  question: string;
  options: SignupSourceOption[];
  source: string | null;
  otherText: string | null;
  shouldPrompt: boolean;
  capturedAt: string | null;
  error?: string;
}

export async function getSignupSourceStatus(
  sessionToken: string,
): Promise<SignupSourceStatusResponse> {
  const empty: SignupSourceStatusResponse = {
    success: false,
    question: "How did you hear about KeenVPN?",
    options: [],
    source: null,
    otherText: null,
    shouldPrompt: false,
    capturedAt: null,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/user/signup-source`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...empty,
        error: extractBackendErrorMessage(
          data,
          "Failed to fetch signup source",
        ),
      };
    }
    return data as SignupSourceStatusResponse;
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch signup source",
    };
  }
}

export async function updateSignupSource(
  sessionToken: string,
  payload: {
    source?: string;
    otherText?: string;
    skipped?: boolean;
  },
): Promise<SignupSourceStatusResponse> {
  const empty: SignupSourceStatusResponse = {
    success: false,
    question: "How did you hear about KeenVPN?",
    options: [],
    source: null,
    otherText: null,
    shouldPrompt: false,
    capturedAt: null,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/user/signup-source`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, platform: "web" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...empty,
        error: extractBackendErrorMessage(data, "Failed to save signup source"),
      };
    }
    return data as SignupSourceStatusResponse;
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error ? error.message : "Failed to save signup source",
    };
  }
}

export interface AdminSignupSourceSummary {
  totalUsers: number;
  responsesCaptured: number;
  responsesSkipped: number;
  unansweredCount: number;
  distribution: { value: string; label: string; count: number }[];
  options: { value: string; label: string; count: number }[];
  trends: { day: string; source: string; label: string; count: number }[];
  analyticsEvents: { eventName: string; count: number }[];
}

export async function adminFetchSignupSourceSummary(params?: {
  signal?: AbortSignal;
}): Promise<{ ok: boolean; data?: AdminSignupSourceSummary; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/signup-sources/summary`,
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
          "Failed to load signup source summary",
        ),
      };
    }
    const record = raw as { data?: AdminSignupSourceSummary };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export interface ContextualEmailUnsubscribeResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function confirmContextualEmailUnsubscribe(
  token: string,
): Promise<ContextualEmailUnsubscribeResponse> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/contextual-email/unsubscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Failed to unsubscribe from personalized emails",
        ),
      };
    }
    return data as ContextualEmailUnsubscribeResponse;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to unsubscribe from personalized emails",
    };
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
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Failed to send verification email",
        ),
      };
    }
    return data as { success: boolean; message?: string };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send verification email",
    };
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
      return {
        success: false,
        error: extractBackendErrorMessage(
          data,
          "Verification link is invalid or expired",
        ),
      };
    }
    return data as { success: boolean; message?: string };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Verification link is invalid or expired",
    };
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
        ...getUtmAttributionAuthPayload(),
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
      clearUtmAttributionStorage();
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
        ? ((
            data as {
              annualSavings?: SubscriptionStatusResult["annualSavings"];
            }
          ).annualSavings ?? null)
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
  eventName:
    | "annual_plan_viewed"
    | "annual_upgrade_clicked"
    | "annual_upgrade_completed",
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
      throw new Error(
        extractBackendErrorMessage(data, "Failed to record event"),
      );
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

function messageIfNonEmpty(
  record: Record<string, unknown>,
): string | undefined {
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
        error: extractBackendErrorMessage(data, "Unexpected server response."),
      };
    }
    if (parsed.success === false) {
      return {
        ...parsed,
        success: false,
      } as PreviewRetentionWinbackOfferResult;
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
        error: extractBackendErrorMessage(data, "Could not reactivate offer"),
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
        message: messageIfNonEmpty(parsed) ?? WINBACK_ALREADY_REDEEMED_MESSAGE,
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
      error: extractBackendErrorMessage(parsed, "Unexpected server response."),
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
        Authorization: `Bearer ${sessionToken}`,
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
      throw new Error(
        extractBackendErrorMessage(data, "Failed to open billing portal"),
      );
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

export async function fetchMembershipTransferRequest(
  sessionToken: string,
): Promise<{
  success: boolean;
  data: MembershipTransferRequestData | null;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/subscription/transfer-request`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: extractBackendErrorMessage(
          raw,
          "Could not load transfer request",
        ),
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
): Promise<{
  success: boolean;
  data?: MembershipTransferPresignData;
  error?: string;
}> {
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
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: h,
    });
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
      const presign = await requestMembershipTransferPresignedUpload(
        sessionToken,
        allowed,
      );
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

export async function submitServerLocationPreference(params: {
  region: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getSessionToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(
      `${BACKEND_URL}/v1/user/preferences/server-locations`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to submit location request",
        ),
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

export interface AdminReviewPromptSummary {
  usersPrompted: number;
  needsImprovementSelected: number;
  feedbackSubmitted: number;
  accepted: number;
  dismissed: number;
  /** Ratio in [0, 1], e.g. 0.75 means 75% of "needs improvement" taps led to feedback. */
  feedbackConversionRate: number | null;
  feedbackFormEnabled: boolean;
  feedbackFormWindowDays: number;
  minSampleSize: number;
  from: string;
  to: string;
  byPlatform: { label: string; count: number }[];
}

export interface AdminUserProfileAnswerDistribution {
  value: string;
  label: string;
  count: number;
}

export interface AdminUserProfileQuestionSummary {
  key: string;
  label: string;
  category: string;
  answeredCount: number;
  skippedCount: number;
  distribution: AdminUserProfileAnswerDistribution[];
}

export type AdminUserProfileAudience = "all" | "billing";

export interface AdminUserProfileSummary {
  audience: AdminUserProfileAudience;
  totalUsers: number;
  activeSubscribers: number;
  trialUsers: number;
  paidUsers: number;
  profilesStarted: number;
  profilesCompleted: number;
  questions: AdminUserProfileQuestionSummary[];
  analyticsEvents: { eventName: string; count: number }[];
  completionSources?: { source: string; count: number }[];
}

export interface AdminDomainInsightsMetrics {
  visitsScheduled: number;
  visitsSkipped: number;
  eventsCreated: number;
  emailsSent: number;
  emailsOpened: number;
  ctaClicks: number;
  unsubscribes: number;
  sendRate: number | null;
  usersOptedIn: number;
  from: string;
  to: string;
  byStatus: { label: string; count: number }[];
  topDomains: { label: string; count: number }[];
}

export interface AdminDomainEmailRule {
  id: string;
  domain: string;
  category: string | null;
  subject: string;
  headline: string;
  bodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  cooldownDays: number;
  sendDelayMinutes: number;
  enabled: boolean;
}

export interface CreateDomainEmailRulePayload {
  id: string;
  domain: string;
  category?: string;
  emailSubject: string;
  emailHeadline: string;
  emailBodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  cooldownDays?: number;
  sendDelayMinutes?: number;
  enabled?: boolean;
}

export type UpdateDomainEmailRulePayload = Partial<{
  domain: string;
  category: string | null;
  emailSubject: string;
  emailHeadline: string;
  emailBodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  cooldownDays: number;
  sendDelayMinutes: number;
  enabled: boolean;
}>;

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

export type AdminEngagementSubscriptionTier =
  | "all"
  | "free"
  | "paid"
  | "unknown";

export interface AdminWeeklySessionKpiSummary {
  iso_year: number;
  iso_week: number;
  week_label: string;
  week_range_label: string;
  active_users: number;
  median_connections_per_user: number;
  total_connections: number;
  median_connection_seconds: number;
  total_connection_seconds: number;
  filters: {
    min_duration_seconds: number;
    exclude_email_patterns: string[];
    exclude_platforms: string[];
    include_platforms: string[];
    subscription_tier: string;
  };
}

export interface AdminWeeklySessionKpiReport {
  summary: AdminWeeklySessionKpiSummary;
  week_over_week: {
    previous_week: string;
    active_users: number;
    median_connections_per_user: number;
    total_connections: number;
    median_connection_seconds: number;
    total_connection_seconds: number;
    delta_active_users: number;
    delta_median_connections: number;
  } | null;
  segments: {
    platform: AdminEngagementSegment[];
    subscription_tier: AdminEngagementSegment[];
  };
}

export interface AdminWeeklySessionKpiTrendReport {
  from: string;
  to: string;
  points: AdminWeeklySessionKpiSummary[];
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

export interface AdminChurnBreakdownRow {
  billingPeriod: string;
  subscriptionType: string;
  hardChurned: number;
  softChurned: number;
  trialChurned: number;
  mrrStart: number;
  revenueChurned: number;
}

export interface AdminChurnReport {
  month: number;
  year: number;
  monthLabel: string;
  startOfMonthActiveUsers: number;
  hardChurned: number;
  hardChurnRate: number;
  churnedFromCancellation: number;
  accountsDeleted: number;
  softChurned: number;
  softChurnRate: number;
  trialChurned: number;
  trialChurnRate: number;
  mrrStart: number;
  revenueChurned: number;
  revenueChurnRate: number;
  breakdowns: AdminChurnBreakdownRow[];
}

export interface AdminChurnTrendPoint {
  month: number;
  year: number;
  monthLabel: string;
  startOfMonthActiveUsers: number;
  hardChurned: number;
  hardChurnRate: number;
  softChurned: number;
  softChurnRate: number;
  trialChurned: number;
  mrrStart: number;
  revenueChurned: number;
  revenueChurnRate: number;
}

export interface AdminChurnTrendReport {
  from: string;
  to: string;
  points: AdminChurnTrendPoint[];
}

export type AdminChurnSubscriptionSource = "all" | "stripe" | "apple_iap";

export interface AdminWeeklyChurnSubscriptionSourceBreakdown {
  subscriptionType: string;
  activeAtWeekStart: number;
  churned: number;
  churnRate: number;
  autoRenewDisabled: number;
  subscriptionExpirations: number;
}

export interface AdminWeeklyChurnClientPlatformBreakdown {
  clientPlatform: string;
  churned: number;
  autoRenewDisabled: number;
  subscriptionExpirations: number;
}

export interface AdminWeeklyChurnReport {
  isoYear: number;
  isoWeek: number;
  weekLabel: string;
  weekRangeLabel: string;
  startOfWeekActiveUsers: number;
  churned: number;
  churnRate: number;
  churnedFromCancellation: number;
  accountsDeleted: number;
  autoRenewDisabled: number;
  autoRenewDisabledRate: number;
  subscriptionExpirations: number;
  subscriptionExpirationsRate: number;
  subscriptionSourceFilter: string | null;
  bySubscriptionSource: AdminWeeklyChurnSubscriptionSourceBreakdown[];
  byClientPlatform: AdminWeeklyChurnClientPlatformBreakdown[];
}

export interface AdminWeeklyChurnTrendPoint {
  isoYear: number;
  isoWeek: number;
  weekLabel: string;
  weekRangeLabel: string;
  startOfWeekActiveUsers: number;
  churned: number;
  churnRate: number;
  churnedFromCancellation: number;
  accountsDeleted: number;
  autoRenewDisabled: number;
  autoRenewDisabledRate: number;
  subscriptionExpirations: number;
  subscriptionExpirationsRate: number;
}

export interface AdminWeeklyChurnTrendReport {
  from: string;
  to: string;
  subscriptionSourceFilter: string | null;
  points: AdminWeeklyChurnTrendPoint[];
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

export interface AdminUserEmailRecord {
  id: string;
  category: string;
  subject: string;
  sentAt: string | null;
  deliveryStatus: string;
  openedAt: string | null;
  clickedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AdminUserReviewActivityRecord {
  eventName: string;
  label: string;
  occurredAt: string;
  platform: string | null;
  properties: Record<string, unknown> | null;
}

export interface AdminUserTimelineEvent {
  id: string;
  type: string;
  label: string;
  occurredAt: string;
  source: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminUserEngagementProfile {
  user: {
    id: string;
    email: string;
    name: string | null;
    provider: string;
    createdAt: string;
    longestSessionSeconds: number;
  };
  subscription: {
    status: string;
    planName: string | null;
    billingPeriod: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    subscriptionType: string;
  } | null;
  emails: AdminUserEmailRecord[];
  reviewActivity: AdminUserReviewActivityRecord[];
  timeline: AdminUserTimelineEvent[];
}

export async function adminFetchUserEngagementProfile(
  userId: string,
  params?: { signal?: AbortSignal },
): Promise<{
  ok: boolean;
  data?: AdminUserEngagementProfile;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/users/${encodeURIComponent(userId)}/profile`,
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
          "Failed to load user profile",
        ),
      };
    }
    const record = raw as { data?: AdminUserEngagementProfile };
    if (!record.data) {
      return { ok: false, error: "Invalid response from server" };
    }
    return { ok: true, data: record.data };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "Request aborted" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
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

/** Matches backend default for admin engagement / overview filters. */
export const ADMIN_DEFAULT_MIN_DURATION_SECONDS = 10;

/** Omit default min duration from query string; still send 0 (use `!= null`, not truthy). */
function appendAdminMinDurationSeconds(
  query: URLSearchParams,
  minDurationSeconds?: number,
): void {
  if (minDurationSeconds == null) return;
  if (minDurationSeconds === ADMIN_DEFAULT_MIN_DURATION_SECONDS) return;
  query.set("min_duration_seconds", String(minDurationSeconds));
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
    appendAdminMinDurationSeconds(query, params?.minDurationSeconds);
    if (params?.excludePlatforms) {
      query.set("exclude_platforms", params.excludePlatforms);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/users/overview${suffix}`,
      {
        credentials: "include",
      },
    );
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
    appendAdminMinDurationSeconds(query, params?.minDurationSeconds);
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

export interface AdminUtmSignupRow {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  signups: number;
}

export interface AdminUtmSignupReport {
  from: string;
  to: string;
  total_signups: number;
  rows: AdminUtmSignupRow[];
}

const SIGNUP_STARTED_SESSION_KEY = "keen_signup_started_tracked";

let signupStartedInFlight: Promise<void> | null = null;

/** Records signup_started with stored first-touch UTMs (pre-account). */
export async function recordSignupStarted(): Promise<void> {
  const payload = getUtmAttributionAuthPayload();
  if (!payload.utmAttribution) return;

  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(SIGNUP_STARTED_SESSION_KEY)) return;
    } catch {
      /* private mode / blocked storage */
    }
  }

  if (signupStartedInFlight) {
    return signupStartedInFlight;
  }

  signupStartedInFlight = (async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/marketing-attribution/signup-started`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        },
      );
      if (!response.ok) return;

      const data: unknown = await response.json().catch(() => ({}));
      const tracked =
        typeof data === "object" &&
        data !== null &&
        (data as { tracked?: boolean }).tracked === true;
      if (!tracked) return;

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(SIGNUP_STARTED_SESSION_KEY, "1");
        } catch {
          /* private mode / blocked storage */
        }
      }
    } catch {
      /* non-fatal */
    } finally {
      signupStartedInFlight = null;
    }
  })();

  return signupStartedInFlight;
}

export interface AdminUtmFunnelRow {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  signup_started: number;
  signups_completed: number;
  trials: number;
  subscriptions: number;
  revenue: number;
  signup_to_completed_rate: number;
  signup_completed_to_trial_rate: number;
  signup_completed_to_paid_rate: number;
}

export interface AdminUtmFunnelReport {
  from: string;
  to: string;
  totals: {
    signup_started: number;
    signups_completed: number;
    trials: number;
    subscriptions: number;
    revenue: number;
    signup_to_completed_rate: number;
    signup_completed_to_trial_rate: number;
    signup_completed_to_paid_rate: number;
  };
  rows: AdminUtmFunnelRow[];
}

export async function adminFetchUtmFunnelReport(params?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminUtmFunnelReport;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/utm-attribution/funnel${suffix}`,
      {
        method: "GET",
        credentials: "include",
        signal: params?.signal,
      },
    );
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          data,
          "Failed to load UTM funnel report",
        ),
      };
    }
    const record = data as { data?: AdminUtmFunnelReport };
    if (!record.data) {
      return { ok: false, error: "Invalid UTM funnel report response" };
    }
    return { ok: true, data: record.data };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, error: "Request aborted" };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchUtmSignupReport(params?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminUtmSignupReport;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/utm-attribution/signups${suffix}`,
      {
        method: "GET",
        credentials: "include",
        signal: params?.signal,
      },
    );
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          data,
          "Failed to load UTM sign-up report",
        ),
      };
    }
    const record = data as { data?: AdminUtmSignupReport };
    if (!record.data) {
      return { ok: false, error: "Invalid UTM sign-up report response" };
    }
    return { ok: true, data: record.data };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, error: "Request aborted" };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchWeeklySessionKpis(params?: {
  year?: number;
  week?: number;
  minDurationSeconds?: number;
  excludePlatforms?: string;
  includePlatforms?: string;
  subscriptionTier?: AdminEngagementSubscriptionTier;
  includeWow?: boolean;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminWeeklySessionKpiReport;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.year != null) query.set("year", String(params.year));
    if (params?.week != null) query.set("week", String(params.week));
    appendAdminMinDurationSeconds(query, params?.minDurationSeconds);
    if (params?.excludePlatforms) {
      query.set("exclude_platforms", params.excludePlatforms);
    }
    if (params?.includePlatforms) {
      query.set("include_platforms", params.includePlatforms);
    }
    if (params?.subscriptionTier && params.subscriptionTier !== "all") {
      query.set("subscription_tier", params.subscriptionTier);
    }
    if (params?.includeWow === false) {
      query.set("include_wow", "false");
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/connection-engagement/weekly-kpis${suffix}`,
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
          "Failed to load weekly session KPIs",
        ),
      };
    }
    const record = raw as { data?: AdminWeeklySessionKpiReport };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchWeeklySessionKpiTrend(params: {
  from: string;
  to: string;
  minDurationSeconds?: number;
  excludePlatforms?: string;
  includePlatforms?: string;
  subscriptionTier?: AdminEngagementSubscriptionTier;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminWeeklySessionKpiTrendReport;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    query.set("from", params.from);
    query.set("to", params.to);
    appendAdminMinDurationSeconds(query, params.minDurationSeconds);
    if (params.excludePlatforms) {
      query.set("exclude_platforms", params.excludePlatforms);
    }
    if (params.includePlatforms) {
      query.set("include_platforms", params.includePlatforms);
    }
    if (params.subscriptionTier && params.subscriptionTier !== "all") {
      query.set("subscription_tier", params.subscriptionTier);
    }
    const response = await fetch(
      `${BACKEND_URL}/admin/connection-engagement/weekly-kpis/trend?${query.toString()}`,
      {
        credentials: "include",
        signal: params.signal,
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load weekly session KPI trend",
        ),
      };
    }
    const record = raw as { data?: AdminWeeklySessionKpiTrendReport };
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
    const response = await fetch(
      `${BACKEND_URL}/admin/product-events/ip-address-clicks${suffix}`,
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
          "Failed to load IP address clicks",
        ),
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

export async function adminFetchReviewPromptSummary(params?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminReviewPromptSummary;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/product-events/review-prompts${suffix}`,
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
          "Failed to load review prompt metrics",
        ),
      };
    }
    const record = raw as { data?: AdminReviewPromptSummary };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchUserProfileSummary(params?: {
  audience?: AdminUserProfileAudience;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminUserProfileSummary;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.audience && params.audience !== "all") {
      query.set("audience", params.audience);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/user-profiles/summary${suffix}`,
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
          "Failed to load user profile summary",
        ),
      };
    }
    const record = raw as { data?: AdminUserProfileSummary };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchDomainInsightsMetrics(params?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{
  ok: boolean;
  data?: AdminDomainInsightsMetrics;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/contextual-email/metrics${suffix}`,
      { credentials: "include", signal: params?.signal },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load domain insights metrics",
        ),
      };
    }
    const record = raw as { data?: AdminDomainInsightsMetrics };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminSimulateDomainVisit(payload: {
  userId: string;
  domain: string;
}): Promise<{
  ok: boolean;
  data?: { success: boolean; scheduled: boolean; reason?: string };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/contextual-email/simulate-visit`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Simulate visit failed"),
      };
    }
    return {
      ok: true,
      data: raw as { success: boolean; scheduled: boolean; reason?: string },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminListDomainEmailRules(): Promise<{
  ok: boolean;
  data?: AdminDomainEmailRule[];
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/domain-email-rules`, {
      credentials: "include",
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load domain rules"),
      };
    }
    const record = raw as { data?: AdminDomainEmailRule[] };
    return { ok: true, data: record.data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminCreateDomainEmailRule(
  payload: CreateDomainEmailRulePayload,
): Promise<{ ok: boolean; data?: AdminDomainEmailRule; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/domain-email-rules`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to create rule"),
      };
    }
    const record = raw as { data?: AdminDomainEmailRule };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminUpdateDomainEmailRule(
  id: string,
  payload: UpdateDomainEmailRulePayload,
): Promise<{ ok: boolean; data?: AdminDomainEmailRule; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/domain-email-rules/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to update rule"),
      };
    }
    const record = raw as { data?: AdminDomainEmailRule };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminDeleteDomainEmailRule(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/domain-email-rules/${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to delete rule"),
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

export interface AudiencePreset {
  id:
    | "all_users"
    | "has_us_bank_account"
    | "no_us_bank_account"
    | "receives_direct_deposit"
    | "self_employed"
    | "business_owner"
    | "interested_in_starting_business"
    | "custom";
  label: string;
}

export type AudiencePresetId = AudiencePreset["id"];

export interface AudienceCustomRule {
  questionKey:
    | "us_bank_account"
    | "direct_deposit_income"
    | "entrepreneurship_interest_2026";
  value: string;
}

export interface AudienceTargeting {
  presets: AudiencePresetId[];
  customRules?: {
    logic: "or" | "and";
    rules: AudienceCustomRule[];
  };
}

export interface AudienceTargetingPreview {
  context: "perks" | "broadcast";
  totalAudience: number;
  matchingRecipients: number;
  matchPercentage: number;
  profileTargeting: AudienceTargeting;
  deliverability?: BroadcastEmailAudience;
  optedInCount?: number;
}

export async function adminFetchAudienceTargetingOptions(): Promise<{
  ok: boolean;
  data?: {
    presets: AudiencePreset[];
    questions: {
      key: string;
      label: string;
      category: string;
      options: { value: string; label: string }[];
    }[];
  };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/audience-targeting/options`,
      {
        credentials: "include",
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load audience options",
        ),
      };
    }
    const record = raw as {
      data?: {
        presets: AudiencePreset[];
        questions: {
          key: string;
          label: string;
          category: string;
          options: { value: string; label: string }[];
        }[];
      };
    };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminPreviewAudienceTargeting(payload: {
  context: "perks" | "broadcast";
  deliverability?: BroadcastEmailAudience;
  profileTargeting?: AudienceTargeting;
}): Promise<{
  ok: boolean;
  data?: AudienceTargetingPreview;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/audience-targeting/preview`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to preview audience"),
      };
    }
    const record = raw as { data?: AudienceTargetingPreview };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export interface AdminPerk {
  id: string;
  title: string;
  partnerName: string | null;
  category: PerkCategory;
  description: string;
  imageUrl: string | null;
  offerText: string;
  redemptionType: PerkRedemptionType;
  redemptionUrl: string | null;
  couponCode: string | null;
  accessLevel: "free" | "paid" | "annual";
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  daysRemaining: number | null;
  status:
    | "active"
    | "scheduled"
    | "expired"
    | "cooling_off"
    | "eligible_for_readd";
  reactivationCount: number;
  lastExpiredAt: string | null;
  eligibleForReactivationAt: string | null;
  clonedFromPerkId: string | null;
  audienceTargeting: AudienceTargeting;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPerkRequestAggregate {
  serviceKey: string;
  serviceName: string;
  websiteUrl: string | null;
  category: string | null;
  requestCount: number;
  uniqueUsers: number;
  isHighDemand: boolean;
  demandScore: number;
  latestRequestedAt: string;
}

export interface AdminPerkReactivation {
  id: string;
  perkId: string;
  perkTitle?: string;
  action: "reactivate" | "clone";
  reactivatedAt: string;
  previousEndsAt: string | null;
  newStartsAt: string;
  newEndsAt: string | null;
  clonedPerkId: string | null;
  adminUser: { id: string; email: string; name: string | null } | null;
}

export interface CreateAdminPerkPayload {
  id: string;
  title: string;
  partnerName?: string;
  category: PerkCategory;
  description: string;
  imageUrl?: string;
  offerText: string;
  redemptionType?: PerkRedemptionType;
  redemptionUrl?: string;
  couponCode?: string;
  accessLevel?: "free" | "paid" | "annual";
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string | null;
  audienceTargeting?: AudienceTargeting;
}

export type UpdateAdminPerkPayload = Partial<{
  title: string;
  partnerName: string | null;
  category: PerkCategory;
  description: string;
  imageUrl: string | null;
  offerText: string;
  redemptionType: PerkRedemptionType;
  redemptionUrl: string | null;
  couponCode: string | null;
  accessLevel: "free" | "paid" | "annual";
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  audienceTargeting: AudienceTargeting;
}>;

export interface AdminPerksMetrics {
  from: string;
  to: string;
  pageViews: number;
  clicks: number;
  claimEvents: number;
  redemptions: number;
  clickThroughRate: number | null;
  claimRate: number | null;
  snoozeRate: number | null;
  notInterestedRate: number | null;
  lifecycle?: {
    snoozedNow: number;
    notInterestedNow: number;
    completedTotal: number;
    expiringIn7Days: number;
    expiringIn30Days: number;
    expiredCatalog: number;
    snoozesInWindow: number;
    dismissalsInWindow: number;
  };
  byPerk: {
    perkId: string;
    title: string;
    viewed: number;
    clicked: number;
    claimed: number;
    redemptions: number;
    clickRate: number | null;
    claimRate: number | null;
  }[];
}

export async function adminFetchPerksMetrics(params?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; data?: AdminPerksMetrics; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/metrics${suffix}`,
      { credentials: "include", signal: params?.signal },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load perk metrics"),
      };
    }
    const record = raw as { data?: AdminPerksMetrics };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminListPerks(options?: {
  includeInactive?: boolean;
}): Promise<{ ok: boolean; data?: AdminPerk[]; error?: string }> {
  try {
    const params = new URLSearchParams();
    params.set(
      "includeInactive",
      options?.includeInactive === false ? "false" : "true",
    );
    const query = params.toString();
    const response = await fetch(`${BACKEND_URL}/admin/perks?${query}`, {
      credentials: "include",
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load perks"),
      };
    }
    const record = raw as { data?: AdminPerk[] };
    return { ok: true, data: record.data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminCreatePerk(
  payload: CreateAdminPerkPayload,
): Promise<{ ok: boolean; data?: AdminPerk; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/perks`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to create perk"),
      };
    }
    const record = raw as { data?: AdminPerk };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminUpdatePerk(
  id: string,
  payload: UpdateAdminPerkPayload,
): Promise<{ ok: boolean; data?: AdminPerk; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to update perk"),
      };
    }
    const record = raw as { data?: AdminPerk };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminDeletePerk(id: string): Promise<{
  ok: boolean;
  softDeleted?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to delete perk"),
      };
    }
    const record = raw as {
      softDeleted?: boolean;
      message?: string;
    };
    return {
      ok: true,
      softDeleted: record.softDeleted,
      message: record.message,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminListExpiredPerks(): Promise<{
  ok: boolean;
  data?: AdminPerk[];
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/perks/expired`, {
      credentials: "include",
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load expired perks"),
      };
    }
    const record = raw as { data?: AdminPerk[] };
    return { ok: true, data: record.data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminListPerkRequests(options?: {
  sort?: "popular" | "newest" | "category" | "high_demand";
}): Promise<{
  ok: boolean;
  data?: AdminPerkRequestAggregate[];
  highDemandThreshold?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (options?.sort) params.set("sort", options.sort);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/requests${suffix}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load perk requests"),
      };
    }
    const record = raw as {
      data?: AdminPerkRequestAggregate[];
      highDemandThreshold?: number;
    };
    return {
      ok: true,
      data: record.data ?? [],
      highDemandThreshold: record.highDemandThreshold,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchPerkReactivations(
  perkId: string,
): Promise<{ ok: boolean; data?: AdminPerkReactivation[]; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/${encodeURIComponent(perkId)}/reactivations`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load reactivation history",
        ),
      };
    }
    const record = raw as { data?: AdminPerkReactivation[] };
    return { ok: true, data: record.data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchAllPerkReactivations(options?: {
  limit?: number;
}): Promise<{ ok: boolean; data?: AdminPerkReactivation[]; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/reactivations${suffix}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load reactivation history",
        ),
      };
    }
    const record = raw as { data?: AdminPerkReactivation[] };
    return { ok: true, data: record.data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminReactivatePerk(
  id: string,
  payload?: { startsAt?: string; endsAt?: string | null },
): Promise<{ ok: boolean; data?: AdminPerk; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/${encodeURIComponent(id)}/reactivate`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to reactivate perk"),
      };
    }
    const record = raw as { data?: AdminPerk };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminClonePerk(
  id: string,
  payload: { newId: string; startsAt?: string; endsAt?: string },
): Promise<{ ok: boolean; data?: AdminPerk; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/perks/${encodeURIComponent(id)}/clone`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to clone perk"),
      };
    }
    const record = raw as { data?: AdminPerk };
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
  const response = await fetch(
    `${BACKEND_URL}/admin/subscription/transfer-requests${q}`,
    {
      credentials: "include",
    },
  );
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

export async function adminListMembershipSharing(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search?.trim()) query.set("search", params.search.trim());
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/membership-sharing${suffix}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to list membership sharing",
        ),
      };
    }
    return { ok: true, data: raw };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list membership sharing",
    };
  }
}

export async function adminRevokeMembershipMember(
  subscriptionId: string,
  memberUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/membership-sharing/${encodeURIComponent(subscriptionId)}/members/${encodeURIComponent(memberUserId)}/revoke`,
      { method: "POST", credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to revoke member"),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to revoke member",
    };
  }
}

export async function adminUpdateMembershipSeatLimit(
  subscriptionId: string,
  seatLimit: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/membership-sharing/${encodeURIComponent(subscriptionId)}/seat-limit`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatLimit }),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to update seat limit"),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to update seat limit",
    };
  }
}

export async function acceptMembershipInvite(
  sessionToken: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/membership-sharing/accept`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to accept invitation"),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}

export async function fetchMembershipSharingDashboard(
  sessionToken: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/membership-sharing/dashboard`,
      {
        credentials: "include",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (response.status === 404) {
      return { ok: false, error: "Membership sharing is not enabled" };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load membership sharing",
        ),
      };
    }
    return { ok: true, data: raw };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load membership sharing",
    };
  }
}

export async function inviteMembershipMember(
  sessionToken: string,
  email: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/membership-sharing/invite`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to send invite"),
      };
    }
    return { ok: true, data: raw };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send invite",
    };
  }
}

export async function revokeMembershipMember(
  sessionToken: string,
  memberUserId: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/membership-sharing/members/${encodeURIComponent(memberUserId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to remove member"),
      };
    }
    return { ok: true, data: raw };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}

export async function revokeMembershipInvite(
  sessionToken: string,
  inviteId: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/membership-sharing/invites/${encodeURIComponent(inviteId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to cancel invite"),
      };
    }
    return { ok: true, data: raw };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to cancel invite",
    };
  }
}

export async function adminFetchChurnReport(params: {
  month: number;
  year: number;
}): Promise<{ ok: boolean; data?: AdminChurnReport; error?: string }> {
  try {
    const query = new URLSearchParams();
    query.set("month", String(params.month));
    query.set("year", String(params.year));
    const response = await fetch(
      `${BACKEND_URL}/admin/churn/monthly?${query.toString()}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load churn report"),
      };
    }
    const record = raw as { data?: AdminChurnReport };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchWeeklyChurnReport(params: {
  week: number;
  year: number;
  source?: AdminChurnSubscriptionSource;
}): Promise<{ ok: boolean; data?: AdminWeeklyChurnReport; error?: string }> {
  try {
    const query = new URLSearchParams();
    query.set("week", String(params.week));
    query.set("year", String(params.year));
    if (params.source && params.source !== "all") {
      query.set("source", params.source);
    }
    const response = await fetch(
      `${BACKEND_URL}/admin/churn/weekly?${query.toString()}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load weekly churn report",
        ),
      };
    }
    const record = raw as { data?: AdminWeeklyChurnReport };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchWeeklyChurnTrend(params: {
  from: string;
  to: string;
  source?: AdminChurnSubscriptionSource;
}): Promise<{
  ok: boolean;
  data?: AdminWeeklyChurnTrendReport;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    query.set("from", params.from);
    query.set("to", params.to);
    if (params.source && params.source !== "all") {
      query.set("source", params.source);
    }
    const response = await fetch(
      `${BACKEND_URL}/admin/churn/weekly/trend?${query.toString()}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load weekly churn trend",
        ),
      };
    }
    const record = raw as { data?: AdminWeeklyChurnTrendReport };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchChurnTrend(params: {
  from: string;
  to: string;
}): Promise<{ ok: boolean; data?: AdminChurnTrendReport; error?: string }> {
  try {
    const query = new URLSearchParams();
    query.set("from", params.from);
    query.set("to", params.to);
    const response = await fetch(
      `${BACKEND_URL}/admin/churn/trend?${query.toString()}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load churn trend"),
      };
    }
    const record = raw as { data?: AdminChurnTrendReport };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
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
        limit: record.data?.limit ?? params?.limit ?? 50,
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
  // Also store for app deeplink (token is URL-encoded for safe query parsing)
  localStorage.setItem(APP_TOKEN_KEY, buildAuthDeepLink(sessionToken));
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
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        extractBackendErrorMessage(data, "Failed to delete account"),
      );
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
  provider: "google" | "apple",
  firebaseIdToken: string,
): Promise<{
  success: boolean;
  linkedProviders: { google: boolean; apple: boolean };
}> {
  const response = await fetch(`${BACKEND_URL}/auth/link-provider`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ provider, firebaseIdToken }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      extractBackendErrorMessage(
        errorData,
        `Failed to link provider: ${response.status}`,
      ),
    );
  }
  return response.json();
}

export async function unlinkProvider(
  sessionToken: string,
  provider: "google" | "apple",
): Promise<{
  success: boolean;
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  };
}> {
  const response = await fetch(`${BACKEND_URL}/auth/unlink-provider`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ provider }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      extractBackendErrorMessage(
        errorData,
        `Failed to unlink provider: ${response.status}`,
      ),
    );
  }
  return response.json();
}

export type BroadcastEmailAudience = "all_deliverable" | "opted_in";

export interface AdminBroadcastComposePayload {
  audience?: BroadcastEmailAudience;
  profileTargeting?: AudienceTargeting;
  subject: string;
  headline: string;
  body: string;
  preheader?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface AdminBroadcastAudienceSummary {
  audience: BroadcastEmailAudience;
  profileTargeting: AudienceTargeting;
  totalRecipients: number;
  totalAudience: number;
  matchingRecipients: number;
  matchPercentage: number;
  optedInCount: number;
}

export async function adminFetchBroadcastAudience(
  audience: BroadcastEmailAudience = "all_deliverable",
): Promise<{
  ok: boolean;
  data?: AdminBroadcastAudienceSummary;
  error?: string;
}> {
  try {
    const query = new URLSearchParams({ audience });
    const response = await fetch(
      `${BACKEND_URL}/admin/broadcast-email/audience?${query.toString()}`,
      { credentials: "include" },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(
          raw,
          "Failed to load broadcast audience",
        ),
      };
    }
    const record = raw as { data?: AdminBroadcastAudienceSummary };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminExportBroadcastAudienceCsv(
  audience: BroadcastEmailAudience = "all_deliverable",
  profileTargeting?: AudienceTargeting,
): Promise<{ ok: boolean; blob?: Blob; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/broadcast-email/audience/export`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          ...(profileTargeting ? { profileTargeting } : {}),
        }),
      },
    );
    if (!response.ok) {
      const raw: unknown = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to export audience"),
      };
    }
    const blob = await response.blob();
    return { ok: true, blob };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminSendBroadcastPreview(
  payload: AdminBroadcastComposePayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/broadcast-email/preview`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to send preview"),
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

export type BroadcastEmailJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface BroadcastEmailJobStatusPayload {
  jobId: string;
  status: BroadcastEmailJobStatus;
  audience: string;
  recipientCount: number;
  syncedContactCount: number;
  broadcastId: string | null;
  sendImmediately: boolean;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export async function adminSendBroadcastEmail(
  payload: AdminBroadcastComposePayload & {
    confirmRecipientCount: number;
    sendImmediately?: boolean;
  },
): Promise<{
  ok: boolean;
  data?: {
    jobId: string;
    status: BroadcastEmailJobStatus;
    recipientCount: number;
    sendImmediately: boolean;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/broadcast-email/send`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to send broadcast"),
      };
    }
    const record = raw as {
      data?: {
        jobId: string;
        status: BroadcastEmailJobStatus;
        recipientCount: number;
        sendImmediately: boolean;
      };
    };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function adminFetchBroadcastEmailJob(jobId: string): Promise<{
  ok: boolean;
  data?: BroadcastEmailJobStatusPayload;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/broadcast-email/jobs/${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        credentials: "include",
      },
    );
    const raw: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: extractBackendErrorMessage(raw, "Failed to load broadcast job"),
      };
    }
    const record = raw as { data?: BroadcastEmailJobStatusPayload };
    return { ok: true, data: record.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function getLinkedProviders(sessionToken: string): Promise<{
  success: boolean;
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  };
}> {
  const response = await fetch(`${BACKEND_URL}/user/linked-providers`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      extractBackendErrorMessage(
        errorData,
        `Failed to get linked providers: ${response.status}`,
      ),
    );
  }
  return response.json();
}
