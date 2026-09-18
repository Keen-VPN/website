import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import { getStoredUtmAttribution } from "@/lib/utm-attribution";

type PostHogPayload = Record<string, string | number | boolean | null>;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const INTERNAL_EMAIL_DOMAINS = (
  import.meta.env.VITE_POSTHOG_INTERNAL_EMAIL_DOMAINS ??
  "keenvpn.com,vpnkeen.com"
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const EVENT_DEDUPE_PREFIX = "keen_posthog_event:";
const INTERNAL_SESSION_KEY = "keen_posthog_internal";
const INTERNAL_PERSIST_KEY = "keen_posthog_internal_persist";
const IDENTIFIED_PERSIST_KEY = "keen_posthog_identified";
/** Must match SESSION_TOKEN_KEY in auth/backend.ts (avoid circular import). */
const SESSION_TOKEN_STORAGE_KEY = "sessionToken";

const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "session_id",
  "sessiontoken",
  "session_token",
  "code",
  "otp",
  "password",
  "secret",
  "access_token",
  "id_token",
  "refresh_token",
  "api_key",
  "apikey",
  "authorization",
  "auth",
  "email_token",
  "magic_token",
  "winback_token",
  "retention_token",
  "key",
]);

const URL_PROPERTY_KEYS = new Set([
  "$current_url",
  "$pathname",
  "$host",
  "$referrer",
  "$referring_domain",
  "$initial_current_url",
  "$session_entry_url",
  "path",
  "landing_url",
  "landing_path",
  "navigation_path",
  "url",
  "href",
]);

/** True for JWTs, percent-encoded blobs, and other long opaque credentials. */
export function looksLikeOpaqueCredential(segment: string): boolean {
  if (!segment || segment.length < 24) return false;
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }
  // JWT: header.payload.signature
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(decoded)) {
    return true;
  }
  // Long opaque segments including base64 / percent-encoding characters.
  // Allow `/` in the decoded form so credentials with encoded slashes still match.
  if (
    decoded.length >= 32 &&
    /^[A-Za-z0-9._%~+=/-]+$/.test(decoded)
  ) {
    return true;
  }
  // Also test the raw segment in case decode fails or changes shape.
  if (
    segment.length >= 32 &&
    /^[A-Za-z0-9._%~+=-]+$/.test(segment)
  ) {
    return true;
  }
  return false;
}

let initialized = false;
let capturingDisabled = false;

export function isPostHogConfigured(): boolean {
  return Boolean(POSTHOG_KEY);
}

export function resolveKeenEnvironment(): "development" | "staging" | "production" {
  if (typeof window === "undefined") {
    return import.meta.env.PROD ? "production" : "development";
  }

  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "development";
  }
  if (
    hostname.includes("staging") ||
    hostname.includes("deploy-preview") ||
    hostname.endsWith(".netlify.app")
  ) {
    return "staging";
  }
  return "production";
}

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain ? INTERNAL_EMAIL_DOMAINS.includes(domain) : false;
}

/** Strip credential-bearing query params and opaque path tokens before analytics. */
export function sanitizeAnalyticsLocation(
  pathname: string,
  search = "",
  origin = typeof window !== "undefined" ? window.location.origin : "",
): { path: string; url: string; pathname: string; host: string } {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  for (const key of [...params.keys()]) {
    const normalized = key.toLowerCase();
    if (
      SENSITIVE_QUERY_KEYS.has(normalized) ||
      normalized.includes("token") ||
      normalized.includes("secret") ||
      normalized.includes("password")
    ) {
      params.set(key, "[redacted]");
    }
  }

  const safePathname = pathname
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (looksLikeOpaqueCredential(segment)) {
        return "[redacted]";
      }
      return segment;
    })
    .join("/");

  const query = params.toString();
  const path = query ? `${safePathname}?${query}` : safePathname;
  let host = "";
  try {
    host = origin ? new URL(origin).host : "";
  } catch {
    host = "";
  }
  const url = origin ? `${origin}${path}` : path;
  return { path, url, pathname: safePathname, host };
}

