import { createContext, useContext, type ReactNode } from "react";
import { useMembershipSharing } from "@/hooks/use-membership-sharing";

type MembershipSharingValue = ReturnType<typeof useMembershipSharing>;

const MembershipSharingContext = createContext<MembershipSharingValue | null>(
  null,
);

export function MembershipSharingProvider({
  sessionToken,
  children,
}: {
  sessionToken: string | null;
  children: ReactNode;
}) {
  const value = useMembershipSharing(sessionToken);
  return (
    <MembershipSharingContext.Provider value={value}>
      {children}
    </MembershipSharingContext.Provider>
  );
}

/** Shared Account-page membership dashboard (one network load for the tree). */
export function useMembershipSharingContext(): MembershipSharingValue {
  const shared = useContext(MembershipSharingContext);
  if (!shared) {
    throw new Error(
      "useMembershipSharingContext must be used within MembershipSharingProvider",
    );
  }
  return shared;
}
