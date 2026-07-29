import { Users } from "lucide-react";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";
import { useMembershipSharing } from "@/hooks/use-membership-sharing";

interface MembershipSharingCardProps {
  sessionToken: string;
}

function panelTitle(role: string | undefined): string {
  if (role === "member") return "Your team membership";
  if (role === "transfer_pending") return "Business transfer";
  return "Team sharing";
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  const { dashboard } = useMembershipSharing(sessionToken);
  return (
    <WorkspacePanel title={panelTitle(dashboard?.role)} icon={Users}>
      <MembershipTeamPanel sessionToken={sessionToken} variant="full" />
    </WorkspacePanel>
  );
}
