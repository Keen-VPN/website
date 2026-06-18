import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminListMembershipSharing,
  adminRevokeMembershipMember,
  adminUpdateMembershipSeatLimit,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface MemberRow {
  userId: string;
  email: string;
  displayName?: string | null;
  joinedAt: string;
}

interface PendingInviteRow {
  id: string;
  email: string;
  expiresAt: string;
}

interface SharingRow {
  subscriptionId: string;
  owner: { id: string; email: string; displayName?: string | null };
  planName?: string | null;
  status: string;
  seatLimit: number;
  activeSeats: number;
  availableSeats: number;
  seats: MembershipSharingSeats;
  members: MemberRow[];
  pendingInvites: PendingInviteRow[];
}

export default function AdminMembershipSharing() {
  const { can } = useAdminAuth();
  const [rows, setRows] = useState<SharingRow[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatDraft, setSeatDraft] = useState<Record<string, string>>({});
  const refreshRequestRef = useRef(0);

  const canWrite = can("membership_sharing.write");

  const refresh = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    const isCurrentRequest = () => refreshRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    try {
      const res = await adminListMembershipSharing({ page, limit: 50, search });
      if (!isCurrentRequest()) return;
      if (!res.ok) {
        setError(res.error ?? "Failed to load membership sharing");
        return;
      }
      const data = res.data as { items?: SharingRow[]; total?: number };
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      if (!isCurrentRequest()) return;
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load membership sharing",
      );
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [page, search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSearch() {
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function handleClearSearch() {
    setSearchDraft("");
    setSearch("");
    setPage(1);
  }

  async function handleRevoke(subscriptionId: string, memberUserId: string) {
    if (!canWrite) return;
    const res = await adminRevokeMembershipMember(subscriptionId, memberUserId);
    if (!res.ok) {
      setError(res.error ?? "Failed to revoke member");
      return;
    }
    await refresh();
  }

  async function handleSeatLimit(subscriptionId: string) {
    if (!canWrite) return;
    const raw = seatDraft[subscriptionId];
    const seatLimit = Number(raw);
    if (!Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > 10) {
      setError("Seat limit must be an integer between 1 and 10");
      return;
    }
    const res = await adminUpdateMembershipSeatLimit(subscriptionId, seatLimit);
    if (!res.ok) {
      setError(res.error ?? "Failed to update seat limit");
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Membership Sharing
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage family access for active subscriptions ({total} total)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search owner email or name"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="max-w-sm bg-slate-900 border-slate-700"
        />
        <Button
          variant="secondary"
          onClick={handleSearch}
          disabled={loading}
        >
          Search
        </Button>
        <Button
          variant="ghost"
          onClick={handleClearSearch}
          disabled={loading || (!search && !searchDraft)}
        >
          Clear
        </Button>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Pending</th>
              {canWrite ? <th className="px-4 py-3">Seat limit</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.subscriptionId}
                className="border-t border-slate-800 align-top"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">
                    {row.owner.email}
                  </div>
                  <div className="text-xs text-slate-500">{row.status}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {row.planName ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {row.seats.activeSeats}/{row.seats.seatLimit} (
                  {row.seats.availableSeats} free)
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-2 text-slate-300">
                    {row.members.map((member) => (
                      <li
                        key={member.userId}
                        className="flex items-center gap-2"
                      >
                        <span>{member.email}</span>
                        {canWrite ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void handleRevoke(
                                row.subscriptionId,
                                member.userId,
                              )
                            }
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </li>
                    ))}
                    {row.members.length === 0 ? (
                      <li className="text-slate-500">—</li>
                    ) : null}
                  </ul>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {row.pendingInvites.length
                    ? row.pendingInvites.map((i) => i.email).join(", ")
                    : "—"}
                </td>
                {canWrite ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-20 bg-slate-900 border-slate-700"
                        defaultValue={String(row.seatLimit)}
                        onChange={(e) =>
                          setSeatDraft((prev) => ({
                            ...prev,
                            [row.subscriptionId]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleSeatLimit(row.subscriptionId)}
                      >
                        Save
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={canWrite ? 6 : 5}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No active subscriptions found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-400">Page {page}</span>
        <Button
          variant="secondary"
          disabled={loading || page * 50 >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
