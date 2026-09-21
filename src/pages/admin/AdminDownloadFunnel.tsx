import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminFetchDownloadFunnelReport,
  adminFetchDownloadsByOs,
  type AdminDownloadFunnelReport,
  type AdminDownloadsByOsKey,
  type AdminDownloadsByOsReport,
} from "@/auth/backend";
import {
  defaultAdminReportFromValue,
  defaultAdminReportToValue,
  formatAdminRate,
  isAdminReportDateRangeValid,
} from "@/lib/admin-utils";

const DOWNLOAD_OS_LABELS: Record<AdminDownloadsByOsKey, string> = {
  ios: "iOS",
  macos: "macOS",
  android: "Android",
  windows: "Windows",
};

const DOWNLOAD_OS_ORDER: AdminDownloadsByOsKey[] = [
  "ios",
  "macos",
  "android",
  "windows",
];

export default function AdminDownloadFunnel() {
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [report, setReport] = useState<AdminDownloadFunnelReport | null>(null);
  const [downloadsByOs, setDownloadsByOs] =
    useState<AdminDownloadsByOsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!from.trim() || !to.trim()) {
      setReport(null);
      setDownloadsByOs(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isAdminReportDateRangeValid(from, to)) {
      activeRequest.current?.abort();
      activeRequest.current = null;
      setReport(null);
      setDownloadsByOs(null);
      setError("From date must be on or before To date.");
      setLoading(false);
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);

    const range = {
      from: `${from}T00:00:00.000Z`,
      to: `${to}T00:00:00.000Z`,
      signal: controller.signal,
    };

    const [funnelResponse, byOsResponse] = await Promise.all([
      adminFetchDownloadFunnelReport(range),
      adminFetchDownloadsByOs(range),
    ]);

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!funnelResponse.ok || !funnelResponse.data) {
      setReport(null);
      setDownloadsByOs(null);
      setError(funnelResponse.error ?? "Failed to load download funnel report");
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    if (!byOsResponse.ok || !byOsResponse.data) {
      setReport(null);
      setDownloadsByOs(null);
      setError(byOsResponse.error ?? "Failed to load downloads by OS");
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    setReport(funnelResponse.data);
    setDownloadsByOs(byOsResponse.data);
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(fromInput, toInput);
    return () => activeRequest.current?.abort();
  }, [load, fromInput, toInput]);

  const showData = !loading && !error && report != null && downloadsByOs != null;
  const downloads = showData ? report.downloads : null;
  const webToApp = showData ? report.web_to_app : null;
  const confirmed = showData ? downloadsByOs : null;
  const platformEntries = Object.entries(downloads?.by_platform ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Download funnel
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirmed downloads use first app open installs. Website store CTA
          clicks are download intent only. Web → app usage uses later native VPN
          sessions after signup. See also{" "}
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Confirmed downloads by OS</h3>
          <p className="text-sm text-muted-foreground">
            Counts from <code className="text-xs">app_first_open</code> (first
            install open), not website CTA clicks.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (confirmed?.total ?? 0)}
            </p>
          </div>
          {DOWNLOAD_OS_ORDER.map((os) => {
            const row = confirmed?.by_os[os];
            return (
              <div
                key={os}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-sm text-muted-foreground">
                  {DOWNLOAD_OS_LABELS[os]}
                </p>
                <p className="text-2xl font-semibold">
                  {loading || error ? "—" : (row?.count ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading || error
                    ? "—"
                    : formatAdminRate(row?.percent_of_total ?? 0)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">
            Website download CTA clicks (intent only)
          </h3>
          <p className="text-sm text-muted-foreground">
            Store button clicks on the website — not confirmed installs.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total clicks</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (downloads?.total_clicks ?? 0)}
            </p>
          </div>
          {platformEntries.map(([platform, count]) => (
            <div
              key={platform}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="text-sm capitalize text-muted-foreground">
                {platform}
              </p>
              <p className="text-2xl font-semibold">
                {loading || error ? "—" : count}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">Platform</th>
                <th className="p-3 font-medium">UTM source</th>
                <th className="p-3 font-medium">Medium</th>
                <th className="p-3 font-medium">Campaign</th>
                <th className="p-3 font-medium text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    Report unavailable.
                  </td>
                </tr>
              ) : (downloads?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    No download clicks in this range.
                  </td>
                </tr>
              ) : (
                downloads?.rows.map((row) => (
                  <tr
                    key={JSON.stringify([
                      row.platform,
                      row.utm_source,
                      row.utm_medium,
                      row.utm_campaign,
                    ])}
                    className="border-b border-border/60"
                  >
                    <td className="p-3 capitalize">{row.platform}</td>
                    <td className="p-3">{row.utm_source}</td>
                    <td className="p-3">{row.utm_medium}</td>
                    <td className="p-3">{row.utm_campaign}</td>
                    <td className="p-3 text-right">{row.clicks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Web signup → app usage</h3>
        <p className="text-sm text-muted-foreground">
          Cohort is web <code className="text-xs">user_account_created</code>{" "}
          in the date window. App usage is later native{" "}
          <code className="text-xs">connection_sessions</code> after signup.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Web sign-ups</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (webToApp?.web_signups ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Later used an app</p>
            <p className="text-2xl font-semibold">
              {loading || error
                ? "—"
                : (webToApp?.later_app_authenticated ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading || error
                ? "—"
                : formatAdminRate(webToApp?.web_signup_to_app_rate ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Never used an app</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (webToApp?.never_used_app ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Trials / Paid</p>
            <p className="text-2xl font-semibold">
              {loading || error
                ? "—"
                : `${webToApp?.trials ?? 0} / ${webToApp?.subscriptions ?? 0}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading || error
                ? "—"
                : `${formatAdminRate(webToApp?.web_signup_to_trial_rate ?? 0)} trial · ${formatAdminRate(webToApp?.web_signup_to_paid_rate ?? 0)} paid`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["windows", webToApp?.by_platform?.windows],
              ["macos", webToApp?.by_platform?.macos],
              ["ios", webToApp?.by_platform?.ios],
              ["android", webToApp?.by_platform?.android],
            ] as const
          ).map(([platform, count]) => (
            <div
              key={platform}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="text-sm capitalize text-muted-foreground">
                {platform} app users
              </p>
              <p className="text-2xl font-semibold">
                {loading || error ? "—" : (count ?? 0)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
