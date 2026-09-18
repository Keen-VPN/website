import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Gift,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSessionToken,
  redeemPromoTrialQr,
  recordPromoTrialQrScan,
  resolvePromoTrialQr,
  type PromoTrialRedeemReason,
} from "@/auth/backend";
import { buildSignInUrl } from "@/auth/post-login-redirect";
import {
  clearPromoTrialCodeStorage,
  setPromoTrialCodeStorage,
} from "@/auth/promo-trial-code";

const HeroShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background">
    <Header />
    <main className="relative flex-1 overflow-hidden bg-gradient-hero pb-16 pt-28 md:pb-24 md:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-60"
      />
      <div className="container relative z-10 mx-auto px-4">{children}</div>
    </main>
    <Footer />
  </div>
);

const NoticeCard = ({
  icon: Icon,
  tone,
  title,
  children,
  actions,
}: {
  icon: typeof Gift;
  tone: "error" | "warning" | "success";
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="mx-auto max-w-xl text-center">
    <div className="rounded-2xl border border-accent/30 bg-card/60 p-8 shadow-card backdrop-blur-sm">
      <div
        className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "error"
            ? "bg-destructive/15"
            : tone === "success"
              ? "bg-primary/15"
              : "bg-accent/15"
        }`}
      >
        <Icon
          className={`h-7 w-7 ${
            tone === "error" ? "text-destructive" : "text-primary"
          }`}
        />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mb-8 max-w-md leading-relaxed text-muted-foreground">
        {children}
      </p>
      {actions}
    </div>
  </div>
);

function redeemMessage(reason: PromoTrialRedeemReason | undefined): string {
  switch (reason) {
    case "existing_subscriber":
      return "Your account already has an active KeenVPN subscription, so this promotional trial was not applied.";
    case "already_used_trial":
    case "already_redeemed":
      return "This account has already used a free trial, so another promotional trial cannot be claimed.";
    case "inactive":
      return "This promotional offer is no longer available.";
    case "device_hash_exists":
      return "A free trial was already claimed on this device.";
    case "feature_disabled":
      return "Promotional trials are temporarily unavailable. Please try again later.";
    default:
      return "This promotional offer could not be redeemed.";
  }
}

function getOrCreateAnonymousId(): string {
  const key = "keen_promo_scan_aid";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `aid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `aid_${Date.now()}`;
  }
}

