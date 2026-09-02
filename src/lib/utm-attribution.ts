import { getRedditUuidCookie } from "@/lib/reddit-analytics";

export const UTM_ATTRIBUTION_STORAGE_KEY = "keen_utm_attribution";
export const FIRST_LANDING_ATTRIBUTION_STORAGE_KEY =
  "keen_first_landing_attribution";

const NON_ATTRIBUTABLE_LANDING_PREFIXES = [
  "/admin",
  "/signin",
  "/auth/magic",
  "/auth/debug",
  "/auth/verify-email",
  "/auth/change-email",
  "/email/preferences",
  "/email/unsubscribe",
  "/contextual-email",
  "/dashboard",
  "/account",
  "/oauth/consent",
  "/success",
  "/cancel",
  "/reactivate",
] as const;

export interface StoredUtmAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path: string;
  landing_url?: string;
  reddit_click_id?: string;
  reddit_uuid?: string;
  captured_at: string;
}

export interface UtmAttributionAuthPayload {
  utmAttribution?: StoredUtmAttribution;
}

interface StoredFirstLandingAttribution {
  landing_path: string;
  landing_url?: string;
  captured_at: string;
}

export function isAttributableLandingPath(path: string): boolean {
  const normalized = path.trim();
  if (!normalized.startsWith("/")) {
    return false;
  }
  return !NON_ATTRIBUTABLE_LANDING_PREFIXES.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function isValidStoredFirstLandingAttribution(
  value: unknown,
): value is StoredFirstLandingAttribution {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.landing_path === "string" &&
    Boolean(record.landing_path.trim()) &&
    typeof record.captured_at === "string" &&
    Boolean(record.captured_at.trim())
  );
}

