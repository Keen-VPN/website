import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminFetchWeeklySessionKpiTrend,
  adminFetchWeeklySessionKpis,
  type AdminEngagementSegment,
  type AdminEngagementSubscriptionTier,
  type AdminWeeklySessionKpiReport,
  type AdminWeeklySessionKpiTrendReport,
} from "@/auth/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  compareIsoWeek,
  currentIsoWeek,
  formatIsoWeekLabel,
  parseWeekInput,
  trendWindowStart,
} from "@/lib/iso-week";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  if (rounded < 3600) {
    const mins = Math.round(rounded / 60);
    return mins >= 60 ? "1h" : `${mins}m`;
  }
  let hours = Math.floor(rounded / 3600);
  let mins = Math.round((rounded % 3600) / 60);
  if (mins >= 60) {
    hours += 1;
    mins = 0;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

type EngagementTrendMetric =
  | "active_users"
  | "median_connections"
  | "total_connections"
  | "median_connection_time"
  | "total_connection_time";

const ENGAGEMENT_TREND_METRICS: {
  value: EngagementTrendMetric;
  label: string;
  dataKey: string;
  color: string;
  formatValue: (value: number) => string;
  allowDecimals: boolean;
}[] = [
  {
    value: "active_users",
    label: "Active users",
    dataKey: "activeUsers",
    color: "hsl(var(--primary))",
    formatValue: (value) => String(Math.round(value)),
    allowDecimals: false,
  },
  {
    value: "median_connections",
    label: "Median connections",
    dataKey: "medianConnections",
    color: "hsl(var(--chart-2))",
    formatValue: (value) => value.toFixed(2),
    allowDecimals: true,
  },
  {
    value: "total_connections",
    label: "Total connections",
    dataKey: "totalConnections",
    color: "hsl(var(--chart-3))",
    formatValue: (value) => String(Math.round(value)),
    allowDecimals: false,
  },
  {
    value: "median_connection_time",
    label: "Median connection time",
    dataKey: "medianConnectionSeconds",
    color: "hsl(var(--chart-4))",
    formatValue: formatDuration,
    allowDecimals: true,
  },
  {
    value: "total_connection_time",
    label: "Total connection time",
    dataKey: "totalConnectionSeconds",
    color: "hsl(var(--chart-5))",
    formatValue: formatDuration,
    allowDecimals: false,
  },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "All platforms" },
  { value: "ios", label: "iOS" },
  { value: "macos", label: "macOS" },
  { value: "ios_extension", label: "iOS extension" },
];

const TIER_OPTIONS: { value: AdminEngagementSubscriptionTier; label: string }[] =
  [
    { value: "all", label: "All tiers" },
    { value: "paid", label: "Paid" },
    { value: "free", label: "Free / trial" },
    { value: "unknown", label: "Unknown" },
  ];

