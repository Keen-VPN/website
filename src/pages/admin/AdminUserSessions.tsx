import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminFetchUserConnectionSessions,
  type AdminConnectionSession,
  type AdminUserConnectionSessionsResponse,
} from "@/auth/backend";

const PAGE_SIZE = 50;

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export default function AdminUserSessions() {
  const { userId } = useParams<{ userId: string }>();
  const [payload, setPayload] =
    useState<AdminUserConnectionSessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      if (!userId) {
        setError("Missing user id");
        setLoading(false);
        return;
      }

      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      setLoading(true);
      setError(null);

      const offset = (targetPage - 1) * PAGE_SIZE;
      const res = await adminFetchUserConnectionSessions(userId, {
        limit: PAGE_SIZE,
        offset,
        signal: controller.signal,
      });

      if (controller.signal.aborted || activeRequest.current !== controller) {
        return;
      }

      if (!res.ok || !res.data) {
        setPayload(null);
        setError(res.error ?? "Failed to load connection sessions");
        setLoading(false);
        activeRequest.current = null;
        return;
      }

      setPayload(res.data);
      setPage(targetPage);
      setLoading(false);
      activeRequest.current = null;
    },
    [userId],
  );

  useEffect(() => {
    void load(1);
    return () => activeRequest.current?.abort();
  }, [load]);

  const total = payload?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const user = payload?.user;
  const sessions = payload?.sessions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/overview"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to overview
          </Link>
          <h2 className="mt-2 text-2xl font-bold">Connection sessions</h2>
          {user ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {user.name ? `${user.name} · ` : ""}
              {user.email} · {user.provider} · joined{" "}
              {user.createdAt.slice(0, 10)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load(page)}
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
        <p className="text-sm text-muted-foreground">Total sessions</p>
        <p className="mt-1 text-3xl font-semibold">{loading ? "…" : total}</p>
        {user ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Longest session: {formatDuration(user.longestSessionSeconds)}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Started</th>
              <th className="p-3">Ended</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Platform</th>
              <th className="p-3">Location</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Termination</th>
              <th className="p-3 text-right">Bytes</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session: AdminConnectionSession) => (
              <tr key={session.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {formatDateTime(session.session_start)}
                </td>
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {formatDateTime(session.session_end)}
                </td>
                <td className="p-3 font-mono">
                  {formatDuration(session.duration_seconds)}
                </td>
                <td className="p-3">{session.platform}</td>
                <td className="p-3 text-muted-foreground">
                  {session.server_location ?? "—"}
                </td>
                <td className="p-3">{session.subscription_tier ?? "—"}</td>
                <td className="p-3 text-muted-foreground">
                  <span className="block">{session.termination_reason}</span>
                  {session.disconnect_reason ? (
                    <span className="block text-xs">
                      {session.disconnect_reason}
                    </span>
                  ) : null}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {formatBytes(session.bytes_transferred)}
                </td>
              </tr>
            ))}
            {!loading && sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-muted-foreground">
                  No connection sessions recorded for this user.
                </td>
              </tr>
            ) : null}
            {loading && sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Page {page} of {totalPages} · showing {sessions.length} of {total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => void load(Math.min(totalPages, page + 1))}
            disabled={loading || page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
