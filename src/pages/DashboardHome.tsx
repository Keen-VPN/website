import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchDeviceConnectionsStatus,
  getSessionToken,
} from "@/auth/backend";
import { serverLocationStats } from "@/constants/server-locations";
import { MembershipSharingProvider } from "@/contexts/MembershipSharingContext";
import { MembershipTeamPanel } from "@/components/MembershipTeamPanel";
import { hasManageableSubscription } from "@/lib/subscription-cta";

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

  const serversLabel = `${serverLocationStats.locations}+ servers`;

  return (
    <div className="p-4 sm:p-6 lg:p-7">
      {/* Greeting */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.5px] text-[#071f3f] sm:text-[28px]">
          Welcome back, {firstName} 👋
        </h1>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
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

          {/* Class Action row */}
          <button
            onClick={() => navigate("/class-action")}
            className="flex items-center gap-3 rounded-[13px] border border-[#e3e8f0] bg-white px-4 py-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] transition-colors hover:bg-[#f5f7fb] sm:gap-4 sm:px-6 sm:py-[22px]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f3f8] text-xl">
              📄
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-[#0f2040]">
                Class Action Claims
              </p>
              <p className="text-[13px] text-[#627086]">
                Track and file claims from data-breach settlements
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#627086]" />
          </button>

          {/* Business team management — only for eligible / member / pending */}
          <MembershipTeamPanel
            variant="dashboard"
            hideIfIneligible
          />
        </div>

        {/* Right column — quick links */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[310px]">
          {[
            {
              title: "Set up devices",
              desc: "Get the KeenVPN app for every device you use to browse, work, and stay protected.",
              cta: "Download apps",
              route: "/downloads",
            },
            {
              title: "Account",
              desc: "Manage your account details, two-factor authentication.",
              cta: "Manage account",
              route: "/profile",
            },
            {
              title: "Help & guides",
              desc: "Setup walkthroughs and troubleshooting for every KeenVPN app.",
              cta: "View guides",
              route: "/support",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-[13px] border border-[#e3e8f0] bg-white px-5 py-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)]"
            >
              <p className="text-[14px] font-semibold text-[#0f2040]">
                {card.title}
              </p>
              <p className="mt-1 text-[13px] leading-[1.5] text-[#627086]">
                {card.desc}
              </p>
              <button
                onClick={() => navigate(card.route)}
                className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-[#ed7d36] transition-opacity hover:opacity-80"
              >
                {card.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <div className="p-4 sm:p-6 lg:p-7">
      {/* Greeting */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.5px] text-[#071f3f] sm:text-[28px]">
          Welcome back, {firstName} 👋
        </h1>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
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

          {/* Class Action row */}
          <button
            onClick={() => navigate("/class-action")}
            className="flex items-center gap-4 rounded-[13px] border border-[#e3e8f0] bg-white px-6 py-[22px] shadow-[0px_3px_4px_rgba(15,32,64,0.03)] transition-colors hover:bg-[#f5f7fb]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f3f8] text-xl">
              📄
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-[#0f2040]">
                Class Action Claims
              </p>
              <p className="text-[13px] text-[#627086]">
                Track and file claims from data-breach settlements
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#627086]" />
          </button>
        </div>

        {/* Right column — quick links */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[310px]">
          {[
            {
              title: "Set up devices",
              desc: "Get the KeenVPN app for every device you use to browse, work, and stay protected.",
              cta: "Download apps",
              route: "/downloads",
            },
            {
              title: "Account",
              desc: "Manage your account details, two-factor authentication.",
              cta: "Manage account",
              route: "/profile",
            },
            {
              title: "Help & guides",
              desc: "Setup walkthroughs and troubleshooting for every KeenVPN app.",
              cta: "View guides",
              route: "/support",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-[13px] border border-[#e3e8f0] bg-white px-5 py-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)]"
            >
              <p className="text-[14px] font-semibold text-[#0f2040]">
                {card.title}
              </p>
              <p className="mt-1 text-[13px] leading-[1.5] text-[#627086]">
                {card.desc}
              </p>
              <button
                onClick={() => navigate(card.route)}
                className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-[#ed7d36] transition-opacity hover:opacity-80"
              >
                {card.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
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

  if (loading) return <HomeLoading />;

  const resolvedState = hasManageableSubscription(subscription)
    ? "subscribed"
    : !subscription
      ? "new"
      : "expired";

  const content = (
    <>
      {resolvedState === "subscribed" && <SubscribedHome />}
      {resolvedState === "new" && <NewUserHome />}
      {resolvedState === "expired" && <ExpiredHome />}
    </>
  );

  return (
    <MembershipSharingProvider sessionToken={sessionToken}>
      {content}
    </MembershipSharingProvider>
  );
}
