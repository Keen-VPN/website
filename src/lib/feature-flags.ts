import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/auth/backend";

export interface ClientFeatureFlags {
  workflowsEnabled: boolean;
  aiAssistantEnabled: boolean;
}

const DEFAULT_FLAGS: ClientFeatureFlags = {
  workflowsEnabled: false,
  aiAssistantEnabled: false,
};

const FLAGS_CACHE_TTL_MS = 5 * 60 * 1000;
const FLAGS_FETCH_TIMEOUT_MS = 5000;

let cachedFlags: ClientFeatureFlags | null = null;
let cachedAt = 0;
let cacheGeneration = 0;
let inFlight: Promise<ClientFeatureFlags> | null = null;
let inFlightGeneration = -1;
let inFlightAbort: AbortController | null = null;

function isExplicitlyTrue(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

export function resetFeatureFlags(): void {
  cacheGeneration += 1;
  cachedFlags = null;
  cachedAt = 0;
  inFlightAbort?.abort();
  inFlightAbort = null;
  inFlight = null;
  inFlightGeneration = -1;
}

function fetchWithTimeout(
  url: string,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    FLAGS_FETCH_TIMEOUT_MS,
  );

  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  if (externalSignal?.aborted) {
    controller.abort();
  }

  return fetch(url, { method: "GET", signal: controller.signal }).finally(
    () => {
      window.clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    },
  );
}

export async function fetchClientFeatureFlags(): Promise<ClientFeatureFlags> {
  const now = Date.now();
  if (cachedFlags && now - cachedAt < FLAGS_CACHE_TTL_MS) return cachedFlags;

  const requestGeneration = cacheGeneration;
  if (inFlight && inFlightGeneration === requestGeneration) {
    return inFlight;
  }

  const abortController = new AbortController();
  inFlightAbort = abortController;
  inFlightGeneration = requestGeneration;

  const request = fetchWithTimeout(
    `${BACKEND_URL}/config/features`,
    abortController.signal,
  )
    .then(async (response) => {
      if (requestGeneration !== cacheGeneration) return null;
      if (!response.ok) return null;
      const raw: unknown = await response.json().catch(() => null);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
      }
      const record = raw as Record<string, unknown>;
      return {
        workflowsEnabled: isExplicitlyTrue(record, "workflowsEnabled"),
        aiAssistantEnabled: isExplicitlyTrue(record, "aiAssistantEnabled"),
      };
    })
    .catch(() => null)
    .then((flags) => {
      if (requestGeneration !== cacheGeneration) {
        return cachedFlags ?? DEFAULT_FLAGS;
      }
      if (flags) {
        cachedFlags = flags;
        cachedAt = Date.now();
      }
      if (inFlightGeneration === requestGeneration) {
        inFlight = null;
        inFlightAbort = null;
        inFlightGeneration = -1;
      }
      return cachedFlags ?? DEFAULT_FLAGS;
    });

  inFlight = request;
  return request;
}

export function useFeatureFlags(): ClientFeatureFlags {
  const [flags, setFlags] = useState<ClientFeatureFlags>(
    cachedFlags ?? DEFAULT_FLAGS,
  );

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void fetchClientFeatureFlags().then((nextFlags) => {
        if (!cancelled) setFlags(nextFlags);
      });
    };

    refresh();

    const interval = window.setInterval(refresh, FLAGS_CACHE_TTL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return flags;
}
