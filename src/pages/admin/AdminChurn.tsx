import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminFetchChurnReport,
  adminFetchChurnTrend,
  type AdminChurnReport,
  type AdminChurnTrendReport,
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

function currentMonthYear(): { month: number; year: number; label: string } {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  return { month, year, label: `${year}-${String(month).padStart(2, "0")}` };
}

function formatMonthLabel(month: number, year: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function trendWindowEnd(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function trendWindowStart(month: number, year: number, span = 6): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - (span - 1));
  const m = d.getUTCMonth() + 1;
  const y = d.getUTCFullYear();
  return `${y}-${String(m).padStart(2, "0")}`;
}

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function friendlyProvider(raw: string): string {
  switch (raw.toLowerCase()) {
    case "stripe":
      return "Credit card";
    case "apple_iap":
      return "Apple";
    default:
      return raw;
  }
}

function friendlyBilling(raw: string): string {
  switch (raw.toLowerCase()) {
    case "month":
      return "Monthly";
    case "year":
    case "annual":
    case "yearly":
      return "Annual";
    default:
      return raw;
  }
}

const trendChartConfig = {
  hardChurnRate: {
    label: "Lost subscribers %",
    color: "hsl(var(--destructive))",
  },
  softChurnRate: {
    label: "At risk %",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function AdminChurn() {
  const initial = currentMonthYear();
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [report, setReport] = useState<AdminChurnReport | null>(null);
  const [trend, setTrend] = useState<AdminChurnTrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async (targetMonth: number, targetYear: number) => {
    const generation = ++loadGeneration.current;

    setLoading(true);
    setError(null);
    setReport(null);
    setTrend(null);

    const from = trendWindowStart(targetMonth, targetYear, 6);
    const to = trendWindowEnd(targetMonth, targetYear);

    const [reportRes, trendRes] = await Promise.all([
      adminFetchChurnReport({ month: targetMonth, year: targetYear }),
      adminFetchChurnTrend({ from, to }),
    ]);

    if (generation !== loadGeneration.current) {
      return;
    }

    if (!reportRes.ok || !reportRes.data) {
      setReport(null);
      setTrend(null);
      setError(reportRes.error ?? "Failed to load churn report");
      setLoading(false);
      return;
    }

    setReport(reportRes.data);
    if (trendRes.ok && trendRes.data) {
      setTrend(trendRes.data);
    } else {
      setTrend(null);
      if (!trendRes.ok) {
        setError(trendRes.error ?? "Failed to load churn trend");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(month, year);
    return () => {
      loadGeneration.current += 1;
    };
  }, [load, month, year]);

  const chartRows = useMemo(
    () =>
      (trend?.points ?? []).map((p) => ({
        label: p.monthLabel,
        hardChurnRate: p.hardChurnRate,
        softChurnRate: p.softChurnRate,
      })),
    [trend],
  );

  const monthInputValue = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Churn analytics</h2>
          <p className="text-sm text-muted-foreground">
            Monthly subscriber loss and revenue impact. Internal test accounts
            are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Report month</span>
            <input
              type="month"
              max={initial.label}
              className="rounded-md border border-border bg-background px-3 py-2"
              value={monthInputValue}
              onChange={(e) => {
                const match = /^(\d{4})-(\d{2})$/.exec(e.target.value);
                if (!match) return;
                const y = Number(match[1]);
                const m = Number(match[2]);
                if (y > initial.year || (y === initial.year && m > initial.month)) return;
                setYear(y);
                setMonth(m);
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void load(month, year)}
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
          title="Active at month start"
          value={report ? String(report.startOfMonthActiveUsers) : "—"}
          subtitle={formatMonthLabel(month, year)}
          loading={loading}
        />
        <SummaryCard
          title="Lost subscribers"
          value={report ? `${report.hardChurned} (${pct(report.hardChurnRate)})` : "—"}
          subtitle="Cancelled or expired this month"
          loading={loading}
        />
        <SummaryCard
          title="At risk"
          value={report ? `${report.softChurned} (${pct(report.softChurnRate)})` : "—"}
          subtitle="Turned off auto-renewal this month"
          loading={loading}
        />
        <SummaryCard
          title="Trial drop-offs"
          value={report ? `${report.trialChurned} (${pct(report.trialChurnRate)})` : "—"}
          subtitle="Free trials that ended without subscribing"
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue impact</CardTitle>
          <CardDescription>
            Monthly revenue at start of month (annual plans ÷ 12) vs revenue
            lost to cancelled subscribers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <MetricBlock
            label="Monthly revenue (start of month)"
            value={report ? money(report.mrrStart) : "—"}
            loading={loading}
          />
          <MetricBlock
            label="Revenue lost"
            value={report ? money(report.revenueChurned) : "—"}
            loading={loading}
          />
          <MetricBlock
            label="Revenue lost (%)"
            value={report ? pct(report.revenueChurnRate) : "—"}
            loading={loading}
          />
        </CardContent>
      </Card>

      {!loading && report && report.breakdowns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Breakdowns</CardTitle>
            <CardDescription>By plan type and payment method.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Payment method</th>
                  <th className="pb-2 pr-4 font-medium text-right">Lost</th>
                  <th className="pb-2 pr-4 font-medium text-right">At risk</th>
                  <th className="pb-2 pr-4 font-medium text-right">Trial drop-off</th>
                  <th className="pb-2 pr-4 font-medium text-right">Revenue (start)</th>
                  <th className="pb-2 font-medium text-right">Revenue lost</th>
                </tr>
              </thead>
              <tbody>
                {report.breakdowns.map((row) => (
                  <tr
                    key={`${row.billingPeriod}-${row.subscriptionType}`}
                    className="border-t border-border/60"
                  >
                    <td className="py-2 pr-4">{friendlyBilling(row.billingPeriod)}</td>
                    <td className="py-2 pr-4">{friendlyProvider(row.subscriptionType)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.hardChurned}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.softChurned}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.trialChurned}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {money(row.mrrStart)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.revenueChurned)}
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
          <CardTitle>6-month trend</CardTitle>
          <CardDescription>Lost subscribers vs at-risk subscribers (% of active users at month start).</CardDescription>
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
                  dataKey="hardChurnRate"
                  stroke="var(--color-hardChurnRate)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="softChurnRate"
                  stroke="var(--color-softChurnRate)"
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

function MetricBlock({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{loading ? "…" : value}</p>
    </div>
  );
}
