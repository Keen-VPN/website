import { Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { workspaceEmptyState } from "@/components/workspace/workspace-ui";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";
import { useMembershipSharing } from "@/hooks/use-membership-sharing";

interface MembershipSharingCardProps {
  sessionToken: string;
}

export function MembershipSharingCard({
  sessionToken,
}: MembershipSharingCardProps) {
  const { loading, sharingDisabled, error, dashboard } =
    useMembershipSharing(sessionToken);

  if (loading) {
    return (
      <WorkspacePanel title="Team sharing" icon={Users}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading team sharing…
        </div>
      </WorkspacePanel>
    );
  }

  if (sharingDisabled) {
    return (
      <WorkspacePanel title="Team sharing" icon={Users}>
        <p className="text-sm text-destructive">{error}</p>
      </WorkspacePanel>
    );
  }

  if (!dashboard && error) {
    return (
      <WorkspacePanel title="Team sharing" icon={Users}>
        <p className="text-sm text-destructive">{error}</p>
      </WorkspacePanel>
    );
  }

  if (dashboard && !dashboard.eligible && dashboard.role !== "member") {
    return (
      <WorkspacePanel
        title="Team sharing"
        icon={Users}
        description="Invite team members to share your KeenVPN Business subscription."
      >
        <p className={workspaceEmptyState + " text-sm text-muted-foreground"}>
          Upgrade to a Business plan to invite members with their own login
          credentials.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/pricing">View Business plan</Link>
        </Button>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel
      title="Team sharing"
      icon={Users}
      description="Invite teammates, manage members, and pending invites."
    >
      <MembershipTeamPanel sessionToken={sessionToken} variant="full" />
    </WorkspacePanel>
  );
}
