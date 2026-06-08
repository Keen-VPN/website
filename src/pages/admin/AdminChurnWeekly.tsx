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

function friendlyClientPlatform(raw: string): string {
  switch (raw.toLowerCase()) {
    case "macos":
      return "macOS";
    case "ios":
      return "iOS";
    case "unknown":
      return "Unknown";
    default:
      return raw;
  }
}

const trendChartConfig = {
  churnRate: {
    label: "Weekly churn %",
    color: "hsl(var(--destructive))",
  },
  autoRenewDisabledRate: {
    label: "Auto-renew off %",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

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
      })),
    [trend],
  );

  const weekInputValue = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Weekly churn</h3>
          <p className="text-sm text-muted-foreground">
            ISO week (Monday UTC). Churn rate = net lost subscribers ÷ active at
            week start (users who switch billing source are not counted as
            churned). Internal test accounts are excluded.
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
          subtitle="Subscribers lost this week"
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
              Dominant VPN app platform (90-day session lookback).
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
                      {friendlyClientPlatform(row.clientPlatform)}
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
        <CardHeader>
          <CardTitle>8-week trend</CardTitle>
          <CardDescription>
            Weekly churn vs auto-renew disabled (% of active subscribers at week
            start).
          </CardDescription>
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
                  dataKey="churnRate"
                  stroke="var(--color-churnRate)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="autoRenewDisabledRate"
                  stroke="var(--color-autoRenewDisabledRate)"
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
