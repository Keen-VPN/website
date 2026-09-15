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
 * Session-only lifecycle for default sessionStorage:
 * - pendingNotice: written on signup store
 * - activeDisplayNotice: locked on first peek so Strict Mode remount can
 *   re-read before the deferred release runs
 * - displayConsumed: set when the banner arms; after active display is
 *   released, further peeks return null (ordinary remount / revisit)
 *
 * We never cancel a pending release timer — cancelling made ordinary remounts
 * (loading flicker, leave/return in the same tick) look like Strict Mode and
 * re-show the banner.
 */
let pendingNotice: BusinessInviteAutoAcceptedNotice | null = null;
let activeDisplayNotice:
  | BusinessInviteAutoAcceptedNotice
  | null
  | undefined;
let displayConsumed = false;
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
    // New signup notice — reset one-time display lifecycle.
    if (pendingReleaseTimer) {
      clearTimeout(pendingReleaseTimer);
      pendingReleaseTimer = null;
    }
    displayConsumed = false;
    activeDisplayNotice = undefined;
    pendingNotice = normalized;
  }

  try {
    storage.setItem(
      BUSINESS_INVITE_AUTO_ACCEPTED_KEY,
      JSON.stringify(normalized),
    );
  } catch {
    /* private mode / blocked storage — banner simply won't show */
  }
}

export function readBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  if (!isDefaultSessionStorage(storage)) {
    return readRawFromStorage(storage);
  }

  // Locked for the current display generation (covers Strict Mode remount
  // before the deferred release macrotask runs).
  if (activeDisplayNotice !== undefined) {
    return activeDisplayNotice;
  }

  if (displayConsumed) {
    return null;
  }

  const notice = pendingNotice ?? readRawFromStorage(storage);
  activeDisplayNotice = notice;
  if (notice) pendingNotice = null;
  return notice;
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
  if (isDefaultSessionStorage(storage)) {
    if (pendingReleaseTimer) {
      clearTimeout(pendingReleaseTimer);
      pendingReleaseTimer = null;
    }
    pendingNotice = null;
    activeDisplayNotice = undefined;
    displayConsumed = false;
  }
  clearBusinessInviteAutoAcceptedStorage(storage);
}

/**
 * Call from the banner mount effect.
 * - Marks the notice consumed for future ordinary remounts / revisits
 * - Clears durable storage immediately
 * - On unmount, schedules release of the active display lock (never cancelled
 *   by a later remount — Strict Mode remount peeks before the macrotask runs;
 *   an ordinary remount after the macrotask sees displayConsumed and gets null)
 */
export function armBusinessInviteNoticeReleaseOnUnmount(): () => void {
  displayConsumed = true;
  pendingNotice = null;
  clearBusinessInviteAutoAcceptedStorage();
  return () => {
    scheduleActiveDisplayRelease();
  };
}

function scheduleActiveDisplayRelease(): void {
  // Do not reset/cancel an already-scheduled release — that is what allowed
  // ordinary remounts to preserve memory and re-show the banner.
  if (pendingReleaseTimer) return;
  pendingReleaseTimer = setTimeout(() => {
    pendingReleaseTimer = null;
    activeDisplayNotice = undefined;
  }, 0);
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
