export const PENDING_MEMBERSHIP_TRANSFER_KEY =
  "keenvpn_pending_membership_transfer";
export const MEMBERSHIP_TRANSFER_QUERY_KEY = "membershipTransfer";
export const MEMBERSHIP_TRANSFER_QUERY_VALUE = "1";

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

export function getMembershipTransferReturnUrl(): string {
  return `/pricing?${MEMBERSHIP_TRANSFER_QUERY_KEY}=${MEMBERSHIP_TRANSFER_QUERY_VALUE}`;
}

export function hasMembershipTransferQuery(
  searchParams: URLSearchParams,
): boolean {
  return (
    searchParams.get(MEMBERSHIP_TRANSFER_QUERY_KEY) ===
    MEMBERSHIP_TRANSFER_QUERY_VALUE
  );
}
