import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SubscriptionData } from "@/auth/types";
import {
  fetchVpnConnectionStatus,
  type VpnConnectionStatusData,
} from "@/auth/backend";
import {
  hasActiveVpnAccess,
  isEndedSubscription,
} from "@/lib/subscription-cta";

const STAT_BOX =
  "rounded-[10px] border border-[#e3e8f0] bg-[#fafbfd] px-4 py-3";

const VPN_STATUS_POLL_MS = 30_000;

function formatProtocol(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.toLowerCase() === "wireguard") return "WireGuard";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isBrowserOnVpn(status: VpnConnectionStatusData | null): boolean {
  if (!status?.connected) return false;
  return status.source !== "app_session" || Boolean(status.vpnIpMasked);
}

function isRemoteAppSession(status: VpnConnectionStatusData | null): boolean {
  return Boolean(
    status?.connected &&
      status.source === "app_session" &&
      !status.vpnIpMasked,
  );
}

function resolveProtectionCopy(subscription: SubscriptionData | null) {
  if (!subscription || isEndedSubscription(subscription)) {
    return {
      protected: false,
      pastDue: false,
      title: "Not protected",
      description:
        "Subscribe to KeenVPN to encrypt your traffic and use our global server network.",
    };
  }

  if (subscription.status === "past_due") {
    return {
      protected: false,
      pastDue: true,
      title: "Payment required",
      description:
        "Your subscription payment failed. Update billing to restore protection.",
    };
  }

  if (!hasActiveVpnAccess(subscription)) {
    return {
      protected: false,
      pastDue: false,
      title: "Not protected",
      description:
        "Choose a KeenVPN plan to activate encryption, DNS protection, and device coverage.",
    };
  }

  return {
    protected: true,
    pastDue: false,
    title: "Your plan is active",
    description:
      "Your KeenVPN plan is active. Connect from the app to route traffic through our encrypted network.",
  };
}

function protectionBadges(live: VpnConnectionStatusData | null): string[] {
  if (!isBrowserOnVpn(live)) {
    return [];
  }
  const badges: string[] = [];
  if (live?.protections?.killSwitch) badges.push("Kill switch on");
  if (live?.protections?.dnsProtection) badges.push("DNS protection on");
  if (live?.protections?.trackerBlocking) badges.push("Tracker blocking on");
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
  const requestGenerationRef = useRef(0);

  const refreshStatus = useCallback(
    async (generation: number, options?: { showLoading?: boolean }) => {
      if (!sessionToken) {
        if (generation === requestGenerationRef.current) {
          setLiveStatus(null);
          setLiveLoading(false);
        }
        return;
      }

      if (
        options?.showLoading &&
        generation === requestGenerationRef.current
      ) {
        setLiveLoading(true);
      }

      const result = await fetchVpnConnectionStatus(sessionToken);
      if (generation !== requestGenerationRef.current) {
        return;
      }

      setLiveStatus(result.ok ? (result.data ?? null) : null);
      setLiveLoading(false);
    },
    [sessionToken],
  );

  useEffect(() => {
    if (!sessionToken) {
      requestGenerationRef.current += 1;
      setLiveStatus(null);
      setLiveLoading(false);
      return;
    }

    const refresh = () => {
      void refreshStatus(++requestGenerationRef.current);
    };

    void refreshStatus(++requestGenerationRef.current, { showLoading: true });

    const intervalId = window.setInterval(refresh, VPN_STATUS_POLL_MS);

    window.addEventListener("focus", refresh);

    return () => {
      requestGenerationRef.current += 1;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [sessionToken, refreshStatus]);

  const planActive = copy.protected;
  const browserProtected = isBrowserOnVpn(liveStatus);
  const remoteSessionActive = isRemoteAppSession(liveStatus);
  const liveConnected = liveStatus?.connected === true;
  const badges = protectionBadges(liveStatus);

  const connectionStats = [
    {
      label: "VPN server",
      value:
        liveStatus?.serverLocation ??
        (planActive || liveConnected ? "Not connected" : "—"),
    },
    {
      label: "Encryption",
      value: browserProtected ? (liveStatus?.encryption ?? "AES-256") : "—",
    },
    {
      label: "Protocol",
      value: liveConnected
        ? formatProtocol(liveStatus?.protocol)
        : planActive
          ? "WireGuard"
          : "—",
    },
    {
      label: "VPN IP",
      value: liveStatus?.vpnIpMasked
        ? liveStatus.vpnIpMasked
        : remoteSessionActive
          ? "Not in this browser"
          : browserProtected
            ? "Hidden"
            : "—",
    },
  ];

  const headline = browserProtected
    ? "You're protected"
    : remoteSessionActive
      ? "Connected on another device"
      : copy.title;

  const description = browserProtected
    ? "Your internet traffic is encrypted and your essential VPN protections are currently active in this browser."
    : remoteSessionActive
      ? `KeenVPN is active on your ${liveStatus?.activeSession?.platform ?? "app"} session. Connect here too if you want this browser protected.`
      : copy.description;

  const footerNote = (() => {
    if (liveLoading) {
      return "Checking for an active KeenVPN connection…";
    }
    if (browserProtected) {
      return "Live connection details from this browser's KeenVPN session.";
    }
    if (remoteSessionActive) {
      return "Your app session is active elsewhere. VPN IP and browser protection appear here when this browser is on KeenVPN too.";
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
                browserProtected || planActive
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4eb]"
                  : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff5f5]"
              }
            >
              {browserProtected || planActive ? (
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
                {headline}
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#627086]">
                {description}
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
          ) : browserProtected ? (
            <p className="mt-5 text-[13px] text-[#627086]">
              Your VPN session is active, but optional protections are off for
              this connection.
            </p>
          ) : remoteSessionActive ? (
            <p className="mt-5 text-[13px] text-[#627086]">
              Kill switch, DNS, and tracker blocking apply on the connected app
              session — not in this browser until you connect here too.
            </p>
          ) : planActive ? (
            <p className="mt-5 text-[13px] text-[#627086]">
              Connect in the app to activate kill switch, DNS, and tracker
              blocking on a VPN session.
            </p>
          ) : copy.pastDue ? (
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#0f2040] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Update billing
            </button>
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