export function sanitizeAnalyticsUrlValue(value: string): string {
  try {
    const parsed = new URL(value, typeof window !== "undefined" ? window.location.origin : "https://portal.vpnkeen.com");
    const sanitized = sanitizeAnalyticsLocation(
      parsed.pathname,
      parsed.search,
      `${parsed.protocol}//${parsed.host}`,
    );
    return sanitized.url;
  } catch {
    const [pathnamePart, searchPart = ""] = value.split("?");
    return sanitizeAnalyticsLocation(
      pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`,
      searchPart ? `?${searchPart}` : "",
    ).path;
  }
}

export function sanitizePostHogPayload(
  payload: PostHogPayload,
): PostHogPayload {
  const next: PostHogPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) {
      next[key] = value;
      continue;
    }
    if (typeof value === "string" && shouldSanitizeUrlProperty(key)) {
      next[key] = sanitizeAnalyticsUrlValue(value);
      continue;
    }
    next[key] = value;
  }
  return next;
}

function shouldSanitizeUrlProperty(key: string): boolean {
  const normalized = key.toLowerCase();
  if (URL_PROPERTY_KEYS.has(key) || URL_PROPERTY_KEYS.has(normalized)) {
    return true;
  }
  return (
    normalized.includes("url") ||
    normalized.includes("path") ||
    normalized.includes("href") ||
    normalized.includes("referrer")
  );
}

function sanitizeEventProperties(
  properties: Record<string, unknown> | undefined,
  options?: { includeLocationFallback?: boolean },
): Record<string, unknown> | undefined {
  if (!properties) return properties;
  const next: Record<string, unknown> = { ...properties };
  const includeLocationFallback = options?.includeLocationFallback !== false;
  const processedKeys = new Set<string>();

  const rawUrl =
    typeof next.$current_url === "string"
      ? next.$current_url
      : includeLocationFallback && typeof window !== "undefined"
        ? window.location.href
        : "";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const pathnameSource =
        typeof next.$pathname === "string" ? next.$pathname : parsed.pathname;
      const [pathnamePart, embeddedSearch = ""] = pathnameSource.split("?");
      const sanitized = sanitizeAnalyticsLocation(
        pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`,
        parsed.search || (embeddedSearch ? `?${embeddedSearch}` : ""),
        `${parsed.protocol}//${parsed.host}`,
      );
      next.$current_url = sanitized.url;
      next.$pathname = sanitized.pathname;
      next.$host = sanitized.host || parsed.host;
      processedKeys.add("$current_url");
      processedKeys.add("$pathname");
      processedKeys.add("$host");
      if (typeof next.path === "string") {
        const [pathPart, pathSearch = ""] = next.path.split("?");
        const sanitizedPath = sanitizeAnalyticsLocation(
          pathPart.startsWith("/") ? pathPart : `/${pathPart}`,
          pathSearch ? `?${pathSearch}` : "",
        );
        next.path = sanitizedPath.path;
        processedKeys.add("path");
      }
    } catch {
      // Parse failed — fall through so the loop can still redact string fields.
    }
  } else if (typeof next.$pathname === "string") {
    const [pathnamePart, searchPart = ""] = next.$pathname.split("?");
    const sanitized = sanitizeAnalyticsLocation(
      pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`,
      searchPart ? `?${searchPart}` : "",
    );
    next.$pathname = sanitized.pathname;
    processedKeys.add("$pathname");
  }

  // Re-sanitize other URL-like fields. Skip only keys this pass already
  // rewrote as path/host (not absolute URLs). Unprocessed path/$host still
  // need redaction when $current_url was absent or malformed.
  for (const [key, value] of Object.entries(next)) {
    if (processedKeys.has(key)) continue;
    if (typeof value !== "string" || !shouldSanitizeUrlProperty(key)) continue;

    if (key === "$pathname" || key === "path") {
      const [pathnamePart, searchPart = ""] = value.split("?");
      const sanitized = sanitizeAnalyticsLocation(
        pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`,
        searchPart ? `?${searchPart}` : "",
      );
      next[key] = key === "path" ? sanitized.path : sanitized.pathname;
      continue;
    }
    if (key === "$host") {
      // Host alone is not a credential bearer; leave as-is when unset above.
      continue;
    }
    next[key] = sanitizeAnalyticsUrlValue(value);
  }

  return next;
}

