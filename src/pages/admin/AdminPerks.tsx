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
  adminClonePerk,
  adminCreatePerk,
  adminDeletePerk,
  adminFetchAllPerkReactivations,
  adminFetchPerkReactivations,
  adminFetchPerksMetrics,
  adminListExpiredPerks,
  adminListPerks,
  adminReactivatePerk,
  adminUpdatePerk,
  type AdminPerk,
  type AdminPerkReactivation,
  type AdminPerksMetrics,
  type CreateAdminPerkPayload,
  type ExtensionDomainRule,
  type PerkCategory,
  type PerkRedemptionType,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useFeatureFlags } from "@/lib/feature-flags";
import {
  AudienceTargetingPanel,
} from "@/components/admin/AudienceTargetingPanel";
import {
  cloneAudienceTargeting,
  createDefaultAudienceTargeting,
  getAudienceTargetingValidationError,
} from "@/components/admin/audience-targeting.constants";
import type { AudienceTargeting } from "@/auth/backend";

const PERK_CATEGORIES: { value: PerkCategory; label: string }[] = [
  { value: "privacy_security", label: "Privacy & Security" },
  { value: "ai_productivity", label: "AI & Productivity" },
  { value: "developer_tools", label: "Developer Tools" },
  { value: "startup_growth", label: "Startup & Growth" },
  { value: "remote_work", label: "Remote Work" },
  { value: "finance", label: "Finance" },
];

const REDEMPTION_TYPES: { value: PerkRedemptionType; label: string }[] = [
  { value: "external_link", label: "External link" },
  { value: "coupon_code", label: "Coupon code" },
  { value: "invite_only", label: "Invite only" },
  { value: "workflow", label: "Workflow (auto-apply)" },
];

/** Registered backend workflow types available for "workflow" redemption perks —
 * see vpn-backend-service-v2/src/workflows/workflow-types/index.ts. */
const WORKFLOW_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "chase_signup", label: "Chase — Account signup (VIG)" },
  { value: "airwallex_signup", label: "Airwallex — Business signup" },
  { value: "mercury_signup", label: "Mercury — Business signup" },
];

const ACCESS_LEVELS = [
  { value: "free", label: "All members" },
  { value: "paid", label: "Paid members" },
  { value: "annual", label: "Annual members" },
] as const;

interface ExtensionDomainFormRow {
  host: string;
  pathPrefix: string;
  priority: string;
}

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
  workflowType: string;
  accessLevel: "free" | "paid" | "annual";
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  audienceTargeting: AudienceTargeting;
  extensionDomains: ExtensionDomainFormRow[];
}

