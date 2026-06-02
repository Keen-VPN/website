import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Gift,
  Loader2,
  Lock,
  Search,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  claimPerk,
  fetchPerks,
  getSessionToken,
  recordPerkEvent,
  type PerkCategory,
  type PerkItem,
} from "@/auth";
import { trackPerksEvent } from "@/lib/product-analytics";

const CATEGORY_LABELS: Record<PerkCategory, string> = {
  privacy_security: "Privacy & Security",
  ai_productivity: "AI & Productivity",
  developer_tools: "Developer Tools",
  startup_growth: "Startup & Growth",
  remote_work: "Remote Work",
};

const ACCESS_BADGE: Record<string, string> = {
  free: "All members",
  paid: "Paid members",
  annual: "Annual members",
};

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const Perks = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [perks, setPerks] = useState<PerkItem[]>([]);
  const [categories, setCategories] = useState<PerkCategory[]>([]);
  const [userAccessTier, setUserAccessTier] = useState<string>("free");
  const [selectedCategory, setSelectedCategory] = useState<
    PerkCategory | "all"
  >("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRequestId = useRef(0);
  const pageViewRecorded = useRef(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadPerks = useCallback(async () => {
    const session = getSessionToken();
    if (!session) {
      setFetchError(
        "No active session found. Sign out and sign in again to view perks.",
      );
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    const requestId = ++loadRequestId.current;
    if (initialLoadRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setFetchError(null);

    const res = await fetchPerks(session, {
      category: selectedCategory === "all" ? undefined : selectedCategory,
      search: debouncedSearch || undefined,
    });

    if (requestId !== loadRequestId.current) return;

    if (res.success && res.data) {
      setPerks(res.data.perks);
      setCategories(res.data.categories);
      setUserAccessTier(res.data.userAccessTier);
      setFetchError(null);
    } else {
      setPerks([]);
      setFetchError(
        res.error?.trim() || "Unable to load perks. Please try again.",
      );
    }
    setLoading(false);
    setRefreshing(false);
    initialLoadRef.current = false;
    setInitialLoad(false);
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signin");
      return;
    }
    void loadPerks();
  }, [user, authLoading, navigate, loadPerks]);

  useEffect(() => {
    if (
      !user ||
      initialLoad ||
      loading ||
      refreshing ||
      fetchError ||
      pageViewRecorded.current
    ) {
      return;
    }
    const session = getSessionToken();
    if (!session) return;
    pageViewRecorded.current = true;
    trackPerksEvent("perk_viewed", { source: "perks_page" });
    void recordPerkEvent(session, "perk_viewed", { source: "perks_page" });
  }, [user, initialLoad, loading, refreshing, fetchError]);

  const featuredPerks = useMemo(
    () => perks.filter((perk) => perk.isFeatured),
    [perks],
  );

  const handleClaim = async (perk: PerkItem) => {
    if (!perk.accessible || perk.redeemed) return;

    const session = getSessionToken();
    if (!session) {
      toast({
        title: "Session expired",
        description: "Sign in again to claim perks.",
        variant: "destructive",
      });
      return;
    }

    setClaimingId(perk.id);
    trackPerksEvent("perk_clicked", { perk_id: perk.id, source: "perks_page" });
    void recordPerkEvent(session, "perk_clicked", {
      perkId: perk.id,
      source: "perks_page",
    });

    const res = await claimPerk(session, perk.id);
    setClaimingId(null);

    if (!res.success) {
      if (res.error === "access_denied") {
        toast({
          title: "Upgrade required",
          description:
            perk.accessLevel === "annual"
              ? "This perk is available to annual members."
              : "Subscribe to unlock this perk.",
        });
        return;
      }
      toast({
        title: "Could not claim perk",
        description: res.error || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    trackPerksEvent("perk_claimed", { perk_id: perk.id, source: "perks_page" });

    if (res.redemptionType === "external_link" && res.redemptionUrl) {
      if (!isSafeHttpUrl(res.redemptionUrl)) {
        toast({
          title: "Invalid offer link",
          description: "This perk link could not be opened safely. Contact support.",
          variant: "destructive",
        });
        void loadPerks();
        return;
      }
      window.open(res.redemptionUrl, "_blank", "noopener,noreferrer");
      toast({
        title: "Offer opened",
        description: "Complete redemption on the partner site.",
      });
    } else if (res.redemptionType === "coupon_code" && res.couponCode) {
      try {
        await navigator.clipboard.writeText(res.couponCode);
        toast({
          title: "Code copied",
          description: `Use code ${res.couponCode} at checkout.`,
        });
      } catch {
        toast({
          title: "Your offer code",
          description: res.couponCode,
        });
      }
    } else if (res.message) {
      toast({ title: "Request received", description: res.message });
    }

    void loadPerks();
  };

  if (authLoading || (initialLoad && loading)) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center bg-gradient-hero py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-hero py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm text-primary">
              <Gift className="h-4 w-4" />
              Member perks
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Perks &amp; Benefits
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Exclusive offers from partners we trust, curated for KeenVPN
              members. Your plan:{" "}
              <span className="font-medium text-foreground capitalize">
                {userAccessTier}
              </span>
              .
            </p>
          </div>

          {fetchError ? (
            <Alert variant="destructive" className="mb-8">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search partners or offers…"
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                  <Button
                    size="sm"
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("all")}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={
                        selectedCategory === cat ? "default" : "outline"
                      }
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Button>
                  ))}
                </div>
              </div>

              {featuredPerks.length > 0 && selectedCategory === "all" && !debouncedSearch ? (
                <section className="mb-10">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Featured
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {featuredPerks.map((perk) => (
                      <PerkCard
                        key={perk.id}
                        perk={perk}
                        claiming={claimingId === perk.id}
                        onClaim={() => void handleClaim(perk)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  {selectedCategory === "all"
                    ? "All perks"
                    : CATEGORY_LABELS[selectedCategory]}
                </h2>
                {perks.length === 0 ? (
                  <p className="text-muted-foreground">
                    No perks match your filters.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {perks.map((perk) => (
                      <PerkCard
                        key={perk.id}
                        perk={perk}
                        claiming={claimingId === perk.id}
                        onClaim={() => void handleClaim(perk)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

function PerkLogo({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials =
    title
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-xl border border-border/60 bg-background object-contain p-1.5"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}

function PerkCard({
  perk,
  claiming,
  onClaim,
}: {
  perk: PerkItem;
  claiming: boolean;
  onClaim: () => void;
}) {
  const locked = !perk.accessible && !perk.redeemed;
  const upgradeHref =
    perk.accessLevel === "annual" ? "/upgrade-annual" : "/subscribe";
  const upgradeLabel =
    perk.accessLevel === "annual" ? "Upgrade to annual" : "Subscribe to unlock";

  return (
    <Card
      className={`relative overflow-hidden border-border/60 bg-card/80 backdrop-blur ${perk.isFeatured ? "ring-1 ring-primary/30" : ""}`}
    >
      {locked ? (
        <div className="pointer-events-none absolute inset-0 z-10 bg-background/55 backdrop-blur-[1px]" />
      ) : null}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {perk.partnerName ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {perk.partnerName}
              </p>
            ) : null}
            <CardTitle className="text-lg">{perk.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-3">
              {perk.description}
            </CardDescription>
          </div>
          <PerkLogo title={perk.title} imageUrl={perk.imageUrl} />
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {CATEGORY_LABELS[perk.category]}
          </Badge>
          <Badge variant="outline">{ACCESS_BADGE[perk.accessLevel]}</Badge>
          {locked ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700">
              Locked
            </Badge>
          ) : null}
          {perk.redeemed ? (
            <Badge className="bg-green-600">Claimed</Badge>
          ) : null}
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-sm font-medium text-primary">{perk.offerText}</p>
        </div>
        {locked ? (
          <div className="relative z-20 rounded-lg border border-border/70 bg-background/95 p-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>
                  {perk.accessLevel === "annual"
                    ? "This perk is reserved for annual members."
                    : "Subscribe to unlock this partner offer."}
                </p>
                <Button size="sm" asChild>
                  <Link to={upgradeHref}>{upgradeLabel}</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <Button
          className="relative z-20 w-full"
          disabled={locked || perk.redeemed || claiming}
          onClick={onClaim}
        >
          {claiming ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : perk.redemptionType === "external_link" && !perk.redeemed ? (
            <ExternalLink className="mr-2 h-4 w-4" />
          ) : null}
          {perk.ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default Perks;
