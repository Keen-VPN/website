import { useCallback, useEffect, useState } from "react";
import { adminFetchUsersOverview, type AdminUserOverview } from "@/auth/backend";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AdminOverview() {
  const [overview, setOverview] = useState<AdminUserOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminFetchUsersOverview();
    if (!res.ok || !res.data) {
      setOverview(null);
      setError(res.error ?? "Failed to load admin overview");
      setLoading(false);
      return;
    }
    setOverview(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Overview</h2>
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

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">Total users</p>
        <p className="mt-1 text-3xl font-semibold">{overview?.totalUsers ?? (loading ? "…" : 0)}</p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium">
          Users by longest session
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">User</th>
              <th className="p-3">Longest session</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(overview?.users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.name ? `${u.name} (${u.email})` : u.email}</td>
                <td className="p-3 font-mono">{formatDuration(u.longestSessionSeconds)}</td>
                <td className="p-3 text-muted-foreground">{u.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
            {!loading && (overview?.users.length ?? 0) === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={3}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
