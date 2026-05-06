import { describe, expect, it } from "vitest";
import {
  consumePendingMembershipTransfer,
  getMembershipTransferReturnUrl,
  hasMembershipTransferQuery,
  MEMBERSHIP_TRANSFER_QUERY_KEY,
  setPendingMembershipTransfer,
} from "@/auth/membership-transfer-flow";

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("membership transfer pending flow", () => {
  it("logged-out click stores flag and can redirect to login", () => {
    const storage = makeStorage();
    setPendingMembershipTransfer(storage);
    expect(storage.getItem("keenvpn_pending_membership_transfer")).toBe("true");
  });

  it("successful login consumes flag and returns to pricing", () => {
    const storage = makeStorage({ keenvpn_pending_membership_transfer: "true" });
    expect(consumePendingMembershipTransfer(storage)).toBe(true);
    expect(storage.getItem("keenvpn_pending_membership_transfer")).toBeNull();
    expect(getMembershipTransferReturnUrl()).toBe("/pricing?membershipTransfer=1");
  });

  it("pricing auto-opens modal for authenticated user with membershipTransfer=1", () => {
    const search = new URLSearchParams(
      `${MEMBERSHIP_TRANSFER_QUERY_KEY}=1&foo=bar`,
    );
    expect(hasMembershipTransferQuery(search)).toBe(true);
  });

  it("logged-out users do not auto-open modal without membershipTransfer=1", () => {
    const search = new URLSearchParams("foo=bar");
    expect(hasMembershipTransferQuery(search)).toBe(false);
  });
});
