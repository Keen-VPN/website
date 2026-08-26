import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, Shield, Smartphone, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import { useStripeCheckoutReturn } from "@/hooks/use-stripe-checkout-return";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchDeviceConnectionsStatus,
  getSessionToken,
} from "@/auth/backend";
import { formatScheduledAnnualBillingDate } from "@/lib/scheduled-annual-billing";
import { getDashboardServersLabel } from "@/constants/server-locations";
import { MembershipSharingProvider, useMembershipSharingContext } from "@/contexts/MembershipSharingContext";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";
import { ReceivedMembershipInviteBanner } from "@/components/ReceivedMembershipInviteBanner";
import { hasManageableSubscription, isEndedSubscription } from "@/lib/subscription-cta";
import type { SubscriptionData } from "@/auth/types";
import { DashboardHomeLayout } from "@/components/dashboard/DashboardHomeShared";
import {
  getAppStoreInstallButtonLabel,
  resolveAppStoreUrl,
} from "@/lib/open-app-or-store";
import {
  isAppDeepLinkSupported,
  getUnsupportedDeviceName,
} from "@/lib/device-detection";
import { RETURN_TO_APP_LABEL } from "@/lib/keenvpn-deep-links";
import { openKeenVpnAppStore } from "@/lib/keenvpn-deep-links";

