export const PENDING_MEMBERSHIP_TRANSFER_KEY =
  "keenvpn_pending_membership_transfer";
export const MEMBERSHIP_TRANSFER_QUERY_KEY = "membershipTransfer";
export const MEMBERSHIP_TRANSFER_QUERY_VALUE = "1";
export const MEMBERSHIP_TRANSFER_SOURCE_KEY = "source";
export const MEMBERSHIP_TRANSFER_SOURCE_SWITCH = "switch";

export function setPendingMembershipTransfer(
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(PENDING_MEMBERSHIP_TRANSFER_KEY, "true");
}

export function consumePendingMembershipTransfer(
  storage: Pick<Storage, "getItem" | "removeItem"> = localStorage,
): boolean {
  const pending = storage.getItem(PENDING_MEMBERSHIP_TRANSFER_KEY) === "true";
  if (pending) {
    storage.removeItem(PENDING_MEMBERSHIP_TRANSFER_KEY);
  }
  return pending;
}

export function getMembershipTransferReturnUrl(
  source?: typeof MEMBERSHIP_TRANSFER_SOURCE_SWITCH,
): string {
  const params = new URLSearchParams();
  params.set(MEMBERSHIP_TRANSFER_QUERY_KEY, MEMBERSHIP_TRANSFER_QUERY_VALUE);
  if (source) {
    params.set(MEMBERSHIP_TRANSFER_SOURCE_KEY, source);
  }
  return `/pricing?${params.toString()}`;
}

export function isSwitchPageMembershipTransfer(
  searchParams: URLSearchParams,
): boolean {
  return (
    searchParams.get(MEMBERSHIP_TRANSFER_SOURCE_KEY) ===
    MEMBERSHIP_TRANSFER_SOURCE_SWITCH
  );
}

export function hasMembershipTransferQuery(
  searchParams: URLSearchParams,
): boolean {
  return (
    searchParams.get(MEMBERSHIP_TRANSFER_QUERY_KEY) ===
    MEMBERSHIP_TRANSFER_QUERY_VALUE
  );
}
