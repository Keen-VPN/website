import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminFetchJiraDeliveryReport,
  type AdminJiraDeliveryReport,
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

function currentMonthYear(): {
  month: number;
  year: number;
  label: string;
} {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  return {
    month,
    year,
    label: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function isFutureMonth(month: number, year: number, max: { month: number; year: number }) {
  return year > max.year || (year === max.year && month > max.month);
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

const trendChartConfig = {
  totalPoints: {
    label: "Story points",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function AdminJiraDelivery() {
  const initial = currentMonthYear();
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [report, setReport] = useState<AdminJiraDeliveryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(
    async (
      targetMonth: number,
      targetYear: number,
      options?: { preserveOnError?: boolean },
    ) => {
      const generation = ++loadGeneration.current;
      setLoading(true);
      setError(null);
      if (!options?.preserveOnError) {
        // Month change: drop stale totals so we don't show last month under a new label.
        setReport(null);
      }

      const res = await adminFetchJiraDeliveryReport({
        month: targetMonth,
        year: targetYear,
      });

      if (generation !== loadGeneration.current) return;

      if (!res.ok || !res.data) {
        if (!options?.preserveOnError) {
          setReport(null);
        }
        setError(res.error ?? "Failed to load Jira delivery report");
        setLoading(false);
        return;
      }

      setReport(res.data);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void load(month, year);
    return () => {
      loadGeneration.current += 1;
    };
  }, [load, month, year]);

  const chartRows = useMemo(
    () =>
      (report?.trend ?? []).map((p) => ({
        label: p.monthLabel,
        totalPoints: p.totalPoints,
      })),
    [report],
  );

  const monthInputValue = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Jira story point delivery
          </h2>
          <p className="text-sm text-muted-foreground">
            Completed story points by month, assignee (RP), and environment
            label. Counted once when a story reaches Done. Tickets without an
            estimate count as 1 point. Kenna&apos;s total is story estimates on
            tickets where he is the{" "}
            <span className="font-medium text-foreground">Reporter</span>{" "}
            (created that month, any status), separate from Done-by-RP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="jira-month">
            Month
          </label>
          <input
            id="jira-month"
            type="month"
            max={initial.label}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            value={monthInputValue}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              if (!y || !m) return;
              if (isFutureMonth(m, y, initial)) return;
              setYear(y);
              setMonth(m);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(month, year, { preserveOnError: true })}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Could not load report</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {report && !report.configured ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jira not configured</CardTitle>
            <CardDescription>
              Set{" "}
              <code className="text-xs">
                JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
              </code>{" "}
              on the backend and redeploy. Create an API token at Atlassian
              account security settings.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {loading && !report ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {loading && report?.configured ? (
        <p className="text-sm text-muted-foreground">Refreshing…</p>
      ) : null}

      {report?.configured ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total points</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {report.totalPoints}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {report.issuesWithPointsCount} of {report.completedIssueCount}{" "}
                Done issues had estimates; missing estimates default to 1 ·{" "}
                {report.monthLabel}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>vs previous month</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {report.monthOverMonthDelta > 0 ? "+" : ""}
                  {report.monthOverMonthDelta}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Prior month ({report.previousMonth}):{" "}
                {report.previousMonthTotalPoints} pts
                {report.monthOverMonthPercent != null
                  ? ` · ${pct(report.monthOverMonthPercent)} MoM`
                  : ""}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>RPs with points</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {report.byRp.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Assignees who completed estimated work this month
                {report.byRp.some((r) => r.suspended)
                  ? ` · ${report.byRp.filter((r) => r.suspended).length} suspended`
                  : ""}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  {report.kennaCreatedEstimates?.displayName ?? "Kenna"} — story
                  estimate (reporter)
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {report.kennaCreatedEstimates == null
                    ? "—"
                    : report.kennaCreatedEstimates.points}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {report.kennaCreatedEstimates == null
                  ? "Unavailable until the API includes Kenna reporter estimates (deploy backend leaderboard)"
                  : report.kennaCreatedEstimates.configured === false
                    ? "Set JIRA_LEADERBOARD_BOSS_ACCOUNT_ID to enable"
                    : `${report.kennaCreatedEstimates.issueCount} tickets with Kenna as reporter this month · missing estimates default to 1 · not Done-by-RP`}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly trend</CardTitle>
              <CardDescription>Last 6 months including selection</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trendChartConfig} className="h-[240px] w-full">
                <LineChart data={chartRows} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="totalPoints"
                    stroke="var(--color-totalPoints)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Points by RP</CardTitle>
                <CardDescription>
                  Assignee when the story was Done. Suspended Jira accounts stay
                  visible here (hidden from daily Slack).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.byRp.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No points this month.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">RP</th>
                          <th className="py-2 pr-3 font-medium">Points</th>
                          <th className="py-2 font-medium">% of total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byRp.map((row, index) => (
                          <tr
                            key={`${row.assigneeAccountId ?? "none"}:${row.assigneeDisplayName}:${index}`}
                            className="border-b border-border/60"
                          >
                            <td className="py-2 pr-3">
                              <span className="inline-flex flex-wrap items-center gap-2">
                                {row.assigneeDisplayName}
                                {row.suspended ? (
                                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                    Suspended
                                  </span>
                                ) : null}
                              </span>
                            </td>
                            <td className="py-2 pr-3 tabular-nums">{row.points}</td>
                            <td className="py-2 tabular-nums">
                              {pct(row.percentOfTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Points by environment</CardTitle>
                <CardDescription>
                  Labels: backend, ios, macos, android, website, seo, design,
                  windows, operations, chrome, infrastructure. Multi-label
                  stories count full points in each match.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.byEnvironment.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No points this month.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Environment</th>
                          <th className="py-2 pr-3 font-medium">Points</th>
                          <th className="py-2 font-medium">% of total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byEnvironment.map((row) => (
                          <tr
                            key={row.environment}
                            className="border-b border-border/60"
                          >
                            <td className="py-2 pr-3 capitalize">
                              {row.environment}
                            </td>
                            <td className="py-2 pr-3 tabular-nums">{row.points}</td>
                            <td className="py-2 tabular-nums">
                              {pct(row.percentOfTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
