import { useCallback, useEffect, useState } from "react";
import {
  adminListSubscriptions,
  type AdminSubscriptionListItem,
} from "@/auth/backend";

export default function AdminSubscriptions() {
  const [rows, setRows] = useState<AdminSubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListSubscriptions(75);
    if (!res.ok || !res.data) {
      setRows([]);
      setError(res.error ?? "Failed to load subscriptions");
      setLoading(false);
      return;
    }
    setRows(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subscriptions</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">User</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Type</th>
              <th className="p-3">Period end</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">
                  {r.user.name ? `${r.user.name} (${r.user.email})` : r.user.email}
                </td>
                <td className="p-3">{r.planName ?? "—"}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{r.subscriptionType}</td>
                <td className="p-3 text-muted-foreground">
                  {r.currentPeriodEnd ? r.currentPeriodEnd.slice(0, 10) : "—"}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={5}>
                  No subscriptions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
