import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetchUsersOverview, type AdminUserOverview } from "@/auth/backend";

function currentMonthValue(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

function formatMonthSubtitle(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return month;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [monthInput, setMonthInput] = useState(currentMonthValue);
  const [minDurationInput, setMinDurationInput] = useState("10");
  const [excludeExtension, setExcludeExtension] = useState(false);
  const limit = 20;

  const load = useCallback(
    async (
      targetPage: number,
      targetSearch: string,
      month: string,
      minDuration: string,
      excludeIosExtension: boolean,
    ) => {
      setLoading(true);
      setError(null);

      const parsedMin = Number(minDuration);
      if (!Number.isInteger(parsedMin) || parsedMin < 0) {
        setOverview(null);
        setError("Min duration must be a non-negative whole number");
        setLoading(false);
        return;
      }

      const res = await adminFetchUsersOverview({
        page: targetPage,
        limit,
        search: targetSearch,
        month,
        minDurationSeconds: parsedMin,
        excludePlatforms: excludeIosExtension ? "ios_extension" : undefined,
      });
      if (!res.ok || !res.data) {
        setOverview(null);
        setError(res.error ?? "Failed to load admin overview");
        setLoading(false);
        return;
      }
      setOverview(res.data);
      setPage(res.data.page);
      setLoading(false);
    },
    [limit],
  );

  // Mount-only: read filter state (not hardcoded literals) so URL/persisted defaults work later.
  useEffect(() => {
    void load(1, searchTerm, monthInput, minDurationInput, excludeExtension);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch only
  }, [load]);

  const applyFilters = () => {
    void load(1, searchTerm, monthInput, minDurationInput, excludeExtension);
  };

  const activeMonth = overview?.month ?? monthInput;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="mt-1 text-sm text-foreground/85">
            User list with VPN session counts for the selected month (UTC).
            Use the same month and filters as Connection engagement to reconcile
            totals.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void load(page, searchTerm, monthInput, minDurationInput, excludeExtension)
          }
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

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Month (UTC)</span>
          <input
            type="month"
            value={monthInput}
            onChange={(event) => setMonthInput(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">
            Min duration (seconds)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={minDurationInput}
            onChange={(event) => setMinDurationInput(event.target.value)}
            className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={excludeExtension}
            onChange={(event) => setExcludeExtension(event.target.checked)}
            className="rounded border-border"
          />
          <span className="text-muted-foreground">
            Exclude iOS extension rows
          </span>
        </label>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Apply
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Search users</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Email or name"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const trimmed = searchInput.trim();
            setSearchTerm(trimmed);
            void load(1, trimmed, monthInput, minDurationInput, excludeExtension);
          }}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchInput("");
            setSearchTerm("");
            void load(1, "", monthInput, minDurationInput, excludeExtension);
          }}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Clear
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium">
          Users by longest session ({formatMonthSubtitle(activeMonth)})
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            Connections and longest session use effective duration (same as the
            session detail view), min{" "}
            {overview?.filters.min_duration_seconds ?? minDurationInput}s
          </span>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">User</th>
              <th className="p-3 text-right">Connections</th>
              <th className="p-3">Longest session</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {(overview?.users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  <Link
                    to={`/admin/users/${u.id}`}
                    className="text-primary hover:underline"
                  >
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </Link>
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {u.connectionCount}
                </td>
                <td className="p-3 font-mono">{formatDuration(u.longestSessionSeconds)}</td>
                <td className="p-3 text-muted-foreground">{u.createdAt.slice(0, 10)}</td>
                <td className="p-3">
                  <Link
                    to={`/admin/user-sessions/${u.id}`}
                    className="text-primary hover:underline"
                  >
                    View sessions
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && (overview?.users.length ?? 0) === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={5}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Page {overview?.page ?? page} of {overview?.totalPages ?? 1}
        </p>
        <div className="flex items-center gap-2">
          <input
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            placeholder="Page #"
            className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const requested = Number.parseInt(jumpPageInput, 10);
              if (!Number.isFinite(requested) || requested < 1) return;
              const maxPage = overview?.totalPages ?? 1;
              void load(
                Math.min(requested, maxPage),
                searchTerm,
                monthInput,
                minDurationInput,
                excludeExtension,
              );
            }}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          >
            Go
          </button>
          <button
            type="button"
            onClick={() =>
              void load(
                Math.max(1, page - 1),
                searchTerm,
                monthInput,
                minDurationInput,
                excludeExtension,
              )
            }
            disabled={loading || page <= 1}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              void load(
                page + 1,
                searchTerm,
                monthInput,
                minDurationInput,
                excludeExtension,
              )
            }
            disabled={loading || page >= (overview?.totalPages ?? 1)}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
