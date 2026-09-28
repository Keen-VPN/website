/**
 * Stable anonymous id for linking pre-signup download CTA clicks to a later account.
 * Same-browser only; cleared storage / other devices cannot be linked.
 */

export const DOWNLOAD_CLIENT_ID_STORAGE_KEY = "keen_download_client_id";

const DOWNLOAD_CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readStoredDownloadClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DOWNLOAD_CLIENT_ID_STORAGE_KEY)?.trim();
    if (!raw || !DOWNLOAD_CLIENT_ID_PATTERN.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeStoredDownloadClientId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DOWNLOAD_CLIENT_ID_STORAGE_KEY, id);
  } catch {
    /* private mode / blocked storage */
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
  writeStoredDownloadClientId(created);
  return created;
}

export function getDownloadClientIdAuthPayload(): {
  downloadClientId?: string;
} {
  const id = getDownloadClientId();
  return id ? { downloadClientId: id } : {};
}
