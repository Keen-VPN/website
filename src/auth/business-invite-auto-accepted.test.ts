import { afterEach, describe, expect, it } from "vitest";
import {
  BUSINESS_INVITE_AUTO_ACCEPTED_KEY,
  clearBusinessInviteAutoAcceptedNotice,
  consumeBusinessInviteAutoAcceptedNotice,
  readBusinessInviteAutoAcceptedNotice,
  storeBusinessInviteAutoAcceptedNotice,
} from "./business-invite-auto-accepted";

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
  sessionStorage.removeItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY);
});

describe("business invite auto-accepted notice", () => {
  it("stores and consumes a valid notice once", () => {
    const storage = createStorage();
    storeBusinessInviteAutoAcceptedNotice(
      {
        inviteId: "inv-1",
        subscriptionId: "sub-1",
        planName: "Business Annual",
        pending: false,
        billingDeferredUntil: null,
      },
      storage,
    );

    expect(readBusinessInviteAutoAcceptedNotice(storage)?.inviteId).toBe(
      "inv-1",
    );
    expect(consumeBusinessInviteAutoAcceptedNotice(storage)?.planName).toBe(
      "Business Annual",
    );
    expect(readBusinessInviteAutoAcceptedNotice(storage)).toBeNull();
  });

  it("rejects malformed payloads", () => {
    const storage = createStorage();
    storage.setItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY, '{"inviteId":1}');
    expect(readBusinessInviteAutoAcceptedNotice(storage)).toBeNull();
    clearBusinessInviteAutoAcceptedNotice(storage);
  });
});
