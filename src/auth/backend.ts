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

    return {
      success: normalized.success,
      hasActiveSubscription: Boolean(normalized.subscription),
      subscription: normalized.subscription ?? null,
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
  users: {
    id: string;
    email: string;
    name: string | null;
    longestSessionSeconds: number;
    createdAt: string;
  }[];
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

export async function adminFetchUsersOverview(): Promise<{
  ok: boolean;
  data?: AdminUserOverview;
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/users/overview`, {
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

export async function adminListSubscriptions(limit = 50): Promise<{
  ok: boolean;
  data?: AdminSubscriptionListItem[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/subscription/subscriptions?limit=${encodeURIComponent(String(limit))}`,
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
    const record = raw as { data?: AdminSubscriptionListItem[] };
    return { ok: true, data: record.data ?? [] };
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
