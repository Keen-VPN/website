import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCreatePromoTrialQr,
  adminListPromoTrialQr,
  adminUpdatePromoTrialQr,
  type AdminPromoTrialQr,
} from "@/auth/backend";
import { promoTrialQrImageUrl } from "@/lib/promotional-trial-qr";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function AdminPromotionalTrialQr() {
  const [items, setItems] = useState<AdminPromoTrialQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const loadSequence = useRef(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [trialDays, setTrialDays] = useState("7");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);

  const daysNum = Number(trialDays);
  const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 90;

  const load = useCallback(async () => {
    const requestId = ++loadSequence.current;
    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);

    const result = await adminListPromoTrialQr();
    if (requestId !== loadSequence.current) return;

    if (result.ok) {
      setItems(result.data ?? []);
      setError(null);
    } else {
      setError(result.error ?? "Failed to load");
    }
    hasLoaded.current = true;
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      loadSequence.current += 1;
      if (copiedTimeoutRef.current != null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, [load]);

  async function handleCreate() {
    if (!name.trim() || !daysValid) return;
    setSaving(true);
    const result = await adminCreatePromoTrialQr({
      name: name.trim(),
      trialDays: daysNum,
    });
    setSaving(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Failed to create");
      return;
    }
    setCreateOpen(false);
    setName("");
    setTrialDays("7");
    setItems((prev) => [result.data!, ...prev]);
  }

  async function toggleActive(item: AdminPromoTrialQr) {
    setUpdatingId(item.id);
    const result = await adminUpdatePromoTrialQr(item.id, {
      isActive: !item.isActive,
    });
    setUpdatingId(null);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Failed to update");
      return;
    }
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? result.data! : row)),
    );
  }

  function handleCopy(item: AdminPromoTrialQr) {
    void copyText(item.landingUrl).then((ok) => {
      if (copiedTimeoutRef.current != null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      if (ok) {
        setCopyErrorId(null);
        setCopiedId(item.id);
        copiedTimeoutRef.current = window.setTimeout(
          () => setCopiedId(null),
          1500,
        );
        return;
      }
      setCopiedId(null);
      setCopyErrorId(item.id);
      copiedTimeoutRef.current = window.setTimeout(
        () => setCopyErrorId(null),
        2500,
      );
    });
  }

  const totals = items.reduce(
    (acc, item) => {
      acc.scans += item.scanCount;
      acc.redemptions += item.redemptionCount;
      acc.paid += item.paidConversionCount;
      if (item.isActive) acc.active += 1;
      return acc;
    },
    { scans: 0, redemptions: 0, paid: 0, active: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Promotional trial QR codes
          </h2>
          <p className="text-sm text-muted-foreground">
            Cardless free-trial QR codes for events and in-person marketing (
            <code className="text-xs">utm_source=promo_qr</code>). Claiming a
            promo trial counts as the user&apos;s one free period. See also{" "}
            <Link
              to="/admin/sticker-campaigns"
              className="text-primary underline-offset-4 hover:underline"
            >
              sticker campaigns
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading || refreshing}
            onClick={() => void load()}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create QR code
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-lg font-medium">Campaign links & QR codes</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No promotional QR codes yet. Create one for an event or flyer.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => {
              const qrUrl = promoTrialQrImageUrl(item.landingUrl);
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <img
                      src={qrUrl}
                      alt={`QR code for ${item.name}`}
                      className="h-32 w-32 shrink-0 rounded-md border border-border bg-white p-2"
                      width={128}
                      height={128}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.trialDays}-day trial ·{" "}
                          <span
                            className={
                              item.isActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : undefined
                            }
                          >
                            {item.isActive ? "Active" : "Disabled"}
                          </span>
                          {" · "}
                          created {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          code={item.code}
                        </p>
                      </div>
                      <p className="break-all rounded-md bg-muted/50 p-2 font-mono text-xs">
                        {item.landingUrl}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scans {item.scanCount} · Redemptions{" "}
                        {item.redemptionCount} · Paid {item.paidConversionCount}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(item)}
                        >
                          {copiedId === item.id
                            ? "Copied"
                            : copyErrorId === item.id
                              ? "Copy failed"
                              : "Copy URL"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a
                            href={item.landingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                        </Button>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a
                            href={qrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open QR
                          </a>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={item.isActive ? "destructive" : "default"}
                          disabled={updatingId === item.id}
                          onClick={() => void toggleActive(item)}
                        >
                          {updatingId === item.id
                            ? "Saving…"
                            : item.isActive
                              ? "Disable"
                              : "Enable"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Promo trial conversions</h3>
          <p className="text-sm text-muted-foreground">
            QR scans are recorded on landing; redemptions are cardless trial
            grants; paid counts subsequent paid conversions attributed to these
            codes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Active codes</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : totals.active}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Scans</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : totals.scans}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Redemptions</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : totals.redemptions}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-semibold">
              {loading || error ? "—" : totals.paid}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Campaign</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Trial days</th>
                <th className="p-3 text-right">Scans</th>
                <th className="p-3 text-right">Redemptions</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && !error && items.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={7}>
                    No promotional QR activity yet.
                  </td>
                </tr>
              ) : null}
              {!loading && !error
                ? items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.code}
                        </div>
                      </td>
                      <td className="p-3">
                        {item.isActive ? "Active" : "Disabled"}
                      </td>
                      <td className="p-3 text-right">{item.trialDays}</td>
                      <td className="p-3 text-right">{item.scanCount}</td>
                      <td className="p-3 text-right">{item.redemptionCount}</td>
                      <td className="p-3 text-right">
                        {item.paidConversionCount}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create promotional trial QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="promo-qr-name">Campaign name</Label>
              <Input
                id="promo-qr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NYC Meetup Booth"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-qr-days">Trial duration (days)</Label>
              <Input
                id="promo-qr-days"
                type="number"
                min={1}
                max={90}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Between 1 and 90 days. Locked after creation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !name.trim() || !daysValid}
              onClick={() => void handleCreate()}
            >
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
