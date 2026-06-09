import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminFetchUtmSignupReport,
  type AdminUtmSignupReport,
} from "@/auth/backend";

function defaultFromValue(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultToValue(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function AdminUtmAttribution() {
  const [fromInput, setFromInput] = useState(defaultFromValue);
  const [toInput, setToInput] = useState(defaultToValue);
  const [report, setReport] = useState<AdminUtmSignupReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);

    const res = await adminFetchUtmSignupReport({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T00:00:00.000Z`,
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!res.ok || !res.data) {
      setReport(null);
      setError(res.error ?? "Failed to load UTM sign-up report");
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    setReport(res.data);
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(fromInput, toInput);
    return () => activeRequest.current?.abort();
  }, [load, fromInput, toInput]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">UTM attribution</h2>
        <p className="text-sm text-muted-foreground">
          First-touch sign-ups grouped by UTM source, campaign, and medium.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From (UTC)</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To (UTC, exclusive)</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void load(fromInput, toInput)}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Total attributed sign-ups
        </p>
        <p className="text-3xl font-semibold">
          {loading ? "—" : (report?.total_signups ?? 0)}
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">UTM source</th>
              <th className="p-3">UTM campaign</th>
              <th className="p-3">UTM medium</th>
              <th className="p-3 text-right">Sign-ups</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : null}
            {!loading && (report?.rows.length ?? 0) === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  No attributed sign-ups in this range.
                </td>
              </tr>
            ) : null}
            {!loading
              ? (report?.rows ?? []).map((row) => (
                  <tr key={`${row.utm_source}-${row.utm_campaign}-${row.utm_medium}`} className="border-t border-border">
                    <td className="p-3">{row.utm_source}</td>
                    <td className="p-3">{row.utm_campaign}</td>
                    <td className="p-3">{row.utm_medium}</td>
                    <td className="p-3 text-right">{row.signups}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
