import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminFetchIpAddressClickSummary,
  type AdminIpAddressClickSummary,
} from "@/auth/backend";

function BreakdownList({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: { label: string; count: number }[];
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-mono tabular-nums">{row.count}</span>
          </div>
        ))}
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded.</p>
        ) : null}
      </div>
    </div>
  );
}

function formatDateRange(summary: AdminIpAddressClickSummary | null) {
  if (!summary) return "Last 90 days";
  const from = new Date(summary.from);
  const to = new Date(summary.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return "Last 90 days";
  }
  return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
}

function dateInputToIsoStart(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function dateInputToIsoExclusiveEnd(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export default function AdminProductEvents() {
  const [summary, setSummary] = useState<AdminIpAddressClickSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (fromValue: string, toValue: string) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);
    if (fromValue && toValue && fromValue > toValue) {
      setSummary(null);
      setError("Start date must be before end date");
      setLoading(false);
      activeRequest.current = null;
      return;
    }
    const res = await adminFetchIpAddressClickSummary({
      from: dateInputToIsoStart(fromValue),
      to: dateInputToIsoExclusiveEnd(toValue),
      signal: controller.signal,
    });
    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }
    if (!res.ok || !res.data) {
      setSummary(null);
      setError(res.error ?? "Failed to load product events");
      setLoading(false);
      activeRequest.current = null;
      return;
    }
    setSummary(res.data);
    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load("", "");
    return () => activeRequest.current?.abort();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Product events</h2>
        <button
          type="button"
          onClick={() => void load(fromInput, toInput)}
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

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">From</span>
          <input
            type="date"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">To</span>
          <input
            type="date"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void load(fromInput, toInput)}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => {
            setFromInput("");
            setToInput("");
            void load("", "");
          }}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Clear
        </button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">IP address link clicks</p>
        <p className="mt-1 text-3xl font-semibold">
          {summary?.total ?? (loading ? "…" : 0)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatDateRange(summary)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList
          title="By platform"
          rows={summary?.byPlatform ?? []}
          loading={loading}
        />
        <BreakdownList
          title="By connection status"
          rows={summary?.byConnectionStatus ?? []}
          loading={loading}
        />
        <BreakdownList
          title="Top server locations"
          rows={summary?.topServerLocations ?? []}
          loading={loading}
        />
      </div>
    </div>
  );
}