export function getStoredFirstLandingAttribution(): StoredFirstLandingAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FIRST_LANDING_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredFirstLandingAttribution(parsed)) {
      localStorage.removeItem(FIRST_LANDING_ATTRIBUTION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(FIRST_LANDING_ATTRIBUTION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function setStoredFirstLandingAttribution(
  value: StoredFirstLandingAttribution,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      FIRST_LANDING_ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {
    /* private mode / blocked storage */
  }
}

/** First-touch capture for organic and campaign visitors without UTMs. */
export function captureFirstLandingPage(
  landingPath: string,
): StoredFirstLandingAttribution | null {
  if (typeof window === "undefined") return null;
  if (getStoredFirstLandingAttribution()) return null;
  if (!isAttributableLandingPath(landingPath)) return null;

  const captured: StoredFirstLandingAttribution = {
    landing_path: landingPath.slice(0, 500),
    landing_url:
      `${window.location.origin}${landingPath}`.slice(0, 2000),
    captured_at: new Date().toISOString(),
  };
  setStoredFirstLandingAttribution(captured);
  return captured;
}

/** Accept first landing forwarded from the static marketing site (cross-origin). */
export function captureFirstLandingFromSearch(
  search: string,
): StoredFirstLandingAttribution | null {
  if (typeof window === "undefined") return null;
  if (getStoredFirstLandingAttribution()) return null;

  const params = new URLSearchParams(search);
  const landingPath = trimParam(params.get("landing_path"));
  if (!landingPath || !isAttributableLandingPath(landingPath)) return null;

  const captured: StoredFirstLandingAttribution = {
    landing_path: landingPath,
    landing_url: trimParam(params.get("landing_url")),
    captured_at: trimParam(params.get("captured_at")) ?? new Date().toISOString(),
  };
  setStoredFirstLandingAttribution(captured);
  return captured;
}

function buildLandingAttributionFields():
  | Pick<StoredUtmAttribution, "landing_path" | "landing_url" | "captured_at">
  | null {
  const stored = getStoredUtmAttribution();
  if (stored) {
    return {
      landing_path: stored.landing_path,
      landing_url: stored.landing_url,
      captured_at: stored.captured_at,
    };
  }

  const firstLanding = getStoredFirstLandingAttribution();
  if (!firstLanding) return null;

  return {
    landing_path: firstLanding.landing_path,
    landing_url: firstLanding.landing_url,
    captured_at: firstLanding.captured_at,
  };
}

const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function trimParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 500) : undefined;
}

function buildAttributionFromSearch(
  search: string,
  landingPath: string,
): StoredUtmAttribution | null {
  const params = new URLSearchParams(search);
  const captured: StoredUtmAttribution = {
    landing_path: landingPath.slice(0, 500),
    landing_url:
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}${landingPath}`.slice(0, 2000),
    captured_at: new Date().toISOString(),
  };

  let hasUtm = false;
  for (const key of UTM_PARAM_KEYS) {
    const value = trimParam(params.get(key));
    if (value) {
      captured[key] = value;
      hasUtm = true;
    }
  }

  const redditClickId = trimParam(params.get("rdt_cid"));
  if (redditClickId) captured.reddit_click_id = redditClickId;

  return hasUtm || redditClickId ? captured : null;
}

function storedUtmParam(
  record: Record<string, unknown>,
  key: (typeof UTM_PARAM_KEYS)[number],
): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function hasStoredUtmValue(record: Record<string, unknown>): boolean {
  return (
    UTM_PARAM_KEYS.some((key) => Boolean(storedUtmParam(record, key))) ||
    (typeof record.reddit_click_id === "string" &&
      Boolean(record.reddit_click_id.trim())) ||
    (typeof record.reddit_uuid === "string" &&
      Boolean(record.reddit_uuid.trim()))
  );
}

function isValidStoredUtmAttribution(
  value: unknown,
): value is StoredUtmAttribution {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.landing_path !== "string" || !record.landing_path.trim()) {
    return false;
  }
  if (typeof record.captured_at !== "string" || !record.captured_at.trim()) {
    return false;
  }
  if (!hasStoredUtmValue(record)) return false;
  return true;
}

export function getStoredUtmAttribution(): StoredUtmAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredUtmAttribution(parsed)) {
      localStorage.removeItem(UTM_ATTRIBUTION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(UTM_ATTRIBUTION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function setStoredUtmAttribution(value: StoredUtmAttribution): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UTM_ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearUtmAttributionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(UTM_ATTRIBUTION_STORAGE_KEY);
    localStorage.removeItem(FIRST_LANDING_ATTRIBUTION_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

/** Parse UTMs from the current URL without reading or writing localStorage. */
export function parseUtmAttributionFromSearch(
  search: string,
  landingPath: string,
): StoredUtmAttribution | null {
  return buildAttributionFromSearch(search, landingPath);
}

/** First-touch capture: only stores the first UTM set seen in this browser. */
export function captureUtmFromSearch(
  search: string,
  landingPath: string,
): StoredUtmAttribution | null {
  if (typeof window === "undefined") return null;
  if (getStoredUtmAttribution()) return null;

  const captured = buildAttributionFromSearch(search, landingPath);
  if (!captured) return null;
  setStoredUtmAttribution(captured);
  return captured;
}

export function getUtmAttributionAuthPayload(): UtmAttributionAuthPayload {
  const stored = getStoredUtmAttribution();
  const landingFields = buildLandingAttributionFields();
  const redditUuid = getRedditUuidCookie();

  if (stored) {
    return {
      utmAttribution: {
        ...stored,
        ...(redditUuid ? { reddit_uuid: redditUuid } : {}),
      },
    };
  }

  if (!landingFields && !redditUuid) {
    return {};
  }

  return {
    utmAttribution: {
      ...(landingFields ?? {}),
      ...(redditUuid ? { reddit_uuid: redditUuid } : {}),
    } as StoredUtmAttribution,
  };
}

export function appendStoredUtmsToDeepLink(deepLink: string): string {
  const stored = getStoredUtmAttribution();
  const redditUuid = getRedditUuidCookie();
  if (!stored && !redditUuid) return deepLink;

  const attribution: Partial<StoredUtmAttribution> = {
    ...(stored ?? {}),
    ...(redditUuid ? { reddit_uuid: redditUuid } : {}),
  };

  try {
    const url = new URL(deepLink);
    const keys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "landing_path",
      "landing_url",
      "reddit_click_id",
      "reddit_uuid",
      "captured_at",
    ] as const;
    for (const key of keys) {
      const value = attribution[key];
      if (
        typeof value === "string" &&
        value.trim() &&
        !url.searchParams.has(key)
      ) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch {
    return deepLink;
  }
}
