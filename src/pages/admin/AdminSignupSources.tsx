import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminFetchSignupSourceSummary,
  type AdminSignupSourceSummary,
} from "@/auth/backend";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function AdminSignupSources() {
  const [summary, setSummary] = useState<AdminSignupSourceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);

    const res = await adminFetchSignupSourceSummary({ signal: controller.signal });
    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (res.ok && res.data) {
      setSummary(res.data);
    } else {
      setSummary(null);
      setError(res.error ?? "Failed to load signup source summary");
    }

    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load();
    return () => activeRequest.current?.abort();
  }, [load]);

  const trendDays = useMemo(() => {
    if (!summary) return [];
    return [...new Set(summary.trends.map((row) => row.day))].sort();
  }, [summary]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Signup sources</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Self-reported acquisition channels at signup. Aggregated only — no
            individual responses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={summary?.totalUsers ?? (loading ? "…" : 0)} />
        <StatCard
          label="Responses captured"
          value={summary?.responsesCaptured ?? (loading ? "…" : 0)}
        />
        <StatCard
          label="Skipped"
          value={summary?.responsesSkipped ?? (loading ? "…" : 0)}
        />
        <StatCard
          label="Unanswered"
          value={summary?.unansweredCount ?? (loading ? "…" : 0)}
        />
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Responses by category</h3>
        <div className="rounded-lg border border-border p-4">
          <div className="space-y-2">
            {(summary?.options ?? []).map((row) => (
              <div
                key={row.value}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span>{row.label}</span>
                <span className="font-mono tabular-nums">{row.count}</span>
              </div>
            ))}
            {!loading && (summary?.options.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Trends over time</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Day</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Signups</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.trends ?? []).map((row) => (
                <tr key={`${row.day}-${row.source}`} className="border-t border-border">
                  <td className="px-4 py-2 font-mono">{row.day}</td>
                  <td className="px-4 py-2">{row.label}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {row.count}
                  </td>
                </tr>
              ))}
              {!loading && trendDays.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-muted-foreground">
                    No trend data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Analytics events</h3>
        <div className="rounded-lg border border-border p-4">
          <div className="space-y-2">
            {(summary?.analyticsEvents ?? []).map((row) => (
              <div
                key={row.eventName}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="font-mono text-muted-foreground">{row.eventName}</span>
                <span className="font-mono tabular-nums">{row.count}</span>
              </div>
            ))}
            {!loading && (summary?.analyticsEvents.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
