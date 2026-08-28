import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SubscriptionData } from "@/auth/types";
import {
  fetchVpnConnectionStatus,
  type VpnConnectionStatusData,
} from "@/auth/backend";
import {
  hasManageableSubscription,
  isEndedSubscription,
} from "@/lib/subscription-cta";

const STAT_BOX =
  "rounded-[10px] border border-[#e3e8f0] bg-[#fafbfd] px-4 py-3";

function formatProtocol(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.toLowerCase() === "wireguard") return "WireGuard";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveProtectionCopy(subscription: SubscriptionData | null) {
  if (!subscription || isEndedSubscription(subscription)) {
    return {
      protected: false,
      title: "Not protected",
      description:
        "Subscribe to KeenVPN to encrypt your traffic and use our global server network.",
    };
  }

  if (subscription.status === "past_due") {
    return {
      protected: false,
      title: "Payment required",
      description:
        "Your subscription payment failed. Update billing to restore protection.",
    };
  }

  if (!hasManageableSubscription(subscription)) {
    return {
      protected: false,
      title: "Not protected",
      description:
        "Choose a KeenVPN plan to activate encryption, DNS protection, and device coverage.",
    };
  }

  return {
    protected: true,
    title: "You're protected",
    description:
      "Your KeenVPN plan is active. Connect from the app to route traffic through our encrypted network.",
  };
}

function protectionBadges(live: VpnConnectionStatusData | null): string[] {
  if (!live?.connected) {
    return [];
  }
  const badges: string[] = [];
  if (live.protections.killSwitch) badges.push("Kill switch on");
  if (live.protections.dnsProtection) badges.push("DNS protection on");
  if (live.protections.trackerBlocking) badges.push("Tracker blocking on");
  return badges;
}

export function VpnProtectionCard({
  subscription,
  sessionToken,
}: {
  subscription: SubscriptionData | null;
  sessionToken: string | null;
}) {
  const navigate = useNavigate();
  const copy = resolveProtectionCopy(subscription);
  const [liveStatus, setLiveStatus] = useState<VpnConnectionStatusData | null>(
    null,
  );
  const [liveLoading, setLiveLoading] = useState(Boolean(sessionToken));

  useEffect(() => {
    if (!sessionToken) {
      setLiveStatus(null);
      setLiveLoading(false);
      return;
    }

    let cancelled = false;
    setLiveLoading(true);
    void fetchVpnConnectionStatus(sessionToken).then((result) => {
      if (cancelled) return;
      setLiveStatus(result.ok ? (result.data ?? null) : null);
      setLiveLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const planActive = copy.protected;
  const tunnelActive = liveStatus?.connected === true;
  const badges = protectionBadges(liveStatus);

  const connectionStats = [
    {
      label: "VPN server",
      value: liveStatus?.serverLocation ?? (planActive ? "Not connected" : "—"),
    },
    {
      label: "Encryption",
      value: liveStatus?.encryption ?? "AES-256",
    },
    {
      label: "Protocol",
      value: tunnelActive
        ? formatProtocol(liveStatus?.protocol)
        : planActive
          ? "WireGuard"
          : "—",
    },
    {
      label: "VPN IP",
      value: liveStatus?.vpnIpMasked ?? (tunnelActive ? "Hidden" : "—"),
    },
  ];

  const footerNote = (() => {
    if (liveLoading) {
      return "Checking for an active KeenVPN connection…";
    }
    if (tunnelActive && liveStatus?.source === "app_session" && !liveStatus.vpnIpMasked) {
      return "Connected on another device. VPN IP shows here when this browser is on KeenVPN too.";
    }
    if (tunnelActive) {
      return "Live connection details from your KeenVPN session.";
    }
    if (planActive) {
      return "Open the KeenVPN app and connect to see your server and VPN IP here.";
    }
    return "Subscribe and connect in the KeenVPN app to see live connection details.";
  })();

  return (
    <section className="rounded-[15px] border border-[#e3e8f0] bg-white p-5 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div
              className={
                planActive
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4eb]"
                  : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff5f5]"
              }
            >
              {planActive ? (
                <CheckCircle2 className="h-5 w-5 text-[#ed7d36]" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-[#d14343]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#a0aabb]">
                Current protection
              </p>
              <h2 className="mt-1 text-[22px] font-bold tracking-[-0.4px] text-[#071f3f] sm:text-[26px]">
                {tunnelActive ? "You're protected" : copy.title}
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#627086]">
                {tunnelActive
                  ? "Your internet traffic is encrypted and your essential VPN protections are currently active."
                  : copy.description}
              </p>
            </div>
          </div>

          {badges.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-[#e3e8f0] bg-[#f5f7fb] px-3 py-1 text-[12px] font-medium text-[#43516a]"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : planActive ? (
            <p className="mt-5 text-[13px] text-[#627086]">
              Connect in the app to activate kill switch, DNS, and tracker
              blocking on this session.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/subscription?tab=plans")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#0f2040] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              View plans
            </button>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:max-w-[420px] lg:shrink-0">
          {connectionStats.map((stat) => (
            <div key={stat.label} className={STAT_BOX}>
              <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0aabb]">
                {stat.label}
              </p>
              <p className="mt-1 break-words text-[14px] font-semibold text-[#071f3f] sm:text-[15px]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 border-t border-[#eef2f7] pt-4 text-[12px] leading-relaxed text-[#7d899c]">
        {liveLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : null}
        {footerNote}
      </p>
    </section>
  );
}
