import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BUSINESS_INVITE_AUTO_ACCEPTED_KEY,
  armBusinessInviteNoticeReleaseOnUnmount,
  clearBusinessInviteAutoAcceptedNotice,
  clearBusinessInviteAutoAcceptedStorage,
  consumeBusinessInviteAutoAcceptedNotice,
  normalizeBusinessInviteAutoAcceptedNotice,
  peekBusinessInviteAutoAcceptedNotice,
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
  clearBusinessInviteAutoAcceptedNotice();
  vi.useRealTimers();
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

  it("normalizes before caching so planName.trim is always safe", () => {
    storeBusinessInviteAutoAcceptedNotice({
      inviteId: "inv-1",
      subscriptionId: "sub-1",
      // @ts-expect-error intentional malformed backend field
      planName: 42,
      pending: false,
    });
    expect(peekBusinessInviteAutoAcceptedNotice()?.planName).toBeNull();
    expect(
      normalizeBusinessInviteAutoAcceptedNotice({
        inviteId: "inv-1",
        subscriptionId: "sub-1",
        planName: 42,
      }),
    ).toEqual({
      inviteId: "inv-1",
      subscriptionId: "sub-1",
      planName: null,
      pending: false,
      billingDeferredUntil: null,
    });
  });

  it("swallows storage write failures", () => {
    const storage = {
      setItem() {
        throw new Error("quota exceeded");
      },
    };
    expect(() =>
      storeBusinessInviteAutoAcceptedNotice(
        {
          inviteId: "inv-1",
          subscriptionId: "sub-1",
          planName: null,
          pending: false,
        },
        storage,
      ),
    ).not.toThrow();
  });

  it("does not leak session memory into a custom storage argument", () => {
    storeBusinessInviteAutoAcceptedNotice({
      inviteId: "session-inv",
      subscriptionId: "sub-1",
      planName: "Business Annual",
      pending: false,
    });
    const other = createStorage();
    expect(readBusinessInviteAutoAcceptedNotice(other)).toBeNull();
  });

  it("releases memory after unmount settles so revisiting dashboard is clean", () => {
    vi.useFakeTimers();
    storeBusinessInviteAutoAcceptedNotice({
      inviteId: "inv-1",
      subscriptionId: "sub-1",
      planName: "Business Annual",
      pending: false,
    });

    const cleanup = armBusinessInviteNoticeReleaseOnUnmount();
    expect(peekBusinessInviteAutoAcceptedNotice()?.inviteId).toBe("inv-1");

    // Strict Mode remount: cancel scheduled release
    cleanup();
    const cleanup2 = armBusinessInviteNoticeReleaseOnUnmount();
    expect(peekBusinessInviteAutoAcceptedNotice()?.inviteId).toBe("inv-1");

    // Real leave: cleanup schedules release, no remount cancels it
    cleanup2();
    vi.runAllTimers();
    expect(peekBusinessInviteAutoAcceptedNotice()).toBeNull();
  });

  it("keeps custom-storage reads independent of session memory", () => {
    const storage = createStorage();
    storeBusinessInviteAutoAcceptedNotice(
      {
        inviteId: "inv-1",
        subscriptionId: "sub-1",
        planName: "Business Annual",
        pending: false,
      },
      storage,
    );
    clearBusinessInviteAutoAcceptedStorage(storage);
    expect(storage.getItem(BUSINESS_INVITE_AUTO_ACCEPTED_KEY)).toBeNull();
    expect(readBusinessInviteAutoAcceptedNotice(storage)).toBeNull();
  });
});
