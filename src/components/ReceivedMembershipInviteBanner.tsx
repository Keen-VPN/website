import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import {
  fetchReceivedMembershipInvites,
  type ReceivedMembershipInvite,
} from "@/auth/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ReceivedMembershipInviteBannerProps {
  sessionToken: string;
}

function inviteSender(invite: ReceivedMembershipInvite): string {
  return invite.ownerName?.trim() || invite.ownerEmail;
}

export function ReceivedMembershipInviteBanner({
  sessionToken,
}: ReceivedMembershipInviteBannerProps) {
  const [invites, setInvites] = useState<ReceivedMembershipInvite[]>([]);

  useEffect(() => {
    let cancelled = false;

    void fetchReceivedMembershipInvites(sessionToken).then((result) => {
      if (!cancelled && result.ok) {
        setInvites(result.data ?? []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  if (invites.length === 0) return null;

  return (
    <div className="mb-8 space-y-3" aria-label="Pending team invitations">
      {invites.map((invite) => (
        <Card
          key={invite.id}
          className="border-primary/50 bg-primary/5 shadow-glow"
        >
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/15 p-2 text-primary">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  You have a team invitation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {inviteSender(invite)} invited you to join their KeenVPN
                  Business account. This invitation expires on{" "}
                  {new Date(invite.expiresAt).toLocaleDateString()}.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link
                to={`/account/membership-sharing/accept?inviteId=${encodeURIComponent(invite.id)}`}
              >
                Review invitation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
