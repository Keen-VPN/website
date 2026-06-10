import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminFetchUtmFunnelReport,
  adminFetchUtmSignupReport,
  type AdminUtmFunnelReport,
  type AdminUtmSignupReport,
} from "@/auth/backend";
import { downloadUtmFunnelCsv } from "@/lib/utm-attribution-export";

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

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatRevenue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AdminUtmAttribution() {
  const [fromInput, setFromInput] = useState(defaultFromValue);
  const [toInput, setToInput] = useState(defaultToValue);
  const [signupReport, setSignupReport] = useState<AdminUtmSignupReport | null>(
    null,
  );
  const [funnelReport, setFunnelReport] = useState<AdminUtmFunnelReport | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!from.trim() || !to.trim()) {
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

    const [signupRes, funnelRes] = await Promise.all([
      adminFetchUtmSignupReport({
        from: fromIso,
        to: toIso,
        signal: controller.signal,
      }),
      adminFetchUtmFunnelReport({
        from: fromIso,
        to: toIso,
        signal: controller.signal,
      }),
    ]);

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!signupRes.ok || !signupRes.data || !funnelRes.ok || !funnelRes.data) {
      setSignupReport(null);
      setFunnelReport(null);
      setError(
        signupRes.error ??
          funnelRes.error ??
          "Failed to load UTM attribution reports",
      );
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    setSignupReport(signupRes.data);
    setFunnelReport(funnelRes.data);
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(fromInput, toInput);
    return () => activeRequest.current?.abort();
  }, [load, fromInput, toInput]);

  const totals = funnelReport?.totals;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">UTM attribution</h2>
        <p className="text-sm text-muted-foreground">
          First-touch sign-ups and conversion funnel by UTM source, campaign, and
          medium.
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
        <Button
          type="button"
          variant="outline"
          disabled={loading || !funnelReport}
          onClick={() => {
            if (funnelReport) downloadUtmFunnelCsv(funnelReport);
          }}
        >
          Export funnel CSV
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sign-up started</p>
          <p className="text-2xl font-semibold">
            {loading || error ? "—" : (totals?.signup_started ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Attributed sign-ups</p>
          <p className="text-2xl font-semibold">
            {loading || error ? "—" : (totals?.signups_completed ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Trials</p>
          <p className="text-2xl font-semibold">
            {loading || error ? "—" : (totals?.trials ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {loading || error
              ? ""
              : formatRate(totals?.signup_completed_to_trial_rate ?? 0) +
                  " of attributed sign-ups"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid subscriptions</p>
          <p className="text-2xl font-semibold">
            {loading || error ? "—" : (totals?.subscriptions ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {loading || error
              ? ""
              : formatRate(totals?.signup_completed_to_paid_rate ?? 0) +
                  " of attributed sign-ups"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Attributed revenue</p>
        <p className="text-3xl font-semibold">
          {loading || error ? "—" : formatRevenue(totals?.revenue ?? 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Completed rate:{" "}
          {loading || error
            ? "—"
            : formatRate(totals?.signup_to_completed_rate ?? 0)}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-medium">Conversion funnel</h3>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">UTM source</th>
                <th className="p-3">UTM campaign</th>
                <th className="p-3">UTM medium</th>
                <th className="p-3 text-right">Started</th>
                <th className="p-3 text-right">Sign-ups</th>
                <th className="p-3 text-right">Trials</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">→ Sign-up</th>
                <th className="p-3 text-right">Completed → trial</th>
                <th className="p-3 text-right">Completed → paid</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={11}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && !error && (funnelReport?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={11}>
                    No funnel data in this range.
                  </td>
                </tr>
              ) : null}
              {!loading && !error
                ? (funnelReport?.rows ?? []).map((row, index) => (
                    <tr
                      key={`${index}\u0000${row.utm_source}\u0000${row.utm_campaign}\u0000${row.utm_medium}`}
                      className="border-t border-border"
                    >
                      <td className="p-3">{row.utm_source}</td>
                      <td className="p-3">{row.utm_campaign}</td>
                      <td className="p-3">{row.utm_medium}</td>
                      <td className="p-3 text-right">{row.signup_started}</td>
                      <td className="p-3 text-right">{row.signups_completed}</td>
                      <td className="p-3 text-right">{row.trials}</td>
                      <td className="p-3 text-right">{row.subscriptions}</td>
                      <td className="p-3 text-right">
                        {formatRevenue(row.revenue)}
                      </td>
                      <td className="p-3 text-right">
                        {formatRate(row.signup_to_completed_rate)}
                      </td>
                      <td className="p-3 text-right">
                        {formatRate(row.signup_completed_to_trial_rate)}
                      </td>
                      <td className="p-3 text-right">
                        {formatRate(row.signup_completed_to_paid_rate)}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-medium">Sign-ups by UTM</h3>
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
              {!loading && !error && (signupReport?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={4}>
                    No attributed sign-ups in this range.
                  </td>
                </tr>
              ) : null}
              {!loading && !error
                ? (signupReport?.rows ?? []).map((row, index) => (
                    <tr
                      key={`${index}\u0000${row.utm_source}\u0000${row.utm_campaign}\u0000${row.utm_medium}`}
                      className="border-t border-border"
                    >
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
    </div>
  );
}