const PromotionalTrialLanding = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, hasSessionToken, refreshSubscription } =
    useAuth();

  const [loading, setLoading] = useState(true);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [found, setFound] = useState(false);
  const [active, setActive] = useState(false);
  const [campaignName, setCampaignName] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const redeemAttempted = useRef(false);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    setLoading(true);
    setResolveFailed(false);
    setFound(false);
    setActive(false);
    setCampaignName(null);
    setTrialDays(null);
    setRedeemed(false);
    setRedeemError(null);
    setTrialEndsAt(null);
    redeemAttempted.current = false;

    let cancelled = false;

    void (async () => {
      const [resolveRes] = await Promise.all([
        resolvePromoTrialQr(code),
        recordPromoTrialQrScan(code, getOrCreateAnonymousId()),
      ]);
      if (cancelled) return;

      if (!resolveRes.ok || !resolveRes.data) {
        setResolveFailed(true);
        setLoading(false);
        return;
      }

      setFound(resolveRes.data.found);
      setActive(resolveRes.data.active);
      setCampaignName(resolveRes.data.name);
      setTrialDays(resolveRes.data.trialDays);

      if (resolveRes.data.found && resolveRes.data.active) {
        setPromoTrialCodeStorage(code);
      } else {
        clearPromoTrialCodeStorage();
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [code, navigate, retryNonce]);

  useEffect(() => {
    if (authLoading || loading || !code || !found || !active) return;
    if (!hasSessionToken || redeemAttempted.current || redeemed) return;

    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    redeemAttempted.current = true;
    setRedeeming(true);
    setRedeemError(null);

    void redeemPromoTrialQr(code, sessionToken).then((result) => {
      setRedeeming(false);
      if (!result.ok) {
        setRedeemError(result.error ?? "Failed to redeem promotional trial");
        return;
      }
      if (result.success) {
        setRedeemed(true);
        setTrialEndsAt(result.trialEndsAt ?? null);
        clearPromoTrialCodeStorage();
        void refreshSubscription();
        return;
      }
      setRedeemError(redeemMessage(result.reason));
    });
  }, [authLoading, loading, code, found, active, hasSessionToken, redeemed, refreshSubscription]);

  if (loading || authLoading) {
    return (
      <HeroShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div
            role="status"
            aria-label="Loading promotional offer"
            className="h-10 w-10 animate-spin rounded-full border-2 border-accent/30 border-t-primary"
          />
        </div>
      </HeroShell>
    );
  }

  if (resolveFailed) {
    return (
      <HeroShell>
        <NoticeCard
          icon={RefreshCw}
          tone="warning"
          title="Couldn't verify this offer"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          }
        >
          We couldn&apos;t reach KeenVPN to validate this promotional link.
          Retry in a moment.
        </NoticeCard>
      </HeroShell>
    );
  }

  if (!found) {
    return (
      <HeroShell>
        <NoticeCard
          icon={AlertTriangle}
          tone="error"
          title="Offer not found"
          actions={
            <Button size="lg" variant="outline" asChild>
              <Link to="/">Go home</Link>
            </Button>
          }
        >
          This promotional link is invalid. Ask the team for a current QR code,
          or start from the KeenVPN home page.
        </NoticeCard>
      </HeroShell>
    );
  }

  if (!active) {
    return (
      <HeroShell>
        <NoticeCard
          icon={AlertTriangle}
          tone="error"
          title="This offer is no longer available"
          actions={
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">See plans</Link>
            </Button>
          }
        >
          This promotional trial QR has been disabled and can no longer grant a
          free trial.
        </NoticeCard>
      </HeroShell>
    );
  }

  if (redeemed) {
    const endsLabel = trialEndsAt
      ? new Date(trialEndsAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    return (
      <HeroShell>
        <NoticeCard
          icon={Sparkles}
          tone="success"
          title="Your free trial is active"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/open-app">
                  <Download className="h-4 w-4" />
                  Open KeenVPN
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          }
        >
          No credit card required
          {endsLabel ? ` — your trial runs through ${endsLabel}` : ""}. Download
          or open the app to connect.
        </NoticeCard>
      </HeroShell>
    );
  }

  if (redeemError) {
    return (
      <HeroShell>
        <NoticeCard
          icon={ShieldCheck}
          tone="warning"
          title="Trial not applied"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/open-app">Open KeenVPN</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">See plans</Link>
              </Button>
            </div>
          }
        >
          {redeemError}
        </NoticeCard>
      </HeroShell>
    );
  }

  if (hasSessionToken || user) {
    return (
      <HeroShell>
        <div className="mx-auto max-w-xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card/50 px-4 py-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Promotional free trial
            </span>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            Activating your trial…
          </h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            {redeeming
              ? "Granting your cardless free trial — no payment info needed."
              : "Almost there."}
          </p>
          {redeeming ? (
            <div
              role="status"
              aria-label="Activating trial"
              className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent/30 border-t-primary"
            />
          ) : null}
        </div>
      </HeroShell>
    );
  }

  const signInUrl = buildSignInUrl({
    redirect: `/promo/${encodeURIComponent(code!)}`,
  });

  return (
    <HeroShell>
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card/50 px-4 py-2 shadow-lg backdrop-blur-sm">
          <Gift className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            {campaignName ?? "Promotional free trial"}
          </span>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Try KeenVPN free
        </h1>
        <p className="mx-auto mb-8 max-w-lg text-lg text-muted-foreground">
          Create or sign into your account to start a{" "}
          {trialDays ? `${trialDays}-day ` : ""}
          free trial — no credit card required.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link to={signInUrl}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "No card needed",
              body: "Activate instantly without payment details.",
            },
            {
              icon: Sparkles,
              title: "Full product access",
              body: "Connect and explore KeenVPN during your trial.",
            },
            {
              icon: Download,
              title: "Open the app",
              body: "After signup, download or launch KeenVPN.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-accent/30 bg-gradient-card p-5 text-center shadow-card"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/20 p-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </HeroShell>
  );
};

export default PromotionalTrialLanding;
