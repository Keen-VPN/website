/** Session notice after Business invite auto-accept on signup. */
export const BUSINESS_INVITE_AUTO_ACCEPTED_KEY =
  "keenvpn_business_invite_auto_accepted";

export interface BusinessInviteAutoAcceptedNotice {
  inviteId: string;
  subscriptionId: string;
  planName: string | null;
  pending: boolean;
  billingDeferredUntil?: string | null;
}

/**
 * In-memory copy for the default sessionStorage only. Scoped so custom
 * storages (tests) never share or bypass each other.
 */
let sessionMemoryNotice:
  | BusinessInviteAutoAcceptedNotice
  | null
  | undefined;

/** Cancels delayed full-clear scheduled on dashboard unmount (Strict Mode). */
let pendingReleaseTimer: ReturnType<typeof setTimeout> | null = null;

function isDefaultSessionStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | Pick<
    Storage,
    "getItem"
  > | Pick<Storage, "setItem"> | Pick<Storage, "removeItem">,
): boolean {
  return typeof sessionStorage !== "undefined" && storage === sessionStorage;
}

export function normalizeBusinessInviteAutoAcceptedNotice(
  notice: unknown,
): BusinessInviteAutoAcceptedNotice | null {
  if (!notice || typeof notice !== "object") return null;
  const parsed = notice as Partial<BusinessInviteAutoAcceptedNotice>;
  if (
    typeof parsed.inviteId !== "string" ||
    typeof parsed.subscriptionId !== "string"
  ) {
    return null;
  }
  return {
    inviteId: parsed.inviteId,
    subscriptionId: parsed.subscriptionId,
    planName: typeof parsed.planName === "string" ? parsed.planName : null,
    pending: parsed.pending === true,
    billingDeferredUntil:
      typeof parsed.billingDeferredUntil === "string"
        ? parsed.billingDeferredUntil
        : null,
  };
}

function readRawFromStorage(
  storage: Pick<Storage, "getItem">,
): BusinessInviteAutoAcceptedNotice | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return normalizeBusinessInviteAutoAcceptedNotice(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function storeBusinessInviteAutoAcceptedNotice(
  notice: BusinessInviteAutoAcceptedNotice,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  const normalized = normalizeBusinessInviteAutoAcceptedNotice(notice);
  if (!normalized) return;

  if (isDefaultSessionStorage(storage)) {
    cancelScheduledBusinessInviteNoticeRelease();
    sessionMemoryNotice = normalized;
  }

  try {
    storage.setItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY, JSON.stringify(normalized));
  } catch {
    /* private mode / blocked storage — banner simply won't show */
  }
}

export function readBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  if (isDefaultSessionStorage(storage) && sessionMemoryNotice !== undefined) {
    return sessionMemoryNotice;
  }

  const fromStorage = readRawFromStorage(storage);
  if (isDefaultSessionStorage(storage)) {
    sessionMemoryNotice = fromStorage;
  }
  return fromStorage;
}

export function clearBusinessInviteAutoAcceptedStorage(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  try {
    storage.removeItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  cancelScheduledBusinessInviteNoticeRelease();
  if (isDefaultSessionStorage(storage)) {
    sessionMemoryNotice = null;
  }
  clearBusinessInviteAutoAcceptedStorage(storage);
}

/**
 * After the banner has committed, drop durable storage. Keep session memory
 * until the dashboard unmount settles (so Strict Mode remount still peeks),
 * then fully clear so revisiting /dashboard does not re-show the banner.
 */
export function armBusinessInviteNoticeReleaseOnUnmount(): () => void {
  cancelScheduledBusinessInviteNoticeRelease();
  clearBusinessInviteAutoAcceptedStorage();
  return () => {
    scheduleBusinessInviteNoticeRelease();
  };
}

function scheduleBusinessInviteNoticeRelease(): void {
  if (pendingReleaseTimer) clearTimeout(pendingReleaseTimer);
  pendingReleaseTimer = setTimeout(() => {
    pendingReleaseTimer = null;
    sessionMemoryNotice = null;
    try {
      sessionStorage.removeItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
    } catch {
      /* blocked storage */
    }
  }, 0);
}

function cancelScheduledBusinessInviteNoticeRelease(): void {
  if (pendingReleaseTimer) {
    clearTimeout(pendingReleaseTimer);
    pendingReleaseTimer = null;
  }
}

/** Read for UI without clearing storage. */
export function peekBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  return readBusinessInviteAutoAcceptedNotice(storage);
}

export function consumeBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  const notice = readBusinessInviteAutoAcceptedNotice(storage);
  if (notice) clearBusinessInviteAutoAcceptedNotice(storage);
  return notice;
}
