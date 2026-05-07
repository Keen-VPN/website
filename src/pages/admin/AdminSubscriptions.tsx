import { useCallback, useEffect, useState } from "react";
import {
  adminListSubscriptions,
  type AdminSubscriptionListItem,
} from "@/auth/backend";

export default function AdminSubscriptions() {
  const [rows, setRows] = useState<AdminSubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [jumpPageInput, setJumpPageInput] = useState("");
  const limit = 50;

  const load = useCallback(
    async (
      targetPage: number,
      targetSearch = searchTerm,
      targetStatus = statusFilter,
      targetType = typeFilter,
    ) => {
    setLoading(true);
    setError(null);
    const res = await adminListSubscriptions({
      page: targetPage,
      limit,
      search: targetSearch,
      status: targetStatus,
      type: targetType,
    });
    if (!res.ok || !res.data) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError(res.error ?? "Failed to load subscriptions");
      setLoading(false);
      return;
    }
    setRows(res.data.items);
    setPage(res.data.page);
    setTotal(res.data.total);
    setTotalPages(res.data.totalPages);
    setLoading(false);
    },
    [limit, searchTerm, statusFilter, typeFilter],
  );

  useEffect(() => {
    void load(1, searchTerm, statusFilter, typeFilter);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subscriptions</h2>
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

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Search</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="User email or name"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Status</span>
          <select
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="active">active</option>
            <option value="trialing">trialing</option>
            <option value="past_due">past_due</option>
            <option value="canceled">canceled</option>
            <option value="incomplete">incomplete</option>
            <option value="unpaid">unpaid</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Type</span>
          <select
            value={typeInput}
            onChange={(e) => setTypeInput(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="stripe">stripe</option>
            <option value="apple_iap">apple_iap</option>
            <option value="manual_transfer">manual_transfer</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const trimmed = searchInput.trim();
            setSearchTerm(trimmed);
            setStatusFilter(statusInput);
            setTypeFilter(typeInput);
            void load(1, trimmed, statusInput, typeInput);
          }}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchInput("");
            setSearchTerm("");
            setStatusInput("");
            setStatusFilter("");
            setTypeInput("");
            setTypeFilter("");
            void load(1, "", "", "");
          }}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Clear
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {total} total subscriptions - page {page} of {totalPages}
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
              void load(Math.min(requested, totalPages));
            }}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          >
            Go
          </button>
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
            onClick={() => void load(page + 1)}
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
