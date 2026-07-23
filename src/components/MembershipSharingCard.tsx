import { Users } from "lucide-react";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";

interface MembershipSharingCardProps {
  sessionToken: string;
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  return (
    <WorkspacePanel title="Team sharing" icon={Users}>
      <MembershipTeamPanel sessionToken={sessionToken} variant="full" />
    </WorkspacePanel>
  );
}
