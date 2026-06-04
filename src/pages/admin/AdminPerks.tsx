import { useCallback, useEffect, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCreatePerk,
  adminDeletePerk,
  adminFetchPerksMetrics,
  adminListPerks,
  adminUpdatePerk,
  type AdminPerk,
  type AdminPerksMetrics,
  type CreateAdminPerkPayload,
  type PerkCategory,
  type PerkRedemptionType,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const PERK_CATEGORIES: { value: PerkCategory; label: string }[] = [
  { value: "privacy_security", label: "Privacy & Security" },
  { value: "ai_productivity", label: "AI & Productivity" },
  { value: "developer_tools", label: "Developer Tools" },
  { value: "startup_growth", label: "Startup & Growth" },
  { value: "remote_work", label: "Remote Work" },
];

const REDEMPTION_TYPES: { value: PerkRedemptionType; label: string }[] = [
  { value: "external_link", label: "External link" },
  { value: "coupon_code", label: "Coupon code" },
  { value: "invite_only", label: "Invite only" },
];

const ACCESS_LEVELS = [
  { value: "free", label: "All members" },
  { value: "paid", label: "Paid members" },
  { value: "annual", label: "Annual members" },
] as const;

interface PerkFormState {
  id: string;
  title: string;
  partnerName: string;
  category: PerkCategory;
  description: string;
  imageUrl: string;
  offerText: string;
  redemptionType: PerkRedemptionType;
  redemptionUrl: string;
  couponCode: string;
  accessLevel: "free" | "paid" | "annual";
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
}

const emptyForm = (): PerkFormState => ({
  id: "",
  title: "",
  partnerName: "",
  category: "privacy_security",
  description: "",
  imageUrl: "",
  offerText: "",
  redemptionType: "external_link",
  redemptionUrl: "",
  couponCode: "",
  accessLevel: "paid",
  isFeatured: false,
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
});

function perkToForm(perk: AdminPerk): PerkFormState {
  return {
    id: perk.id,
    title: perk.title,
    partnerName: perk.partnerName ?? "",
    category: perk.category,
    description: perk.description,
    imageUrl: perk.imageUrl ?? "",
    offerText: perk.offerText,
    redemptionType: perk.redemptionType,
    redemptionUrl: perk.redemptionUrl ?? "",
    couponCode: perk.couponCode ?? "",
    accessLevel: perk.accessLevel,
    isFeatured: perk.isFeatured,
    isActive: perk.isActive,
    sortOrder: String(perk.sortOrder),
    startsAt: perk.startsAt ? perk.startsAt.slice(0, 10) : "",
    endsAt: perk.endsAt ? perk.endsAt.slice(0, 10) : "",
  };
}

function parseSortOrder(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function optionalIsoDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
}

function formToCreatePayload(form: PerkFormState): CreateAdminPerkPayload {
  return {
    id: form.id.trim(),
    title: form.title.trim(),
    partnerName: form.partnerName.trim() || undefined,
    category: form.category,
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim() || undefined,
    offerText: form.offerText.trim(),
    redemptionType: form.redemptionType,
    redemptionUrl: form.redemptionUrl.trim() || undefined,
    couponCode: form.couponCode.trim() || undefined,
    accessLevel: form.accessLevel,
    isFeatured: form.isFeatured,
    isActive: form.isActive,
    sortOrder: parseSortOrder(form.sortOrder),
    startsAt: optionalIsoDate(form.startsAt),
    endsAt: optionalIsoDate(form.endsAt),
  };
}

function categoryLabel(category: PerkCategory): string {
  return PERK_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatDateRange(from?: string, to?: string) {
  if (!from || !to) return "Last 90 days";
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Last 90 days";
  }
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
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

export default function AdminPerks() {
  const { can } = useAdminAuth();
  const canWrite = can("subscriptions.write");

  const [perks, setPerks] = useState<AdminPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PerkFormState>(emptyForm());
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [metrics, setMetrics] = useState<AdminPerksMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const metricsRequest = useRef<AbortController | null>(null);

  const loadMetrics = useCallback(async (fromValue: string, toValue: string) => {
    metricsRequest.current?.abort();
    const controller = new AbortController();
    metricsRequest.current = controller;

    setLoadingMetrics(true);
    setMetricsError(null);
    if (fromValue && toValue && fromValue > toValue) {
      setMetrics(null);
      setMetricsError("Start date must be before end date");
      setLoadingMetrics(false);
      metricsRequest.current = null;
      return;
    }

    const res = await adminFetchPerksMetrics({
      from: dateInputToIsoStart(fromValue),
      to: dateInputToIsoExclusiveEnd(toValue),
      signal: controller.signal,
    });

    if (controller.signal.aborted || metricsRequest.current !== controller) {
      return;
    }

    if (!res.ok || !res.data) {
      setMetrics(null);
      setMetricsError(res.error ?? "Failed to load perk metrics");
    } else {
      setMetrics(res.data);
    }
    setLoadingMetrics(false);
    metricsRequest.current = null;
  }, []);

  const loadPerks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListPerks({ includeInactive: showInactive });
    if (!res.ok) {
      setPerks([]);
      setError(res.error ?? "Failed to load perks");
    } else {
      setPerks(res.data ?? []);
    }
    setLoading(false);
  }, [showInactive]);

  useEffect(() => {
    void loadPerks();
  }, [loadPerks]);

  useEffect(() => {
    void loadMetrics("", "");
    return () => metricsRequest.current?.abort();
  }, [loadMetrics]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (perk: AdminPerk) => {
    setEditingId(perk.id);
    setForm(perkToForm(perk));
    setDialogError(null);
    setDialogOpen(true);
  };

  const toggleActive = async (perk: AdminPerk, isActive: boolean) => {
    const res = await adminUpdatePerk(perk.id, { isActive });
    if (!res.ok) {
      setError(res.error ?? "Failed to update perk");
      return;
    }
    void loadPerks();
  };

  const toggleFeatured = async (perk: AdminPerk, isFeatured: boolean) => {
    const res = await adminUpdatePerk(perk.id, { isFeatured });
    if (!res.ok) {
      setError(res.error ?? "Failed to update perk");
      return;
    }
    void loadPerks();
  };

  const deletePerk = async (perk: AdminPerk) => {
    if (
      !window.confirm(
        `Remove "${perk.title}"? Perks with redemption history will be deactivated instead of permanently deleted.`,
      )
    ) {
      return;
    }
    const res = await adminDeletePerk(perk.id);
    if (!res.ok) {
      setError(res.error ?? "Failed to delete perk");
      return;
    }
    if (res.softDeleted && res.message) {
      setError(null);
      window.alert(res.message);
    }
    void loadPerks();
  };

  const validateFormDates = (): string | null => {
    if (form.startsAt.trim() && form.endsAt.trim() && form.startsAt > form.endsAt) {
      return "Start date must be before end date.";
    }
    return null;
  };

  const savePerk = async () => {
    setSaving(true);
    setDialogError(null);

    const dateError = validateFormDates();
    if (dateError) {
      setSaving(false);
      setDialogError(dateError);
      return;
    }

    if (editingId) {
      const res = await adminUpdatePerk(editingId, {
        title: form.title.trim(),
        partnerName: form.partnerName.trim() || null,
        category: form.category,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || null,
        offerText: form.offerText.trim(),
        redemptionType: form.redemptionType,
        redemptionUrl: form.redemptionUrl.trim() || null,
        couponCode: form.couponCode.trim() || null,
        accessLevel: form.accessLevel,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        sortOrder: parseSortOrder(form.sortOrder),
        startsAt: form.startsAt.trim()
          ? optionalIsoDate(form.startsAt) ?? null
          : null,
        endsAt: form.endsAt.trim()
          ? optionalIsoDate(form.endsAt) ?? null
          : null,
      });
      setSaving(false);
      if (!res.ok) {
        setDialogError(res.error ?? "Failed to update perk");
        return;
      }
    } else {
      if (!form.id.trim() || !form.title.trim()) {
        setSaving(false);
        setDialogError("ID and title are required.");
        return;
      }
      const res = await adminCreatePerk(formToCreatePayload(form));
      setSaving(false);
      if (!res.ok) {
        setDialogError(res.error ?? "Failed to create perk");
        return;
      }
    }

    setDialogOpen(false);
    void loadPerks();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Perks &amp; Benefits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage partner offers shown on the member perks page. Requires{" "}
          <code className="text-xs">FF_PERKS_ENABLED=true</code> for members to
          see them.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Engagement</h3>
            <p className="text-sm text-muted-foreground">
              {formatDateRange(metrics?.from, metrics?.to)}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="metrics-from" className="text-xs">
                From
              </Label>
              <Input
                id="metrics-from"
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
            <div>
              <Label htmlFor="metrics-to" className="text-xs">
                To
              </Label>
              <Input
                id="metrics-to"
                type="date"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadMetrics(fromInput, toInput)}
            >
              Apply
            </Button>
          </div>
        </div>

        {metricsError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {metricsError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Page views</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.pageViews ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Clicks</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.clicks ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Redemptions</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.redemptions ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Click → claim rate</p>
            <p className="mt-1 text-3xl font-semibold">
              {loadingMetrics ? "…" : formatPercent(metrics?.claimRate)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Perk</th>
                <th className="px-3 py-2 font-medium">Card views</th>
                <th className="px-3 py-2 font-medium">Clicks</th>
                <th className="px-3 py-2 font-medium">Claims</th>
                <th className="px-3 py-2 font-medium">Redemptions</th>
                <th className="px-3 py-2 font-medium">Click rate</th>
              </tr>
            </thead>
            <tbody>
              {loadingMetrics ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    Loading metrics…
                  </td>
                </tr>
              ) : (metrics?.byPerk.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    No perk interactions in this window.
                  </td>
                </tr>
              ) : (
                metrics?.byPerk.map((row) => (
                  <tr key={row.perkId} className="border-b border-border/60">
                    <td className="px-3 py-2 font-medium">{row.title}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {row.viewed}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {row.clicked}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {row.claimed}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {row.redemptions}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {formatPercent(row.clickRate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Perks catalog</h3>
            <div className="flex items-center gap-2">
              <Switch
                id="admin-perks-show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label
                htmlFor="admin-perks-show-inactive"
                className="text-sm font-normal text-muted-foreground"
              >
                Show inactive
              </Label>
            </div>
          </div>
          {canWrite ? (
            <Button type="button" variant="outline" onClick={openCreate}>
              Add perk
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Perk</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Access</th>
                <th className="px-3 py-2 font-medium">Redemption</th>
                <th className="px-3 py-2 font-medium">Featured</th>
                <th className="px-3 py-2 font-medium">Active</th>
                {canWrite ? (
                  <th className="px-3 py-2 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canWrite ? 7 : 6}
                    className="px-3 py-4 text-muted-foreground"
                  >
                    Loading perks…
                  </td>
                </tr>
              ) : perks.length === 0 ? (
                <tr>
                  <td
                    colSpan={canWrite ? 7 : 6}
                    className="px-3 py-4 text-muted-foreground"
                  >
                    No perks configured.
                  </td>
                </tr>
              ) : (
                perks.map((perk) => (
                  <tr key={perk.id} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      <div className="font-medium">{perk.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {perk.partnerName ?? perk.id}
                      </div>
                      <div className="mt-0.5 text-xs text-primary">
                        {perk.offerText}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {categoryLabel(perk.category)}
                    </td>
                    <td className="px-3 py-2 capitalize">{perk.accessLevel}</td>
                    <td className="px-3 py-2">
                      {perk.redemptionType.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2">
                      <Switch
                        checked={perk.isFeatured}
                        disabled={!canWrite}
                        onCheckedChange={(checked) =>
                          void toggleFeatured(perk, checked)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Switch
                        checked={perk.isActive}
                        disabled={!canWrite}
                        onCheckedChange={(checked) =>
                          void toggleActive(perk, checked)
                        }
                      />
                    </td>
                    {canWrite ? (
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(perk)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void deletePerk(perk)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogError(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit perk" : "New perk"}
            </DialogTitle>
          </DialogHeader>
          {dialogError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {dialogError}
            </div>
          ) : null}
          <div className="space-y-3">
            {!editingId ? (
              <div>
                <Label htmlFor="perk-id">Perk ID</Label>
                <Input
                  id="perk-id"
                  value={form.id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, id: e.target.value }))
                  }
                  placeholder="perk_1password"
                  className="mt-1"
                />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="perk-title">Title</Label>
                <Input
                  id="perk-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="perk-partner">Partner name</Label>
                <Input
                  id="perk-partner"
                  value={form.partnerName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      partnerName: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      category: value as PerkCategory,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Access level</Label>
                <Select
                  value={form.accessLevel}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      accessLevel: value as PerkFormState["accessLevel"],
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="perk-offer">Offer text</Label>
              <Input
                id="perk-offer"
                value={form.offerText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, offerText: e.target.value }))
                }
                placeholder="50% off your first year"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="perk-description">Description</Label>
              <Textarea
                id="perk-description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="perk-image">Image URL</Label>
              <Input
                id="perk-image"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                placeholder="https://…"
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Redemption type</Label>
                <Select
                  value={form.redemptionType}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      redemptionType: value as PerkRedemptionType,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REDEMPTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="perk-sort">Sort order</Label>
                <Input
                  id="perk-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sortOrder: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            {form.redemptionType === "external_link" ? (
              <div>
                <Label htmlFor="perk-url">Redemption URL</Label>
                <Input
                  id="perk-url"
                  value={form.redemptionUrl}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      redemptionUrl: e.target.value,
                    }))
                  }
                  placeholder="https://…"
                  className="mt-1"
                />
              </div>
            ) : null}
            {form.redemptionType === "coupon_code" ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="perk-coupon">Coupon code</Label>
                  <Input
                    id="perk-coupon"
                    value={form.couponCode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        couponCode: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="perk-coupon-url">
                    Redemption URL (recommended)
                  </Label>
                  <Input
                    id="perk-coupon-url"
                    value={form.redemptionUrl}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        redemptionUrl: e.target.value,
                      }))
                    }
                    placeholder="https://github.com/…"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Members copy the code and can open this page to redeem it
                    (e.g. partner checkout or billing).
                  </p>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="perk-starts">Starts (optional)</Label>
                <Input
                  id="perk-starts"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="perk-ends">Ends (optional)</Label>
                <Input
                  id="perk-ends"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="admin-perk-featured"
                  checked={form.isFeatured}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isFeatured: checked }))
                  }
                />
                <Label htmlFor="admin-perk-featured" className="text-sm font-normal">
                  Featured
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="admin-perk-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label htmlFor="admin-perk-active" className="text-sm font-normal">
                  Active
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void savePerk()}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create perk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
