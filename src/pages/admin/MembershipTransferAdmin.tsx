import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminApproveTransferRequest,
  adminFetchTransferProofView,
  adminListTransferRequests,
  adminRejectTransferRequest,
  BACKEND_URL,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

type ProofMetadata = {
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  uploadedAt: string | null;
  proofHashPrefix: string | null;
};

type Row = {
  id: string;
  userId: string;
  userEmail?: string;
  userAccountCreatedAt?: string;
  provider: string;
  expiryDate: string;
  proofUrl: string;
  hasUploadedProof?: boolean;
  hasS3Proof?: boolean;
  status: string;
  requestedCreditDays: number;
  approvedCreditDays: number | null;
  adminNote: string | null;
  createdAt: string;
  riskScore?: number;
  riskFlags?: string[];
  proofMetadata?: ProofMetadata;
  billingAlignmentStatus?: string;
  ledgerBillingAlignmentStatus?: string | null;
};

function accountAgeLabel(iso: string | undefined): string {
  if (!iso) return "—";
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return "—";
  const days = Math.floor((Date.now() - created.getTime()) / (86400 * 1000));
  if (days < 1) return "<1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return `${months} mo (${days} d)`;
}

export default function MembershipTransferAdmin() {
  const { admin, logout, can } = useAdminAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofZoom, setProofZoom] = useState(1);
  const [approveDays, setApproveDays] = useState("30");
  const [adminNote, setAdminNote] = useState("");

  const canApprove = can("membership_transfer.approve");
  const canReject = can("membership_transfer.reject");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListTransferRequests("PENDING");
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error ?? "Failed to load");
      setRows([]);
      return;
    }
    setRows(res.data as Row[]);
  }, []);

  const revokeProofObjectUrl = () => {
    if (proofUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(proofUrl);
    }
  };

  const loadProof = async (row: Row) => {
    setSelected(row);
    setProofUrl(null);
    setProofZoom(1);
    setApproveDays(String(Math.min(30, row.requestedCreditDays)));
    setAdminNote("");
    setError(null);
    setModalOpen(true);
    const view = await adminFetchTransferProofView(row.id);
    if (!view.ok || !view.data) {
      setError(view.error ?? "Could not load proof");
      return;
    }
    const d = view.data;
    if (d.kind === "presigned" || d.kind === "public") {
      setProofUrl(d.viewUrl);
      return;
    }
    const origin = new URL(BACKEND_URL).origin;
    const res = await fetch(`${origin}${d.binaryPath}`, {
      credentials: "include",
    });
    if (!res.ok) {
      setError("Could not load proof image");
      return;
    }
    const blob = await res.blob();
    setProofUrl(URL.createObjectURL(blob));
  };

  useEffect(() => {
    return () => {
      revokeProofObjectUrl();
    };
  }, []);

  const closeModal = (open: boolean) => {
    if (!open) {
      revokeProofObjectUrl();
      setModalOpen(false);
      setSelected(null);
      setProofUrl(null);
    }
  };

  const maxApprove = (r: Row) => Math.min(r.requestedCreditDays, 180);

  const approve = async (daysOverride?: number) => {
    if (!selected || !canApprove) return;
    const days = daysOverride ?? Number(approveDays);
    if (!Number.isFinite(days) || days < 1 || days > 180) {
      setError("approvedCreditDays must be 1–180");
      return;
    }
    const cap = maxApprove(selected);
    if (days > cap) {
      setError(`For this request, max is ${cap} days`);
      return;
    }
    const res = await adminApproveTransferRequest(selected.id, {
      approvedCreditDays: days,
      adminNote: adminNote.trim() || undefined,
    });
    if (!res.success) {
      setError(res.error ?? "Approve failed");
      return;
    }
    closeModal(false);
    setAdminNote("");
    await refresh();
  };

  const reject = async () => {
    if (!selected || !canReject) return;
    const note = adminNote.trim();
    if (!note) {
      setError("Rejection requires a note (may be shown to the user).");
      return;
    }
    const res = await adminRejectTransferRequest(selected.id, {
      adminNote: note,
    });
    if (!res.success) {
      setError(res.error ?? "Reject failed");
      return;
    }
    closeModal(false);
    setAdminNote("");
    await refresh();
  };

  const signOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Membership transfer</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Signed in as {admin?.email} ({admin?.role}). Actions are limited by your role.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading…" : "Refresh pending"}
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">User</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Expiry</th>
                <th className="p-3">Days</th>
                <th className="p-3">Risk</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.userEmail ?? r.userId}</td>
                  <td className="p-3">{r.provider}</td>
                  <td className="p-3">{r.expiryDate?.slice(0, 10)}</td>
                  <td className="p-3">{r.requestedCreditDays}</td>
                  <td className="p-3">
                    <span className="font-mono tabular-nums">{r.riskScore ?? 0}</span>
                    {r.riskFlags && r.riskFlags.length > 0 ? (
                      <span className="text-muted-foreground text-xs block truncate max-w-[8rem]">
                        {r.riskFlags.join(", ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <Button type="button" size="sm" variant="outline" onClick={() => void loadProof(r)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading ? (
            <p className="p-6 text-muted-foreground text-sm">No pending requests.</p>
          ) : null}
        </div>

        <Dialog open={modalOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review transfer request</DialogTitle>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">User</span>
                    <p className="font-medium">{selected.userEmail ?? selected.userId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account age</span>
                    <p className="font-medium">{accountAgeLabel(selected.userAccountCreatedAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Provider</span>
                    <p className="font-medium">{selected.provider}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Competitor expiry</span>
                    <p className="font-medium">{selected.expiryDate?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested credit (days)</span>
                    <p className="font-medium">{selected.requestedCreditDays}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk score</span>
                    <p className="font-medium">
                      {selected.riskScore ?? 0}
                      {selected.riskFlags && selected.riskFlags.length > 0 ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({selected.riskFlags.join(", ")})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {selected.riskFlags && selected.riskFlags.length > 0 ? (
                    <div className="sm:col-span-2 flex flex-wrap gap-1">
                      {selected.riskFlags.map((f) => (
                        <span
                          key={f}
                          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-900 dark:text-amber-100"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Proof metadata</span>
                    <p className="font-mono text-xs mt-1 break-all">
                      {selected.proofMetadata
                        ? [
                            selected.proofMetadata.mimeType ?? "—",
                            selected.proofMetadata.sizeBytes != null
                              ? `${selected.proofMetadata.sizeBytes} B`
                              : "—",
                            selected.proofMetadata.originalFilename ?? "—",
                            selected.proofMetadata.uploadedAt ?? "—",
                            selected.proofMetadata.proofHashPrefix
                              ? `hash…${selected.proofMetadata.proofHashPrefix}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Billing alignment</span>
                    <p className="font-medium">
                      {selected.billingAlignmentStatus ?? "not_required"}
                      {selected.ledgerBillingAlignmentStatus
                        ? ` (ledger: ${selected.ledgerBillingAlignmentStatus})`
                        : ""}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label>Proof preview</Label>
                    <div className="flex gap-1">
                      {[1, 1.5, 2].map((z) => (
                        <Button
                          key={z}
                          type="button"
                          size="sm"
                          variant={proofZoom === z ? "default" : "outline"}
                          onClick={() => setProofZoom(z)}
                        >
                          {z}×
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[50vh] rounded-md border border-border bg-muted/30 flex items-center justify-center p-2">
                    {proofUrl ? (
                      <img
                        src={proofUrl}
                        alt="Proof"
                        className="max-w-full h-auto transition-transform duration-150"
                        style={{ transform: `scale(${proofZoom})`, transformOrigin: "center top" }}
                      />
                    ) : (
                      <p className="text-muted-foreground py-12">Loading proof…</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Credit days (max {maxApprove(selected)})</Label>
                    <Input
                      value={approveDays}
                      onChange={(e) => setApproveDays(e.target.value)}
                      type="number"
                      min={1}
                      max={maxApprove(selected)}
                      disabled={!canApprove}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!canApprove}
                        onClick={() => void approve(30)}
                      >
                        Approve 30 days
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!canApprove}
                        onClick={() => void approve(90)}
                      >
                        Approve 90 days
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!canApprove}
                        onClick={() => void approve(maxApprove(selected))}
                      >
                        Approve max ({maxApprove(selected)})
                      </Button>
                    </div>
                    <Button type="button" disabled={!canApprove} onClick={() => void approve()}>
                      Approve (use days above)
                    </Button>
                    {!canApprove ? (
                      <p className="text-xs text-muted-foreground">
                        Your role cannot approve transfers.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Note — optional for approve, required for reject</Label>
                    <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={4} />
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!canReject}
                      onClick={() => void reject()}
                    >
                      Reject
                    </Button>
                    {!canReject ? (
                      <p className="text-xs text-muted-foreground">
                        Your role cannot reject transfers.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
