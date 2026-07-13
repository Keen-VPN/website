import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminConnectionEngagementWeekly from "./AdminConnectionEngagementWeekly";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  adminFetchMedianMonthlySessions,
  type AdminEngagementSegment,
  type AdminMedianMonthlySessionsReport,
} from "@/auth/backend";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  downloadConnectionEngagementCsv,
  downloadConnectionEngagementJson,
} from "@/lib/connection-engagement-export";

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

const distributionChartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface DistributionChartRow {
  session_count: number;
  sessionLabel: string;
  users: number;
}

function DistributionTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as DistributionChartRow | undefined;
  if (!row) {
    return null;
  }
  const userWord = row.users === 1 ? "user" : "users";
  const sessionWord = row.session_count === 1 ? "session" : "sessions";
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">
        {row.users} {userWord} had exactly {row.session_count} {sessionWord}{" "}
        this month
      </p>
    </div>
  );
}

function barValueLabel(value: number) {
  const count = Number(value);
  if (!Number.isFinite(count)) {
    return "";
  }
  return `${count} ${count === 1 ? "user" : "users"}`;
}

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
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Segment</th>
              <th className="pb-2 pr-4 font-medium text-right">Median</th>
              <th className="pb-2 pr-4 font-medium text-right">Users</th>
              <th className="pb-2 font-medium text-right">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.segment} className="border-t border-border/60">
                <td className="py-2 pr-4 text-muted-foreground">
                  {row.segment}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">
                  {row.median_sessions_per_user}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">
                  {row.users_with_sessions}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {row.total_sessions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data.</p>
        ) : null}
      </div>
    </div>
  );
}

function HistogramChart({
  buckets,
  loading,
  monthLabel,
}: {
  buckets: { session_count: number; users: number }[];
  loading: boolean;
  monthLabel: string;
}) {
  const chartData = useMemo<DistributionChartRow[]>(
    () =>
      [...buckets]
        .sort((a, b) => a.session_count - b.session_count)
        .map((bucket) => ({
          session_count: bucket.session_count,
          sessionLabel: String(bucket.session_count),
          users: bucket.users,
        })),
    [buckets],
  );

  const monthTitle = formatMonthSubtitle(monthLabel);

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">Sessions per user (distribution)</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Each bar shows how many users had that exact session count in{" "}
        {monthTitle}.
      </p>

      {loading && chartData.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {!loading && chartData.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No sessions recorded.
        </p>
      ) : null}

      {chartData.length > 0 ? (
        <ChartContainer
          config={distributionChartConfig}
          className="mt-4 aspect-[5/2] min-h-[280px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{ top: 32, right: 16, left: 20, bottom: 56 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="sessionLabel"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
            >
              <Label
                value="Sessions per user"
                position="insideBottom"
                offset={-40}
                className="fill-muted-foreground text-xs"
              />
            </XAxis>
            <YAxis
              dataKey="users"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
            >
              <Label
                value="Number of users"
                angle={-90}
                position="insideLeft"
                offset={12}
                className="fill-muted-foreground text-xs"
              />
            </YAxis>
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={<DistributionTooltip />}
            />
            <Bar
              dataKey="users"
              fill="var(--color-users)"
              radius={[4, 4, 0, 0]}
              maxBarSize={56}
            >
              <LabelList
                dataKey="users"
                position="top"
                className="fill-foreground text-[11px] font-medium"
                formatter={barValueLabel}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : null}
    </div>
  );
}


type EngagementView = "weekly" | "monthly";

