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
 * In-memory copy so the dashboard banner survives React Strict Mode remounts
 * after sessionStorage is cleared post-commit. Cleared on dismiss and logout.
 */
let memoryNotice: BusinessInviteAutoAcceptedNotice | null | undefined;

export function storeBusinessInviteAutoAcceptedNotice(
  notice: BusinessInviteAutoAcceptedNotice,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  memoryNotice = notice;
  try {
    storage.setItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY, JSON.stringify(notice));
  } catch {
    /* private mode / blocked storage — banner simply won't show */
  }
}

export function readBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  if (memoryNotice !== undefined) return memoryNotice;

  let raw: string | null = null;
  try {
    raw = storage.getItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
  } catch {
    memoryNotice = null;
    return null;
  }
  if (!raw) {
    memoryNotice = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as BusinessInviteAutoAcceptedNotice;
    if (
      typeof parsed?.inviteId !== "string" ||
      typeof parsed?.subscriptionId !== "string"
    ) {
      memoryNotice = null;
      return null;
    }
    memoryNotice = {
      inviteId: parsed.inviteId,
      subscriptionId: parsed.subscriptionId,
      planName:
        typeof parsed.planName === "string" ? parsed.planName : null,
      pending: parsed.pending === true,
      billingDeferredUntil:
        typeof parsed.billingDeferredUntil === "string"
          ? parsed.billingDeferredUntil
          : null,
    };
    return memoryNotice;
  } catch {
    memoryNotice = null;
    return null;
  }
}

export function clearBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  memoryNotice = null;
  clearBusinessInviteAutoAcceptedStorage(storage);
}

/** Clears durable storage only; keeps in-memory peek for Strict Mode remounts. */
export function clearBusinessInviteAutoAcceptedStorage(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  try {
    storage.removeItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

/** Read for UI without clearing storage (clear storage after mount; full clear on dismiss/logout). */
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