function normalizeExtensionHost(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function emptyExtensionDomainRow(): ExtensionDomainFormRow {
  return { host: "", pathPrefix: "", priority: "" };
}

function extensionDomainsToFormRows(
  rules: ExtensionDomainRule[] | undefined,
): ExtensionDomainFormRow[] {
  if (!rules?.length) {
    return [];
  }

  return rules.map((rule) => ({
    host: rule.host,
    pathPrefix: rule.pathPrefix ?? "",
    priority:
      rule.priority != null && Number.isFinite(rule.priority)
        ? String(rule.priority)
        : "",
  }));
}

function extensionDomainsFromFormRows(
  rows: ExtensionDomainFormRow[],
): ExtensionDomainRule[] {
  const rules: ExtensionDomainRule[] = [];

  for (const row of rows) {
    const host = normalizeExtensionHost(row.host);
    if (!host) {
      continue;
    }

    const priority = row.priority.trim();
    const parsedPriority = priority ? Number(priority) : undefined;
    const rule: ExtensionDomainRule = { host };

    if (row.pathPrefix.trim()) {
      rule.pathPrefix = row.pathPrefix.trim();
    }
    if (parsedPriority != null && Number.isFinite(parsedPriority)) {
      rule.priority = parsedPriority;
    }

    rules.push(rule);
  }

  return rules;
}

function validateExtensionDomains(rows: ExtensionDomainFormRow[]): string | null {
  for (const row of rows) {
    const host = normalizeExtensionHost(row.host);
    const hasExtra =
      row.pathPrefix.trim().length > 0 || row.priority.trim().length > 0;

    if (!host && hasExtra) {
      return "Each Chrome extension site needs a host when path or priority is set.";
    }

    if (host && !/^[a-z0-9.-]+$/.test(host)) {
      return `Invalid extension host "${host}". Use a domain like amazon.com.`;
    }

    if (row.priority.trim()) {
      const parsed = Number(row.priority.trim());
      if (!Number.isFinite(parsed)) {
        return "Extension site priority must be a number.";
      }
    }
  }

  return null;
}

function formatExtensionSiteSummary(rules: ExtensionDomainRule[] | undefined) {
  if (!rules?.length) {
    return "—";
  }

  const preview = rules
    .slice(0, 2)
    .map((rule) => rule.pathPrefix ? `${rule.host}${rule.pathPrefix}` : rule.host)
    .join(", ");

  if (rules.length > 2) {
    return `${preview} +${rules.length - 2}`;
  }

  return preview;
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

function defaultPerkEndDateInput(startsAt = ""): string {
  const base = startsAt.trim()
    ? new Date(`${startsAt.trim()}T00:00:00.000Z`)
    : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + 45);
    return fallback.toISOString().slice(0, 10);
  }
  base.setUTCDate(base.getUTCDate() + 45);
  return base.toISOString().slice(0, 10);
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
  workflowType: "",
  accessLevel: "paid",
  isFeatured: false,
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: defaultPerkEndDateInput(),
  audienceTargeting: createDefaultAudienceTargeting(),
  extensionDomains: [],
});

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
    workflowType: form.workflowType.trim() || undefined,
    accessLevel: form.accessLevel,
    isFeatured: form.isFeatured,
    isActive: form.isActive,
    sortOrder: parseSortOrder(form.sortOrder),
    startsAt: optionalIsoDate(form.startsAt),
    endsAt: form.endsAt.trim() ? optionalIsoDate(form.endsAt) : null,
    audienceTargeting: form.audienceTargeting,
    extensionDomains: extensionDomainsFromFormRows(form.extensionDomains),
  };
}

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
    workflowType: perk.workflowType ?? "",
    accessLevel: perk.accessLevel,
    isFeatured: perk.isFeatured,
    isActive: perk.isActive,
    sortOrder: String(perk.sortOrder),
    startsAt: perk.startsAt ? perk.startsAt.slice(0, 10) : "",
    endsAt: perk.endsAt ? perk.endsAt.slice(0, 10) : "",
    audienceTargeting: perk.audienceTargeting
      ? cloneAudienceTargeting(perk.audienceTargeting)
      : createDefaultAudienceTargeting(),
    extensionDomains: extensionDomainsToFormRows(perk.extensionDomains),
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

function formatAdminDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatAdminDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function adminDisplayName(
  admin: AdminPerkReactivation["adminUser"],
): string {
  if (!admin) return "—";
  return admin.name?.trim() || admin.email;
}

function statusLabel(status: AdminPerk["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "scheduled":
      return "Scheduled";
    case "expired":
      return "Expired";
    case "cooling_off":
      return "Cooling off";
    case "eligible_for_readd":
      return "Eligible";
    default:
      return status;
  }
}

