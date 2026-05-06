import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMembershipTransferRequest,
  getSessionToken,
  submitMembershipTransferRequest,
  type MembershipTransferRequestData,
} from "@/auth/backend";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toIsoDate(d: string): string {
  const date = new Date(d + "T12:00:00");
  return date.toISOString();
}

function isAfterMinDate(dateValue: string, minDateValue: string): boolean {
  return dateValue.length > 0 && dateValue >= minDateValue;
}

export function MembershipTransferDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, authProvider } = useAuth();
  const [existing, setExisting] = useState<MembershipTransferRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setContactEmail("");
    const token = getSessionToken();
    if (!token) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await fetchMembershipTransferRequest(token);
      if (!cancelled) {
        setExisting(res.data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const minDate = (): string => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  };

  const requiresContactEmail =
    authProvider === "apple" &&
    Boolean(user?.email?.toLowerCase().endsWith("privaterelay.appleid.com"));

  const isValidContactEmail = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const canSubmit =
    isAfterMinDate(expiryDate, minDate()) &&
    (!requiresContactEmail || isValidContactEmail(contactEmail)) &&
    proofFile != null &&
    proofFile.size > 0;

  const onSubmit = async () => {
    const token = getSessionToken();
    if (!token) {
      toast({
        title: "Sign in required",
        description: "Please sign in to request a membership transfer.",
        variant: "destructive",
      });
      return;
    }
    if (!canSubmit) {
      toast({
        title: "Check the form",
        description: requiresContactEmail
          ? "A valid contact email, future expiry date, and proof upload are required."
          : "A future expiry date and proof upload are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitMembershipTransferRequest(token, {
        provider: "Competitor VPN",
        expiryDate: toIsoDate(expiryDate),
        contactEmail: requiresContactEmail ? contactEmail.trim() : undefined,
        proofFile,
      });
      if (res.success) {
        setSubmitted(true);
        setExisting(res.data ?? null);
        toast({
          title: "Request submitted",
          description:
            "Your request has been received. Most requests are reviewed within 24 hours.",
        });
      } else {
        if (res.data) {
          setExisting(res.data);
        }
        toast({
          title: "Could not submit",
          description: res.error ?? "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const presentAdminNote = (note: string | null | undefined): string => {
    if (!note) return "";
    return note.replace(
      "Auto-approved: competitor subscription expiry is within 1 month",
      "Auto-approved: subscription expiry is within 1 month",
    );
  };

  const isAutoApproved =
    existing?.status === "APPROVED" &&
    existing?.reviewedByAdminId === "system_auto_approval";

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen && isAutoApproved) {
      navigate("/account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Membership transfer</DialogTitle>
          <DialogDescription>
            Already have a VPN? Switch to KeenVPN today and we&apos;ll transfer your remaining
            membership time for free.
          </DialogDescription>
        </DialogHeader>

        {!getSessionToken() ? (
          <p className="text-sm text-muted-foreground">
            Sign in to submit a transfer request.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : existing ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Status:</span>{" "}
              {existing.status === "PENDING"
                ? "Pending — most requests are reviewed within 24 hours."
                : existing.status === "APPROVED"
                  ? `Approved — ${existing.approvedCreditDays ?? 0} day(s) of Keen credit were added to your account.`
                  : existing.status === "REJECTED"
                    ? "Rejected"
                    : existing.status.replace(/_/g, " ")}
            </p>
            {existing.status === "REJECTED" && existing.adminNote ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Reason: </span>
                {presentAdminNote(existing.adminNote)}
              </p>
            ) : existing.adminNote && existing.status !== "REJECTED" ? (
              <p className="text-muted-foreground">
                {presentAdminNote(existing.adminNote)}
              </p>
            ) : null}
          </div>
        ) : submitted ? (
          <p className="text-sm text-muted-foreground">
            Your request has been received. Most requests are reviewed within 24 hours.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mt-expiry">Subscription expiry</Label>
              <Input
                id="mt-expiry"
                type="date"
                min={minDate()}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            {requiresContactEmail ? (
              <div className="space-y-2">
                <Label htmlFor="mt-contact-email">Contact email (required)</Label>
                <Input
                  id="mt-contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="mt-proof-file">Upload proof image (required)</Label>
              <Input
                id="mt-proof-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          {getSessionToken() && !existing && !loading && !submitted ? (
            <Button type="button" onClick={() => void onSubmit()} disabled={submitting || !canSubmit}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
