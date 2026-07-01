import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MonitorSmartphone } from "lucide-react";
import {
  fetchDeviceConnectionsStatus,
  restoreDeviceConnection,
  revokeDeviceConnection,
} from "@/auth/backend";

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

  async function handleRevoke(deviceId: string) {
    setSubmittingId(deviceId);
    setError(null);
    try {
      const res = await revokeDeviceConnection(sessionToken, deviceId);
      if (!res.ok) {
        setError(res.error ?? "Failed to remove device.");
        return;
      }
      await load();
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleRestore(deviceId: string) {
    setSubmittingId(deviceId);
    setError(null);
    try {
      const res = await restoreDeviceConnection(sessionToken, deviceId);
      if (!res.ok) {
        setError(res.error ?? "Failed to restore device.");
        return;
      }
      await load();
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Connected devices
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading devices…
        </CardContent>
      </Card>
    );
  }

  if (featureDisabled) {
    return null;
  }

  if (error && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Connected devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5" />
          Connected devices
        </CardTitle>
        <CardDescription>
          {status.activeCount} of {status.limit} devices connected ·{" "}
          {status.available} available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {status.devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No registered devices yet. Devices appear here after you connect
            from the KeenVPN app.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {status.devices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
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
            <ul className="divide-y rounded-md border">
              {status.revokedDevices?.map((device) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
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
      </CardContent>
    </Card>
  );
}
