import { useCallback, useEffect, useState } from "react";
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
  adminCreateAffiliateLink,
  adminListAffiliateLinks,
  adminUpdateAffiliateLink,
  type AdminAffiliateLink,
} from "@/auth/backend";

const EMPTY_FORM = {
  email: "",
  displayName: "",
  campaignId: "",
  rewardMonths: "1",
  expiresAt: "",
  notes: "",
};

export default function AdminAffiliateLinks() {
  const [links, setLinks] = useState<AdminAffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // The shareable URL is returned exactly once at creation — only its hash is
  // stored — so it is held here until the admin dismisses it. Closing the
  // dialog without copying means issuing a new link.
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminListAffiliateLinks(emailFilter || undefined);
    if (result.ok) {
      setLinks(result.data ?? []);
      setError(null);
    } else {
      setError(result.error ?? "Failed to load");
    }
    setLoading(false);
  }, [emailFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setSaving(true);
    const result = await adminCreateAffiliateLink({
      email: form.email.trim(),
      displayName: form.displayName.trim() || undefined,
      campaignId: form.campaignId.trim() || undefined,
      rewardMonths: Number(form.rewardMonths) || 1,
      expiresAt: form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : undefined,
      notes: form.notes.trim() || undefined,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Create failed");
      return;
    }
    setCreateOpen(false);
    setForm({ ...EMPTY_FORM });
    setIssuedUrl(result.data?.url ?? null);
    setCopied(false);
    void load();
  }

  async function toggleActive(link: AdminAffiliateLink) {
    const result = await adminUpdateAffiliateLink(link.id, {
      isActive: !link.isActive,
    });
    if (result.ok) void load();
    else setError(result.error ?? "Update failed");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate Links</h1>
          <p className="text-sm text-muted-foreground">
            Pre-signup referral links bound to an email address. Signups are
            attributed before the affiliate has an account, and convert to
            rewards once they claim it.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Issue link</Button>
      </div>

      <Input
        placeholder="Filter by exact email…"
        value={emailFilter}
        onChange={(e) => setEmailFilter(e.target.value)}
        className="max-w-sm"
      />

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No affiliate links yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Reward</th>
                <th className="px-3 py-2">Claimed</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{link.email}</td>
                  <td className="px-3 py-2">{link.displayName ?? "—"}</td>
                  <td className="px-3 py-2">{link.campaignId ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {link.rewardMonths} mo
                  </td>
                  <td className="px-3 py-2">
                    {link.claimed ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                        Claimed
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
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
                      onClick={() => void toggleActive(link)}
                    >
                      {link.isActive ? "Deactivate" : "Activate"}
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
            <DialogTitle>Issue affiliate link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">Affiliate email</Label>
              <Input
                id="email"
                type="email"
                placeholder="partner@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                The link can only be claimed by an account with this verified
                address.
              </p>
            </div>
            {(
              [
                ["displayName", "Display name (optional)", "Partner Co"],
                ["campaignId", "Campaign (optional)", "august_2026"],
                ["rewardMonths", "Reward months", "1"],
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
              <Label htmlFor="expiresAt">Expires (optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: e.target.value }))
                }
              />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !form.email.trim()}
              onClick={() => void handleCreate()}
            >
              {saving ? "Issuing…" : "Issue link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- the URL, shown once -------- */}
      <Dialog
        open={issuedUrl !== null}
        onOpenChange={(open) => !open && setIssuedUrl(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy this link now</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              This URL is shown once and cannot be recovered — only its hash is
              stored. If you close without copying it, issue a new link.
            </div>
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
              {issuedUrl}
            </code>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (issuedUrl) {
                  void navigator.clipboard.writeText(issuedUrl);
                  setCopied(true);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={() => setIssuedUrl(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
