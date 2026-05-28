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
  adminCreateDomainEmailRule,
  adminDeleteDomainEmailRule,
  adminFetchDomainInsightsMetrics,
  adminListDomainEmailRules,
  adminSimulateDomainVisit,
  adminUpdateDomainEmailRule,
  type AdminDomainEmailRule,
  type AdminDomainInsightsMetrics,
  type CreateDomainEmailRulePayload,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

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
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : null}
      </div>
    </div>
  );
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

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
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

interface RuleFormState {
  id: string;
  domain: string;
  category: string;
  emailSubject: string;
  emailHeadline: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  cooldownDays: string;
  sendDelayMinutes: string;
  enabled: boolean;
}

const emptyRuleForm = (): RuleFormState => ({
  id: "",
  domain: "",
  category: "",
  emailSubject: "",
  emailHeadline: "",
  bodyText: "",
  ctaLabel: "View offer",
  ctaUrl: "",
  cooldownDays: "30",
  sendDelayMinutes: "120",
  enabled: true,
});

function parseFormNumber(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ruleToForm(rule: AdminDomainEmailRule): RuleFormState {
  return {
    id: rule.id,
    domain: rule.domain,
    category: rule.category ?? "",
    emailSubject: rule.subject,
    emailHeadline: rule.headline,
    bodyText: rule.bodyParagraphs.join("\n"),
    ctaLabel: rule.ctaLabel,
    ctaUrl: rule.ctaUrl,
    cooldownDays: String(rule.cooldownDays),
    sendDelayMinutes: String(rule.sendDelayMinutes),
    enabled: rule.enabled,
  };
}

function formToCreatePayload(form: RuleFormState): CreateDomainEmailRulePayload {
  return {
    id: form.id.trim(),
    domain: form.domain.trim(),
    category: form.category.trim() || undefined,
    emailSubject: form.emailSubject.trim(),
    emailHeadline: form.emailHeadline.trim(),
    emailBodyParagraphs: form.bodyText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    ctaLabel: form.ctaLabel.trim(),
    ctaUrl: form.ctaUrl.trim(),
    cooldownDays: parseFormNumber(form.cooldownDays, 30),
    sendDelayMinutes: parseFormNumber(form.sendDelayMinutes, 120),
    enabled: form.enabled,
  };
}

export default function AdminDomainInsights() {
  const { can } = useAdminAuth();
  const canWrite = can("subscriptions.write");

  const [metrics, setMetrics] = useState<AdminDomainInsightsMetrics | null>(
    null,
  );
  const [rules, setRules] = useState<AdminDomainEmailRule[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingRules, setLoadingRules] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const [simulateUserId, setSimulateUserId] = useState("");
  const [simulateDomain, setSimulateDomain] = useState("tesla.com");
  const [simulateResult, setSimulateResult] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm());
  const [savingRule, setSavingRule] = useState(false);

  const metricsRequest = useRef<AbortController | null>(null);

  const loadMetrics = useCallback(async (fromValue: string, toValue: string) => {
    metricsRequest.current?.abort();
    const controller = new AbortController();
    metricsRequest.current = controller;

    setLoadingMetrics(true);
    setError(null);
    if (fromValue && toValue && fromValue > toValue) {
      setMetrics(null);
      setError("Start date must be before end date");
      setLoadingMetrics(false);
      metricsRequest.current = null;
      return;
    }

    const res = await adminFetchDomainInsightsMetrics({
      from: dateInputToIsoStart(fromValue),
      to: dateInputToIsoExclusiveEnd(toValue),
      signal: controller.signal,
    });

    if (controller.signal.aborted || metricsRequest.current !== controller) {
      return;
    }

    if (res.ok && res.data) {
      setMetrics(res.data);
    } else {
      setMetrics(null);
      setError(res.error ?? "Failed to load metrics");
    }
    setLoadingMetrics(false);
    metricsRequest.current = null;
  }, []);

  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    setError(null);
    const res = await adminListDomainEmailRules();
    if (res.ok && res.data) {
      setRules(res.data);
    } else {
      setRules([]);
      setError((prev) => prev ?? res.error ?? "Failed to load rules");
    }
    setLoadingRules(false);
  }, []);

  useEffect(() => {
    void loadMetrics("", "");
    void loadRules();
    return () => metricsRequest.current?.abort();
  }, [loadMetrics, loadRules]);

  async function handleSimulate() {
    if (!canWrite) return;
    setSimulating(true);
    setSimulateResult(null);
    const res = await adminSimulateDomainVisit({
      userId: simulateUserId.trim(),
      domain: simulateDomain.trim(),
    });
    setSimulating(false);
    if (!res.ok || !res.data) {
      setSimulateResult(res.error ?? "Request failed");
      return;
    }
    const { scheduled, reason } = res.data;
    setSimulateResult(
      scheduled
        ? "Email scheduled (respects opt-in, cooldowns, and caps)."
        : `Not scheduled${reason ? `: ${reason}` : ""}`,
    );
    void loadMetrics(fromInput, toInput);
  }

  function openCreateRule() {
    setEditingRuleId(null);
    setRuleForm(emptyRuleForm());
    setRuleDialogOpen(true);
  }

  function openEditRule(rule: AdminDomainEmailRule) {
    setEditingRuleId(rule.id);
    setRuleForm(ruleToForm(rule));
    setRuleDialogOpen(true);
  }

  async function saveRule() {
    if (!canWrite) return;
    setSavingRule(true);
    setError(null);

    const paragraphs = ruleForm.bodyText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      setError("Email body needs at least one paragraph.");
      setSavingRule(false);
      return;
    }

    if (editingRuleId) {
      const res = await adminUpdateDomainEmailRule(editingRuleId, {
        domain: ruleForm.domain.trim(),
        category: ruleForm.category.trim() || null,
        emailSubject: ruleForm.emailSubject.trim(),
        emailHeadline: ruleForm.emailHeadline.trim(),
        emailBodyParagraphs: paragraphs,
        ctaLabel: ruleForm.ctaLabel.trim(),
        ctaUrl: ruleForm.ctaUrl.trim(),
        cooldownDays: parseFormNumber(ruleForm.cooldownDays, 30),
        sendDelayMinutes: parseFormNumber(ruleForm.sendDelayMinutes, 120),
        enabled: ruleForm.enabled,
      });
      setSavingRule(false);
      if (!res.ok) {
        setError(res.error ?? "Failed to update rule");
        return;
      }
    } else {
      const payload = formToCreatePayload(ruleForm);
      if (!payload.id || !payload.domain) {
        setError("Rule id and domain are required.");
        setSavingRule(false);
        return;
      }
      const res = await adminCreateDomainEmailRule(payload);
      setSavingRule(false);
      if (!res.ok) {
        setError(res.error ?? "Failed to create rule");
        return;
      }
    }

    setRuleDialogOpen(false);
    await loadRules();
  }

  async function toggleRuleEnabled(rule: AdminDomainEmailRule, enabled: boolean) {
    if (!canWrite) return;
    const res = await adminUpdateDomainEmailRule(rule.id, { enabled });
    if (!res.ok) {
      setError(res.error ?? "Failed to update rule");
      return;
    }
    await loadRules();
  }

  async function deleteRule(rule: AdminDomainEmailRule) {
    if (!canWrite) return;
    if (!window.confirm(`Delete rule "${rule.id}" (${rule.domain})?`)) return;
    const res = await adminDeleteDomainEmailRule(rule.id);
    if (!res.ok) {
      setError(res.error ?? "Failed to delete rule");
      return;
    }
    await loadRules();
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Domain insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            VPN visit-triggered lifecycle emails (opt-in, DB rules, node
            detection).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadMetrics(fromInput, toInput);
            void loadRules();
          }}
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

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Metrics</h3>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">From</span>
            <input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">To</span>
            <input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadMetrics(fromInput, toInput)}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Apply
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Users opted in</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.usersOptedIn ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Emails scheduled</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.visitsScheduled ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Emails sent</p>
            <p className="mt-1 text-3xl font-semibold">
              {metrics?.emailsSent ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Send rate</p>
            <p className="mt-1 text-3xl font-semibold">
              {loadingMetrics ? "…" : formatPercent(metrics?.sendRate)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Visits skipped</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.visitsSkipped ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Opened</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.emailsOpened ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">CTA clicks</p>
            <p className="mt-1 text-2xl font-semibold">
              {metrics?.ctaClicks ?? (loadingMetrics ? "…" : 0)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatDateRange(metrics?.from, metrics?.to)} · Unsubscribes:{" "}
          {metrics?.unsubscribes ?? (loadingMetrics ? "…" : 0)} · Queue events:{" "}
          {metrics?.eventsCreated ?? (loadingMetrics ? "…" : 0)}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownList
            title="Events by status"
            rows={metrics?.byStatus ?? []}
            loading={loadingMetrics}
          />
          <BreakdownList
            title="Top domains"
            rows={metrics?.topDomains ?? []}
            loading={loadingMetrics}
          />
        </div>
      </section>

      {canWrite ? (
        <section className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-lg font-semibold">QA: simulate visit</h3>
          <p className="text-sm text-muted-foreground">
            Runs the same pipeline as a VPN node event (consent, cooldowns, and
            monthly cap apply).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="simulate-user-id">User ID</Label>
              <Input
                id="simulate-user-id"
                value={simulateUserId}
                onChange={(e) => setSimulateUserId(e.target.value)}
                placeholder="uuid"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="simulate-domain">Domain</Label>
              <Input
                id="simulate-domain"
                value={simulateDomain}
                onChange={(e) => setSimulateDomain(e.target.value)}
                placeholder="tesla.com"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={simulating || !simulateUserId.trim() || !simulateDomain.trim()}
            onClick={() => void handleSimulate()}
          >
            {simulating ? "Running…" : "Simulate visit"}
          </Button>
          {simulateResult ? (
            <p className="text-sm text-muted-foreground">{simulateResult}</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Domain email rules</h3>
          {canWrite ? (
            <Button type="button" variant="outline" onClick={openCreateRule}>
              Add rule
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Domain</th>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Delay</th>
                <th className="px-3 py-2 font-medium">Cooldown</th>
                <th className="px-3 py-2 font-medium">Enabled</th>
                {canWrite ? (
                  <th className="px-3 py-2 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loadingRules ? (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="px-3 py-4 text-muted-foreground">
                    Loading rules…
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="px-3 py-4 text-muted-foreground">
                    No rules configured.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      <div className="font-medium">{rule.domain}</div>
                      <div className="text-xs text-muted-foreground">{rule.id}</div>
                    </td>
                    <td className="max-w-xs truncate px-3 py-2">{rule.subject}</td>
                    <td className="px-3 py-2">{rule.sendDelayMinutes}m</td>
                    <td className="px-3 py-2">{rule.cooldownDays}d</td>
                    <td className="px-3 py-2">
                      <Switch
                        checked={rule.enabled}
                        disabled={!canWrite}
                        onCheckedChange={(checked) =>
                          void toggleRuleEnabled(rule, checked)
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
                            onClick={() => openEditRule(rule)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteRule(rule)}
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

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRuleId ? "Edit domain rule" : "New domain rule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editingRuleId ? (
              <div>
                <Label htmlFor="rule-id">Rule ID</Label>
                <Input
                  id="rule-id"
                  value={ruleForm.id}
                  onChange={(e) =>
                    setRuleForm((prev) => ({ ...prev, id: e.target.value }))
                  }
                  placeholder="tesla_partner"
                  className="mt-1"
                />
              </div>
            ) : null}
            <div>
              <Label htmlFor="rule-domain">Domain pattern</Label>
              <Input
                id="rule-domain"
                value={ruleForm.domain}
                onChange={(e) =>
                  setRuleForm((prev) => ({ ...prev, domain: e.target.value }))
                }
                placeholder="tesla.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rule-category">Category</Label>
              <Input
                id="rule-category"
                value={ruleForm.category}
                onChange={(e) =>
                  setRuleForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rule-subject">Email subject</Label>
              <Input
                id="rule-subject"
                value={ruleForm.emailSubject}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    emailSubject: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rule-headline">Email headline</Label>
              <Input
                id="rule-headline"
                value={ruleForm.emailHeadline}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    emailHeadline: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rule-body">Body paragraphs (one per line)</Label>
              <Textarea
                id="rule-body"
                value={ruleForm.bodyText}
                onChange={(e) =>
                  setRuleForm((prev) => ({ ...prev, bodyText: e.target.value }))
                }
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rule-cta-label">CTA label</Label>
                <Input
                  id="rule-cta-label"
                  value={ruleForm.ctaLabel}
                  onChange={(e) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      ctaLabel: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rule-enabled">Enabled</Label>
                <div className="mt-3">
                  <Switch
                    id="rule-enabled"
                    checked={ruleForm.enabled}
                    onCheckedChange={(checked) =>
                      setRuleForm((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="rule-cta-url">CTA URL</Label>
              <Input
                id="rule-cta-url"
                value={ruleForm.ctaUrl}
                onChange={(e) =>
                  setRuleForm((prev) => ({ ...prev, ctaUrl: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rule-delay">Send delay (minutes)</Label>
                <Input
                  id="rule-delay"
                  type="number"
                  value={ruleForm.sendDelayMinutes}
                  onChange={(e) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      sendDelayMinutes: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rule-cooldown">Cooldown (days)</Label>
                <Input
                  id="rule-cooldown"
                  type="number"
                  value={ruleForm.cooldownDays}
                  onChange={(e) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      cooldownDays: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRuleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={savingRule} onClick={() => void saveRule()}>
              {savingRule ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
