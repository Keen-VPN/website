import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminBusinessOnboarding,
  adminListMembershipSharing,
  adminMembershipSharingMetrics,
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

interface MembershipSharingSeats {
  seatLimit: number;
  activeSeats: number;
  availableSeats: number;
  pendingInvites: number;
}

interface MembershipSharingMetrics {
  totalSeatSubscriptions: number;
  totalSeatsPurchased: number;
  totalMembers: number;
  totalPendingInvites: number;
  averageSeatsPerAccount: number;
  familyPlanCount: number;
  businessPlanCount: number;
  familyPlanRevenueUsd: number;
  businessPlanRevenueUsd: number;
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

interface BusinessOnboardingOwner {
  subscriptionId: string;
  owner: { id: string; email: string; displayName?: string | null };
  planId?: string | null;
  planName?: string | null;
  status: string;
  seats: MembershipSharingSeats;
  members: MemberRow[];
  pendingInvites: {
    id: string;
    email: string;
    status: string;
    sentAt: string;
    expiresAt: string;
    billingDeferredUntil: string | null;
  }[];
}

interface BusinessOnboardingReport {
  windowDays: number;
  windowStart: string;
  snapshot: {
    activeBusinessPlans: number;
    seatsPurchased: number;
    seatsUsed: number;
    seatsUnused: number;
    activeMembers: number;
    pendingInvites: {
      total: number;
      pending: number;
      billingPending: number;
      creditPending: number;
    };
  };
  funnel: {
    invitesSent: number;
    invitesAccepted: number;
    invitesExpired: number;
    invitesRevoked: number;
    sentToAcceptedPercent: number | null;
    avgHoursToAccept: number | null;
  };
  owners: BusinessOnboardingOwner[];
}

type Tab = "seats" | "onboarding";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function AdminMembershipSharing() {
  const { can } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("onboarding");
  const [rows, setRows] = useState<SharingRow[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatDraft, setSeatDraft] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<MembershipSharingMetrics | null>(null);
  const [onboardingDays, setOnboardingDays] = useState(30);
  const [onboarding, setOnboarding] = useState<BusinessOnboardingReport | null>(
    null,
  );
  // Separate guards so a seat mutation refresh cannot cancel an onboarding fetch.
  const seatsRequestRef = useRef(0);
  const onboardingRequestRef = useRef(0);

  const canWrite = can("membership_sharing.write");

  const refreshSeats = useCallback(async () => {
    const requestId = seatsRequestRef.current + 1;
    seatsRequestRef.current = requestId;
    const isCurrentRequest = () => seatsRequestRef.current === requestId;

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

      const metricsRes = await adminMembershipSharingMetrics();
      if (isCurrentRequest()) {
        if (metricsRes.ok) {
          setMetrics(metricsRes.data as MembershipSharingMetrics);
        } else {
          setMetrics(null);
          setError(metricsRes.error ?? "Failed to load seat metrics");
        }
      }
    } catch (err) {
      if (!isCurrentRequest()) return;
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load membership sharing",
      );
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [page, search]);

  const refreshOnboarding = useCallback(async () => {
    const requestId = onboardingRequestRef.current + 1;
    onboardingRequestRef.current = requestId;
    const isCurrentRequest = () => onboardingRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    // Drop prior window data so the UI does not keep showing stale metrics.
    setOnboarding(null);
    try {
      const res = await adminBusinessOnboarding({ days: onboardingDays });
      if (!isCurrentRequest()) return;
      if (!res.ok || !res.data) {
        setOnboarding(null);
        setError(res.error ?? "Failed to load Business onboarding");
        return;
      }
      setOnboarding(res.data as BusinessOnboardingReport);
    } catch (err) {
      if (!isCurrentRequest()) return;
      setOnboarding(null);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Business onboarding",
      );
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [onboardingDays]);

  useEffect(() => {
    if (tab === "seats") {
      void refreshSeats();
    } else {
      void refreshOnboarding();
    }
  }, [tab, refreshSeats, refreshOnboarding]);

  function handleSearch() {
    if (loading) return;
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
    await refreshSeats();
  }

  async function handleSeatLimit(subscriptionId: string) {
    if (!canWrite) return;
    const raw = seatDraft[subscriptionId];
    const seatLimit = Number(raw);
    if (!Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > 25) {
      setError("Seat limit must be an integer between 1 and 25");
      return;
    }
    const res = await adminUpdateMembershipSeatLimit(subscriptionId, seatLimit);
    if (!res.ok) {
      setError(res.error ?? "Failed to update seat limit");
      return;
    }
    await refreshSeats();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Membership Sharing
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor Business onboarding and manage shared seats
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "onboarding" ? "default" : "secondary"}
          onClick={() => setTab("onboarding")}
        >
          Business onboarding
        </Button>
        <Button
          variant={tab === "seats" ? "default" : "secondary"}
          onClick={() => setTab("seats")}
        >
          Seat accounts
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {tab === "onboarding" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-400">
              Window
              <select
                className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                value={onboardingDays}
                onChange={(e) => setOnboardingDays(Number(e.target.value))}
                disabled={loading}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
            <Button
              variant="secondary"
              onClick={() => void refreshOnboarding()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {onboarding ? (
            <>
              <div>
                <h2 className="mb-2 text-sm font-medium text-slate-300">
                  Current snapshot
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    label="Active Business plans"
                    value={onboarding.snapshot.activeBusinessPlans}
                  />
                  <MetricCard
                    label="Seats purchased"
                    value={onboarding.snapshot.seatsPurchased}
                  />
                  <MetricCard
                    label="Seats unused"
                    value={onboarding.snapshot.seatsUnused}
                    hint={`${onboarding.snapshot.seatsUsed} used · ${onboarding.snapshot.activeMembers} members`}
                  />
                  <MetricCard
                    label="Pending invites"
                    value={onboarding.snapshot.pendingInvites.total}
                    hint={`open ${onboarding.snapshot.pendingInvites.pending} · billing ${onboarding.snapshot.pendingInvites.billingPending} · credit ${onboarding.snapshot.pendingInvites.creditPending}`}
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-slate-300">
                  Funnel (last {onboardingDays} days)
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    label="Invites sent"
                    value={onboarding.funnel.invitesSent}
                  />
                  <MetricCard
                    label="Invites accepted"
                    value={onboarding.funnel.invitesAccepted}
                    hint={
                      onboarding.funnel.sentToAcceptedPercent != null
                        ? `${onboarding.funnel.sentToAcceptedPercent}% of sent`
                        : undefined
                    }
                  />
                  <MetricCard
                    label="Expired / revoked"
                    value={`${onboarding.funnel.invitesExpired} / ${onboarding.funnel.invitesRevoked}`}
                  />
                  <MetricCard
                    label="Avg hours to accept"
                    value={
                      onboarding.funnel.avgHoursToAccept != null
                        ? onboarding.funnel.avgHoursToAccept
                        : "—"
                    }
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/80 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Seats</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3">Pending invites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboarding.owners.map((row) => (
                      <tr
                        key={row.subscriptionId}
                        className="border-t border-slate-800 align-top"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {row.owner.email}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.status}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {row.planName ?? row.planId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {row.seats.activeSeats}/{row.seats.seatLimit} (
                          {row.seats.availableSeats} free)
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {row.members.length
                            ? row.members.map((m) => m.email).join(", ")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {row.pendingInvites.length ? (
                            <ul className="space-y-1">
                              {row.pendingInvites.map((invite) => (
                                <li key={invite.id}>
                                  {invite.email}{" "}
                                  <span className="text-xs text-slate-500">
                                    ({invite.status.toLowerCase()})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                    {!loading && onboarding.owners.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No active Business plans found
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : loading ? (
            <p className="text-sm text-slate-400">Loading onboarding…</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {metrics ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Seat subscriptions"
                value={metrics.totalSeatSubscriptions}
              />
              <MetricCard
                label="Avg seats / account"
                value={metrics.averageSeatsPerAccount}
              />
              <MetricCard
                label="Family plans"
                value={metrics.familyPlanCount}
                hint={`$${metrics.familyPlanRevenueUsd.toFixed(2)} listed MRR`}
              />
              <MetricCard
                label="Business plans"
                value={metrics.businessPlanCount}
                hint={`$${metrics.businessPlanRevenueUsd.toFixed(2)} listed MRR`}
              />
            </div>
          ) : null}

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
              onClick={() => void refreshSeats()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

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
                            onClick={() =>
                              void handleSeatLimit(row.subscriptionId)
                            }
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
            <span className="text-sm text-slate-400">
              Page {page} · {total} total
            </span>
            <Button
              variant="secondary"
              disabled={loading || page * 50 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
