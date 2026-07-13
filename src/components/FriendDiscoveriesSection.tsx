import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Gift,
  Loader2,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  type DiscoveryFeedFilter,
  type DiscoverySharingMode,
  type FriendDiscoveryDraft,
  type FriendDiscoveryShare,
  approveFriendDiscoveryDraft,
  dismissFriendDiscoveryDraft,
  fetchDiscoveryPreferences,
  fetchFriendDiscoveries,
  fetchPerks,
  getSessionToken,
  sharePerkWithFriends,
  updateDiscoveryPreferences,
  updateFriendDiscoveryShare,
} from "@/auth";

interface FriendRow {
  userId: string;
  displayName: string | null;
  sharingPreferences?: {
    shareRecommendations: boolean;
    shareReferrals: boolean;
    shareAiInsights: boolean;
  };
}

interface PerkOption {
  id: string;
  title: string;
  partnerName: string | null;
  offerText: string;
}

interface FriendDiscoveriesSectionProps {
  friends: FriendRow[];
  hasSession: boolean;
  refreshKey?: number;
}

const FEED_TABS: { value: DiscoveryFeedFilter; label: string }[] = [
  { value: "new", label: "New" },
  { value: "pending", label: "Review" },
  { value: "saved", label: "Saved" },
  { value: "shared", label: "You shared" },
  { value: "dismissed", label: "Dismissed" },
];

const SHARING_MODE_LABELS: Record<DiscoverySharingMode, string> = {
  review: "Review before sharing",
  auto: "Share automatically",
  never: "Never share",
};

function isShareItem(
  item: FriendDiscoveryShare | FriendDiscoveryDraft,
): item is FriendDiscoveryShare {
  return "recommendation" in item;
}

function sharerLabel(share: FriendDiscoveryShare): string {
  return share.sharer.displayName?.trim() || "A friend";
}