export function sanitizeCaptureResult(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: sanitizeEventProperties(event.properties, {
      includeLocationFallback: true,
    }),
    // Never inject current-page location into person properties.
    $set: sanitizeEventProperties(
      event.$set as Record<string, unknown> | undefined,
      { includeLocationFallback: false },
    ) as CaptureResult["$set"],
    $set_once: sanitizeEventProperties(
      event.$set_once as Record<string, unknown> | undefined,
      { includeLocationFallback: false },
    ) as CaptureResult["$set_once"],
  };
}

function shouldDisableCapturing(email?: string | null): boolean {
  if (typeof window === "undefined") return true;
  if (import.meta.env.DEV && import.meta.env.VITE_POSTHOG_ENABLE_DEV !== "true") {
    return true;
  }
  if (isInternalEmail(email)) {
    persistInternalOptOut();
    return true;
  }
  try {
    if (sessionStorage.getItem(INTERNAL_SESSION_KEY) === "1") return true;
    if (localStorage.getItem(INTERNAL_PERSIST_KEY) === "1") return true;
  } catch {
    /* storage blocked */
  }
  if (new URLSearchParams(window.location.search).get("ph_internal") === "1") {
    persistInternalOptOut();
    return true;
  }
  return false;
}

function persistInternalOptOut(): void {
  try {
    sessionStorage.setItem(INTERNAL_SESSION_KEY, "1");
    localStorage.setItem(INTERNAL_PERSIST_KEY, "1");
  } catch {
    /* storage blocked */
  }
}

