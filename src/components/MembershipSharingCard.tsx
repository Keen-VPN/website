import { Users } from "lucide-react";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";
import { useMembershipSharingContext } from "@/contexts/MembershipSharingContext";

interface MembershipSharingCardProps {
  sessionToken: string;
}

function panelTitle(role: string | undefined): string {
  if (role === "member") return "Your team";
  if (role === "transfer_pending") return "Joining a team";
  return "Team sharing";
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  const { dashboard } = useMembershipSharingContext();
  return (
    <WorkspacePanel title={panelTitle(dashboard?.role)} icon={Users}>
      <MembershipTeamPanel sessionToken={sessionToken} variant="full" />
    </WorkspacePanel>
  );
}
