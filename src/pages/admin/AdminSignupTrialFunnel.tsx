import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminFetchSignupTrialPaidFunnelReport,
  type AdminSignupTrialPaidFunnelReport,
} from "@/auth/backend";
import {
  defaultAdminReportFromValue,
  defaultAdminReportToValue,
  formatAdminRate,
  isAdminReportDateRangeValid,
} from "@/lib/admin-utils";

export default function AdminSignupTrialFunnel() {
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [report, setReport] = useState<AdminSignupTrialPaidFunnelReport | null>(
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

    const res = await adminFetchSignupTrialPaidFunnelReport({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T00:00:00.000Z`,
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!res.ok || !res.data) {
      setReport(null);
      setError(res.error ?? "Failed to load funnel");
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

  const stages = report?.stages;
  const rates = report?.rates;
  const dropOff = report?.drop_off;

  const stageRows = stages
    ? [
        {
          label: "Visitors (signup_started)",
          count: stages.visitors,
          note: "Intent events in window — not unique browsers",
        },
        { label: "Signups", count: stages.signups, note: "Accounts created" },
        {
          label: "Trial CTA viewed",
          count: stages.trial_cta_viewed,
          note: "Saw Start free trial",
        },
        {
          label: "Trial CTA clicked",
          count: stages.trial_cta_clicked,
          note: "Clicked Start free trial",
        },
        {
          label: "Trial started",
          count: stages.trial_started,
          note: "Activated trial",
        },
        {
          label: "Paid",
          count: stages.paid,
          note: "subscription_started",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Signup → Trial → Paid
        </h2>
        <p className="text-sm text-muted-foreground">
          Conversion funnel with Trial CTA view and click kept separate from
          trial activation. Internal @keenvpn.com / @vpnkeen.com accounts are
          excluded. PostHog events:{" "}
          <code className="text-xs">trial_cta_viewed</code>,{" "}
          <code className="text-xs">trial_cta_clicked</code>,{" "}
          <code className="text-xs">trial_started</code>,{" "}
          <code className="text-xs">subscription_started</code>. Also see{" "}
          <Link className="underline" to="/admin/utm-attribution">
            UTM attribution
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">From (UTC)</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">
            To (UTC, exclusive)
          </span>
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
        >
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {stages && rates && dropOff ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Visitor → Signup",
                value: formatAdminRate(rates.visitor_to_signup),
              },
              {
                label: "Signup → CTA viewed",
                value: formatAdminRate(rates.signup_to_cta_viewed),
              },
              {
                label: "Signup → CTA clicked",
                value: formatAdminRate(rates.signup_to_cta_clicked),
              },
              {
                label: "Signup → Trial",
                value: formatAdminRate(rates.signup_to_trial),
              },
              {
                label: "Trial → Paid",
                value: formatAdminRate(rates.trial_to_paid),
              },
              {
                label: "Signup → Paid",
                value: formatAdminRate(rates.signup_to_paid),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="p-3 font-medium">Stage</th>
                  <th className="p-3 font-medium">Users</th>
                  <th className="p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {stageRows.map((row) => (
                  <tr key={row.label} className="border-b border-border/60">
                    <td className="p-3 font-medium">{row.label}</td>
                    <td className="p-3">{row.count.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-base font-medium">Drop-off (raw)</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                Visitor → Signup: {dropOff.visitor_to_signup.toLocaleString()}
              </li>
              <li>
                Signup → CTA viewed:{" "}
                {dropOff.signup_to_cta_viewed.toLocaleString()}
              </li>
              <li>
                CTA viewed → Clicked:{" "}
                {dropOff.cta_viewed_to_clicked.toLocaleString()}
              </li>
              <li>
                CTA clicked → Trial:{" "}
                {dropOff.cta_clicked_to_trial.toLocaleString()}
              </li>
              <li>Trial → Paid: {dropOff.trial_to_paid.toLocaleString()}</li>
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
