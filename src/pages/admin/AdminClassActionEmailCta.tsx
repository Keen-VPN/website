import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminFetchClassActionEmailCtaReport,
  type AdminClassActionEmailCtaReport,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  defaultAdminReportFromValue,
  defaultAdminReportToValue,
  formatAdminRate,
  isAdminReportDateRangeValid,
} from "@/lib/admin-utils";

export default function AdminClassActionEmailCta() {
  const { can } = useAdminAuth();
  const canView = can("emails.broadcast");
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [report, setReport] = useState<AdminClassActionEmailCtaReport | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!isAdminReportDateRangeValid(from, to)) {
      activeRequest.current?.abort();
      activeRequest.current = null;
      setReport(null);
      setError(
        from.trim() && to.trim()
          ? "From date must be on or before To date."
          : "Select both dates.",
      );
      setLoading(false);
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError(null);

    const res = await adminFetchClassActionEmailCtaReport({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T00:00:00.000Z`,
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;
    if (!res.ok || !res.data) {
      setReport(null);
      setError(res.error === "aborted" ? null : res.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    setReport(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canView) return;
    void load(fromInput, toInput);
    return () => activeRequest.current?.abort();
  }, [canView, fromInput, toInput, load]);

  if (!canView) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Class Action Email CTAs</h2>
        <p className="text-sm text-muted-foreground">
          You need the emails.broadcast permission to view this report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Class Action Email CTAs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sent → CTA clicks for class-action announcement emails. Bot /
            link-scanner hits are excluded from unique CTR.{" "}
            <Link
              to="/admin/broadcast-email"
              className="text-primary underline-offset-2 hover:underline"
            >
              Broadcast Email
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            From
            <input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="ml-2 rounded-md border border-border bg-background px-2 py-1"
            />
          </label>
          <label className="text-sm">
            To
            <input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="ml-2 rounded-md border border-border bg-background px-2 py-1"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(fromInput, toInput)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Emails sent",
            value: report?.emails_sent.toLocaleString() ?? (loading ? "…" : "0"),
          },
          {
            label: "CTA clicks",
            value:
              report?.total_cta_clicks.toLocaleString() ??
              (loading ? "…" : "0"),
          },
          {
            label: "Unique users",
            value:
              report?.unique_users_clicked.toLocaleString() ??
              (loading ? "…" : "0"),
          },
          {
            label: "Overall CTR",
            value: loading
              ? "…"
              : report?.overall_ctr == null
                ? "—"
                : formatAdminRate(report.overall_ctr * 100),
          },
          {
            label: "Bot clicks excluded",
            value:
              report?.bot_clicks_excluded.toLocaleString() ??
              (loading ? "…" : "0"),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="p-3 font-medium">CTA</th>
              <th className="p-3 font-medium">Total clicks</th>
              <th className="p-3 font-medium">Unique users</th>
            </tr>
          </thead>
          <tbody>
            {(report?.by_cta ?? []).length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={3}>
                  {loading ? "Loading…" : "No CTA clicks in this window."}
                </td>
              </tr>
            ) : (
              report!.by_cta.map((row) => (
                <tr key={row.cta_id} className="border-b border-border/60">
                  <td className="p-3 font-mono text-xs">{row.cta_id}</td>
                  <td className="p-3">{row.total_clicks.toLocaleString()}</td>
                  <td className="p-3">{row.unique_users.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="p-3 font-medium">Class action</th>
              <th className="p-3 font-medium">Sent</th>
              <th className="p-3 font-medium">Clicks</th>
              <th className="p-3 font-medium">Unique</th>
              <th className="p-3 font-medium">CTR</th>
              <th className="p-3 font-medium">Trials after click</th>
              <th className="p-3 font-medium">Paid after click</th>
            </tr>
          </thead>
          <tbody>
            {(report?.by_perk ?? []).length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  {loading
                    ? "Loading…"
                    : "No class-action announcement sends in this window."}
                </td>
              </tr>
            ) : (
              report!.by_perk.map((row) => (
                <tr key={row.perk_id} className="border-b border-border/60">
                  <td className="p-3">
                    {row.perk_title ?? row.perk_id}
                  </td>
                  <td className="p-3">{row.emails_sent.toLocaleString()}</td>
                  <td className="p-3">{row.total_clicks.toLocaleString()}</td>
                  <td className="p-3">{row.unique_users.toLocaleString()}</td>
                  <td className="p-3">
                    {row.ctr == null ? "—" : formatAdminRate(row.ctr * 100)}
                  </td>
                  <td className="p-3">
                    {row.subsequent_trials.toLocaleString()}
                  </td>
                  <td className="p-3">
                    {row.subsequent_paid.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
