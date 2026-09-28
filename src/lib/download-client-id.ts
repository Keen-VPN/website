/**
 * Stable anonymous id for linking pre-signup download CTA clicks to a later account.
 * Same-browser only; cleared storage / other devices cannot be linked.
 * Marketing site (vpnkeen.com) may hand this off via ?download_client_id= on portal links.
 */

export const DOWNLOAD_CLIENT_ID_STORAGE_KEY = "keen_download_client_id";
export const DOWNLOAD_CLIENT_ID_QUERY_PARAM = "download_client_id";

/** UUID or website fallback `dl-...` ids (aligned with backend normalizeDownloadClientId). */
const DOWNLOAD_CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

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

/**
 * First-touch capture from marketing → portal handoff query param.
 * Does not overwrite an id already stored in this browser.
 */
export function captureDownloadClientIdFromSearch(
  search: string,
): string | null {
  if (typeof window === "undefined") return null;

  const existing = readStoredDownloadClientId();
  if (existing) return existing;

  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search : `?${search}`,
    );
    const fromQuery = params.get(DOWNLOAD_CLIENT_ID_QUERY_PARAM)?.trim();
    if (!fromQuery || !isValidDownloadClientId(fromQuery)) return null;
    writeStoredDownloadClientId(fromQuery);
    return fromQuery;
  } catch {
    return null;
  }
}

export function getDownloadClientIdAuthPayload(): {
  downloadClientId?: string;
} {
  const id = getDownloadClientId();
  return id ? { downloadClientId: id } : {};
}
