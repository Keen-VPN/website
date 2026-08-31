import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Gift,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  clearReferralTokenStorage,
  setReferralTokenStorage,
} from "@/auth/referral-token";
import { resolveInviteToken, type InviteKind } from "@/lib/invite-resolve";
import { formatReferralRewardLabel } from "@/lib/referral-campaign-copy";

/**
 * Brand shell for `/r/:token`. The hero wash and card treatment are the same
 * ones Hero/Features use, so an invite — often the very first KeenVPN page a
 * visitor ever sees — does not look like a different product than the site it
 * hands them off to.
 */
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

const Pill = ({
  icon: Icon,
  children,
}: {
  icon: typeof Gift;
  children: React.ReactNode;
}) => (
  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card/50 px-4 py-2 shadow-lg backdrop-blur-sm">
    <Icon className="h-4 w-4 text-primary" />
    <span className="text-sm font-medium text-muted-foreground">{children}</span>
  </div>
);

const Step = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Gift;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="group flex flex-col items-center rounded-xl border border-accent/30 bg-gradient-card p-6 text-center shadow-card transition-all hover:border-accent/50 hover:shadow-glow">
    <div className="mb-4 rounded-lg bg-primary/20 p-3 transition-colors group-hover:bg-primary/30">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
    <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
  </div>
);

/**
 * Recoverable and dead invites share a layout: one icon, one explanation, and
 * the ways out. Only the tint differs, so a retryable failure never looks as
 * final as a link that is genuinely gone.
 */
