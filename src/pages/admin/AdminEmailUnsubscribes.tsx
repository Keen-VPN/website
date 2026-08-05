import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  adminFetchEmailUnsubscribeCampaigns,
  adminFetchEmailUnsubscribeEvents,
  adminFetchEmailUnsubscribeSummary,
  adminFetchEmailUnsubscribeTrends,
  type AdminEmailUnsubscribeCampaignsReport,
  type AdminEmailUnsubscribeEventsReport,
  type AdminEmailUnsubscribeSummary,
  type AdminEmailUnsubscribeTrendReport,
  type AdminUnsubscribeTrendInterval,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  defaultAdminReportFromValue,
  defaultAdminReportToValue,
  formatAdminRate,
} from "@/lib/admin-utils";

const PAGE_SIZE = 25;

const trendChartConfig = {
  unsubscribes: {
    label: "Unsubscribes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function formatOptionalRate(value: number | null | undefined): string {
  if (value == null) return "n/a";
  return formatAdminRate(value);
}

function formatOptionalNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function sourceLabel(source: string): string {
  switch (source) {
    case "resend_broadcast":
      return "Email footer";
    case "contextual_link":
      return "Personalized email";
    case "preferences":
      return "Preferences";
    default:
      return source;
  }
}

function lastEmailCell(
  subject: string | null,
  broadcastId: string | null,
): ReactNode {
  if (!subject) return "—";
  if (!broadcastId) return subject;
  return (
    <a
      href={`https://resend.com/broadcasts/${encodeURIComponent(broadcastId)}`}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {subject}
    </a>
  );
}

export default function AdminEmailUnsubscribes() {
  const { can } = useAdminAuth();
  const canBroadcast = can("emails.broadcast");
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [interval, setTrendInterval] =
    useState<AdminUnsubscribeTrendInterval>("day");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [page, setPage] = useState(0);

  const [summary, setSummary] = useState<AdminEmailUnsubscribeSummary | null>(
    null,
  );
  const [trends, setTrends] =
    useState<AdminEmailUnsubscribeTrendReport | null>(null);
  const [campaigns, setCampaigns] =
    useState<AdminEmailUnsubscribeCampaignsReport | null>(null);
  const [events, setEvents] =
    useState<AdminEmailUnsubscribeEventsReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const eventsRequest = useRef<AbortController | null>(null);

  const loadReports = useCallback(
    async (from: string, to: string, trendInterval: AdminUnsubscribeTrendInterval) => {
      if (!from.trim() || !to.trim()) {
        setSummary(null);
        setTrends(null);
        setCampaigns(null);
        setError(null);
        setLoading(false);
        return;
      }

      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      setLoading(true);
      setError(null);

      const fromIso = `${from}T00:00:00.000Z`;
      const toIso = `${to}T00:00:00.000Z`;

      const [summaryRes, trendsRes, campaignsRes] = await Promise.all([
        adminFetchEmailUnsubscribeSummary({
          from: fromIso,
          to: toIso,
          signal: controller.signal,
        }),
        adminFetchEmailUnsubscribeTrends({
          from: fromIso,
          to: toIso,
          interval: trendInterval,
          signal: controller.signal,
        }),
        adminFetchEmailUnsubscribeCampaigns({
          from: fromIso,
          to: toIso,
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted || activeRequest.current !== controller) {
        return;
      }

      if (
        !summaryRes.ok ||
        !summaryRes.data ||
        !trendsRes.ok ||
        !trendsRes.data ||
        !campaignsRes.ok ||
        !campaignsRes.data
      ) {
        setSummary(null);
        setTrends(null);
        setCampaigns(null);
        setError(
          summaryRes.error ??
            trendsRes.error ??
            campaignsRes.error ??
            "Failed to load unsubscribe reports",
        );
        setLoading(false);
        activeRequest.current = null;
        return;
      }

      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setCampaigns(campaignsRes.data);
      setLoading(false);
      activeRequest.current = null;
    },
    [],
  );

  const loadEvents = useCallback(
    async (
      from: string,
      to: string,
      campaign: string,
      template: string,
      pageIndex: number,
    ) => {
      if (!from.trim() || !to.trim()) {
        setEvents(null);
        setEventsError(null);
        setEventsLoading(false);
        return;
      }

      eventsRequest.current?.abort();
      const controller = new AbortController();
      eventsRequest.current = controller;
      setEventsLoading(true);
      setEventsError(null);

      const response = await adminFetchEmailUnsubscribeEvents({
        from: `${from}T00:00:00.000Z`,
        to: `${to}T00:00:00.000Z`,
        campaign: campaign.trim() || undefined,
        template: template.trim() || undefined,
        limit: PAGE_SIZE,
        offset: pageIndex * PAGE_SIZE,
        signal: controller.signal,
      });

      if (controller.signal.aborted || eventsRequest.current !== controller) {
        return;
      }

      if (!response.ok || !response.data) {
        setEvents(null);
        setEventsLoading(false);
        eventsRequest.current = null;
        if (response.error && response.error !== "Request aborted") {
          setEventsError(response.error);
        }
        return;
      }

      setEvents(response.data);
      setEventsError(null);
      setEventsLoading(false);
      eventsRequest.current = null;
    },
    [],
  );

  useEffect(() => {
    void loadReports(fromInput, toInput, interval);
    return () => activeRequest.current?.abort();
  }, [loadReports, fromInput, toInput, interval]);

  useEffect(() => {
    void loadEvents(fromInput, toInput, campaignFilter, templateFilter, page);
    return () => eventsRequest.current?.abort();
  }, [loadEvents, fromInput, toInput, campaignFilter, templateFilter, page]);

  const chartRows = useMemo(
    () =>
      (trends?.rows ?? []).map((row) => ({
        bucket: new Date(row.bucket).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
          timeZone: "UTC",
        }),
        unsubscribes: row.unsubscribes,
      })),
    [trends],
  );

  const totalPages = events
    ? Math.max(1, Math.ceil(events.total / PAGE_SIZE))
    : 1;

  if (!canBroadcast) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Email unsubscribes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your admin account does not have permission to view email unsubscribe
          reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Email unsubscribes
        </h2>
        <p className="text-sm text-muted-foreground">
          Marketing unsubscribe events from Resend broadcast footers,
          personalized email links, and account preferences. Broadcast
          audience sync excludes opted-out users. Related:{" "}
          <Link
            to="/admin/broadcast-email"
            className="text-primary underline-offset-4 hover:underline"
          >
            Broadcast email
          </Link>
          ,{" "}
          <Link
            to="/admin/domain-insights"
            className="text-primary underline-offset-4 hover:underline"
          >
            Domain insights
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From (UTC)</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2"
            value={fromInput}
            onChange={(e) => {
              setFromInput(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To (UTC, exclusive)</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2"
            value={toInput}
            onChange={(e) => {
              setToInput(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Trend interval</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2"
            value={interval}
            onChange={(e) =>
              setTrendInterval(e.target.value as AdminUnsubscribeTrendInterval)
            }
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={loading || eventsLoading}
          onClick={() => {
            void loadReports(fromInput, toInput, interval);
            void loadEvents(
              fromInput,
              toInput,
              campaignFilter,
              templateFilter,
              page,
            );
          }}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total unsubscribes</p>
          <p className="text-2xl font-semibold">
            {loading || error ? "—" : (summary?.total_unsubscribes ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Unsubscribe rate</p>
          <p className="text-2xl font-semibold">
            {loading || error
              ? "—"
              : formatOptionalRate(summary?.unsubscribe_rate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {loading || error
              ? ""
              : `${summary?.broadcast_unsubscribes ?? 0} broadcast / ${summary?.delivered_recipients ?? 0} delivered recipients`}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg time subscribed</p>
          <p className="text-2xl font-semibold">
            {loading || error
              ? "—"
              : summary?.avg_subscribed_days != null
                ? `${formatOptionalNumber(summary.avg_subscribed_days)} days`
                : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Resend contact created date when available, else account created
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg emails received</p>
          <p className="text-2xl font-semibold">
            {loading || error
              ? "—"
              : formatOptionalNumber(summary?.avg_emails_received)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-lg font-medium">Unsubscribe trend</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : chartRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unsubscribe events in this window.
          </p>
        ) : (
          <ChartContainer config={trendChartConfig} className="h-64 w-full">
            <LineChart data={chartRows} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="unsubscribes"
                stroke="var(--color-unsubscribes)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-lg font-medium">By last email received</h3>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Campaign / last email</th>
                <th className="p-3 text-right">Unsubscribes</th>
                <th className="p-3 text-right">Share</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Avg days subscribed</th>
                <th className="p-3 text-right">Avg emails</th>
                <th className="p-3">Last unsubscribe</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-3 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (campaigns?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-muted-foreground">
                    No campaign breakdown for this window.
                  </td>
                </tr>
              ) : (
                campaigns?.rows.map((row) => {
                  const templateId = row.template_id;
                  return (
                  <tr key={row.campaign_key} className="border-t border-border">
                    <td className="p-3">
                      <button
                        type="button"
                        className="text-left text-primary underline-offset-4 hover:underline"
                        onClick={() => {
                          setCampaignFilter(row.campaign_key);
                          setPage(0);
                        }}
                      >
                        {row.campaign}
                      </button>
                      {templateId ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Template:{" "}
                          <button
                            type="button"
                            className="underline-offset-4 hover:underline"
                            onClick={() => {
                              setTemplateFilter(templateId);
                              setPage(0);
                            }}
                          >
                            {templateId}
                          </button>
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 text-right">{row.unsubscribes}</td>
                    <td className="p-3 text-right">
                      {formatOptionalRate(row.share_of_total)}
                    </td>
                    <td className="p-3 text-right">
                      {formatOptionalRate(row.unsubscribe_rate)}
                    </td>
                    <td className="p-3 text-right">
                      {formatOptionalNumber(row.avg_subscribed_days)}
                    </td>
                    <td className="p-3 text-right">
                      {formatOptionalNumber(row.avg_emails_received)}
                    </td>
                    <td className="p-3">
                      {formatDateTime(row.last_unsubscribe_at)}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-medium">Unsubscribe events</h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Campaign filter</span>
              <input
                type="text"
                className="min-w-[220px] rounded-md border border-border bg-background px-3 py-2"
                placeholder="broadcast:… or subject:…"
                value={campaignFilter}
                onChange={(e) => {
                  setCampaignFilter(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Template filter</span>
              <input
                type="text"
                className="min-w-[180px] rounded-md border border-border bg-background px-3 py-2"
                placeholder="template id"
                value={templateFilter}
                onChange={(e) => {
                  setTemplateFilter(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            {campaignFilter || templateFilter ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCampaignFilter("");
                  setTemplateFilter("");
                  setPage(0);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
        {eventsError ? (
          <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {eventsError}
          </div>
        ) : null}
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Last email</th>
                <th className="p-3">Source</th>
                <th className="p-3 text-right">Days subscribed</th>
                <th className="p-3 text-right">Emails received</th>
                <th className="p-3">Unsubscribed</th>
              </tr>
            </thead>
            <tbody>
              {eventsLoading ? (
                <tr>
                  <td colSpan={6} className="p-3 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (events?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-muted-foreground">
                    No unsubscribe events for this filter.
                  </td>
                </tr>
              ) : (
                events?.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{row.email}</td>
                    <td className="p-3">
                      {lastEmailCell(
                        row.last_email_subject,
                        row.last_email_broadcast_id,
                      )}
                    </td>
                    <td className="p-3">{sourceLabel(row.source)}</td>
                    <td className="p-3 text-right">
                      {formatOptionalNumber(row.subscribed_days)}
                    </td>
                    <td className="p-3 text-right">
                      {row.emails_received_count}
                    </td>
                    <td className="p-3">
                      {formatDateTime(row.unsubscribed_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {events
              ? `${events.total} event${events.total === 1 ? "" : "s"}`
              : "—"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0 || eventsLoading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                eventsLoading || !events || (page + 1) * PAGE_SIZE >= events.total
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
