import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminFetchUserEngagementProfile,
  type AdminUserEngagementProfile,
  type AdminUserEmailRecord,
  type AdminUserReviewActivityRecord,
  type AdminUserTimelineEvent,
} from "@/auth/backend";
import { formatDuration } from "@/lib/format-duration";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatCategory(category: string) {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimelineMetadata(event: AdminUserTimelineEvent) {
  if (event.type === "vpn_activity_summary" && event.metadata) {
    const total = event.metadata.totalSessions;
    const limit = event.metadata.recentDetailLimit;
    if (typeof total === "number" && typeof limit === "number") {
      return `${total} total sessions · showing last ${limit}`;
    }
  }
  return event.metadata ? JSON.stringify(event.metadata) : null;
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs capitalize">
      {value.replaceAll("_", " ")}
    </span>
  );
}

function EmailTable({ emails }: { emails: AdminUserEmailRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">Category</th>
            <th className="p-3">Subject</th>
            <th className="p-3">Sent</th>
            <th className="p-3">Delivery</th>
            <th className="p-3">Opened</th>
            <th className="p-3">Clicked</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-t border-border">
              <td className="p-3 text-muted-foreground">
                {formatCategory(email.category)}
              </td>
              <td className="p-3">{email.subject}</td>
              <td className="p-3 whitespace-nowrap text-muted-foreground">
                {formatDateTime(email.sentAt)}
              </td>
              <td className="p-3">
                <StatusBadge value={email.deliveryStatus} />
              </td>
              <td className="p-3 whitespace-nowrap text-muted-foreground">
                {formatDateTime(email.openedAt)}
              </td>
              <td className="p-3 whitespace-nowrap text-muted-foreground">
                {formatDateTime(email.clickedAt)}
              </td>
            </tr>
          ))}
          {emails.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-muted-foreground">
                No tracked emails for this user yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ReviewActivityTable({
  rows,
}: {
  rows: AdminUserReviewActivityRecord[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">Event</th>
            <th className="p-3">When</th>
            <th className="p-3">Platform</th>
            <th className="p-3">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.eventName}-${row.occurredAt}-${index}`}
              className="border-t border-border"
            >
              <td className="p-3">{row.label}</td>
              <td className="p-3 whitespace-nowrap text-muted-foreground">
                {formatDateTime(row.occurredAt)}
              </td>
              <td className="p-3">{row.platform ?? "—"}</td>
              <td className="p-3 text-xs text-muted-foreground">
                {row.properties
                  ? JSON.stringify(row.properties)
                  : "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-4 text-muted-foreground">
                No review or rating activity recorded.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function TimelineList({ events }: { events: AdminUserTimelineEvent[] }) {
  return (
    <div className="rounded-lg border border-border">
      <ul className="divide-y divide-border">
        {events.map((event) => {
          const metadataText = formatTimelineMetadata(event);
          return (
          <li
            key={event.id}
            className="flex flex-wrap items-start justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">{event.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {event.type} · {event.source}
              </p>
              {metadataText ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {metadataText}
                </p>
              ) : null}
            </div>
            <p className="whitespace-nowrap text-sm text-muted-foreground">
              {formatDateTime(event.occurredAt)}
            </p>
          </li>
          );
        })}
        {events.length === 0 ? (
          <li className="p-4 text-muted-foreground">No timeline events.</li>
        ) : null}
      </ul>
    </div>
  );
}

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<AdminUserEngagementProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
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

    const res = await adminFetchUserEngagementProfile(userId, {
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!res.ok || !res.data) {
      setProfile(null);
      setError(res.error ?? "Failed to load user profile");
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    setProfile(res.data);
    setLoading(false);
    activeRequest.current = null;
  }, [userId]);

  useEffect(() => {
    void load();
    return () => activeRequest.current?.abort();
  }, [load]);

  const user = profile?.user;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/overview"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to overview
          </Link>
          <h2 className="mt-2 text-2xl font-bold">User profile</h2>
          {user ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {user.name ? `${user.name} · ` : ""}
              {user.email} · {user.provider} · joined{" "}
              {user.createdAt.slice(0, 10)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {userId ? (
            <Link
              to={`/admin/user-sessions/${userId}`}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              View sessions
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Longest session</p>
          <p className="mt-1 text-2xl font-semibold">
            {loading || !user
              ? "…"
              : formatDuration(user.longestSessionSeconds)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 md:col-span-2">
          <p className="text-sm text-muted-foreground">Subscription</p>
          {profile?.subscription ? (
            <p className="mt-1 text-sm">
              {profile.subscription.status}
              {profile.subscription.planName
                ? ` · ${profile.subscription.planName}`
                : ""}
              {profile.subscription.billingPeriod
                ? ` · ${profile.subscription.billingPeriod}`
                : ""}
              {profile.subscription.cancelAtPeriodEnd
                ? " · auto-renew off"
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "…" : "No subscription on file"}
            </p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Email timeline</h3>
          <p className="text-sm text-muted-foreground">
            Lifecycle emails with delivery tracking (trial reminder, retention,
            contextual). Welcome, auth, referral, and subscription emails are
            not yet logged here.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <EmailTable emails={profile?.emails ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Review activity</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ReviewActivityTable rows={profile?.reviewActivity ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Activity timeline</h3>
          <p className="text-sm text-muted-foreground">
            Chronological lifecycle events. VPN connect/disconnect shows the most
            recent sessions when activity is high.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <TimelineList events={profile?.timeline ?? []} />
        )}
      </section>
    </div>
  );
}