function hasExistingSessionToken(): boolean {
  try {
    return Boolean(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function initializePostHog(options?: {
  email?: string | null;
}): boolean {
  if (typeof window === "undefined" || !POSTHOG_KEY) {
    return false;
  }

  if (initialized) {
    // Learned staff email after init — opt out without re-entering init.
    if (isInternalEmail(options?.email)) {
      applyInternalOptOut();
    }
    return true;
  }

  const environment = resolveKeenEnvironment();
  capturingDisabled = shouldDisableCapturing(options?.email);

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage+cookie",
    disable_session_recording: capturingDisabled,
    session_recording: capturingDisabled
      ? undefined
      : {
          maskAllInputs: true,
          maskTextSelector: "[data-ph-mask], [data-sensitive]",
        },
    before_send: sanitizeCaptureResult,
    loaded: (client) => {
      client.register({
        keen_environment: environment,
        keen_app: "portal",
      });
      if (capturingDisabled) {
        client.register({ is_internal: true });
        client.opt_out_capturing();
      }
    },
  });

  initialized = true;
  return true;
}

export function getAttributionProperties(): PostHogPayload {
  const stored = getStoredUtmAttribution();
  if (!stored) return {};

  return sanitizePostHogPayload({
    utm_source: stored.utm_source ?? null,
    utm_medium: stored.utm_medium ?? null,
    utm_campaign: stored.utm_campaign ?? null,
    utm_content: stored.utm_content ?? null,
    utm_term: stored.utm_term ?? null,
    landing_path: stored.landing_path,
    landing_url: stored.landing_url ?? null,
  });
}

function applyInternalOptOut(): void {
  persistInternalOptOut();
  if (!initialized) return;
  posthog.register({ is_internal: true });
  if (!capturingDisabled) {
    posthog.opt_out_capturing();
    capturingDisabled = true;
  }
}

export function markInternalTraffic(email?: string | null): void {
  if (!isInternalEmail(email)) return;

  if (!initialized) {
    initializePostHog({ email });
  }
  applyInternalOptOut();
}

export function identifyPostHogUser(
  userId: string,
  properties: PostHogPayload = {},
): void {
  if (!initializePostHog() || capturingDisabled) return;
  posthog.identify(userId, {
    ...sanitizePostHogPayload(properties),
    keen_environment: resolveKeenEnvironment(),
  });
  try {
    localStorage.setItem(IDENTIFIED_PERSIST_KEY, "1");
  } catch {
    /* storage blocked */
  }
}

/** True when we previously identified a KeenVPN user in this browser. */
export function hadIdentifiedPostHogUser(): boolean {
  try {
    return localStorage.getItem(IDENTIFIED_PERSIST_KEY) === "1";
  } catch {
    return false;
  }
}

export function resetPostHogUser(): void {
  if (!initialized) return;
  posthog.reset();
  try {
    localStorage.removeItem(IDENTIFIED_PERSIST_KEY);
  } catch {
    /* storage blocked */
  }
}

export function trackPostHogEvent(
  eventName: string,
  payload: PostHogPayload = {},
  dedupeKey?: string,
  options?: { persistent?: boolean },
): void {
  if (!initializePostHog() || capturingDisabled) return;
  if (dedupeKey && wasTracked(dedupeKey, options?.persistent === true)) return;

  posthog.capture(eventName, {
    ...getAttributionProperties(),
    ...sanitizePostHogPayload(payload),
  });
  if (dedupeKey) markTracked(dedupeKey, options?.persistent === true);
}

export function trackPostHogPageView(pathname: string, search = ""): void {
  if (!initializePostHog() || capturingDisabled) return;

  const { path, url, pathname: safePathname, host } =
    sanitizeAnalyticsLocation(pathname, search);
  posthog.capture("$pageview", {
    ...getAttributionProperties(),
    path,
    $current_url: url,
    $pathname: safePathname,
    $host: host,
  });
  trackPostHogEvent("website_visit", { path });
}

export type SignupMethod = "google" | "apple" | "email";

export type AppDownloadPlatform =
  | "windows"
  | "macos"
  | "ios"
  | "android"
  | "chrome"
  | "unknown";

const PENDING_SIGNUP_METHOD_KEY = "keen_pending_signup_method";
const PENDING_SIGNUP_METHOD_TTL_MS = 30 * 60 * 1000;

function isReturningSignupBrowser(): boolean {
  return hadIdentifiedPostHogUser() || hasExistingSessionToken();
}

/** Opt out before capture when the email is already known (staff / internal). */
function applyEmailAwareOptOut(email?: string | null): void {
  if (!email) return;
  initializePostHog({ email });
  markInternalTraffic(email);
}

export function clearPostHogPendingSignupMethod(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_METHOD_KEY);
  } catch {
    /* storage blocked */
  }
}

function readPendingSignupMethod(): SignupMethod | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_METHOD_KEY);
    if (!raw) return null;

    // Legacy plain method string
    if (raw === "google" || raw === "apple" || raw === "email") {
      return raw;
    }

    const parsed = JSON.parse(raw) as {
      method?: string;
      queuedAt?: number;
    };
    if (
      parsed.method !== "google" &&
      parsed.method !== "apple" &&
      parsed.method !== "email"
    ) {
      clearPostHogPendingSignupMethod();
      return null;
    }
    if (
      typeof parsed.queuedAt === "number" &&
      Date.now() - parsed.queuedAt > PENDING_SIGNUP_METHOD_TTL_MS
    ) {
      clearPostHogPendingSignupMethod();
      return null;
    }
    return parsed.method;
  } catch {
    clearPostHogPendingSignupMethod();
    return null;
  }
}

export function trackPostHogSignupStarted(email?: string | null): void {
  // Staff email must still opt out even when we skip funnel capture for
  // returning browsers (existing identify/session markers).
  applyEmailAwareOptOut(email);
  // Returning / already-authenticated users re-entering SignIn should not
  // inflate the signup_started funnel step.
  if (isReturningSignupBrowser()) return;
  trackPostHogEvent("signup_started", {}, "signup_started", {
    persistent: true,
  });
}

/**
 * Queue OAuth method until after auth reveals email (so staff can opt out first).
 * No-op for returning browsers.
 */
