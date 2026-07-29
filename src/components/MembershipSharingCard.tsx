import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";

interface MembershipSharingCardProps {
  sessionToken: string;
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  // Tab header already names the section — render the panel without a nested title.
  return <MembershipTeamPanel sessionToken={sessionToken} variant="full" />;
}
