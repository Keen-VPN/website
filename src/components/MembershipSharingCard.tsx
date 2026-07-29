import { Users } from "lucide-react";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";
import { useMembershipSharingContext } from "@/contexts/MembershipSharingContext";

interface MembershipSharingCardProps {
  sessionToken: string;
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  const { dashboard } = useMembershipSharingContext();
  const isInviteeView =
    dashboard?.role === "member" || dashboard?.role === "transfer_pending";

  // Invitees only need the status line + leave action — skip nested team titles.
  if (isInviteeView) {
    return <MembershipTeamPanel sessionToken={sessionToken} variant="full" />;
  }

  return (
    <WorkspacePanel title="Team sharing" icon={Users}>
      <MembershipTeamPanel sessionToken={sessionToken} variant="full" />
    </WorkspacePanel>
  );
}