export function FriendDiscoveriesSection({
  friends,
  hasSession,
  refreshKey = 0,
}: FriendDiscoveriesSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<DiscoveryFeedFilter>("new");
  const [items, setItems] = useState<
    (FriendDiscoveryShare | FriendDiscoveryDraft)[]
  >([]);
  const [counts, setCounts] = useState({ new: 0, saved: 0, pending: 0 });
  const [sharingMode, setSharingMode] =
    useState<DiscoverySharingMode>("review");
  const sharingModeRequestRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [perks, setPerks] = useState<PerkOption[]>([]);
  const [selectedPerkId, setSelectedPerkId] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const loadRef = useRef(0);

  const shareableFriends = friends.filter(
    (friend) => friend.sharingPreferences?.shareRecommendations,
  );

  const load = useCallback(async () => {
    const token = hasSession ? getSessionToken() : null;
    if (!token) return;

    const requestId = ++loadRef.current;
    setLoading(true);

    const [feedRes, prefRes] = await Promise.all([
      fetchFriendDiscoveries(token, filter),
      fetchDiscoveryPreferences(token),
    ]);

    if (requestId !== loadRef.current) return;

    if (feedRes.ok && feedRes.data) {
      setItems(feedRes.data.items);
      setCounts({
        new: feedRes.data.counts.new,
        saved: feedRes.data.counts.saved,
        pending: feedRes.data.counts.pending ?? 0,
      });
    }
    if (prefRes.ok && prefRes.data) {
      setSharingMode(prefRes.data.sharingMode);
    }
    setLoading(false);
  }, [filter, hasSession]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleSharingModeChange(mode: DiscoverySharingMode) {
    const token = getSessionToken();
    if (!token) return;
    const requestId = ++sharingModeRequestRef.current;
    const res = await updateDiscoveryPreferences(token, mode);
    if (requestId !== sharingModeRequestRef.current) return;
    if (!res.ok) {
      toast({
        title: "Could not update preference",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    setSharingMode(mode);
  }

  async function openShareDialog() {
    const token = getSessionToken();
    if (!token) return;
    if (shareableFriends.length === 0) {
      toast({
        title: "Enable sharing first",
        description:
          "Turn on “Share recommendations” for at least one friend under My Friends.",
      });
      return;
    }
    setShareOpen(true);
    setSelectedFriendIds(shareableFriends.map((f) => f.userId));
    setShareMessage("");
    const res = await fetchPerks(token);
    if (res.success && res.data?.perks) {
      setPerks(
        res.data.perks.map((p) => ({
          id: p.id,
          title: p.title,
          partnerName: p.partnerName ?? null,
          offerText: p.offerText,
        })),
      );
      if (res.data.perks[0]) {
        setSelectedPerkId(res.data.perks[0].id);
      }
    }
  }

  async function handleShare() {
    const token = getSessionToken();
    if (!token || !selectedPerkId) return;
    setSharing(true);
    const res = await sharePerkWithFriends(token, {
      perkId: selectedPerkId,
      friendUserIds: selectedFriendIds,
      message: shareMessage.trim() || undefined,
    });
    setSharing(false);
    if (!res.ok || !res.data?.success) {
      toast({
        title: "Could not share",
        description: res.error ?? "No friends received this share",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Opportunity shared",
      description: `Sent to ${res.data.deliveredShareIds.length} friend${
        res.data.deliveredShareIds.length === 1 ? "" : "s"
      }.`,
    });
    setShareOpen(false);
    void load();
  }

  async function handleShareAction(
    shareId: string,
    action: "save" | "dismiss" | "claim" | "view",
  ) {
    const token = getSessionToken();
    if (!token) return;
    setActingId(shareId);
    const res = await updateFriendDiscoveryShare(token, shareId, action);
    setActingId(null);
    if (!res.ok) {
      toast({
        title: "Action failed",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    if (action === "claim" && res.data?.claimCtaPath) {
      navigate(res.data.claimCtaPath);
    }
    void load();
  }

  async function handleApproveDraft(draftId: string) {
    const token = getSessionToken();
    if (!token) return;
    setActingId(draftId);
    const res = await approveFriendDiscoveryDraft(token, draftId);
    setActingId(null);
    if (!res.ok) {
      toast({
        title: "Could not share",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Opportunity shared with friends" });
    void load();
  }

  async function handleDismissDraft(draftId: string) {
    const token = getSessionToken();
    if (!token) return;
    setActingId(draftId);
    const res = await dismissFriendDiscoveryDraft(token, draftId);
    setActingId(null);
    if (!res.ok) {
      toast({
        title: "Could not dismiss",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    void load();
  }

  function toggleFriend(userId: string, checked: boolean) {
    setSelectedFriendIds((current) =>
      checked ? [...current, userId] : current.filter((id) => id !== userId),
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Private Value Network
              </CardTitle>
              <CardDescription>
                Opportunities shared by friends — never browsing history.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={shareableFriends.length === 0}
              onClick={() => void openShareDialog()}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share opportunity
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {FEED_TABS.map((tab) => (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={filter === tab.value ? "default" : "outline"}
                  onClick={() => setFilter(tab.value)}
                >
                  {tab.label}
                  {tab.value === "new" && counts.new > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                      {counts.new}
                    </Badge>
                  ) : null}
                  {tab.value === "saved" && counts.saved > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                      {counts.saved}
                    </Badge>
                  ) : null}
                  {tab.value === "pending" && counts.pending > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                      {counts.pending}
                    </Badge>
                  ) : null}
                </Button>
              ))}
            </div>
            <div className="w-full sm:w-56">
              <Label className="sr-only">Sharing preference</Label>
              <Select
                value={sharingMode}
                onValueChange={(v) =>
                  void handleSharingModeChange(v as DiscoverySharingMode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SHARING_MODE_LABELS) as DiscoverySharingMode[]).map(
                    (mode) => (
                      <SelectItem key={mode} value={mode}>
                        {SHARING_MODE_LABELS[mode]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {filter === "new"
                  ? "No new discoveries from friends yet."
                  : filter === "pending"
                    ? "Nothing waiting for your review."
                    : "Nothing here yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) =>
                isShareItem(item) ? (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-card/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {filter === "shared"
                            ? "You shared"
                            : `${sharerLabel(item)} discovered`}
                        </p>
                        <p className="font-semibold">
                          {item.recommendation.title}
                        </p>
                        {item.recommendation.partnerName ? (
                          <p className="text-sm text-muted-foreground">
                            {item.recommendation.partnerName}
                          </p>
                        ) : null}
                        {item.recommendation.valueLabel ? (
                          <p className="text-sm font-medium text-primary">
                            {item.recommendation.valueLabel}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {item.recommendation.opportunityType}
                      </Badge>
                    </div>

                    {item.message ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        &ldquo;{item.message}&rdquo;
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {filter !== "shared" && item.status !== "claimed" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={actingId === item.id}
                            onClick={() => void handleShareAction(item.id, "claim")}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Claim
                          </Button>
                          {item.recommendation.ctaPath ? (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <Link
                                to={item.recommendation.ctaPath}
                                onClick={() => {
                                  if (item.status === "delivered") {
                                    void handleShareAction(item.id, "view");
                                  }
                                }}
                              >
                                View details
                              </Link>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              actingId === item.id || item.status === "saved"
                            }
                            onClick={() => void handleShareAction(item.id, "save")}
                          >
                            {item.status === "saved" ? (
                              <BookmarkCheck className="mr-2 h-4 w-4" />
                            ) : (
                              <Bookmark className="mr-2 h-4 w-4" />
                            )}
                            {item.status === "saved" ? "Saved" : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actingId === item.id}
                            onClick={() =>
                              void handleShareAction(item.id, "dismiss")
                            }
                          >
                            <X className="mr-2 h-4 w-4" />
                            Dismiss
                          </Button>
                        </>
                      ) : item.recommendation.ctaPath ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={item.recommendation.ctaPath}>
                            View opportunity
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="rounded-lg border border-primary/20 bg-primary/5 p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Ready to share after you claimed a perk
                      </p>
                      <p className="font-semibold">{item.perk.title}</p>
                      {item.perk.partnerName ? (
                        <p className="text-sm text-muted-foreground">
                          {item.perk.partnerName}
                        </p>
                      ) : null}
                      {item.perk.valueLabel ? (
                        <p className="text-sm font-medium text-primary">
                          {item.perk.valueLabel}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Will share with {item.friendUserIds.length} friend
                        {item.friendUserIds.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actingId === item.id}
                        onClick={() => void handleApproveDraft(item.id)}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actingId === item.id}
                        onClick={() => void handleDismissDraft(item.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share an opportunity</DialogTitle>
            <DialogDescription>
              Friends see the offer — not how you found it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Opportunity</Label>
              <Select value={selectedPerkId} onValueChange={setSelectedPerkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a perk" />
                </SelectTrigger>
                <SelectContent>
                  {perks.map((perk) => (
                    <SelectItem key={perk.id} value={perk.id}>
                      {perk.partnerName
                        ? `${perk.partnerName} — ${perk.title}`
                        : perk.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Friends with sharing enabled</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {shareableFriends.map((friend) => (
                  <label
                    key={friend.userId}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedFriendIds.includes(friend.userId)}
                      onCheckedChange={(checked) =>
                        toggleFriend(friend.userId, checked === true)
                      }
                    />
                    <span>
                      {friend.displayName?.trim() || "KeenVPN member"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Optional note</Label>
              <Textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Thought you might like this…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleShare()}
              disabled={
                sharing || !selectedPerkId || selectedFriendIds.length === 0
              }
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
