import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Loader2,
  Share2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptFriendInvitation,
  blockFriendUser,
  declineFriendInvitation,
  fetchFriendsDashboard,
  fetchFriendsNotifications,
  getSessionToken,
  inviteFriendByEmail,
  inviteFriendByUsername,
  inviteFriend,
  setFriendUsername,
  markFriendsNotificationsRead,
  removeFriend,
  reportFriendUser,
} from "@/auth";

interface FriendRow {
  relationshipId: string;
  userId: string;
  displayName: string | null;
  friendsSince: string;
}

interface PendingRow {
  relationshipId: string;
  userId: string | null;
  displayName: string | null;
  inviteEmail?: string | null;
  sentAt: string;
}

interface DashboardData {
  inviteUrl: string;
  inviteToken: string;
  username?: string | null;
  counts: {
    friends: number;
    pendingReceived: number;
    pendingSent: number;
  };
  friends: FriendRow[];
  pendingReceived: PendingRow[];
  pendingSent: PendingRow[];
  suggestedFriends: {
    userId: string;
    displayName: string | null;
    username?: string | null;
    reason?: string;
  }[];
}

interface FriendNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

function notificationMessage(notification: FriendNotification): string {
  const payload = notification.payload;
  const name =
    (typeof payload.requesterDisplayName === "string" &&
      payload.requesterDisplayName) ||
    (typeof payload.friendDisplayName === "string" &&
      payload.friendDisplayName) ||
    "Someone";

  switch (notification.type) {
    case "friend_request_received":
      return `${name} sent you a friend request`;
    case "friend_request_accepted":
      return `${name} accepted your friend request`;
    case "friend_removed":
      return "A friend removed you from their network";
    default:
      return "Friends network update";
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayLabel(row: {
  displayName: string | null;
  inviteEmail?: string | null;
}): string {
  return row.displayName?.trim() || row.inviteEmail?.trim() || "KeenVPN member";
}

export default function Friends() {
  const { hasSessionToken } = useAuth();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<FriendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [removeTarget, setRemoveTarget] = useState<FriendRow | null>(null);
  const [reportTarget, setReportTarget] = useState<FriendRow | null>(null);
  const [reportReason, setReportReason] = useState("");
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const sessionToken = hasSessionToken ? getSessionToken() : null;
    if (!sessionToken) {
      setError("Please sign in to view your friends network.");
      setLoading(false);
      return;
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrent = () => loadRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, notificationsRes] = await Promise.all([
        fetchFriendsDashboard(sessionToken),
        fetchFriendsNotifications(sessionToken),
      ]);
      if (!isCurrent()) return;
      if (!dashboardRes.ok) {
        setError(dashboardRes.error ?? "Could not load friends network.");
        return;
      }
      setDashboard(dashboardRes.data as DashboardData);
      setUsernameDraft((dashboardRes.data as DashboardData).username ?? "");
      if (notificationsRes.ok) {
        const payload = notificationsRes.data as {
          notifications?: FriendNotification[];
        };
        setNotifications(payload.notifications ?? []);
        const unreadIds = (payload.notifications ?? [])
          .filter((n) => !n.readAt)
          .map((n) => n.id);
        if (unreadIds.length > 0) {
          void markFriendsNotificationsRead(sessionToken, unreadIds).catch(
            (error) => {
              console.warn("Failed to mark friends notifications read:", error);
            },
          );
        }
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [hasSessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function withSession(
    action: (token: string) => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ): Promise<boolean> {
    const sessionToken = hasSessionToken ? getSessionToken() : null;
    if (!sessionToken) return false;
    setSubmitting(true);
    try {
      const res = await action(sessionToken);
      if (!res.ok) {
        toast({
          title: "Something went wrong",
          description: res.error,
          variant: "destructive",
        });
        return false;
      }
      toast({ title: successMessage });
      await load();
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const target = inviteTarget.trim();
    if (!target) return;
    const isEmail = target.includes("@") && !target.startsWith("@");
    const ok = await withSession(
      (token) =>
        isEmail
          ? inviteFriendByEmail(token, target)
          : inviteFriendByUsername(token, target.replace(/^@/, "")),
      "Invitation sent",
    );
    if (ok) setInviteTarget("");
  }

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    const username = usernameDraft.trim().replace(/^@/, "").toLowerCase();
    if (!username) return;
    await withSession(
      (token) => setFriendUsername(token, username),
      "Username saved",
    );
  }

  async function handleInviteSuggested(userId: string, username?: string | null) {
    await withSession(
      (token) =>
        username
          ? inviteFriendByUsername(token, username)
          : inviteFriend(token, { targetUserId: userId }),
      "Invitation sent",
    );
  }

  async function handleAccept(relationshipId: string) {
    await withSession(
      (token) => acceptFriendInvitation(token, { relationshipId }),
      "Friend request accepted",
    );
  }

  async function handleDecline(relationshipId: string) {
    await withSession(
      (token) => declineFriendInvitation(token, relationshipId),
      "Invitation declined",
    );
  }

  async function handleBlockFromPending(row: PendingRow) {
    await withSession(
      (token) =>
        blockFriendUser(token, {
          relationshipId: row.relationshipId,
          ...(row.userId ? { targetUserId: row.userId } : {}),
        }),
      "User blocked",
    );
  }

  async function handleRemoveFriend() {
    if (!removeTarget) return;
    const ok = await withSession(
      (token) => removeFriend(token, removeTarget.userId),
      "Friend removed",
    );
    if (ok) setRemoveTarget(null);
  }

  async function handleReport() {
    if (!reportTarget) return;
    const ok = await withSession(
      (token) =>
        reportFriendUser(token, reportTarget.userId, reportReason.trim()),
      "Report submitted",
    );
    if (ok) {
      setReportTarget(null);
      setReportReason("");
    }
  }

  function copyInviteLink() {
    if (!dashboard?.inviteUrl) return;
    void navigator.clipboard.writeText(dashboard.inviteUrl);
    toast({ title: "Invite link copied" });
  }

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;
  const totalUpdates =
    (dashboard?.counts.pendingReceived ?? 0) + unreadNotificationCount;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-24">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
            {totalUpdates > 0 ? (
              <Badge variant="default">
                {totalUpdates} update
                {totalUpdates === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-muted-foreground">
            Build a trusted Private Value Network. Share discoveries with people
            you know — nothing is shared unless you choose to.
          </p>
        </div>

        {!loading && notifications.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recent updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <p>{notificationMessage(notification)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!loading && error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load Friends</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!loading && !error && dashboard ? (
          <div className="space-y-6">
            {!dashboard.username ? (
              <Card>
                <CardHeader>
                  <CardTitle>Choose a username</CardTitle>
                  <CardDescription>
                    Usernames let friends invite you without sharing your email.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => void handleSaveUsername(e)}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="yourname"
                      value={usernameDraft}
                      onChange={(e) => setUsernameDraft(e.target.value)}
                      disabled={submitting}
                    />
                    <Button type="submit" disabled={submitting || !usernameDraft.trim()}>
                      Save
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your username: <strong>@{dashboard.username}</strong>
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Friends
                </CardTitle>
                <CardDescription>
                  Invite by email or username, or share your personal link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={(e) => void handleInvite(e)} className="flex gap-2">
                  <Input
                    placeholder="friend@example.com or username"
                    value={inviteTarget}
                    onChange={(e) => setInviteTarget(e.target.value)}
                    disabled={submitting}
                  />
                  <Button type="submit" disabled={submitting || !inviteTarget.trim()}>
                    Send
                  </Button>
                </form>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-sm font-medium">Shareable invite link</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      readOnly
                      value={dashboard.inviteUrl}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyInviteLink}
                        aria-label="Copy invite link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (navigator.share && dashboard.inviteUrl) {
                            void navigator.share({
                              title: "Join my KeenVPN Friends Network",
                              url: dashboard.inviteUrl,
                            });
                          } else {
                            copyInviteLink();
                          }
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pending Invitations
                  {dashboard.counts.pendingReceived > 0 ? (
                    <Badge>{dashboard.counts.pendingReceived}</Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.pendingReceived.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending invitations.
                  </p>
                ) : (
                  dashboard.pendingReceived.map((row) => (
                    <div
                      key={row.relationshipId}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{displayLabel(row)}</p>
                        <p className="text-xs text-muted-foreground">
                          Received {formatDate(row.sentAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={submitting}
                          onClick={() => void handleAccept(row.relationshipId)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() => void handleDecline(row.relationshipId)}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={submitting}
                          onClick={() => void handleBlockFromPending(row)}
                        >
                          Block
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                {dashboard.pendingSent.length > 0 ? (
                  <div className="border-t pt-4">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">
                      Sent ({dashboard.counts.pendingSent})
                    </p>
                    {dashboard.pendingSent.map((row) => (
                      <div
                        key={row.relationshipId}
                        className="mb-2 flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{displayLabel(row)}</p>
                          <p className="text-xs text-muted-foreground">
                            Sent {formatDate(row.sentAt)}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  My Friends
                  <Badge variant="secondary">{dashboard.counts.friends}</Badge>
                </CardTitle>
                <CardDescription>
                  Connected members of your Private Value Network.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No friends yet. Invite someone you trust to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.friends.map((friend) => (
                      <div
                        key={friend.relationshipId}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {friend.displayName?.trim() || "KeenVPN member"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Friends since {formatDate(friend.friendsSince)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submitting}
                            onClick={() => setRemoveTarget(friend)}
                          >
                            <UserMinus className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={submitting}
                            onClick={() => setReportTarget(friend)}
                          >
                            Report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggested Friends</CardTitle>
                <CardDescription>
                  People you may know through mutual friends or shared referrals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.suggestedFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suggestions yet. Add friends to grow your network.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.suggestedFriends.map((suggestion) => (
                      <div
                        key={suggestion.userId}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {suggestion.displayName?.trim() || "KeenVPN member"}
                            {suggestion.username ? (
                              <span className="ml-2 text-sm text-muted-foreground">
                                @{suggestion.username}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.reason === "shared_referrer"
                              ? "Joined through the same referral"
                              : "Friends with people you know"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() =>
                            void handleInviteSuggested(
                              suggestion.userId,
                              suggestion.username,
                            )
                          }
                        >
                          Invite
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
      <Footer />

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove friend?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `Remove ${displayLabel(removeTarget)} from your friends network?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemoveFriend()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReportTarget(null);
            setReportReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report user</AlertDialogTitle>
            <AlertDialogDescription>
              Tell us what happened. Our team will review this report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Optional details"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleReport()}>
              Submit report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