export function queuePostHogSignupMethodSelected(method: SignupMethod): void {
  if (isReturningSignupBrowser()) return;
  try {
    sessionStorage.setItem(
      PENDING_SIGNUP_METHOD_KEY,
      JSON.stringify({ method, queuedAt: Date.now() }),
    );
  } catch {
    /* storage blocked */
  }
}

/** Flush a queued OAuth signup_method_selected after identity/email is known. */
export function flushPostHogSignupMethodSelected(
  email?: string | null,
): void {
  const method = readPendingSignupMethod();
  clearPostHogPendingSignupMethod();
  if (!method) return;
  applyEmailAwareOptOut(email);
  trackPostHogEvent("signup_method_selected", {
    signup_method: method,
    platform: "web",
  });
}

export function trackPostHogSignupMethodSelected(
  method: SignupMethod,
  properties: PostHogPayload = {},
  options?: { email?: string | null },
): void {
  // Email / magic-link path replaces any stale OAuth queue from a cancelled popup.
  clearPostHogPendingSignupMethod();
  applyEmailAwareOptOut(options?.email);
  if (isReturningSignupBrowser()) return;
  // Once per browser for email so OTP/magic-link retries do not inflate the funnel.
  const dedupeKey =
    method === "email" ? "signup_method_selected:email" : undefined;
  trackPostHogEvent(
    "signup_method_selected",
    {
      ...properties,
      signup_method: method,
      platform: "web",
    },
    dedupeKey,
    dedupeKey ? { persistent: true } : undefined,
  );
}

export function trackPostHogEmailVerified(
  properties: PostHogPayload = {},
  options?: { email?: string | null; isNewSignup?: boolean },
): void {
  try {
    applyEmailAwareOptOut(options?.email);
    // Call before storeSessionToken so returning browsers are still detectable.
    if (isReturningSignupBrowser()) return;
    // Existing accounts signing in via OTP/magic link must not inflate signup funnels.
    if (options?.isNewSignup !== true) return;
    trackPostHogEvent("email_verified", {
      ...properties,
      platform: "web",
    });
  } catch {
    /* analytics must not block sign-in */
  }
}

export function trackPostHogAppDownloadClicked(
  downloadPlatform: AppDownloadPlatform,
  properties: PostHogPayload = {},
): void {
  trackPostHogEvent("app_download_clicked", {
    ...properties,
    download_platform: downloadPlatform,
    platform: "web",
  });
}

export function trackPostHogAccountCreated(userId: string): void {
  identifyPostHogUser(userId);
  trackPostHogEvent(
    "user_account_created",
    { user_id: userId },
    `user_account_created:${userId}`,
    { persistent: true },
  );
}

export function trackPostHogTrialStarted(userId: string, conversionId?: string): void {
  identifyPostHogUser(userId);
  trackPostHogEvent(
    "trial_started",
    {
      user_id: userId,
      conversion_id: conversionId ?? null,
    },
    `trial_started:${userId}`,
    { persistent: true },
  );
}

export function trackPostHogSubscriptionStarted(
  userId: string,
  properties: PostHogPayload = {},
): void {
  identifyPostHogUser(userId);
  trackPostHogEvent(
    "subscription_started",
    {
      user_id: userId,
      ...properties,
    },
    `subscription_started:${userId}`,
    { persistent: true },
  );
}

export function forwardProductEventToPostHog(
  eventName: string,
  payload: PostHogPayload = {},
): void {
  trackPostHogEvent(eventName, sanitizePostHogPayload(payload));
}

function storageGet(key: string, persistent: boolean): string | null {
  try {
    return (persistent ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, persistent: boolean): void {
  try {
    (persistent ? localStorage : sessionStorage).setItem(key, "1");
  } catch {
    /* storage blocked */
  }
}

function wasTracked(key: string, persistent: boolean): boolean {
  return storageGet(`${EVENT_DEDUPE_PREFIX}${key}`, persistent) === "1";
}

function markTracked(key: string, persistent: boolean): void {
  storageSet(`${EVENT_DEDUPE_PREFIX}${key}`, persistent);
}
