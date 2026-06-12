import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminFetchWeeklyChurnReport,
  adminFetchWeeklyChurnTrend,
  type AdminChurnSubscriptionSource,
  type AdminWeeklyChurnReport,
  type AdminWeeklyChurnTrendReport,
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
  parseWeekInput,
  trendWindowEnd,
  trendWindowStart,
} from "@/lib/iso-week";

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function friendlyProvider(raw: string): string {
  switch (raw.toLowerCase()) {
    case "stripe":
      return "Stripe";
    case "apple_iap":
      return "Apple";
    default:
      return raw;
  }
}

function friendlyClientPlatform(raw: string): { label: string; hint?: string } {
  switch (raw.toLowerCase()) {
    case "macos":
      return { label: "macOS" };
    case "ios":
      return { label: "iOS" };
    case "no_vpn_sessions":
      return {
        label: "No VPN sessions",
        hint: "No qualifying VPN sessions in the prior 90 days",
      };
    case "other_platform":
      return {
        label: "Other / unrecognized",
        hint: "Had sessions, but not mostly iOS or macOS",
      };
    case "unknown":
      return {
        label: "No VPN sessions",
        hint: "Legacy bucket — no qualifying VPN sessions in the prior 90 days",
      };
    default:
      return { label: raw };
  }
}

type ChurnTrendMetric = "churned" | "auto_renew_off" | "expirations";

const CHURN_TREND_METRICS: {
  value: ChurnTrendMetric;
  label: string;
  dataKey: "churnRate" | "autoRenewDisabledRate" | "subscriptionExpirationsRate";
  color: string;
}[] = [
  {
    value: "churned",
    label: "Churned",
    dataKey: "churnRate",
    color: "hsl(var(--destructive))",
  },
  {
    value: "auto_renew_off",
    label: "Auto-renew off",
    dataKey: "autoRenewDisabledRate",
    color: "hsl(var(--primary))",
  },
  {
    value: "expirations",
    label: "Expirations",
    dataKey: "subscriptionExpirationsRate",
    color: "hsl(var(--chart-2))",
  },
];

const SOURCE_OPTIONS: { value: AdminChurnSubscriptionSource; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "stripe", label: "Stripe" },
  { value: "apple_iap", label: "Apple" },
];