function SegmentTable({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: AdminEngagementSegment[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Segment</th>
              <th className="pb-2 pr-4 font-medium text-right">Median conn.</th>
              <th className="pb-2 pr-4 font-medium text-right">Users</th>
              <th className="pb-2 font-medium text-right">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.segment} className="border-t border-border/60">
                <td className="py-2 pr-4">{row.segment}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.median_sessions_per_user}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.users_with_sessions}
                </td>
                <td className="py-2 text-right tabular-nums">{row.total_sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AdminConnectionEngagementWeekly() {
  const initial = currentIsoWeek();
  const [isoYear, setIsoYear] = useState(initial.isoYear);
  const [isoWeek, setIsoWeek] = useState(initial.isoWeek);
  const [minDuration, setMinDuration] = useState("10");
  const [excludeExtension, setExcludeExtension] = useState(false);
  const [platform, setPlatform] = useState("");
  const [subscriptionTier, setSubscriptionTier] =
    useState<AdminEngagementSubscriptionTier>("all");
  const [report, setReport] = useState<AdminWeeklySessionKpiReport | null>(null);
  const [trend, setTrend] = useState<AdminWeeklySessionKpiTrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendWarning, setTrendWarning] = useState<string | null>(null);
  const [trendMetric, setTrendMetric] =
    useState<EngagementTrendMetric>("active_users");
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(
    async (
      targetYear: number,
      targetWeek: number,
      targetMinDuration: string,
      targetExcludeExtension: boolean,
      targetPlatform: string,
      targetTier: AdminEngagementSubscriptionTier,
    ) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      setLoading(true);
      setError(null);
      setTrendWarning(null);
      setReport(null);
      setTrend(null);

      const parsedMin = Number(targetMinDuration);
      if (!Number.isInteger(parsedMin) || parsedMin < 0) {
        setError("Min duration must be a non-negative whole number");
        setLoading(false);
        return;
      }

      const excludePlatforms = targetExcludeExtension ? "ios_extension" : undefined;
      const includePlatforms = targetPlatform || undefined;
      const from = trendWindowStart(targetYear, targetWeek, 8);
      const to = formatIsoWeekLabel(targetYear, targetWeek);

      const [reportRes, trendRes] = await Promise.all([
        adminFetchWeeklySessionKpis({
          year: targetYear,
          week: targetWeek,
          minDurationSeconds: parsedMin,
          excludePlatforms,
          includePlatforms,
          subscriptionTier: targetTier,
          signal: controller.signal,
        }),
        adminFetchWeeklySessionKpiTrend({
          from,
          to,
          minDurationSeconds: parsedMin,
          excludePlatforms,
          includePlatforms,
          subscriptionTier: targetTier,
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted || activeRequest.current !== controller) {
        return;
      }

      if (!reportRes.ok || !reportRes.data) {
        setError(reportRes.error ?? "Failed to load weekly session KPIs");
        setLoading(false);
        activeRequest.current = null;
        return;
      }

      setReport(reportRes.data);
      if (trendRes.ok && trendRes.data) {
        setTrend(trendRes.data);
      } else if (!trendRes.ok) {
        setTrendWarning(trendRes.error ?? "Failed to load weekly trend");
      }
      setLoading(false);
      activeRequest.current = null;
    },
    [],
  );

  // Week/platform/tier changes reload immediately; min duration and exclude extension use Apply.
  useEffect(() => {
    void load(isoYear, isoWeek, minDuration, excludeExtension, platform, subscriptionTier);
    return () => activeRequest.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- minDuration/excludeExtension omitted: Apply button only
  }, [load, isoYear, isoWeek, platform, subscriptionTier]);

  const applyFilters = () => {
    void load(isoYear, isoWeek, minDuration, excludeExtension, platform, subscriptionTier);
  };

  const chartRows = useMemo(
    () =>
      (trend?.points ?? []).map((p) => ({
        label: p.week_label,
        activeUsers: p.active_users,
        medianConnections: p.median_connections_per_user,
        totalConnections: p.total_connections,
        medianConnectionSeconds: p.median_connection_seconds,
        totalConnectionSeconds: p.total_connection_seconds,
      })),
    [trend],
  );

  const selectedTrendMetric =
    ENGAGEMENT_TREND_METRICS.find((option) => option.value === trendMetric) ??
    ENGAGEMENT_TREND_METRICS[0];

  const trendChartConfig = useMemo(
    () =>
      ({
        [selectedTrendMetric.dataKey]: {
          label: selectedTrendMetric.label,
          color: selectedTrendMetric.color,
        },
      }) satisfies ChartConfig,
    [selectedTrendMetric],
  );

  const wow = report?.week_over_week;
  const weekInputValue = formatIsoWeekLabel(isoYear, isoWeek);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Weekly session KPIs</h3>
        <p className="text-sm text-muted-foreground">
          ISO week (Monday UTC). Sessions count after min duration filter.
          Internal test accounts are excluded.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {trendWarning ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {trendWarning}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Week (UTC)</span>
          <input
            type="week"
            max={initial.label}
            className="rounded-md border border-border bg-background px-3 py-2"
            value={weekInputValue}
            onChange={(e) => {
              const parsed = parseWeekInput(e.target.value);
              if (!parsed) return;
              if (compareIsoWeek(parsed, initial) > 0) return;
              setIsoYear(parsed.isoYear);
              setIsoWeek(parsed.isoWeek);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Platform</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2"
            value={platform}
            onChange={(e) => {
              const value = e.target.value;
              setPlatform(value);
              if (value === "ios_extension") {
                setExcludeExtension(false);
              }
            }}
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Subscription tier</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2"
            value={subscriptionTier}
            onChange={(e) =>
              setSubscriptionTier(e.target.value as AdminEngagementSubscriptionTier)
            }
          >
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Min duration (s)</span>
          <input
            type="number"
            min={0}
            className="w-24 rounded-md border border-border bg-background px-3 py-2"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={excludeExtension}
            disabled={platform === "ios_extension"}
            onChange={(e) => setExcludeExtension(e.target.checked)}
          />
          <span className="text-muted-foreground">Exclude iOS extension</span>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={applyFilters}
        >
          Apply
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Active users"
          value={report ? String(report.summary.active_users) : "—"}
          subtitle="Unique users who connected"
          detail={report?.summary.week_range_label}
          loading={loading}
          delta={wow ? formatDelta(wow.delta_active_users) : undefined}
        />
        <KpiCard
          title="Median connections"
          value={report ? String(report.summary.median_connections_per_user) : "—"}
          subtitle="Per active user"
          loading={loading}
          delta={wow ? formatDelta(wow.delta_median_connections, true) : undefined}
        />
        <KpiCard
          title="Total connections"
          value={report ? String(report.summary.total_connections) : "—"}
          subtitle="VPN sessions this week"
          loading={loading}
        />
        <KpiCard
          title="Median connection time"
          value={
            report ? formatDuration(report.summary.median_connection_seconds) : "—"
          }
          subtitle="Per session"
          loading={loading}
        />
        <KpiCard
          title="Total connection time"
          value={
            report ? formatDuration(report.summary.total_connection_seconds) : "—"
          }
          subtitle="All sessions combined"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SegmentTable
          title="By platform"
          rows={report?.segments.platform ?? []}
          loading={loading}
        />
        <SegmentTable
          title="By subscription tier"
          rows={report?.segments.subscription_tier ?? []}
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>8-week trend</CardTitle>
            <CardDescription>
              {selectedTrendMetric.label} over time for the selected filters.
            </CardDescription>
          </div>
          <div
            className="flex flex-wrap gap-1 rounded-lg border border-border p-1"
            role="group"
            aria-label="Trend metric"
          >
            {ENGAGEMENT_TREND_METRICS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={trendMetric === option.value ? "default" : "ghost"}
                className="h-8"
                aria-pressed={trendMetric === option.value}
                onClick={() => setTrendMetric(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading trend…</p>
          ) : trendWarning ? (
            <p className="text-sm text-muted-foreground">Trend chart unavailable.</p>
          ) : chartRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trend data.</p>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[320px] w-full">
              <LineChart data={chartRows} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={selectedTrendMetric.allowDecimals}
                  tickFormatter={(value) =>
                    selectedTrendMetric.formatValue(Number(value))
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        selectedTrendMetric.formatValue(Number(value))
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey={selectedTrendMetric.dataKey}
                  stroke={`var(--color-${selectedTrendMetric.dataKey})`}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDelta(value: number, decimal = false): string {
  const prefix = value > 0 ? "+" : "";
  return decimal ? `${prefix}${value.toFixed(2)}` : `${prefix}${value}`;
}

function KpiCard({
  title,
  value,
  subtitle,
  detail,
  delta,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  detail?: string;
  delta?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {loading ? "…" : value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        ) : null}
        {delta ? (
          <p className="mt-1 text-xs text-muted-foreground">vs prior week: {delta}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