const NoticeCard = ({
  icon: Icon,
  tone,
  title,
  children,
  actions,
}: {
  icon: typeof Gift;
  tone: "error" | "warning";
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) => (
  <div className="mx-auto max-w-xl">
    <div className="rounded-2xl border border-accent/30 bg-gradient-card p-8 text-center shadow-card md:p-10">
      <div
        className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "error" ? "bg-destructive/15" : "bg-primary/20"
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

const ReferralLanding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [inviteKind, setInviteKind] = useState<InviteKind>("referral");
  const [rewardMonths, setRewardMonths] = useState(1);
  const [loading, setLoading] = useState(true);
  /** `true` once we get explicit `valid: false` */
  const [inviteInvalid, setInviteInvalid] = useState(false);
  /** Network failure, non-OK HTTP, or malformed resolve body (no usable `valid` boolean). */
  const [resolveFailed, setResolveFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setLoading(true);
    setReferrerName(null);
    setInviteKind("referral");
    setRewardMonths(1);
    setInviteInvalid(false);
    setResolveFailed(false);
    setLoading(true);
    /** Drop any prior invite token so stale values are never sent to auth after failed or superseded resolves. */
    clearReferralTokenStorage();

    let cancelled = false;

    void resolveInviteToken(token).then((resolution) => {
      if (cancelled) return;
      if (resolution.status === "failed") {
        setResolveFailed(true);
      } else if (resolution.status === "invalid") {
        // Storage already cleared at effect start; no token was written for invalid invites.
        setInviteInvalid(true);
      } else {
        setReferralTokenStorage(token);
        setReferrerName(resolution.invite.referrerName);
        setInviteKind(resolution.invite.kind);
        setRewardMonths(resolution.invite.rewardMonths);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token, navigate, retryNonce]);

  if (loading) {
    return (
      <HeroShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div
            role="status"
            aria-label="Checking your invite"
            className="h-10 w-10 animate-spin rounded-full border-2 border-accent/30 border-t-primary"
          />
        </div>
      </HeroShell>
    );
  }

  if (inviteInvalid) {
    return (
      <HeroShell>
        <NoticeCard
          icon={AlertTriangle}
          tone="error"
          title="This invite isn't available"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-primary font-semibold text-primary-foreground shadow-glow transition-all hover:scale-105 hover:bg-primary/90"
                type="button"
                onClick={() => navigate("/pricing")}
              >
                See plans
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-accent font-semibold text-accent transition-all hover:border-accent/70 hover:bg-accent/10"
                type="button"
                onClick={() => navigate("/")}
              >
                Go home
              </Button>
            </div>
          }
        >
          This invite link could not be validated. It may be invalid, expired, or
          referrals may be unavailable. You can still join KeenVPN — the invite
          reward just won&apos;t apply.
        </NoticeCard>
      </HeroShell>
    );
  }

  if (resolveFailed) {
    return (
      <HeroShell>
        <NoticeCard
          icon={RefreshCw}
          tone="warning"
          title="Couldn't verify this invite"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-primary font-semibold text-primary-foreground shadow-glow transition-all hover:scale-105 hover:bg-primary/90"
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-accent font-semibold text-accent transition-all hover:border-accent/70 hover:bg-accent/10"
                type="button"
                onClick={() => navigate("/")}
              >
                Go home
              </Button>
            </div>
          }
        >
          We couldn&apos;t reach KeenVPN to validate this link. Retry in a moment
          — your invite isn&apos;t saved until validation succeeds, so nothing is
          lost.
        </NoticeCard>
      </HeroShell>
    );
  }

  const rewardLabel = formatReferralRewardLabel(rewardMonths);
  const isMemberReferral = inviteKind === "referral";
  const pillLabel = isMemberReferral ? "Referral invite" : "Partner invite";
  // The reward belongs to whoever sent the link, never to the visitor reading
  // this page — so the copy always names them, and falls back to wording that
  // still fits when the backend withheld a display name.
  const inviterLabel =
    referrerName ??
    (inviteKind === "affiliate" ? "the person who invited you" : "your friend");

  const headlineRewardLine = isMemberReferral
    ? `You both earn ${rewardLabel}.`
    : referrerName
      ? `They earn ${rewardLabel}.`
      : null;

  const bodyRewardLine = isMemberReferral
    ? `you and ${inviterLabel} each earn ${rewardLabel} of KeenVPN`
    : `${inviterLabel} earns ${rewardLabel} of KeenVPN`;

  const stepThreeTitle = isMemberReferral
    ? `You both get ${rewardLabel}`
    : `They get ${rewardLabel}`;

  const stepThreeBody = isMemberReferral
    ? `Once you're on a paid plan, you and ${inviterLabel} each receive ${rewardLabel} of KeenVPN.`
    : `Once you're on a paid plan, ${inviterLabel} receives ${rewardLabel} of KeenVPN.`;

  return (
    <HeroShell>
      <div className="mx-auto max-w-5xl text-center">
        <Pill icon={Gift}>{pillLabel}</Pill>

        <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
          {referrerName
            ? `${referrerName} invited you to KeenVPN`
            : "You've been invited to KeenVPN"}
          {headlineRewardLine ? (
            <span className="mt-2 block text-primary">{headlineRewardLine}</span>
          ) : null}
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          KeenVPN secures your connection and unlocks member perks — cashback
          offers, partner discounts and rewards. Subscribe on a paid plan and{" "}
          {bodyRewardLine}.
        </p>

        <div className="mb-4 flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-glow transition-all hover:scale-105 hover:bg-primary/90"
            type="button"
            onClick={() => navigate("/signin")}
          >
            Sign up or sign in
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-accent px-8 py-6 text-lg font-semibold text-accent transition-all hover:scale-105 hover:border-accent/70 hover:bg-accent/10"
            type="button"
            onClick={() => navigate("/pricing")}
          >
            See plans
          </Button>
        </div>

        <p className="mb-12 text-sm text-muted-foreground">
          Keep using this browser so we can connect your invite. Start with a
          free trial — no commitment.
        </p>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <Step icon={UserRoundPlus} title="Create your account">
            Sign up in this same browser session so the invite stays attached to
            your new account.
          </Step>
          <Step icon={ShieldCheck} title="Start protecting your traffic">
            Install KeenVPN on iOS or macOS and connect. Your free trial starts
            straight away.
          </Step>
          <Step icon={Sparkles} title={stepThreeTitle}>
            {stepThreeBody}
          </Step>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-sm text-muted-foreground">
          After you subscribe on a paid plan, rewards apply per program terms.
        </p>
      </div>
    </HeroShell>
  );
};

export default ReferralLanding;
