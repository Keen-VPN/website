import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminFetchLandingPageReport,
  type AdminLandingPageReport,
} from "@/auth/backend";
import {
  defaultAdminReportFromValue,
  defaultAdminReportToValue,
  formatAdminRate,
} from "@/lib/admin-utils";

function formatFirstPageLabel(path: string): string {
  if (path === "/") return "Homepage";
  return path;
}

export default function AdminLandingAttribution() {
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [report, setReport] = useState<AdminLandingPageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!from.trim() || !to.trim()) {
      setReport(null);
      setError(null);
      setLoading(false);
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);

    const response = await adminFetchLandingPageReport({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T00:00:00.000Z`,
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!response.ok || !response.data) {
      setReport(null);
      setError(response.error ?? "Failed to load landing page report");
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    setReport(response.data);
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(fromInput, toInput);
    return () => activeRequest.current?.abort();
  }, [load, fromInput, toInput]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Landing page attribution
        </h2>
        <p className="text-sm text-muted-foreground">
          First-touch entry pages for account sign-ups and trials. Campaign UTMs
          are reported separately in{" "}
          <Link
            to="/admin/utm-attribution"
            className="text-primary underline-offset-4 hover:underline"
          >
            UTM attribution
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
          onClick={() => void load(fromInput, toInput)}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sign-ups</p>
            <p className="text-2xl font-semibold">
              {loading ? "—" : (report?.total_signups ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Trials</p>
            <p className="text-2xl font-semibold">
              {loading ? "—" : (report?.total_trials ?? 0)}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">First page</th>
              <th className="p-3 font-medium text-right">Sign-ups</th>
              <th className="p-3 font-medium text-right">Trials</th>
              <th className="p-3 font-medium text-right">Signup → trial</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : error ? null : report?.rows.length ? (
              report.rows.map((row) => (
                <tr
                  key={row.first_page}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-3 font-mono text-xs sm:text-sm">
                    {formatFirstPageLabel(row.first_page)}
                  </td>
                  <td className="p-3 text-right">{row.signups}</td>
                  <td className="p-3 text-right">{row.trials}</td>
                  <td className="p-3 text-right">
                    {formatAdminRate(row.signup_to_trial_rate)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  No sign-ups in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
