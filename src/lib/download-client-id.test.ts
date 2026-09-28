import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDownloadClientId,
  getOrCreateDownloadClientId,
  getDownloadClientIdAuthPayload,
  captureDownloadClientIdFromSearch,
  verifyDownloadClientHandoffSignature,
  DOWNLOAD_CLIENT_ID_STORAGE_KEY,
  DOWNLOAD_CLIENT_ID_SOURCE_KEY,
} from "./download-client-id";

const HANDOFF_SECRET = "test-landing-handoff-secret";
const OTHER_SECRET = "other-landing-handoff-secret";

async function hmacHex(
  secret: string,
  clientId: string,
  at: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${clientId}|${at}`),
  );
  return Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signedHandoffSearch(
  clientId: string,
  at = "2026-04-21T12:00:00.000Z",
  secret = HANDOFF_SECRET,
) {
  const signature = await hmacHex(secret, clientId, at);
  return `?download_client_id=${encodeURIComponent(clientId)}&download_client_at=${encodeURIComponent(at)}&download_client_sig=${signature}`;
}

describe("download-client-id", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom's Crypto has no subtle — use Node's WebCrypto for HMAC tests.
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: webcrypto,
    });
    vi.stubEnv("VITE_LANDING_HANDOFF_SECRET", HANDOFF_SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns null when nothing stored", () => {
    expect(getDownloadClientId()).toBeNull();
    expect(getDownloadClientIdAuthPayload()).toEqual({});
  });

  it("creates and reuses a stable client id", () => {
    const first = getOrCreateDownloadClientId();
    const second = getOrCreateDownloadClientId();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_STORAGE_KEY)).toBe(first);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("local");
    expect(getDownloadClientIdAuthPayload()).toEqual({
      downloadClientId: first,
    });
  });

  it("captures signed download_client_id from marketing handoff query", async () => {
    const handedOff = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(
      await captureDownloadClientIdFromSearch(
        await signedHandoffSearch(handedOff),
      ),
    ).toBe(handedOff);
    expect(getDownloadClientId()).toBe(handedOff);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("handoff");
    expect(getDownloadClientIdAuthPayload()).toEqual({
      downloadClientId: handedOff,
    });
  });

  it("captures marketing dl- fallback handoff ids when signed", async () => {
    const handedOff = "dl-1a2b3c";
    expect(
      await captureDownloadClientIdFromSearch(
        await signedHandoffSearch(handedOff),
      ),
    ).toBe(handedOff);
    expect(getDownloadClientId()).toBe(handedOff);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("handoff");
  });

  it("lets a verified marketing handoff replace a portal-local id", async () => {
    getOrCreateDownloadClientId();
    const handedOff = "11111111-2222-4333-8444-555555555555";
    expect(
      await captureDownloadClientIdFromSearch(
        await signedHandoffSearch(handedOff),
      ),
    ).toBe(handedOff);
    expect(getDownloadClientId()).toBe(handedOff);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("handoff");
  });

  it("keeps first-touch among verified handoff ids", async () => {
    const first = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(
      await captureDownloadClientIdFromSearch(await signedHandoffSearch(first)),
    ).toBe(first);
    expect(
      await captureDownloadClientIdFromSearch(
        await signedHandoffSearch("11111111-2222-4333-8444-555555555555"),
      ),
    ).toBe(first);
    expect(getDownloadClientId()).toBe(first);
  });

  it("ignores unsigned or forged handoff values", async () => {
    const local = getOrCreateDownloadClientId();
    expect(
      await captureDownloadClientIdFromSearch(
        "?download_client_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      ),
    ).toBe(local);
    expect(
      await captureDownloadClientIdFromSearch(
        await signedHandoffSearch(
          "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          "2026-04-21T12:00:00.000Z",
          OTHER_SECRET,
        ),
      ),
    ).toBe(local);
    expect(getDownloadClientId()).toBe(local);
  });

  it("ignores invalid handoff values", async () => {
    expect(
      await captureDownloadClientIdFromSearch("?download_client_id=not valid!"),
    ).toBeNull();
    expect(getDownloadClientId()).toBeNull();
  });

  it("verifies handoff signatures against the shared secret", async () => {
    const clientId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const capturedAt = "2026-04-21T12:00:00.000Z";
    const wrongSecretSig = await hmacHex(OTHER_SECRET, clientId, capturedAt);
    await expect(
      verifyDownloadClientHandoffSignature({
        clientId,
        capturedAt,
        signature: wrongSecretSig,
        secret: HANDOFF_SECRET,
      }),
    ).resolves.toBe(false);

    const search = await signedHandoffSearch(clientId, capturedAt);
    const sig = new URLSearchParams(search).get("download_client_sig");
    expect(sig).toBeTruthy();
    await expect(
      verifyDownloadClientHandoffSignature({
        clientId,
        capturedAt,
        signature: sig ?? "",
        secret: HANDOFF_SECRET,
      }),
    ).resolves.toBe(true);
  });
});
