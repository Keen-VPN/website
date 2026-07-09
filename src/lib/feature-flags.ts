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
let inFlight: Promise<ClientFeatureFlags> | null = null;

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    FLAGS_FETCH_TIMEOUT_MS,
  );

  return fetch(url, { method: "GET", signal: controller.signal }).finally(() =>
    window.clearTimeout(timeout),
  );
}

export async function fetchClientFeatureFlags(): Promise<ClientFeatureFlags> {
  const now = Date.now();
  if (cachedFlags && now - cachedAt < FLAGS_CACHE_TTL_MS) return cachedFlags;

  inFlight ??= fetchWithTimeout(`${BACKEND_URL}/config/features`)
    .then(async (response) => {
      if (!response.ok) return null;
      const raw: unknown = await response.json().catch(() => ({}));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
      }
      const record = raw as Record<string, unknown>;
      return {
        workflowsEnabled: readBoolean(record, "workflowsEnabled"),
        aiAssistantEnabled: readBoolean(record, "aiAssistantEnabled"),
      };
    })
    .catch(() => null)
    .then((flags) => {
      if (flags) {
        cachedFlags = flags;
        cachedAt = Date.now();
      }
      inFlight = null;
      return cachedFlags ?? DEFAULT_FLAGS;
    });

  return inFlight;
}

export function useFeatureFlags(): ClientFeatureFlags {
  const [flags, setFlags] = useState<ClientFeatureFlags>(
    cachedFlags ?? DEFAULT_FLAGS,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchClientFeatureFlags().then((nextFlags) => {
      if (!cancelled) setFlags(nextFlags);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return flags;
}
