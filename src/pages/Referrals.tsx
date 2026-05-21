import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Gift, Share2, Users, Clock, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionToken, fetchReferralDashboard } from "@/auth";

interface ReferralRow {
  id: string;
  status: string;
  refereeName: string;
  /** Full referee account email — always exposed to the referrer on this page. */
  refereeEmail?: string;
  appDownloadedAt: string | null;
  appOpenedAt: string | null;
  signedUpAt: string | null;
  trialStartedAt: string | null;
  subscribedAt: string | null;
  rewardedAt: string | null;
}

interface DashboardPayload {
  referralUrl: string;
  token: string;
  totalReferrals: number;
  rewardsEarned: number;
  pendingReferrals: number;
  referrals: ReferralRow[];
  referralsHasMore: boolean;
}

const REFERRALS_PAGE_SIZE = 20;

const stageConfig: {
  key: keyof Pick<
    ReferralRow,
    | "appDownloadedAt"
    | "appOpenedAt"
    | "signedUpAt"
    | "trialStartedAt"
    | "subscribedAt"
    | "rewardedAt"
  >;
  label: string;
  secondary?: boolean;
}[] = [
  { key: "signedUpAt", label: "Signed up" },
  { key: "trialStartedAt", label: "Free trial started" },
  { key: "subscribedAt", label: "Subscribed" },
  { key: "rewardedAt", label: "Reward" },
  { key: "appDownloadedAt", label: "Downloaded app", secondary: true },
  { key: "appOpenedAt", label: "Opened app", secondary: true },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function coerceIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return null;
}

/** Normalize dashboard `referrals` items from JSON (typed as loose records upstream). */
function coerceReferralRow(raw: unknown): ReferralRow | null {
  if (!isPlainObject(raw)) return null;
  const id = coerceString(raw["id"]);
  if (!id) return null;
  return {
    id,
    status: coerceString(raw["status"]),
    refereeName: coerceString(raw["refereeName"]),
    refereeEmail: coerceString(raw["refereeEmail"]),
    appDownloadedAt: coerceIsoOrNull(raw["appDownloadedAt"]),
    appOpenedAt: coerceIsoOrNull(raw["appOpenedAt"]),
    signedUpAt: coerceIsoOrNull(raw["signedUpAt"]),
    trialStartedAt: coerceIsoOrNull(raw["trialStartedAt"]),
    subscribedAt: coerceIsoOrNull(raw["subscribedAt"]),
    rewardedAt: coerceIsoOrNull(raw["rewardedAt"]),
  };
}

function normalizeReferralRows(value: unknown): ReferralRow[] {
  if (!Array.isArray(value)) return [];
  const out: ReferralRow[] = [];
  for (const item of value) {
    const row = coerceReferralRow(item);
    if (row) out.push(row);
  }
  return out;
}

