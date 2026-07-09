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

let cachedFlags: ClientFeatureFlags | null = null;
let inFlight: Promise<ClientFeatureFlags> | null = null;

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

export async function fetchClientFeatureFlags(): Promise<ClientFeatureFlags> {
  if (cachedFlags) return cachedFlags;
  inFlight ??= fetch(`${BACKEND_URL}/config/features`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return DEFAULT_FLAGS;
      const raw: unknown = await response.json().catch(() => ({}));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return DEFAULT_FLAGS;
      }
      const record = raw as Record<string, unknown>;
      return {
        workflowsEnabled: readBoolean(record, "workflowsEnabled"),
        aiAssistantEnabled: readBoolean(record, "aiAssistantEnabled"),
      };
    })
    .catch(() => DEFAULT_FLAGS)
    .then((flags) => {
      cachedFlags = flags;
      inFlight = null;
      return flags;
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