export default function AdminPerks() {
  const { can } = useAdminAuth();
  const { workflowsEnabled } = useFeatureFlags();
  const canWrite = can("subscriptions.write");

  const [perks, setPerks] = useState<AdminPerk[]>([]);
  const [expiredPerks, setExpiredPerks] = useState<AdminPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpired, setLoadingExpired] = useState(true);
  const [expiredError, setExpiredError] = useState<string | null>(null);
  const [reactivationHistory, setReactivationHistory] = useState<
    AdminPerkReactivation[]
  >([]);
  const [loadingReactivations, setLoadingReactivations] = useState(true);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyPerk, setHistoryPerk] = useState<AdminPerk | null>(null);
  const [perkHistory, setPerkHistory] = useState<AdminPerkReactivation[]>([]);
  const [loadingPerkHistory, setLoadingPerkHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PerkFormState>(emptyForm());
  const showDisabledWorkflowType =
    !workflowsEnabled && Boolean(editingId) && form.redemptionType === "workflow";
  const availableRedemptionTypes =
    workflowsEnabled || showDisabledWorkflowType
      ? REDEMPTION_TYPES
      : REDEMPTION_TYPES.filter((type) => type.value !== "workflow");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [metrics, setMetrics] = useState<AdminPerksMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const metricsRequest = useRef<AbortController | null>(null);
  const historyRequestRef = useRef(0);

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

  const loadExpired = useCallback(async () => {
    setLoadingExpired(true);
    setExpiredError(null);
    const res = await adminListExpiredPerks();
    if (res.ok) {
      setExpiredPerks(res.data ?? []);
    } else {
      setExpiredPerks([]);
      setExpiredError(res.error ?? "Failed to load expired perks");
    }
    setLoadingExpired(false);
  }, []);

  const loadReactivationHistory = useCallback(async () => {
    setLoadingReactivations(true);
    const res = await adminFetchAllPerkReactivations({ limit: 50 });
    if (res.ok) {
      setReactivationHistory(res.data ?? []);
    } else {
      setReactivationHistory([]);
    }
    setLoadingReactivations(false);
  }, []);

  const openPerkHistory = async (perk: AdminPerk) => {
    const requestId = ++historyRequestRef.current;
    setHistoryPerk(perk);
    setHistoryDialogOpen(true);
    setLoadingPerkHistory(true);
    setHistoryError(null);
    setPerkHistory([]);
    const res = await adminFetchPerkReactivations(perk.id);
    if (requestId !== historyRequestRef.current) return;
    if (res.ok) {
      setPerkHistory(res.data ?? []);
    } else {
      setHistoryError(res.error ?? "Failed to load reactivation history");
    }
    setLoadingPerkHistory(false);
  };

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
    void loadExpired();
    void loadReactivationHistory();
  }, [loadExpired, loadReactivationHistory]);

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

    const audienceError = getAudienceTargetingValidationError(
      form.audienceTargeting,
    );
    if (audienceError) {
      setSaving(false);
      setDialogError(audienceError);
      return;
    }

    const extensionDomainsError = validateExtensionDomains(form.extensionDomains);
    if (extensionDomainsError) {
      setSaving(false);
      setDialogError(extensionDomainsError);
      return;
    }

    if (form.redemptionType === "workflow" && !form.workflowType.trim()) {
      setSaving(false);
      setDialogError("Workflow type is required for workflow perks.");
      return;
    }

    const extensionDomains = extensionDomainsFromFormRows(form.extensionDomains);

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
        workflowType: form.workflowType.trim() || null,
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
        audienceTargeting: form.audienceTargeting,
        extensionDomains,
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
    void loadExpired();
  };

  const reactivatePerk = async (perk: AdminPerk) => {
    if (perk.status !== "eligible_for_readd") {
      window.alert("This perk is still in its cooling-off period.");
      return;
    }
    const res = await adminReactivatePerk(perk.id);
    if (!res.ok) {
      setError(res.error ?? "Failed to reactivate perk");
      return;
    }
    void loadPerks();
    void loadExpired();
    void loadReactivationHistory();
  };

  const clonePerk = async (perk: AdminPerk) => {
    const newId = window.prompt(
      `Clone "${perk.title}" as a new perk. Enter a unique perk ID:`,
      `${perk.id}_v2`,
    );
    if (!newId?.trim()) return;
    const res = await adminClonePerk(perk.id, { newId: newId.trim() });
    if (!res.ok) {
      setError(res.error ?? "Failed to clone perk");
      return;
    }
    void loadPerks();
    void loadExpired();
    void loadReactivationHistory();
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
            <p className="text-sm text-muted-foreground">Redemptions</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.redemptions ?? (loadingMetrics ? "…" : 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loadingMetrics ? "" : `Redeem rate ${formatPercent(metrics?.claimRate)}`}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Snooze rate</p>
            <p className="mt-1 text-3xl font-semibold">
              {loadingMetrics ? "…" : formatPercent(metrics?.snoozeRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics?.lifecycle?.snoozedNow ?? 0} currently snoozed
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Not interested rate</p>
            <p className="mt-1 text-3xl font-semibold">
              {loadingMetrics ? "…" : formatPercent(metrics?.notInterestedRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics?.lifecycle?.notInterestedNow ?? 0} marked not interested
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Completed (all time)</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.lifecycle?.completedTotal ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Expiring in 7 days</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.lifecycle?.expiringIn7Days ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Expiring in 30 days</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.lifecycle?.expiringIn30Days ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Expired catalog</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.lifecycle?.expiredCatalog ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Snoozes in window</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.lifecycle?.snoozesInWindow ?? (loadingMetrics ? "…" : 0)}
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
                <th className="px-3 py-2 font-medium">Extension sites</th>
                <th className="px-3 py-2 font-medium">Expires</th>
                <th className="px-3 py-2 font-medium">Status</th>
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
                    colSpan={canWrite ? 10 : 9}
                    className="px-3 py-4 text-muted-foreground"
                  >
                    Loading perks…
                  </td>
                </tr>
              ) : perks.length === 0 ? (
                <tr>
                  <td
                    colSpan={canWrite ? 10 : 9}
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
                      {perk.redemptionType === "workflow" &&
                      perk.workflowType ? (
                        <div className="text-xs text-muted-foreground">
                          {perk.workflowType}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatExtensionSiteSummary(perk.extensionDomains)}
                    </td>
                    <td className="px-3 py-2">
                      <div>{formatAdminDate(perk.endsAt)}</div>
                      {perk.daysRemaining != null ? (
                        <div className="text-xs text-muted-foreground">
                          {perk.daysRemaining}d left
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {statusLabel(perk.status)}
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

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Expired &amp; reactivation</h3>
        <p className="text-sm text-muted-foreground">
          Perks enter a 7-day cooling-off period after expiration. Only admins
          with <code className="text-xs">subscriptions.write</code> can
          reactivate or clone once status is Eligible.
        </p>
        {expiredError ? (
          <p className="text-sm text-destructive">{expiredError}</p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Perk</th>
                <th className="px-3 py-2 font-medium">Ended</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Eligible from</th>
                <th className="px-3 py-2 font-medium">Reactivations</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingExpired ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    Loading expired perks…
                  </td>
                </tr>
              ) : expiredError ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-destructive">
                    {expiredError}
                  </td>
                </tr>
              ) : expiredPerks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    No expired perks.
                  </td>
                </tr>
              ) : (
                expiredPerks.map((perk) => (
                  <tr key={perk.id} className="border-b border-border/60">
                    <td className="px-3 py-2 font-medium">{perk.title}</td>
                    <td className="px-3 py-2">
                      {formatAdminDate(perk.endsAt ?? perk.lastExpiredAt)}
                    </td>
                    <td className="px-3 py-2">{statusLabel(perk.status)}</td>
                    <td className="px-3 py-2">
                      {formatAdminDate(perk.eligibleForReactivationAt)}
                    </td>
                    <td className="px-3 py-2">{perk.reactivationCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void openPerkHistory(perk)}
                        >
                          History
                        </Button>
                        {canWrite ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={perk.status !== "eligible_for_readd"}
                              onClick={() => void reactivatePerk(perk)}
                            >
                              Reactivate
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={perk.status !== "eligible_for_readd"}
                              onClick={() => void clonePerk(perk)}
                            >
                              Clone
                            </Button>
                          </>
                        ) : null}
                      </div>
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
          <div>
            <h3 className="text-lg font-semibold">Reactivation history</h3>
            <p className="text-sm text-muted-foreground">
              Audit log of admin reactivations and clones (most recent first).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadReactivationHistory()}
          >
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Perk</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">New window</th>
                <th className="px-3 py-2 font-medium">Admin</th>
                <th className="px-3 py-2 font-medium">Clone ID</th>
              </tr>
            </thead>
            <tbody>
              {loadingReactivations ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    Loading reactivation history…
                  </td>
                </tr>
              ) : reactivationHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    No reactivations recorded yet.
                  </td>
                </tr>
              ) : (
                reactivationHistory.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      {formatAdminDateTime(row.reactivatedAt)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {row.perkTitle ?? row.perkId}
                    </td>
                    <td className="px-3 py-2 capitalize">{row.action}</td>
                    <td className="px-3 py-2">
                      {formatAdminDate(row.newStartsAt)}
                      {" – "}
                      {formatAdminDate(row.newEndsAt)}
                    </td>
                    <td className="px-3 py-2">{adminDisplayName(row.adminUser)}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.clonedPerkId ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={historyDialogOpen}
        onOpenChange={(open) => {
          setHistoryDialogOpen(open);
          if (!open) {
            setHistoryPerk(null);
            setPerkHistory([]);
            setHistoryError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Reactivation history
              {historyPerk ? ` — ${historyPerk.title}` : ""}
            </DialogTitle>
          </DialogHeader>
          {historyError ? (
            <p className="text-sm text-destructive">{historyError}</p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">New window</th>
                  <th className="px-3 py-2 font-medium">Admin</th>
                  <th className="px-3 py-2 font-medium">Clone ID</th>
                </tr>
              </thead>
              <tbody>
                {loadingPerkHistory ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-destructive">
                      {historyError}
                    </td>
                  </tr>
                ) : perkHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                      No reactivations for this perk yet.
                    </td>
                  </tr>
                ) : (
                  perkHistory.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        {formatAdminDateTime(row.reactivatedAt)}
                      </td>
                      <td className="px-3 py-2 capitalize">{row.action}</td>
                      <td className="px-3 py-2">
                        {formatAdminDate(row.newStartsAt)}
                        {" – "}
                        {formatAdminDate(row.newEndsAt)}
                      </td>
                      <td className="px-3 py-2">
                        {adminDisplayName(row.adminUser)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.clonedPerkId ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

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
            <AudienceTargetingPanel
              value={form.audienceTargeting}
              onChange={(audienceTargeting) =>
                setForm((prev) => ({ ...prev, audienceTargeting }))
              }
              context="perks"
            />

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <Label>Chrome extension sites</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  When a member visits these domains, the KeenVPN Chrome
                  extension activates and links this perk for copy/claim.
                </p>
              </div>

              {form.extensionDomains.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No extension sites configured.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.extensionDomains.map((row, index) => (
                    <div
                      key={`extension-domain-${index}`}
                      className="grid gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-[1.4fr_1fr_0.7fr_auto]"
                    >
                      <div>
                        <Label className="text-xs">Host</Label>
                        <Input
                          value={row.host}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              extensionDomains: prev.extensionDomains.map(
                                (entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, host: e.target.value }
                                    : entry,
                              ),
                            }))
                          }
                          placeholder="amazon.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Path prefix</Label>
                        <Input
                          value={row.pathPrefix}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              extensionDomains: prev.extensionDomains.map(
                                (entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, pathPrefix: e.target.value }
                                    : entry,
                              ),
                            }))
                          }
                          placeholder="/optional"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Input
                          value={row.priority}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              extensionDomains: prev.extensionDomains.map(
                                (entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, priority: e.target.value }
                                    : entry,
                              ),
                            }))
                          }
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              extensionDomains: prev.extensionDomains.filter(
                                (_, entryIndex) => entryIndex !== index,
                              ),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    extensionDomains: [
                      ...prev.extensionDomains,
                      emptyExtensionDomainRow(),
                    ],
                  }))
                }
              >
                Add extension site
              </Button>
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
                    {availableRedemptionTypes.map((type) => (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        disabled={
                          type.value === "workflow" && !workflowsEnabled
                        }
                      >
                        {type.label}
                        {type.value === "workflow" && !workflowsEnabled
                          ? " (disabled)"
                          : ""}
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
            {form.redemptionType === "workflow" ? (
              <div>
                <Label htmlFor="perk-workflow-type">Workflow type</Label>
                <Select
                  value={form.workflowType || undefined}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, workflowType: value }))
                  }
                >
                  <SelectTrigger id="perk-workflow-type" className="mt-1">
                    <SelectValue placeholder="Select a workflow type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Claiming this perk starts the AI Workflow Engine application
                  for the selected partner instead of opening a link.
                </p>
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
