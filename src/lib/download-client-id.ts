/**
 * Stable anonymous id for linking pre-signup download CTA clicks to a later account.
 * Same-browser only; cleared storage / other devices cannot be linked.
 * Marketing site (vpnkeen.com) hands this off via signed query params on portal links.
 */

import { parseValidHandoffCapturedAt } from "@/lib/landing-handoff";

export const DOWNLOAD_CLIENT_ID_STORAGE_KEY = "keen_download_client_id";
export const DOWNLOAD_CLIENT_ID_SOURCE_KEY = "keen_download_client_id_source";
export const DOWNLOAD_CLIENT_ID_QUERY_PARAM = "download_client_id";
export const DOWNLOAD_CLIENT_ID_AT_PARAM = "download_client_at";
export const DOWNLOAD_CLIENT_ID_SIG_PARAM = "download_client_sig";

/** UUID or website fallback `dl-...` ids (aligned with backend normalizeDownloadClientId). */
const DOWNLOAD_CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;
const DOWNLOAD_CLIENT_SIG_PATTERN = /^[0-9a-f]{32,256}$/i;

type DownloadClientIdSource = "local" | "handoff";

function isValidDownloadClientId(value: string): boolean {
  return DOWNLOAD_CLIENT_ID_PATTERN.test(value);
}

function readStoredDownloadClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DOWNLOAD_CLIENT_ID_STORAGE_KEY)?.trim();
    if (!raw || !isValidDownloadClientId(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

function readStoredDownloadClientIdSource(): DownloadClientIdSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)?.trim();
    if (raw === "local" || raw === "handoff") return raw;
    return null;
  } catch {
    return null;
  }
}

function writeStoredDownloadClientId(
  id: string,
  source: DownloadClientIdSource,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DOWNLOAD_CLIENT_ID_STORAGE_KEY, id);
    localStorage.setItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY, source);
  } catch {
    /* private mode / blocked storage */
  }
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** HMAC-SHA256 hex over `${clientId}|${capturedAt}` (same payload as marketing). */
export async function verifyDownloadClientHandoffSignature(input: {
  clientId: string;
  capturedAt: string;
  signature: string;
  secret?: string | null;
}): Promise<boolean> {
  const secret = (input.secret ?? import.meta.env.VITE_LANDING_HANDOFF_SECRET)
    ?.toString()
    .trim();
  if (!secret) return false;
  if (!DOWNLOAD_CLIENT_SIG_PATTERN.test(input.signature)) return false;
  if (
    typeof crypto === "undefined" ||
    !crypto.subtle ||
    typeof TextEncoder === "undefined"
  ) {
    return false;
  }

  try {
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
      new TextEncoder().encode(`${input.clientId}|${input.capturedAt}`),
    );
    return timingSafeEqualHex(bytesToHex(mac), input.signature.toLowerCase());
  } catch {
    return false;
  }
}

/** Existing id only — do not invent one at signup time. */
export function getDownloadClientId(): string | null {
  return readStoredDownloadClientId();
}

/** Create + persist a client id when recording a download click. */
export function getOrCreateDownloadClientId(): string {
  const existing = readStoredDownloadClientId();
  if (existing) return existing;
  const created =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  writeStoredDownloadClientId(created, "local");
  return created;
}

/**
 * Capture from marketing → portal signed handoff query params.
 * Requires download_client_id + download_client_at + download_client_sig;
 * rejects unsigned / forged values so crafted links cannot overwrite the local id.
 * First-touch among verified handoffs; a verified handoff replaces a portal-local id.
 */
export async function captureDownloadClientIdFromSearch(
  search: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search : `?${search}`,
    );
    const fromQuery = params.get(DOWNLOAD_CLIENT_ID_QUERY_PARAM)?.trim();
    const existing = readStoredDownloadClientId();
    if (!fromQuery || !isValidDownloadClientId(fromQuery)) {
      return existing;
    }

    const capturedAt = parseValidHandoffCapturedAt(
      params.get(DOWNLOAD_CLIENT_ID_AT_PARAM)?.trim(),
    );
    const signature = params.get(DOWNLOAD_CLIENT_ID_SIG_PARAM)?.trim();
    if (!capturedAt || !signature) {
      return existing;
    }

    const verified = await verifyDownloadClientHandoffSignature({
      clientId: fromQuery,
      capturedAt,
      signature,
    });
    if (!verified) {
      return existing;
    }

    const source = readStoredDownloadClientIdSource();
    // Keep first verified handoff; allow handoff to replace portal-local CTA ids.
    if (existing && source === "handoff") return existing;

    writeStoredDownloadClientId(fromQuery, "handoff");
    return fromQuery;
  } catch {
    return readStoredDownloadClientId();
  }
}

export function getDownloadClientIdAuthPayload(): {
  downloadClientId?: string;
} {
  const id = getDownloadClientId();
  return id ? { downloadClientId: id } : {};
}
