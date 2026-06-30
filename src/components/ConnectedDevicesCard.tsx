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
  revokeDeviceConnection,
} from "@/auth/backend";

interface ConnectedDevicesCardProps {
  sessionToken: string;
}

interface DeviceRow {
  id: string;
  platform?: string | null;
  lastSeenAt: string;
  connected: boolean;
}

interface DeviceStatusData {
  limit: number;
  activeCount: number;
  available: number;
  devices: DeviceRow[];
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

function platformLabel(platform?: string | null): string {
  if (!platform?.trim()) return "Unknown device";
  return platform;
}

export function ConnectedDevicesCard({
  sessionToken,
}: ConnectedDevicesCardProps) {
  const [status, setStatus] = useState<DeviceStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    try {
      const res = await fetchDeviceConnectionsStatus(sessionToken);
      if (!isCurrentRequest()) return;
      if (!res.ok) {
        if (res.error?.includes("not enabled")) {
          setStatus(null);
          return;
        }
        setError(res.error ?? "Could not load connected devices.");
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
                  <p className="font-medium">{platformLabel(device.platform)}</p>
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
                >
                  {submittingId === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Remove"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
