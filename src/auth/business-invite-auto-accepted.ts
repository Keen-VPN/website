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

export function storeBusinessInviteAutoAcceptedNotice(
  notice: BusinessInviteAutoAcceptedNotice,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  try {
    storage.setItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY, JSON.stringify(notice));
  } catch {
    /* private mode / blocked storage — banner simply won't show */
  }
}

export function readBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BusinessInviteAutoAcceptedNotice;
    if (
      typeof parsed?.inviteId !== "string" ||
      typeof parsed?.subscriptionId !== "string"
    ) {
      return null;
    }
    return {
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
  } catch {
    return null;
  }
}

export function clearBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  try {
    storage.removeItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function consumeBusinessInviteAutoAcceptedNotice(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
): BusinessInviteAutoAcceptedNotice | null {
  const notice = readBusinessInviteAutoAcceptedNotice(storage);
  if (notice) clearBusinessInviteAutoAcceptedNotice(storage);
  return notice;
}
