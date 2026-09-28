import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminFetchDownloadClickUsers,
  adminFetchDownloadFunnelReport,
  adminFetchDownloadsByOs,
  adminFetchWebToAppUsers,
  type AdminDownloadClickRow,
  type AdminDownloadClickUsersReport,
  type AdminDownloadFunnelReport,
  type AdminDownloadFunnelUserRow,
  type AdminDownloadsByOsKey,
  type AdminDownloadsByOsReport,
  type AdminWebToAppFunnelRow,
  type AdminWebToAppUsersReport,
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

type DrilldownKind = "download_click" | "web_to_app";

type DrilldownSelection =
  | {
      kind: "download_click";
      row: AdminDownloadClickRow;
    }
  | {
      kind: "web_to_app";
      row: AdminWebToAppFunnelRow;
    };

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function UserDrilldownPanel({
  title,
  subtitle,
  loading,
  error,
  summary,
  users,
  emptyMessage,
  onClose,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  summary?: string | null;
  users: AdminDownloadFunnelUserRow[];
  emptyMessage: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {summary ? (
            <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Used app</th>
              <th className="p-3 font-medium">Trial</th>
              <th className="p-3 font-medium">Paid</th>
              <th className="p-3 font-medium">Profile</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : !error && users.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr
                  key={`${user.user_id ?? "anon"}-${user.clicked_at ?? user.signed_up_at ?? index}`}
                  className="border-b border-border/60"
                >
                  <td className="p-3">
                    {user.email ?? user.contact_email ?? "—"}
                  </td>
                  <td className="p-3">
                    {formatWhen(user.clicked_at ?? user.signed_up_at)}
                  </td>
                  <td className="p-3">{user.later_app_used ? "Yes" : "No"}</td>
                  <td className="p-3">{user.trial_started ? "Yes" : "No"}</td>
                  <td className="p-3">
                    {user.subscription_started ? "Yes" : "No"}
                  </td>
                  <td className="p-3">
                    {user.user_id ? (
                      <Link
                        to={`/admin/users/${user.user_id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    ) : (
                      "—"
                    )}
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

export default function AdminDownloadFunnel() {
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [report, setReport] = useState<AdminDownloadFunnelReport | null>(null);
  const [downloadsByOs, setDownloadsByOs] =
    useState<AdminDownloadsByOsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [byOsError, setByOsError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const [selection, setSelection] = useState<DrilldownSelection | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const [clickUsers, setClickUsers] =
    useState<AdminDownloadClickUsersReport | null>(null);
  const [webUsers, setWebUsers] = useState<AdminWebToAppUsersReport | null>(
    null,
  );
  const drilldownRequest = useRef<AbortController | null>(null);

  const closeDrilldown = useCallback(() => {
    drilldownRequest.current?.abort();
    drilldownRequest.current = null;
    setSelection(null);
    setClickUsers(null);
    setWebUsers(null);
    setDrilldownError(null);
    setDrilldownLoading(false);
  }, []);

  const load = useCallback(async (from: string, to: string) => {
    if (!from.trim() || !to.trim()) {
      activeRequest.current?.abort();
      activeRequest.current = null;
      drilldownRequest.current?.abort();
      drilldownRequest.current = null;
      setReport(null);
      setDownloadsByOs(null);
      setError(null);
      setByOsError(null);
      setSelection(null);
      setClickUsers(null);
      setWebUsers(null);
      setDrilldownError(null);
      setDrilldownLoading(false);
      setLoading(false);
      return;
    }

    if (!isAdminReportDateRangeValid(from, to)) {
      activeRequest.current?.abort();
      activeRequest.current = null;
      drilldownRequest.current?.abort();
      drilldownRequest.current = null;
      setReport(null);
      setDownloadsByOs(null);
      setError("From date must be on or before To date.");
      setByOsError(null);
      setSelection(null);
      setClickUsers(null);
      setWebUsers(null);
      setDrilldownError(null);
      setDrilldownLoading(false);
      setLoading(false);
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    drilldownRequest.current?.abort();
    drilldownRequest.current = null;

    setLoading(true);
    setError(null);
    setByOsError(null);
    setSelection(null);
    setClickUsers(null);
    setWebUsers(null);
    setDrilldownError(null);
    setDrilldownLoading(false);

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
      setByOsError(null);
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    const funnelData = funnelResponse.data;
    if (!Array.isArray(funnelData.web_to_app.rows)) {
      funnelData.web_to_app.rows = [];
    }
    for (const row of funnelData.downloads.rows) {
      row.identified_clicks = row.identified_clicks ?? 0;
      row.identified_users = row.identified_users ?? 0;
    }

    setReport(funnelData);
    if (byOsResponse.ok && byOsResponse.data) {
      setDownloadsByOs(byOsResponse.data);
      setByOsError(null);
    } else {
      setDownloadsByOs(null);
      setByOsError(byOsResponse.error ?? "Failed to load downloads by OS");
    }
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(fromInput, toInput);
    return () => activeRequest.current?.abort();
  }, [load, fromInput, toInput]);

  const openDrilldown = useCallback(
    async (next: DrilldownSelection) => {
      setSelection(next);
      setDrilldownError(null);
      setClickUsers(null);
      setWebUsers(null);
      drilldownRequest.current?.abort();
      const controller = new AbortController();
      drilldownRequest.current = controller;
      setDrilldownLoading(true);

      const range = {
        from: `${fromInput}T00:00:00.000Z`,
        to: `${toInput}T00:00:00.000Z`,
        signal: controller.signal,
      };

      if (next.kind === "download_click") {
        const response = await adminFetchDownloadClickUsers({
          ...range,
          platform: next.row.platform,
          utm_source: next.row.utm_source,
          utm_medium: next.row.utm_medium,
          utm_campaign: next.row.utm_campaign,
        });
        if (controller.signal.aborted || drilldownRequest.current !== controller) {
          return;
        }
        if (!response.ok || !response.data) {
          setDrilldownError(
            response.error ?? "Failed to load download click users",
          );
          setDrilldownLoading(false);
          return;
        }
        setClickUsers(response.data);
        setDrilldownLoading(false);
        return;
      }

      const response = await adminFetchWebToAppUsers({
        ...range,
        utm_source: next.row.utm_source,
        utm_medium: next.row.utm_medium,
        utm_campaign: next.row.utm_campaign,
      });
      if (controller.signal.aborted || drilldownRequest.current !== controller) {
        return;
      }
      if (!response.ok || !response.data) {
        setDrilldownError(response.error ?? "Failed to load web-to-app users");
        setDrilldownLoading(false);
        return;
      }
      setWebUsers(response.data);
      setDrilldownLoading(false);
    },
    [fromInput, toInput],
  );

  useEffect(() => {
    return () => drilldownRequest.current?.abort();
  }, []);

  const showData = !loading && !error && report != null;
  const downloads = showData ? report.downloads : null;
  const webToApp = showData ? report.web_to_app : null;
  const confirmed =
    showData && !byOsError && downloadsByOs != null ? downloadsByOs : null;
  const platformEntries = Object.entries(downloads?.by_platform ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  const drilldownKind: DrilldownKind | null = selection?.kind ?? null;
  const drilldownUsers =
    drilldownKind === "download_click"
      ? (clickUsers?.rows ?? [])
      : drilldownKind === "web_to_app"
        ? (webUsers?.rows ?? [])
        : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Download funnel
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirmed downloads use first app open installs. Website store CTA
          clicks are download intent only — click a row to see identified users
          who signed up / used the app. Web → app usage includes a UTM breakdown.
          See also{" "}
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
            install open), not website CTA clicks. These installs are anonymous
            and cannot be linked to accounts yet.
          </p>
        </div>
        {byOsError ? (
          <p className="text-sm text-destructive">{byOsError}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">
              {loading || error || byOsError ? "—" : (confirmed?.total ?? 0)}
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
                  {loading || error || byOsError ? "—" : (row?.count ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading || error || byOsError
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
            Store button clicks on the website — not confirmed installs. Click a
            row to see which logged-in users clicked and whether they later used
            an app.
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
                <th className="p-3 font-medium text-right">Identified</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    Report unavailable.
                  </td>
                </tr>
              ) : (downloads?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No download clicks in this range.
                  </td>
                </tr>
              ) : (
                downloads?.rows.map((row) => {
                  const selected =
                    selection?.kind === "download_click" &&
                    selection.row.platform === row.platform &&
                    selection.row.utm_source === row.utm_source &&
                    selection.row.utm_medium === row.utm_medium &&
                    selection.row.utm_campaign === row.utm_campaign;
                  const open = () =>
                    void openDrilldown({ kind: "download_click", row });
                  return (
                    <tr
                      key={JSON.stringify([
                        row.platform,
                        row.utm_source,
                        row.utm_medium,
                        row.utm_campaign,
                      ])}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      aria-label={`Open users for ${row.platform} download clicks, ${row.utm_source} ${row.utm_medium} ${row.utm_campaign}`}
                      className={`border-b border-border/60 cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected ? "bg-muted/40" : ""
                      }`}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open();
                        }
                      }}
                    >
                      <td className="p-3 capitalize text-primary underline-offset-4">
                        {row.platform}
                      </td>
                      <td className="p-3">{row.utm_source}</td>
                      <td className="p-3">{row.utm_medium}</td>
                      <td className="p-3">{row.utm_campaign}</td>
                      <td className="p-3 text-right">{row.clicks}</td>
                      <td className="p-3 text-right">
                        {row.identified_users}/{row.identified_clicks}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selection?.kind === "download_click" ? (
          <UserDrilldownPanel
            title="Download CTA → users"
            subtitle={`${selection.row.platform} · ${selection.row.utm_source} / ${selection.row.utm_medium} / ${selection.row.utm_campaign}`}
            summary={
              clickUsers
                ? `${clickUsers.identified_clicks} identified · ${clickUsers.anonymous_clicks} anonymous (link after signup in same browser)`
                : null
            }
            loading={drilldownLoading}
            error={drilldownError}
            users={drilldownUsers}
            emptyMessage="No identified users for this row yet. Anonymous clicks link after signup when the same browser still has the download client id."
            onClose={closeDrilldown}
          />
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Web signup → app usage</h3>
        <p className="text-sm text-muted-foreground">
          Cohort is web <code className="text-xs">user_account_created</code>{" "}
          in the date window. App usage is later native{" "}
          <code className="text-xs">app_authenticated</code> (preferred) or{" "}
          <code className="text-xs">connection_sessions</code>. Click a UTM row
          to open the users.
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

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">UTM source</th>
                <th className="p-3 font-medium">Medium</th>
                <th className="p-3 font-medium">Campaign</th>
                <th className="p-3 font-medium text-right">Sign-ups</th>
                <th className="p-3 font-medium text-right">Used app</th>
                <th className="p-3 font-medium text-right">Never app</th>
                <th className="p-3 font-medium text-right">Trials</th>
                <th className="p-3 font-medium text-right">Paid</th>
                <th className="p-3 font-medium text-right">App rate</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={9}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={9}>
                    Report unavailable.
                  </td>
                </tr>
              ) : (webToApp?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={9}>
                    No web sign-ups in this range.
                  </td>
                </tr>
              ) : (
                webToApp?.rows.map((row) => {
                  const selected =
                    selection?.kind === "web_to_app" &&
                    selection.row.utm_source === row.utm_source &&
                    selection.row.utm_medium === row.utm_medium &&
                    selection.row.utm_campaign === row.utm_campaign;
                  const open = () =>
                    void openDrilldown({ kind: "web_to_app", row });
                  return (
                    <tr
                      key={JSON.stringify([
                        row.utm_source,
                        row.utm_medium,
                        row.utm_campaign,
                      ])}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      aria-label={`Open users for web signups ${row.utm_source} ${row.utm_medium} ${row.utm_campaign}`}
                      className={`border-b border-border/60 cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected ? "bg-muted/40" : ""
                      }`}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open();
                        }
                      }}
                    >
                      <td className="p-3 text-primary underline-offset-4">
                        {row.utm_source}
                      </td>
                      <td className="p-3">{row.utm_medium}</td>
                      <td className="p-3">{row.utm_campaign}</td>
                      <td className="p-3 text-right">{row.web_signups}</td>
                      <td className="p-3 text-right">
                        {row.later_app_authenticated}
                      </td>
                      <td className="p-3 text-right">{row.never_used_app}</td>
                      <td className="p-3 text-right">{row.trials}</td>
                      <td className="p-3 text-right">{row.subscriptions}</td>
                      <td className="p-3 text-right">
                        {formatAdminRate(row.web_signup_to_app_rate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selection?.kind === "web_to_app" ? (
          <UserDrilldownPanel
            title="Web signup → app users"
            subtitle={`${selection.row.utm_source} / ${selection.row.utm_medium} / ${selection.row.utm_campaign}`}
            loading={drilldownLoading}
            error={drilldownError}
            users={drilldownUsers}
            emptyMessage="No users matched for this row in this range yet."
            onClose={closeDrilldown}
          />
        ) : null}
      </section>
    </div>
  );
}
