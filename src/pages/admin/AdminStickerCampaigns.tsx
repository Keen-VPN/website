import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminFetchStickerFunnelReport,
  type AdminStickerFunnelReport,
} from "@/auth/backend";
import {
  STICKER_CAMPAIGN_TEMPLATES,
  buildStickerUrlFromTemplate,
  stickerQrCodeImageUrl,
} from "@/lib/sticker-campaigns";
import {
  defaultAdminReportFromValue,
  defaultAdminReportToValue,
  formatAdminRate,
  formatAdminRevenue,
} from "@/lib/admin-utils";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function AdminStickerCampaigns() {
  const [fromInput, setFromInput] = useState(defaultAdminReportFromValue);
  const [toInput, setToInput] = useState(defaultAdminReportToValue);
  const [funnelReport, setFunnelReport] =
    useState<AdminStickerFunnelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!from.trim() || !to.trim()) {
      setFunnelReport(null);
      setError(null);
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

    const funnelRes = await adminFetchStickerFunnelReport({
      from: fromIso,
      to: toIso,
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (!funnelRes.ok || !funnelRes.data) {
      setFunnelReport(null);
      setError(funnelRes.error ?? "Failed to load sticker funnel report");
      setLoading(false);
      activeRequest.current = null;
      return;
    }

    setFunnelReport(funnelRes.data);
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(fromInput, toInput);
    return () => {
      activeRequest.current?.abort();
      if (copiedTimeoutRef.current != null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, [load, fromInput, toInput]);

  const totals = funnelReport?.totals;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Sticker campaigns
        </h2>
        <p className="text-sm text-muted-foreground">
          Physical sticker URLs, QR codes, and conversion tracking (
          <code className="text-xs">utm_source=sticker</code>). See also{" "}
          <Link
            to="/admin/utm-attribution"
            className="text-primary underline-offset-4 hover:underline"
          >
            all UTM attribution
          </Link>
          .
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-medium">Campaign links & QR codes</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {STICKER_CAMPAIGN_TEMPLATES.map((template) => {
            const url = buildStickerUrlFromTemplate(template);
            const qrUrl = stickerQrCodeImageUrl(url);
            return (
              <div
                key={template.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <img
                    src={qrUrl}
                    alt={`QR code for ${template.label}`}
                    className="h-32 w-32 shrink-0 rounded-md border border-border bg-white p-2"
                    width={128}
                    height={128}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-medium">{template.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {template.kind} · utm_content={template.content}
                      </p>
                      {template.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="break-all rounded-md bg-muted/50 p-2 font-mono text-xs">
                      {url}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void copyText(url).then((ok) => {
                            if (copiedTimeoutRef.current != null) {
                              window.clearTimeout(copiedTimeoutRef.current);
                            }
                            if (ok) {
                              setCopyErrorId(null);
                              setCopiedId(template.id);
                              copiedTimeoutRef.current = window.setTimeout(
                                () => setCopiedId(null),
                                1500,
                              );
                              return;
                            }
                            setCopiedId(null);
                            setCopyErrorId(template.id);
                            copiedTimeoutRef.current = window.setTimeout(
                              () => setCopyErrorId(null),
                              2500,
                            );
                          });
                        }}
                      >
                        {copiedId === template.id
                          ? "Copied"
                          : copyErrorId === template.id
                            ? "Copy failed"
                            : "Copy URL"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      </Button>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                          Open QR
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Sticker conversions</h3>
          <p className="text-sm text-muted-foreground">
            QR scans are recorded as sticker landings; sign-up and subscription
            events use the same first-touch UTMs through checkout.
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sticker landings</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (totals?.sticker_landings ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sign-up started</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (totals?.signup_started ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sign-ups</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (totals?.signups_completed ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Trials</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (totals?.trials ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : (totals?.subscriptions ?? 0)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Attributed revenue</p>
          <p className="text-3xl font-semibold">
            {loading || error ? "—" : formatAdminRevenue(totals?.revenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Landing → sign-up started:{" "}
            {loading || error
              ? "—"
              : formatAdminRate(totals?.landing_to_signup_started_rate ?? 0)}
          </p>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Campaign</th>
                <th className="p-3">Content</th>
                <th className="p-3">Medium</th>
                <th className="p-3 text-right">Landings</th>
                <th className="p-3 text-right">Started</th>
                <th className="p-3 text-right">Sign-ups</th>
                <th className="p-3 text-right">Trials</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">Landing → start</th>
                <th className="p-3 text-right">Start → sign-up</th>
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
                    No sticker activity in this range.
                  </td>
                </tr>
              ) : null}
              {!loading && !error
                ? (funnelReport?.rows ?? []).map((row, index) => (
                    <tr
                      key={`${index}\u0000${row.utm_campaign}\u0000${row.utm_content}`}
                      className="border-t border-border"
                    >
                      <td className="p-3">{row.utm_campaign}</td>
                      <td className="p-3">{row.utm_content}</td>
                      <td className="p-3">{row.utm_medium}</td>
                      <td className="p-3 text-right">{row.sticker_landings}</td>
                      <td className="p-3 text-right">{row.signup_started}</td>
                      <td className="p-3 text-right">{row.signups_completed}</td>
                      <td className="p-3 text-right">{row.trials}</td>
                      <td className="p-3 text-right">{row.subscriptions}</td>
                      <td className="p-3 text-right">
                        {formatAdminRevenue(row.revenue)}
                      </td>
                      <td className="p-3 text-right">
                        {formatAdminRate(row.landing_to_signup_started_rate)}
                      </td>
                      <td className="p-3 text-right">
                        {formatAdminRate(row.signup_to_completed_rate)}
                      </td>
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
