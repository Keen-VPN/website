import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import {
  workspaceListRow,
  workspaceListSurface,
} from "@/components/workspace/workspace-ui";
import { Loader2, MonitorSmartphone } from "lucide-react";
import {
  fetchDeviceConnectionsStatus,
  restoreDeviceConnection,
  revokeDeviceConnection,
} from "@/auth/backend";
import { cn } from "@/lib/utils";

interface ConnectedDevicesCardProps {
  sessionToken: string;
}

interface DeviceRow {
  id: string;
  platform?: string | null;
  label?: string | null;
  lastSeenAt: string;
  connected: boolean;
}

interface RevokedDeviceRow {
  id: string;
  platform?: string | null;
  label?: string | null;
  lastSeenAt: string;
  revokedAt: string;
}

interface DeviceStatusData {
  limit: number;
  activeCount: number;
  available: number;
  devices: DeviceRow[];
  revokedDevices?: RevokedDeviceRow[];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function deviceLabel(device: { label?: string | null; platform?: string | null }): string {
  if (device.label?.trim()) return device.label.trim();
  if (device.platform?.trim()) return device.platform.trim();
  return "Unknown device";
}

export function ConnectedDevicesCard({
  sessionToken,
}: ConnectedDevicesCardProps) {
  const [status, setStatus] = useState<DeviceStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    setFeatureDisabled(false);
    try {
      const res = await fetchDeviceConnectionsStatus(sessionToken);
      if (!isCurrentRequest()) return;
      if (!res.ok) {
        if (res.error?.includes("not enabled")) {
          setStatus(null);
          setFeatureDisabled(true);
          return;
        }
        setError(res.error ?? "Could not load connected devices.");
        setStatus(null);
        return;
      }
      setStatus(res.data as DeviceStatusData);
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runDeviceAction(
    deviceId: string,
    action: (
      token: string,
      id: string,
    ) => Promise<{ ok: boolean; error?: string }>,
    failureMessage: string,
  ) {
    setSubmittingId(deviceId);
    setError(null);
    try {
      const res = await action(sessionToken, deviceId);
      if (!res.ok) {
        setError(res.error ?? failureMessage);
        return;
      }
      await load();
    } finally {
      setSubmittingId((current) => (current === deviceId ? null : current));
    }
  }

  async function handleRevoke(deviceId: string) {
    await runDeviceAction(
      deviceId,
      revokeDeviceConnection,
      "Failed to remove device.",
    );
  }

  async function handleRestore(deviceId: string) {
    await runDeviceAction(
      deviceId,
      restoreDeviceConnection,
      "Failed to restore device.",
    );
  }

  if (loading) {
    return (
      <WorkspacePanel title="Connected devices" icon={MonitorSmartphone}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading devices…
        </div>
      </WorkspacePanel>
    );
  }

  if (featureDisabled) {
    return null;
  }

  if (error && !status) {
    return (
      <WorkspacePanel title="Connected devices" icon={MonitorSmartphone}>
        <p className="text-sm text-destructive">{error}</p>
      </WorkspacePanel>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <WorkspacePanel
      title="Connected devices"
      icon={MonitorSmartphone}
      description={`${status.activeCount} of ${status.limit} devices connected · ${status.available} available`}
    >
        {error && <p className="text-sm text-destructive">{error}</p>}
        {status.devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No registered devices yet. Devices appear here after you connect
            from the KeenVPN app.
          </p>
        ) : (
          <ul className={workspaceListSurface}>
            {status.devices.map((device) => (
              <li
                key={device.id}
                className={cn(
                  workspaceListRow,
                  "flex flex-wrap items-center justify-between gap-3",
                )}
              >
                <div>
                  <p className="font-medium">{deviceLabel(device)}</p>
                  <p className="text-sm text-muted-foreground">
                    Last seen {formatDate(device.lastSeenAt)}
                    {device.connected ? " · Connected now" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={submittingId === device.id}
                  onClick={() => void handleRevoke(device.id)}
                  aria-busy={submittingId === device.id}
                >
                  {submittingId === device.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      <span className="sr-only">Removing device</span>
                      <span>Remove</span>
                    </>
                  ) : (
                    "Remove"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {(status.revokedDevices?.length ?? 0) > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Removed devices</p>
            <ul className={workspaceListSurface}>
              {status.revokedDevices?.map((device) => (
                <li
                  key={device.id}
                  className={cn(
                    workspaceListRow,
                    "flex flex-wrap items-center justify-between gap-3",
                  )}
                >
                  <div>
                    <p className="font-medium">{deviceLabel(device)}</p>
                    <p className="text-sm text-muted-foreground">
                      Removed {formatDate(device.revokedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submittingId === device.id}
                    onClick={() => void handleRestore(device.id)}
                    aria-busy={submittingId === device.id}
                  >
                    {submittingId === device.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        <span className="sr-only">Restoring device</span>
                        <span>Restore</span>
                      </>
                    ) : (
                      "Restore"
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
    </WorkspacePanel>
  );
}
