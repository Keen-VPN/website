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

export function getStoredUtmAttribution(): StoredUtmAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUtmAttribution;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
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

/** First-touch capture: only stores the first UTM set seen in this browser. */
export function captureUtmFromSearch(
  search: string,
  landingPath: string,
): void {
  if (typeof window === "undefined") return;
  if (getStoredUtmAttribution()) return;

  const params = new URLSearchParams(
    search.startsWith("?") ? search : `?${search}`,
  );
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

  if (!hasUtm) return;
  setStoredUtmAttribution(captured);
}

export function getUtmAttributionAuthPayload():
  | { utmAttribution: StoredUtmAttribution }
  | Record<string, never> {
  const stored = getStoredUtmAttribution();
  if (!stored) return {};
  return { utmAttribution: stored };
}
