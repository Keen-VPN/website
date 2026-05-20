import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Gift, Share2, Users, Clock } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionToken, fetchReferralDashboard } from "@/auth";

interface ReferralRow {
  id: string;
  status: string;
  refereeName: string;
  appDownloadedAt: string | null;
  appOpenedAt: string | null;
  signedUpAt: string | null;
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
}

const stageConfig: {
  key: keyof Pick<
    ReferralRow,
    | "appDownloadedAt"
    | "appOpenedAt"
    | "signedUpAt"
    | "subscribedAt"
    | "rewardedAt"
  >;
  label: string;
}[] = [
  { key: "appDownloadedAt", label: "Downloaded" },
  { key: "appOpenedAt", label: "Opened app" },
  { key: "signedUpAt", label: "Signed up" },
  { key: "subscribedAt", label: "Subscribed" },
  { key: "rewardedAt", label: "Reward" },
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
    appDownloadedAt: coerceIsoOrNull(raw["appDownloadedAt"]),
    appOpenedAt: coerceIsoOrNull(raw["appOpenedAt"]),
    signedUpAt: coerceIsoOrNull(raw["signedUpAt"]),
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signin");
      return;
    }
    const session = getSessionToken();
    if (!session) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchReferralDashboard(session).then((res) => {
      if (cancelled) return;
      if (res.success && res.referralUrl) {
        setData({
          referralUrl: res.referralUrl,
          token: res.token ?? "",
          totalReferrals: res.totalReferrals ?? 0,
          rewardsEarned: res.rewardsEarned ?? 0,
          pendingReferrals: res.pendingReferrals ?? 0,
          referrals: normalizeReferralRows(res.referrals),
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

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
        return <Badge className="bg-green-600">Rewarded</Badge>;
      case "SUBSCRIBED":
        return <Badge className="bg-blue-600">Subscribed</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">In progress</Badge>;
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-hero py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-foreground">
              Refer a <span className="text-primary">friend</span>
            </h1>
            <p className="text-muted-foreground">
              Share your link. When a friend subscribes, you can earn 1 free
              month on your subscription (program terms apply).
            </p>
          </div>

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
                  {data?.referralUrl ?? "—"}
                </code>
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
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
                <div className="text-3xl font-bold">{data?.totalReferrals ?? 0}</div>
                <div className="text-sm text-muted-foreground">Invites</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Gift className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <div className="text-3xl font-bold">{data?.rewardsEarned ?? 0}</div>
                <div className="text-sm text-muted-foreground">Rewards</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
                <div className="text-3xl font-bold">{data?.pendingReferrals ?? 0}</div>
                <div className="text-sm text-muted-foreground">In progress</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Status per friend (privacy-safe)</CardDescription>
            </CardHeader>
            <CardContent>
              {referralRows.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No referrals yet. Share your link to get started.
                </p>
              ) : (
                <div className="space-y-6">
                  {referralRows.map((r) => (
                    <div key={r.id} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.refereeName}</span>
                        {statusBadge(r.status)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {stageConfig.map((s) => (
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Referrals;
