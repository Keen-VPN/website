/** Survives OAuth/OTP round-trips when the post-login `redirect` query is dropped. */
export const PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY =
  "keenvpn_membership_invite_pending_accept";

export interface PendingMembershipInviteAcceptIntent {
  token?: string;
  inviteId?: string;
  acceptsBusinessBilling: boolean;
  acknowledgesPrivacy: boolean;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildMembershipInviteAcceptPath(intent: {
  token?: string;
  inviteId?: string;
}): string | null {
  const token = intent.token?.trim() ?? "";
  const inviteId = intent.inviteId?.trim() ?? "";
  if (token && inviteId) return null;
  if (inviteId) {
    return `/account/membership-sharing/accept?inviteId=${encodeURIComponent(inviteId)}`;
  }
  if (token) {
    return `/account/membership-sharing/accept?token=${encodeURIComponent(token)}`;
  }
  return null;
}

export function inviteAcceptIntentMatches(
  intent: PendingMembershipInviteAcceptIntent | null,
  token: string,
  inviteId: string,
): boolean {
  if (!intent) return false;
  if (token && inviteId) return false;
  if (inviteId) return intent.inviteId === inviteId;
  if (token) return intent.token === token;
  return false;
}

function parsePendingMembershipInviteAcceptIntent(
  raw: string | null,
): PendingMembershipInviteAcceptIntent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingMembershipInviteAcceptIntent;
    const token = isNonEmptyString(parsed?.token)
      ? parsed.token.trim()
      : undefined;
    const inviteId = isNonEmptyString(parsed?.inviteId)
      ? parsed.inviteId.trim()
      : undefined;
    if (
      Boolean(token) === Boolean(inviteId) ||
      parsed.acceptsBusinessBilling !== true ||
      parsed.acknowledgesPrivacy !== true
    ) {
      return null;
    }
    return {
      ...(token ? { token } : {}),
      ...(inviteId ? { inviteId } : {}),
      acceptsBusinessBilling: true,
      acknowledgesPrivacy: true,
    };
  } catch {
    return null;
  }
}

export function readPendingMembershipInviteAcceptIntent(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
): PendingMembershipInviteAcceptIntent | null {
  const fromPrimary = parsePendingMembershipInviteAcceptIntent(
    storage.getItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY),
  );
  if (fromPrimary) return fromPrimary;

  // Migrate mid-flow intents written before localStorage was adopted.
  if (typeof sessionStorage === "undefined") return null;
  try {
    const legacy = parsePendingMembershipInviteAcceptIntent(
      sessionStorage.getItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY),
    );
    if (!legacy) return null;
    storePendingMembershipInviteAcceptIntent(legacy, storage);
    sessionStorage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function storePendingMembershipInviteAcceptIntent(
  intent: PendingMembershipInviteAcceptIntent,
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage,
): void {
  storage.setItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY, JSON.stringify(intent));
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
    } catch {
      // Ignore quota / private-mode failures on the legacy key.
    }
  }
}

export function clearPendingMembershipInviteAcceptIntent(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  storage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
    } catch {
      // Ignore.
    }
  }
}

export function clearMatchingPendingMembershipInviteAcceptIntent(
  token: string,
  inviteId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
): void {
  if (
    inviteAcceptIntentMatches(
      readPendingMembershipInviteAcceptIntent(storage),
      token,
      inviteId,
    )
  ) {
    clearPendingMembershipInviteAcceptIntent(storage);
  }
}

/** Prefer this when the normal post-login redirect was lost or double-consumed. */
export function peekPendingMembershipInviteAcceptRedirect(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
): string | null {
  const intent = readPendingMembershipInviteAcceptIntent(storage);
  if (!intent) return null;
  return buildMembershipInviteAcceptPath(intent);
}