const Referrals = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const dataRef = useRef<DashboardPayload | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signin");
      return;
    }
    const session = getSessionToken();
    if (!session) {
      setData(null);
      setFetchError(
        "No active session found. Sign out and sign in again to view your referral dashboard.",
      );
      setLoading(false);
      return;
    }
    let cancelled = false;
    setFetchError(null);
    void fetchReferralDashboard(session, {
      offset: 0,
      limit: REFERRALS_PAGE_SIZE,
    }).then((res) => {
      if (cancelled) return;
      if (res.success && res.referralUrl) {
        setData({
          referralUrl: res.referralUrl,
          token: res.token ?? "",
          totalReferrals: res.totalReferrals ?? 0,
          rewardsEarned: res.rewardsEarned ?? 0,
          pendingReferrals: res.pendingReferrals ?? 0,
          referrals: normalizeReferralRows(res.referrals),
          referralsHasMore: Boolean(res.referralsHasMore),
        });
        setFetchError(null);
      } else {
        setData(null);
        setFetchError(
          res.error?.trim()
            ? res.error
            : "Unable to load referral data. Please try again.",
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const appendReferralRows = (existing: ReferralRow[], incoming: ReferralRow[]) => {
    const seen = new Set(existing.map((r) => r.id));
    const extra = incoming.filter((r) => !seen.has(r.id));
    return [...existing, ...extra];
  };

  const loadMoreReferrals = async () => {
    const session = getSessionToken();
    const snap = dataRef.current;
    if (!session || !snap?.referralsHasMore || loadingMore) return;

    const offset = snap.referrals.length;
    setLoadingMore(true);
    const res = await fetchReferralDashboard(session, {
      offset,
      limit: REFERRALS_PAGE_SIZE,
    });
    setLoadingMore(false);

    if (!res.success || !res.referralUrl) {
      toast({
        title: "Could not load more",
        description:
          res.error?.trim() || "Please refresh the page or try again later.",
        variant: "destructive",
      });
      return;
    }

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalReferrals: res.totalReferrals ?? prev.totalReferrals,
        rewardsEarned: res.rewardsEarned ?? prev.rewardsEarned,
        pendingReferrals: res.pendingReferrals ?? prev.pendingReferrals,
        referrals: appendReferralRows(
          prev.referrals,
          normalizeReferralRows(res.referrals),
        ),
        referralsHasMore: Boolean(res.referralsHasMore),
      };
    });
  };

  const copyLink = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      toast({ title: "Copied", description: "Referral link copied." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const share = async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "KeenVPN",
          text: "Try KeenVPN with my link — we both benefit when you subscribe.",
          url: data.referralUrl,
        });
      } catch {
        /* dismissed */
      }
    } else {
      void copyLink();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "REWARDED":
        return <Badge className="bg-green-600">Reward applied</Badge>;
      case "SUBSCRIBED":
        return <Badge className="bg-blue-600">Subscribed</Badge>;
      case "TRIALING":
        return (
          <Badge variant="outline" className="border-violet-500 text-violet-700">
            Free trial
          </Badge>
        );
      case "EXPIRED":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center bg-gradient-hero py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const referralRows = data?.referrals ?? [];
  const dashboardReady = data !== null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-hero py-20">
        <div className="container mx-auto max-w-4xl px-4">
          {fetchError ? (
            <Alert variant="destructive" className="mb-8">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{fetchError}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/50"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-foreground">
              Refer a <span className="text-primary">friend</span>
            </h1>
            <p className="text-muted-foreground">
              Share your link. When a friend subscribes, you can earn 1 free
              month on your subscription (program terms apply).
            </p>
          </div>

          {!dashboardReady && fetchError ? (
            <p className="mb-8 text-sm text-muted-foreground">
              Your referral dashboard will appear here after it loads successfully.
            </p>
          ) : null}

          {dashboardReady ? (
            <>
              <Card className="mb-8 border-accent/50 shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Share2 className="mr-2 h-5 w-5" />
                    Your referral link
                  </CardTitle>
                  <CardDescription>
                    Anyone who signs up with this link is attributed to you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-sm">
                      {data.referralUrl}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button type="button" className="w-full" onClick={share}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share link
                  </Button>
                </CardContent>
              </Card>

              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <div className="text-3xl font-bold">{data.totalReferrals}</div>
                    <div className="text-sm text-muted-foreground">Invites</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Gift className="mx-auto mb-2 h-8 w-8 text-green-500" />
                    <div className="text-3xl font-bold">{data.rewardsEarned}</div>
                    <div className="text-sm text-muted-foreground">Rewards</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Clock className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
                    <div className="text-3xl font-bold">{data.pendingReferrals}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Pending referrals</CardTitle>
                  <CardDescription>
                    Invitees appear as Pending until they start a trial and subscribe. Rows show signed
                    up, free trial, paid subscription, and reward. App download/open events are tracked
                    when available from mobile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {referralRows.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      No referrals yet. Share your link to get started.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {referralRows.map((r) => {
                        const primaryStages = stageConfig.filter((s) => !s.secondary);
                        const secondaryStages = stageConfig.filter((s) => s.secondary);
                        return (
                          <div key={r.id} className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 text-left">
                                {r.refereeEmail &&
                                r.refereeName.trim() !== r.refereeEmail.trim() ? (
                                  <>
                                    <div className="font-medium">{r.refereeName}</div>
                                    <div className="break-all text-sm text-muted-foreground">
                                      {r.refereeEmail}
                                    </div>
                                  </>
                                ) : (
                                  <div className="break-all font-medium">
                                    {r.refereeEmail || r.refereeName || "—"}
                                  </div>
                                )}
                              </div>
                              {statusBadge(r.status)}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {primaryStages.map((s) => (
                                <span
                                  key={s.key}
                                  className={
                                    r[s.key]
                                      ? "text-primary font-medium"
                                      : "opacity-40"
                                  }
                                >
                                  {s.label}
                                  {r[s.key] ? " ✓" : ""}
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                              <span className="font-medium uppercase tracking-wide opacity-70">
                                App activity
                              </span>
                              {secondaryStages.map((s) => (
                                <span
                                  key={s.key}
                                  className={
                                    r[s.key]
                                      ? "font-medium text-foreground"
                                      : "opacity-40"
                                  }
                                >
                                  {s.label}
                                  {r[s.key] ? " ✓" : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {data.referralsHasMore ? (
                        <div className="flex justify-center pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={loadingMore}
                            onClick={() => void loadMoreReferrals()}
                          >
                            {loadingMore ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading…
                              </>
                            ) : (
                              "Load more"
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Referrals;