export default function AdminChurnWeekly() {
  const initial = currentIsoWeek();
  const [isoYear, setIsoYear] = useState(initial.isoYear);
  const [isoWeek, setIsoWeek] = useState(initial.isoWeek);
  const [source, setSource] = useState<AdminChurnSubscriptionSource>("all");
  const [trendMetric, setTrendMetric] = useState<ChurnTrendMetric>("churned");
  const [report, setReport] = useState<AdminWeeklyChurnReport | null>(null);
  const [trend, setTrend] = useState<AdminWeeklyChurnTrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(
    async (
      targetYear: number,
      targetWeek: number,
      targetSource: AdminChurnSubscriptionSource,
    ) => {
      const generation = ++loadGeneration.current;

      setLoading(true);
      setError(null);
      setReport(null);
      setTrend(null);

      const from = trendWindowStart(targetYear, targetWeek, 8);
      const to = trendWindowEnd(targetYear, targetWeek);

      const [reportRes, trendRes] = await Promise.all([
        adminFetchWeeklyChurnReport({
          year: targetYear,
          week: targetWeek,
          source: targetSource,
        }),
        adminFetchWeeklyChurnTrend({ from, to, source: targetSource }),
      ]);

      if (generation !== loadGeneration.current) {
        return;
      }

      if (!reportRes.ok || !reportRes.data) {
        setReport(null);
        setTrend(null);
        setError(reportRes.error ?? "Failed to load weekly churn report");
        setLoading(false);
        return;
      }

      setReport(reportRes.data);
      if (trendRes.ok && trendRes.data) {
        setTrend(trendRes.data);
      } else {
        setTrend(null);
        if (!trendRes.ok) {
          setError(trendRes.error ?? "Failed to load weekly churn trend");
        }
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void load(isoYear, isoWeek, source);
    return () => {
      loadGeneration.current += 1;
    };
  }, [load, isoYear, isoWeek, source]);

  const chartRows = useMemo(
    () =>
      (trend?.points ?? []).map((p) => ({
        label: p.weekLabel,
        churnRate: p.churnRate,
        autoRenewDisabledRate: p.autoRenewDisabledRate,
        subscriptionExpirationsRate: p.subscriptionExpirationsRate,
      })),
    [trend],
  );

  const selectedTrendMetric = CHURN_TREND_METRICS.find(
    (option) => option.value === trendMetric,
  ) ?? CHURN_TREND_METRICS[0];

  const trendChartConfig = useMemo(
    () =>
      ({
        [selectedTrendMetric.dataKey]: {
          label: `${selectedTrendMetric.label} %`,
          color: selectedTrendMetric.color,
        },
      }) satisfies ChartConfig,
    [selectedTrendMetric],
  );

  const weekInputValue = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Weekly churn</h3>
          <p className="text-sm text-muted-foreground">
            ISO week (Monday UTC). Churn = subscribers lost this week (cancellations
            + account deletions) ÷ active at week start. Users who switch billing
            source are not counted as churned. Internal test accounts are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Report week</span>
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
            <span className="text-muted-foreground">Subscription source</span>
            <select
              className="rounded-md border border-border bg-background px-3 py-2"
              value={source}
              onChange={(e) =>
                setSource(e.target.value as AdminChurnSubscriptionSource)
              }
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void load(isoYear, isoWeek, source)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active at week start"
          value={report ? String(report.startOfWeekActiveUsers) : "—"}
          subtitle={report?.weekRangeLabel ?? weekInputValue}
          loading={loading}
        />
        <SummaryCard
          title="Weekly churn"
          value={report ? `${report.churned} (${pct(report.churnRate)})` : "—"}
          subtitle={
            report
              ? `Lost this week: ${report.churnedFromCancellation} cancelled, ${report.accountsDeleted} deleted account${report.accountsDeleted === 1 ? "" : "s"}`
              : "Subscribers lost this week"
          }
          loading={loading}
        />
        <SummaryCard
          title="Auto-renew disabled"
          value={
            report
              ? `${report.autoRenewDisabled} (${pct(report.autoRenewDisabledRate)})`
              : "—"
          }
          subtitle="Turned off auto-renewal this week"
          loading={loading}
        />
        <SummaryCard
          title="Subscription expirations"
          value={
            report
              ? `${report.subscriptionExpirations} (${pct(report.subscriptionExpirationsRate)})`
              : "—"
          }
          subtitle="Period ended without renewal"
          loading={loading}
        />
      </div>

      {!loading && report && source === "all" && report.bySubscriptionSource.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Churn by subscription source</CardTitle>
            <CardDescription>Stripe vs Apple billing.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium text-right">Active (start)</th>
                  <th className="pb-2 pr-4 font-medium text-right">Churned</th>
                  <th className="pb-2 pr-4 font-medium text-right">Churn %</th>
                  <th className="pb-2 pr-4 font-medium text-right">Auto-renew off</th>
                  <th className="pb-2 font-medium text-right">Expirations</th>
                </tr>
              </thead>
              <tbody>
                {report.bySubscriptionSource.map((row) => (
                  <tr
                    key={row.subscriptionType}
                    className="border-t border-border/60"
                  >
                    <td className="py-2 pr-4">
                      {friendlyProvider(row.subscriptionType)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.activeAtWeekStart}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.churned}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {pct(row.churnRate)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.autoRenewDisabled}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.subscriptionExpirations}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {!loading && report && report.byClientPlatform.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Churn by client platform</CardTitle>
            <CardDescription>
              Primary VPN app used in the 90 days before week end. &quot;No VPN
              sessions&quot; means the subscriber had no recorded VPN connections in
              that window (not the same as account deletion).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Platform</th>
                  <th className="pb-2 pr-4 font-medium text-right">Churned</th>
                  <th className="pb-2 pr-4 font-medium text-right">Auto-renew off</th>
                  <th className="pb-2 font-medium text-right">Expirations</th>
                </tr>
              </thead>
              <tbody>
                {report.byClientPlatform.map((row) => (
                  <tr
                    key={row.clientPlatform}
                    className="border-t border-border/60"
                  >
                    <td className="py-2 pr-4">
                      {(() => {
                        const platform = friendlyClientPlatform(row.clientPlatform);
                        return (
                          <div>
                            <span>{platform.label}</span>
                            {platform.hint ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {platform.hint}
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.churned}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.autoRenewDisabled}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.subscriptionExpirations}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>8-week trend</CardTitle>
            <CardDescription>
              {selectedTrendMetric.label} as % of active subscribers at week
              start.
            </CardDescription>
          </div>
          <div
            className="flex flex-wrap gap-1 rounded-lg border border-border p-1"
            role="group"
            aria-label="Trend metric"
          >
            {CHURN_TREND_METRICS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={trendMetric === option.value ? "default" : "ghost"}
                className="h-8"
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
          ) : chartRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trend data for this window.</p>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[320px] w-full">
              <LineChart data={chartRows} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
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

function SummaryCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
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
      </CardContent>
    </Card>
  );
}