function PaymentCompleteBanner({
  isASWeb,
  onReturnToApp,
  onDismiss,
}: {
  isASWeb: boolean;
  onReturnToApp: () => void;
  onDismiss: () => void;
}) {
  const appStoreUrl = useAppStoreUrl();
  const isDeepLinkSupported = useMemo(() => isAppDeepLinkSupported(), []);
  const unsupportedDeviceName = useMemo(() => getUnsupportedDeviceName(), []);

  const handleDownload = () => {
    openKeenVpnAppStore(resolveAppStoreUrl(appStoreUrl));
    onDismiss();
  };

  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-[13px] bg-[#eef8f2] px-4 py-4 sm:mx-6 sm:px-5 lg:mx-7">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#159653]/15">
          <CheckCircle2 className="h-4 w-4 text-[#159653]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#0f2040]">
                You&apos;re all set
              </h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#43516a]">
                {isASWeb
                  ? "Your subscription is active. Return to the app to connect."
                  : isDeepLinkSupported
                    ? "Your subscription is active. Download the app to connect on this device."
                    : `Your subscription is active. Install KeenVPN on your ${unsupportedDeviceName} to connect.`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#627086] hover:bg-white/70 hover:text-[#0f2040]"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isASWeb ? (
              <>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#0f2040] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f2040]/90"
                  onClick={onReturnToApp}
                >
                  <Smartphone className="h-4 w-4" />
                  {RETURN_TO_APP_LABEL}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#627086] hover:text-[#0f2040]"
                  onClick={onDismiss}
                >
                  Continue on web
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-[8px] bg-[#0f2040] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f2040]/90"
                  onClick={handleDownload}
                >
                  {getAppStoreInstallButtonLabel()}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#627086] hover:text-[#0f2040]"
                  onClick={onDismiss}
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subscribed state ────────────────────────────────────────────────────────

function SubscribedHome() {
  const { user, subscription, hasSessionToken } = useAuth();
  const navigate = useNavigate();
  const [devicesLabel, setDevicesLabel] = useState("—");

  const firstName = user?.displayName?.split(" ")[0] ?? user?.email ?? "there";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const renewsDate = subscription?.endDate
    ? formatDate(subscription.endDate)
    : "";
  const isExpiring = subscription?.cancelAtPeriodEnd;

  useEffect(() => {
    if (!hasSessionToken) return;
    const token = getSessionToken();
    if (!token) return;
    let cancelled = false;
    void fetchDeviceConnectionsStatus(token).then((res) => {
      if (cancelled) return;
      if (!res.ok || !res.data || typeof res.data !== "object") {
        setDevicesLabel("—");
        return;
      }
      const data = res.data as { activeCount?: number; limit?: number };
      if (
        typeof data.activeCount === "number" &&
        typeof data.limit === "number"
      ) {
        setDevicesLabel(`${data.activeCount}/${data.limit}`);
      } else {
        setDevicesLabel("—");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasSessionToken]);

  const serversLabel = getDashboardServersLabel();

  return (
    <DashboardHomeLayout
      firstName={firstName}
      navigate={navigate}
      leftExtra={
        <MembershipTeamPanel variant="dashboard" hideIfIneligible />
      }
    >
      {/* Subscription card */}
      <div className="rounded-[13px] border border-[#e3e8f0] bg-white shadow-[0px_3px_4px_rgba(15,32,64,0.03),0px_16px_19px_rgba(15,32,64,0.06)]">
        {/* Subscription row */}
        <button
          onClick={() => navigate("/subscription")}
          className="flex w-full items-center gap-4 rounded-t-[13px] px-6 py-[23px] transition-colors hover:bg-[#f5f7fb]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f3f8]">
            <Shield className="h-5 w-5 text-[#0f2040]" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-[#0f2040]">
                {subscription?.plan ?? "KeenVPN"}
              </span>
              <span
                className={
                  subscription?.status === "past_due"
                    ? "rounded-full bg-[#fff4eb] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c05600]"
                    : "rounded-full bg-[#e6f9f0] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1a9e5a]"
                }
              >
                {subscription?.status === "past_due"
                  ? "Past due"
                  : subscription?.status === "trialing"
                    ? "Trial"
                    : "Active"}
              </span>
            </div>
            {subscription?.status === "past_due" ? (
              <p className="mt-0.5 text-[13px] text-[#c05600]">
                Payment failed — update billing to stay protected.
              </p>
            ) : renewsDate ? (
              <p className="mt-0.5 text-[13px] text-[#627086]">
                {isExpiring ? "Ends" : "Renews"} {renewsDate}
              </p>
            ) : null}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#627086]" />
        </button>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-[#e3e8f0] border-t border-[#e3e8f0]">
          {[
            { label: "Devices", value: devicesLabel },
            { label: "Servers", value: serversLabel },
            {
              label: "Status",
              value:
                subscription?.status === "past_due"
                  ? "Payment due"
                  : "Protected",
            },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-3 sm:px-6 sm:py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#a0aabb]">
                {stat.label}
              </p>
              <p className="mt-1 text-[14px] font-semibold text-[#071f3f] sm:text-[18px]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </DashboardHomeLayout>
  );
}

// ─── New user state ───────────────────────────────────────────────────────────

function NewUserHome() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 lg:p-7">
      {/* Greeting */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.5px] text-[#071f3f] sm:text-[28px]">
          👋 Welcome to KeenVPN!
        </h1>
        <p className="mt-2 text-[15px] text-[#6b7890]">
          You&apos;re just a few steps away from a safer, faster, and more private internet.
        </p>
      </div>

      {/* 3-step onboarding card */}
      <div className="rounded-[15px] border border-[#e3e8f0] bg-white shadow-[0px_3px_4px_rgba(15,32,64,0.03),0px_16px_19px_rgba(15,32,64,0.06)]">
        <div className="px-4 pt-5 pb-2 sm:px-10 sm:pt-6">
          <p className="text-center text-[17px] font-bold text-[#071f3f] sm:text-[20px]">
            Set up your VPN in 3 simple steps
          </p>
        </div>
        <div className="relative grid grid-cols-1 gap-4 px-4 pb-6 pt-4 sm:gap-5 sm:px-8 sm:pb-8 sm:pt-5 md:grid-cols-3">
          {/* Step 1 */}
          <div className="relative flex flex-col items-center rounded-[13px] border border-[#e3e8f0] bg-gradient-to-b from-white to-[#fcfdff] px-5 pb-6 pt-8 text-center shadow-sm">
            <div className="mb-5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#0f2040] shadow-[0px_7px_7px_rgba(47,102,255,0.15)]">
              <span className="text-[13px] font-bold text-white">1</span>
            </div>
            <h3 className="mb-3 text-[20px] font-bold text-[#071f3f]">Subscribe</h3>
            <p className="mb-6 text-[15px] leading-[1.5] text-[#6b7890]">
              Choose a plan that fits your needs and subscribe to KeenVPN.
            </p>
            <button
              onClick={() => navigate("/subscription?tab=plans")}
              className="w-full rounded-[7px] bg-[#0f2040] py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              View plans
            </button>
          </div>

          {/* Arrow between step 1 and 2 */}
          <ChevronRight className="absolute left-[calc(33.33%-12px)] top-[calc(50%-14px)] hidden h-6 w-6 text-[#627086] pointer-events-none md:block" />

          {/* Step 2 */}
          <div className="relative flex flex-col items-center rounded-[13px] border border-[#e3e8f0] bg-gradient-to-b from-white to-[#fcfdff] px-5 pb-6 pt-8 text-center shadow-sm">
            <div className="mb-5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#ed7d36] shadow-[0px_7px_7px_rgba(47,102,255,0.15)]">
              <span className="text-[13px] font-bold text-white">2</span>
            </div>
            <h3 className="mb-3 text-[20px] font-bold text-[#071f3f]">
              Download the app
            </h3>
            <p className="mb-6 text-[15px] leading-[1.5] text-[#6b7890]">
              Get the KeenVPN app for your device and install it.
            </p>
            <button
              onClick={() => navigate("/downloads")}
              className="w-full rounded-[7px] border border-[#dbe2ec] bg-white py-3 text-[15px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f5f7fb]"
            >
              Download apps
            </button>
          </div>

          <ChevronRight className="absolute left-[calc(66.66%-12px)] top-[calc(50%-14px)] hidden h-6 w-6 text-[#627086] pointer-events-none md:block" />

          {/* Step 3 */}
          <div className="relative flex flex-col items-center rounded-[13px] border border-[#e3e8f0] bg-gradient-to-b from-white to-[#fcfdff] px-5 pb-6 pt-8 text-center shadow-sm">
            <div className="mb-5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#0f2040] shadow-[0px_7px_7px_rgba(47,102,255,0.15)]">
              <span className="text-[13px] font-bold text-white">3</span>
            </div>
            <h3 className="mb-3 text-[20px] font-bold text-[#071f3f]">
              Connect &amp; enjoy
            </h3>
            <p className="mb-6 text-[15px] leading-[1.5] text-[#6b7890]">
              Open the app, connect to a server, and enjoy private browsing.
            </p>
            <button
              onClick={() => navigate("/downloads")}
              className="w-full rounded-[7px] bg-[#0f2040] py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Go to apps
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Expired state ────────────────────────────────────────────────────────────

function ExpiredHome() {
  const { user, subscription } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.displayName?.split(" ")[0] ?? user?.email ?? "there";

  return (
    <DashboardHomeLayout firstName={firstName} navigate={navigate}>
      {/* Expired subscription card */}
      <div className="rounded-[13px] border border-[#e3e8f0] bg-white shadow-[0px_3px_4px_rgba(15,32,64,0.03),0px_16px_19px_rgba(15,32,64,0.06)]">
        <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-[23px]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff0f0]">
            <Shield className="h-5 w-5 text-[#d14343]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-[#0f2040]">
                {subscription?.plan ?? "KeenVPN"}
              </span>
              <span className="rounded-full bg-[#fdecea] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#d14343]">
                Expired
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-[#627086]">
              Your subscription has ended. Renew to restore protection.
            </p>
          </div>
          <button
            onClick={() => navigate("/subscription?tab=plans")}
            className="shrink-0 rounded-[8px] bg-[#0f2040] px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Subscribe
          </button>
        </div>
      </div>
    </DashboardHomeLayout>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HomeLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <Skeleton className="mb-6 h-9 w-48 sm:w-72" />
      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-40 rounded-[13px]" />
          <Skeleton className="h-20 rounded-[13px]" />
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-[310px]">
          <Skeleton className="h-28 rounded-[13px]" />
          <Skeleton className="h-28 rounded-[13px]" />
          <Skeleton className="h-28 rounded-[13px]" />
        </div>
      </div>
    </div>
  );
}

// ─── Main export — picks the right state ─────────────────────────────────────

export default function DashboardHome() {
  const { loading, subscription, hasSessionToken } = useAuth();
  const sessionToken = hasSessionToken ? getSessionToken() : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const businessUpgradeHandledRef = useRef(false);
  const appStoreUrl = useAppStoreUrl();
  const {
    checkoutHydrating,
    showPaymentCompleteBanner,
    isASWeb,
    dismissPostCheckoutUi,
    returnToApp,
  } = useStripeCheckoutReturn(appStoreUrl);

  useEffect(() => {
    if (searchParams.get("business") !== "upgraded") return;
    if (businessUpgradeHandledRef.current) return;
    businessUpgradeHandledRef.current = true;

    const scheduledBillingPeriod = searchParams.get("billing");
    const scheduledBillingDate = formatScheduledAnnualBillingDate(
      searchParams.get("billingEffectiveAt"),
    );
    toast({
      title: "Business plan updated",
      description:
        (scheduledBillingPeriod === "year" ||
          scheduledBillingPeriod === "month") &&
        scheduledBillingDate
          ? `Business is active with no upgrade charge. ${
              scheduledBillingPeriod === "year" ? "Annual" : "Monthly"
            } billing starts on ${scheduledBillingDate}, after your current paid period ends.`
          : "Business is enabled. Invite teammates in the Team section below.",
    });

    const next = new URLSearchParams(searchParams);
    next.delete("business");
    next.delete("billing");
    next.delete("billingEffectiveAt");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  if (loading || checkoutHydrating) return <HomeLoading />;

  return (
    <MembershipSharingProvider sessionToken={sessionToken}>
      <DashboardHomeContent
        sessionToken={sessionToken}
        subscription={subscription}
        showPaymentCompleteBanner={showPaymentCompleteBanner}
        isASWeb={isASWeb}
        dismissPostCheckoutUi={dismissPostCheckoutUi}
        returnToApp={returnToApp}
      />
    </MembershipSharingProvider>
  );
}

function DashboardHomeContent({
  sessionToken,
  subscription,
  showPaymentCompleteBanner,
  isASWeb,
  dismissPostCheckoutUi,
  returnToApp,
}: {
  sessionToken: string | null;
  subscription: SubscriptionData | null;
  showPaymentCompleteBanner: boolean;
  isASWeb: boolean;
  dismissPostCheckoutUi: () => void;
  returnToApp: (token: string | null) => void;
}) {
  const { dashboard: membershipDashboard, loading: membershipLoading } =
    useMembershipSharingContext();
  const onTeam =
    membershipDashboard?.role === "member" ||
    membershipDashboard?.role === "transfer_pending";

  if (membershipLoading && !membershipDashboard) {
    return <HomeLoading />;
  }

  const resolvedState = hasManageableSubscription(subscription) || onTeam
    ? "subscribed"
    : isEndedSubscription(subscription)
      ? "expired"
      : "new";

  return (
    <>
      {showPaymentCompleteBanner ? (
        <PaymentCompleteBanner
          isASWeb={isASWeb}
          onReturnToApp={() => returnToApp(getSessionToken())}
          onDismiss={dismissPostCheckoutUi}
        />
      ) : null}
      {sessionToken ? (
        <ReceivedMembershipInviteBanner
          sessionToken={sessionToken}
          variant="dashboard"
        />
      ) : null}
      {resolvedState === "subscribed" && <SubscribedHome />}
      {resolvedState === "new" && <NewUserHome />}
      {resolvedState === "expired" && <ExpiredHome />}
    </>
  );
}
