import posthog from "posthog-js";
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

function shouldDisableCapturing(): boolean {
  if (typeof window === "undefined") return true;
  if (import.meta.env.DEV && import.meta.env.VITE_POSTHOG_ENABLE_DEV !== "true") {
    return true;
  }
  try {
    if (sessionStorage.getItem(INTERNAL_SESSION_KEY) === "1") return true;
  } catch {
    /* storage blocked */
  }
  if (new URLSearchParams(window.location.search).get("ph_internal") === "1") {
    try {
      sessionStorage.setItem(INTERNAL_SESSION_KEY, "1");
    } catch {
      /* storage blocked */
    }
    return true;
  }
  return false;
}

export function initializePostHog(): boolean {
  if (typeof window === "undefined" || !POSTHOG_KEY || initialized) {
    return initialized;
  }

  const environment = resolveKeenEnvironment();
  capturingDisabled = shouldDisableCapturing();

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask], [data-sensitive]",
    },
    loaded: (client) => {
      client.register({
        keen_environment: environment,
        keen_app: "portal",
      });
      if (capturingDisabled) {
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

  return {
    utm_source: stored.utm_source ?? null,
    utm_medium: stored.utm_medium ?? null,
    utm_campaign: stored.utm_campaign ?? null,
    utm_content: stored.utm_content ?? null,
    utm_term: stored.utm_term ?? null,
    landing_path: stored.landing_path,
    landing_url: stored.landing_url ?? null,
  };
}

export function markInternalTraffic(email?: string | null): void {
  if (!initializePostHog()) return;

  const internal = isInternalEmail(email);
  if (!internal) return;

  try {
    sessionStorage.setItem(INTERNAL_SESSION_KEY, "1");
  } catch {
    /* storage blocked */
  }

  posthog.register({ is_internal: true });
  if (!capturingDisabled) {
    posthog.opt_out_capturing();
    capturingDisabled = true;
  }
}

export function identifyPostHogUser(
  userId: string,
  properties: PostHogPayload = {},
): void {
  if (!initializePostHog() || capturingDisabled) return;
  posthog.identify(userId, {
    ...properties,
    keen_environment: resolveKeenEnvironment(),
  });
}

export function resetPostHogUser(): void {
  if (!initialized) return;
  posthog.reset();
}

export function trackPostHogEvent(
  eventName: string,
  payload: PostHogPayload = {},
  dedupeKey?: string,
): void {
  if (!initializePostHog() || capturingDisabled) return;
  if (dedupeKey && wasTracked(dedupeKey)) return;

  posthog.capture(eventName, {
    ...getAttributionProperties(),
    ...payload,
  });
  if (dedupeKey) markTracked(dedupeKey);
}

export function trackPostHogPageView(path: string): void {
  if (!initializePostHog() || capturingDisabled) return;

  posthog.capture("$pageview", {
    ...getAttributionProperties(),
    path,
    $current_url: window.location.href,
  });
  trackPostHogEvent("website_visit", { path });
}

export function trackPostHogSignupStarted(): void {
  trackPostHogEvent("signup_started", {}, "signup_started");
}

export function trackPostHogAccountCreated(userId: string): void {
  identifyPostHogUser(userId);
  trackPostHogEvent(
    "user_account_created",
    { user_id: userId },
    `user_account_created:${userId}`,
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
    `trial_started:${conversionId ?? userId}`,
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
  );
}

export function forwardProductEventToPostHog(
  eventName: string,
  payload: PostHogPayload = {},
): void {
  trackPostHogEvent(eventName, payload);
}

function wasTracked(key: string): boolean {
  try {
    return sessionStorage.getItem(`${EVENT_DEDUPE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function markTracked(key: string): void {
  try {
    sessionStorage.setItem(`${EVENT_DEDUPE_PREFIX}${key}`, "1");
  } catch {
    /* storage blocked */
  }
}
