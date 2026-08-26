/** Tab-scoped resume intent for consented invite Accept → sign-in. */
export const PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY =
  "keenvpn_membership_invite_pending_accept";

/** Abandoned Accept→sign-in flows expire so later logins are not hijacked. */
export const PENDING_MEMBERSHIP_INVITE_ACCEPT_TTL_MS = 2 * 60 * 60 * 1000;

export interface PendingMembershipInviteAcceptIntent {
  token?: string;
  inviteId?: string;
  acceptsBusinessBilling: boolean;
  acknowledgesPrivacy: boolean;
  /** Epoch ms when Accept was clicked; used for expiry cleanup. */
  createdAt?: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function defaultIntentStorage(): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> {
  return sessionStorage;
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
  nowMs = Date.now(),
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

    const createdAt =
      typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
        ? parsed.createdAt
        : null;
    // Legacy entries without createdAt are treated as expired so abandoned
    // origin-wide localStorage intents cannot redirect later logins forever.
    if (
      createdAt === null ||
      nowMs - createdAt > PENDING_MEMBERSHIP_INVITE_ACCEPT_TTL_MS
    ) {
      return null;
    }

    return {
      ...(token ? { token } : {}),
      ...(inviteId ? { inviteId } : {}),
      acceptsBusinessBilling: true,
      acknowledgesPrivacy: true,
      createdAt,
    };
  } catch {
    return null;
  }
}

function clearLegacyLocalStorageIntent(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
  } catch {
    // Ignore private-mode / quota failures.
  }
}

export function readPendingMembershipInviteAcceptIntent(
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
  > = defaultIntentStorage(),
): PendingMembershipInviteAcceptIntent | null {
  const fromPrimary = parsePendingMembershipInviteAcceptIntent(
    storage.getItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY),
  );
  if (fromPrimary) return fromPrimary;

  // Drop stale/invalid primary entries and any leftover origin-wide copies.
  try {
    storage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
  } catch {
    // Ignore.
  }
  clearLegacyLocalStorageIntent();
  return null;
}

export function storePendingMembershipInviteAcceptIntent(
  intent: PendingMembershipInviteAcceptIntent,
  storage: Pick<Storage, "setItem" | "removeItem"> = defaultIntentStorage(),
): void {
  const payload: PendingMembershipInviteAcceptIntent = {
    ...intent,
    createdAt:
      typeof intent.createdAt === "number" && Number.isFinite(intent.createdAt)
        ? intent.createdAt
        : Date.now(),
  };
  storage.setItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY, JSON.stringify(payload));
  // Prefer tab-scoped sessionStorage; never leave a durable localStorage copy.
  clearLegacyLocalStorageIntent();
}

export function clearPendingMembershipInviteAcceptIntent(
  storage: Pick<Storage, "removeItem"> = defaultIntentStorage(),
): void {
  storage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
  clearLegacyLocalStorageIntent();
}

export function clearMatchingPendingMembershipInviteAcceptIntent(
  token: string,
  inviteId: string,
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
  > = defaultIntentStorage(),
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
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
  > = defaultIntentStorage(),
): string | null {
  const intent = readPendingMembershipInviteAcceptIntent(storage);
  if (!intent) return null;
  return buildMembershipInviteAcceptPath(intent);
}