export default function AdminConnectionEngagement() {
  const [view, setView] = useState<EngagementView>("weekly");
  const [report, setReport] = useState<AdminMedianMonthlySessionsReport | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthInput, setMonthInput] = useState(currentMonthValue);
  const [minDurationInput, setMinDurationInput] = useState("10");
  const [excludeExtension, setExcludeExtension] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(
    async (
      month: string,
      minDuration: string,
      excludeIosExtension: boolean,
    ) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      setLoading(true);
      setError(null);

      const parsedMin = Number(minDuration);
      if (!Number.isInteger(parsedMin) || parsedMin < 0) {
        setReport(null);
        setError("Min duration must be a non-negative whole number");
        setLoading(false);
        activeRequest.current = null;
        return;
      }

      const res = await adminFetchMedianMonthlySessions({
        month,
        minDurationSeconds: parsedMin,
        excludePlatforms: excludeIosExtension ? "ios_extension" : undefined,
        signal: controller.signal,
      });

      if (controller.signal.aborted || activeRequest.current !== controller) {
        return;
      }

      if (!res.ok || !res.data) {
        setReport(null);
        setError(res.error ?? "Failed to load connection engagement");
        setLoading(false);
        activeRequest.current = null;
        return;
      }

      setReport(res.data);
      setLoading(false);
      activeRequest.current = null;
    },
    [],
  );

  // Reload monthly data when switching back from weekly; uses filter state at switch time.
  // Filter changes are applied explicitly via Refresh — not on every keystroke.
  useEffect(() => {
    if (view !== "monthly") return;
    void load(monthInput, minDurationInput, excludeExtension);
    return () => activeRequest.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- monthInput/minDurationInput/excludeExtension omitted: re-fetch on tab switch only
  }, [load, view]);

  const applyFilters = () => {
    void load(monthInput, minDurationInput, excludeExtension);
  };

  const summary = report?.summary;
  const mom = report?.month_over_month;
  const canExport = Boolean(report) && !loading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Connection engagement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            VPN session usage (UTC). Weekly active users (VPN + perks) are on
            the weekly churn tab. Internal test accounts are excluded.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              view === "weekly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setView("weekly")}
          >
            Weekly KPIs
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              view === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setView("monthly")}
          >
            Monthly median
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {view === "monthly" ? (
            <>
          <button
            type="button"
            onClick={() => {
              if (report) {
                downloadConnectionEngagementCsv(report);
              }
            }}
            disabled={!canExport}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              if (report) {
                downloadConnectionEngagementJson(report);
              }
            }}
            disabled={!canExport}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export JSON
          </button>
            </>
          ) : null}
          {view === "monthly" ? (
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {view === "weekly" ? <AdminConnectionEngagementWeekly /> : null}

      {view !== "monthly" ? null : (
        <>
      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Median sessions / user
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.median_sessions_per_user ?? (loading ? "…" : 0)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {summary?.month ?? monthInput}
          </p>
          {mom ? (
            <p className="mt-1 text-xs text-muted-foreground">
              vs {mom.previous_month}:{" "}
              <span
                className={
                  mom.delta_median >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }
              >
                {mom.delta_median >= 0 ? "+" : ""}
                {mom.delta_median} median
              </span>{" "}
              (prev {mom.median_sessions_per_user})
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Users with sessions</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.users_with_sessions ?? (loading ? "…" : 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total sessions</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.total_sessions ?? (loading ? "…" : 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Mean (reference only)</p>
          <p className="mt-1 text-3xl font-semibold text-muted-foreground">
            {summary?.mean_sessions_per_user ?? (loading ? "…" : 0)}
          </p>
        </div>
      </div>

      {summary ? (
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">Percentile distribution</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                ["25%", summary.percentiles.p25],
                ["50%", summary.percentiles.p50],
                ["75%", summary.percentiles.p75],
                ["90%", summary.percentiles.p90],
                ["95%", summary.percentiles.p95],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-xs uppercase text-muted-foreground">
                  {label}
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <HistogramChart
        buckets={report?.histogram ?? []}
        loading={loading}
        monthLabel={summary?.month ?? monthInput}
      />

      <div className="grid gap-4 lg:grid-cols-3">
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
        <SegmentTable
          title="By sign-in provider"
          rows={report?.segments.acquisition_source ?? []}
          loading={loading}
        />
      </div>
        </>
      )}
    </div>
  );
}
