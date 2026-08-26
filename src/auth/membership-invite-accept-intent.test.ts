import { afterEach, describe, expect, it } from "vitest";
import {
  PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY,
  PENDING_MEMBERSHIP_INVITE_ACCEPT_TTL_MS,
  buildMembershipInviteAcceptPath,
  clearPendingMembershipInviteAcceptIntent,
  peekPendingMembershipInviteAcceptRedirect,
  readPendingMembershipInviteAcceptIntent,
  storePendingMembershipInviteAcceptIntent,
} from "./membership-invite-accept-intent";

function createStorage() {
  const values = new Map<string, string>();
  return {
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

afterEach(() => {
  sessionStorage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
  localStorage.removeItem(PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY);
});

describe("membership invite accept intent", () => {
  it("builds accept paths for token or inviteId", () => {
    expect(buildMembershipInviteAcceptPath({ token: "abc" })).toBe(
      "/account/membership-sharing/accept?token=abc",
    );
    expect(buildMembershipInviteAcceptPath({ inviteId: "inv-1" })).toBe(
      "/account/membership-sharing/accept?inviteId=inv-1",
    );
    expect(
      buildMembershipInviteAcceptPath({ token: "abc", inviteId: "inv-1" }),
    ).toBeNull();
  });

  it("stores consented intent and peeks a resume redirect", () => {
    const storage = createStorage();
    storePendingMembershipInviteAcceptIntent(
      {
        token: "invite-token",
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: true,
      },
      storage,
    );

    expect(peekPendingMembershipInviteAcceptRedirect(storage)).toBe(
      "/account/membership-sharing/accept?token=invite-token",
    );
    expect(readPendingMembershipInviteAcceptIntent(storage)?.token).toBe(
      "invite-token",
    );
  });

  it("rejects intents without both consent flags", () => {
    const storage = createStorage();
    storage.setItem(
      PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY,
      JSON.stringify({
        token: "invite-token",
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: false,
        createdAt: Date.now(),
      }),
    );

    expect(readPendingMembershipInviteAcceptIntent(storage)).toBeNull();
    expect(peekPendingMembershipInviteAcceptRedirect(storage)).toBeNull();
  });

  it("rejects expired intents", () => {
    const storage = createStorage();
    storage.setItem(
      PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY,
      JSON.stringify({
        token: "invite-token",
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: true,
        createdAt: Date.now() - PENDING_MEMBERSHIP_INVITE_ACCEPT_TTL_MS - 1,
      }),
    );

    expect(readPendingMembershipInviteAcceptIntent(storage)).toBeNull();
  });

  it("rejects legacy intents without createdAt", () => {
    const storage = createStorage();
    storage.setItem(
      PENDING_MEMBERSHIP_INVITE_ACCEPT_KEY,
      JSON.stringify({
        token: "invite-token",
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: true,
      }),
    );

    expect(readPendingMembershipInviteAcceptIntent(storage)).toBeNull();
  });

  it("clears stored intent", () => {
    const storage = createStorage();
    storePendingMembershipInviteAcceptIntent(
      {
        inviteId: "inv-1",
        acceptsBusinessBilling: true,
        acknowledgesPrivacy: true,
      },
      storage,
    );
    clearPendingMembershipInviteAcceptIntent(storage);
    expect(peekPendingMembershipInviteAcceptRedirect(storage)).toBeNull();
  });
});
