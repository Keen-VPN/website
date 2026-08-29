import { useAuth } from "@/contexts/AuthContext";
import { getSessionToken } from "@/auth/backend";
import { ConnectedDevicesCard } from "@/components/ConnectedDevicesCard";
import { VpnProtectionCard } from "@/components/dashboard/VpnProtectionCard";
import { WebsiteExclusionsCard } from "@/components/dashboard/WebsiteExclusionsCard";

export default function DashboardVpn() {
  const { subscription } = useAuth();
  const sessionToken = getSessionToken();

  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <VpnProtectionCard
          subscription={subscription}
          sessionToken={sessionToken}
        />
        {sessionToken ? (
          <>
            <ConnectedDevicesCard
              sessionToken={sessionToken}
              variant="dashboard"
            />
            <WebsiteExclusionsCard sessionToken={sessionToken} />
          </>
        ) : null}
      </div>
    </div>
  );
}
