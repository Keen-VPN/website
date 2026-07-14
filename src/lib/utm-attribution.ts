export const UTM_ATTRIBUTION_STORAGE_KEY = "keen_utm_attribution";

export interface StoredUtmAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path: string;
  captured_at: string;
}

export interface UtmAttributionAuthPayload {
  utmAttribution?: StoredUtmAttribution;
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

  return hasUtm ? captured : null;
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
  return UTM_PARAM_KEYS.some((key) => Boolean(storedUtmParam(record, key)));
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
  } catch {
    /* private mode / blocked storage */
  }
}

/** Parse UTMs from the current URL without reading or writing localStorage. */
export function parseUtmAttributionFromSearch(
  search: string,
  landingPath: string,
): StoredUtmAttribution | null {
  if (typeof window === "undefined") return null;
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
  if (!stored) return {};
  return { utmAttribution: stored };
}

export function appendStoredUtmsToDeepLink(deepLink: string): string {
  const stored = getStoredUtmAttribution();
  if (!stored) return deepLink;

  try {
    const url = new URL(deepLink);
    const keys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "landing_path",
      "captured_at",
    ] as const;
    for (const key of keys) {
      const value = stored[key];
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
