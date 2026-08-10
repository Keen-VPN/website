import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  adminCreateHotLink,
  adminDeleteHotLink,
  adminExportHotLinksCsv,
  adminImportHotLinksCsv,
  adminListHotLinks,
  adminSetHotLinkActive,
  adminUpdateHotLink,
  adminValidateHotLinkDomains,
  type AdminHotLink,
  type HotLinkDomainRejection,
  type HotLinkImportResult,
} from "@/auth/backend";

const EMPTY_FORM = {
  partnerName: "",
  category: "",
  websiteUrl: "",
  referralUrl: "",
  referralCode: "",
  promotionalValue: "",
  description: "",
  priority: "0",
  notes: "",
  domains: "",
};

/** The column order the importer expects, shown to the admin before they paste. */
const CSV_HEADER =
  "partnerName,category,websiteUrl,referralUrl,referralCode,promotionalValue,description,domains,priority,notes";

export default function AdminHotLinks() {
  const [links, setLinks] = useState<AdminHotLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  // null = the dialog is creating; an id = it is editing that partner.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [rejected, setRejected] = useState<HotLinkDomainRejection[]>([]);
  const [domainPreview, setDomainPreview] = useState<{
    accepted: string[];
    rejected: HotLinkDomainRejection[];
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<HotLinkImportResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminListHotLinks({
      category: category || undefined,
      search: search || undefined,
    });
    if (result.ok) {
      setLinks(result.data ?? []);
      setError(null);
    } else {
      setError(result.error ?? "Failed to load");
    }
    setLoading(false);
  }, [category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set(links.map((l) => l.category))].sort(),
    [links],
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setRejected([]);
    setDomainPreview(null);
    setCreateOpen(true);
  }

  function openEdit(link: AdminHotLink) {
    setEditingId(link.id);
    setForm({
      partnerName: link.partnerName,
      category: link.category,
      websiteUrl: link.websiteUrl,
      referralUrl: link.referralUrl,
      referralCode: link.referralCode ?? "",
      promotionalValue: link.promotionalValue ?? "",
      description: link.description ?? "",
      priority: String(link.priority),
      notes: link.notes ?? "",
      domains: link.domains.map((d) => d.host).join(" "),
    });
    setRejected([]);
    setDomainPreview(null);
    setCreateOpen(true);
  }

  function parseDomains(raw: string): string[] {
    return raw
      .split(/[\s;,]+/)
      .map((d) => d.trim())
      .filter(Boolean);
  }

  /** The ticket's "preview matching domains" — checks before saving. */
  async function handlePreviewDomains() {
    const domains = parseDomains(form.domains);
    if (domains.length === 0) return;
    setPreviewing(true);
    const result = await adminValidateHotLinkDomains(
      domains,
      editingId ?? undefined,
    );
    setPreviewing(false);
    if (!result.ok) {
      setError(result.error ?? "Validation failed");
      return;
    }
    setDomainPreview({
      accepted: result.accepted ?? [],
      rejected: result.rejected ?? [],
    });
  }

  async function handleCreate() {
    setSaving(true);
    setRejected([]);
    const payload = {
      partnerName: form.partnerName.trim(),
      category: form.category.trim(),
      websiteUrl: form.websiteUrl.trim(),
      referralUrl: form.referralUrl.trim(),
      referralCode: form.referralCode.trim() || undefined,
      promotionalValue: form.promotionalValue.trim() || undefined,
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
      priority: Number(form.priority) || 0,
      // Accept the same separators the CSV importer does, so an admin can paste
      // a domain cell straight out of a spreadsheet.
      domains: parseDomains(form.domains),
    };
    const result = editingId
      ? await adminUpdateHotLink(editingId, payload)
      : await adminCreateHotLink(payload);
    setSaving(false);

    // Rejections are shown even on success: a partner can be created while some
    // of its domains were refused, and silently dropping them would leave the
    // admin believing a domain is matching when it is not.
    setRejected(result.rejectedDomains ?? []);
    if (result.ok) {
      if (!result.rejectedDomains?.length) {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setCreateOpen(false);
      }
      void load();
    } else {
      setError(result.error ?? (editingId ? "Update failed" : "Create failed"));
    }
  }

  async function handleImport(dryRun: boolean) {
    setImporting(true);
    const result = await adminImportHotLinksCsv(csv, dryRun);
    setImporting(false);
    if (!result.ok) {
      setError(result.error ?? "Import failed");
      return;
    }
    setPreview(result.data ?? null);
    if (!dryRun) {
      void load();
    }
  }

  async function handleExport() {
    const result = await adminExportHotLinksCsv();
    if (!result.ok || !result.csv) {
      setError(result.error ?? "Export failed");
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hot-links.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleActive(link: AdminHotLink) {
    const result = await adminSetHotLinkActive(link.id, !link.isActive);
    if (result.ok) void load();
    else setError(result.error ?? "Update failed");
  }

  async function remove(link: AdminHotLink) {
    if (
      !window.confirm(
        `Delete ${link.partnerName}? Its domains are removed with it.`,
      )
    ) {
      return;
    }
    const result = await adminDeleteHotLink(link.id);
    if (result.ok) void load();
    else setError(result.error ?? "Delete failed");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hot Links</h1>
          <p className="text-sm text-muted-foreground">
            Partner referral destinations. Shown in the extension when a member
            visits a matching domain, and offered by the assistant in chat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void handleExport()}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button onClick={openCreate}>Add partner</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search partner or domain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No partners yet. Add one, or import the partner CSV.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Domains</th>
                <th className="px-3 py-2">Offer</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{link.partnerName}</td>
                  <td className="px-3 py-2">{link.category}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {link.domains.map((d) => d.host).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    {link.promotionalValue ?? "—"}
                    {link.referralCode ? ` (${link.referralCode})` : ""}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{link.priority}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        link.isActive
                          ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {link.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(link)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void toggleActive(link)}
                    >
                      {link.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void remove(link)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- create ---------------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit partner" : "Add partner"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {(
              [
                ["partnerName", "Partner name", "Gusto"],
                ["category", "Category", "Payroll"],
                ["websiteUrl", "Website URL", "https://gusto.com"],
                ["referralUrl", "Referral URL", "https://gusto.com/r/keenvpn"],
                ["referralCode", "Referral code (optional)", "KEEN100"],
                ["promotionalValue", "Offer (optional)", "$100 gift card"],
                ["priority", "Priority", "0"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key} className="flex flex-col gap-1">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <Label htmlFor="domains">Matching domains</Label>
              <Textarea
                id="domains"
                rows={2}
                placeholder="gusto.com app.gusto.com"
                value={form.domains}
                onChange={(e) =>
                  setForm((f) => ({ ...f, domains: e.target.value }))
                }
              />
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted-foreground">
                  Space, comma or semicolon separated. Each domain can belong to
                  only one partner.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={previewing || !form.domains.trim()}
                  onClick={() => void handlePreviewDomains()}
                >
                  {previewing ? "Checking…" : "Preview"}
                </Button>
              </div>
              {domainPreview && (
                <div className="rounded-md border px-3 py-2 text-xs">
                  {domainPreview.accepted.length > 0 && (
                    <p>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        Available:
                      </span>{" "}
                      <span className="font-mono">
                        {domainPreview.accepted.join(", ")}
                      </span>
                    </p>
                  )}
                  {domainPreview.rejected.length > 0 && (
                    <p className="mt-1">
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        Unavailable:
                      </span>{" "}
                      <span className="font-mono">
                        {domainPreview.rejected
                          .map((r) => `${r.host} (${r.reason.replace(/_/g, " ")})`)
                          .join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="notes">Internal notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Never shown to members or the assistant — safe for margins and
                contract terms.
              </p>
            </div>

            {rejected.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                <p className="font-medium">Some domains were rejected:</p>
                <ul className="mt-1 list-inside list-disc">
                  {rejected.map((r) => (
                    <li key={r.host} className="font-mono text-xs">
                      {r.host} — {r.reason.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleCreate()}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- import ---------------- */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import partners from CSV</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Preview first — it writes nothing and reports every bad row by
              spreadsheet line number.
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
              {CSV_HEADER}
            </pre>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              placeholder="Paste CSV including the header row…"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file.text().then(setCsv);
              }}
            />

            {preview && (
              <div className="rounded-md border px-3 py-2 text-sm">
                <p>
                  <span className="font-medium">{preview.created}</span> row
                  {preview.created === 1 ? "" : "s"} would be created.
                </p>
                {preview.rowErrors.length > 0 && (
                  <>
                    <p className="mt-2 font-medium">Row problems:</p>
                    <ul className="list-inside list-disc">
                      {preview.rowErrors.map((r) => (
                        <li key={`${r.lineNumber}-${r.reason}`}>
                          line {r.lineNumber}: {r.reason.replace(/_/g, " ")}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {preview.domainRejections.length > 0 && (
                  <>
                    <p className="mt-2 font-medium">Domain conflicts:</p>
                    <ul className="list-inside list-disc font-mono text-xs">
                      {preview.domainRejections.map((r) => (
                        <li key={`${r.lineNumber}-${r.host}`}>
                          line {r.lineNumber}: {r.host} —{" "}
                          {r.reason.replace(/_/g, " ")}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={importing || !csv.trim()}
              onClick={() => void handleImport(true)}
            >
              {importing ? "Checking…" : "Preview"}
            </Button>
            <Button
              disabled={importing || !csv.trim()}
              onClick={() => void handleImport(false)}
            >
              Apply import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
