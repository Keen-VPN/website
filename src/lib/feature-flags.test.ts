import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchClientFeatureFlags,
  resetFeatureFlags,
} from "./feature-flags";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe("fetchClientFeatureFlags reset races", () => {
  beforeEach(() => {
    resetFeatureFlags();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetFeatureFlags();
    vi.unstubAllGlobals();
  });

  it("ignores stale in-flight responses after reset", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    vi.mocked(fetch).mockReturnValue(fetchPromise as Promise<Response>);

    const first = fetchClientFeatureFlags();
    resetFeatureFlags();

    resolveFetch(
      jsonResponse({
        workflowsEnabled: true,
        aiAssistantEnabled: true,
      }),
    );

    await expect(first).resolves.toEqual({
      workflowsEnabled: false,
      aiAssistantEnabled: false,
    });

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        workflowsEnabled: false,
        aiAssistantEnabled: true,
      }),
    );

    await expect(fetchClientFeatureFlags()).resolves.toEqual({
      workflowsEnabled: false,
      aiAssistantEnabled: true,
    });
  });

  it("does not let a stale response overwrite a newer cache", async () => {
    let resolveFirst!: (value: Response) => void;
    const firstFetch = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetch).mockReturnValueOnce(firstFetch as Promise<Response>);

    const staleRequest = fetchClientFeatureFlags();
    resetFeatureFlags();

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        workflowsEnabled: false,
        aiAssistantEnabled: true,
      }),
    );

    const freshRequest = fetchClientFeatureFlags();
    await expect(freshRequest).resolves.toEqual({
      workflowsEnabled: false,
      aiAssistantEnabled: true,
    });

    resolveFirst(
      jsonResponse({
        workflowsEnabled: true,
        aiAssistantEnabled: true,
      }),
    );

    await expect(staleRequest).resolves.toEqual({
      workflowsEnabled: false,
      aiAssistantEnabled: true,
    });
    await expect(fetchClientFeatureFlags()).resolves.toEqual({
      workflowsEnabled: false,
      aiAssistantEnabled: true,
    });
  });

  it("aborts the outstanding request on reset", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });

    void fetchClientFeatureFlags();
    expect(capturedSignal?.aborted).toBe(false);

    resetFeatureFlags();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
