import { useCallback, useEffect, useRef, useState } from "react";
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
import { Loader2 } from "lucide-react";
import {
  getContactEmailStatus,
  isContactEmailRequired,
  saveContactEmail,
  sendContactEmailVerification,
} from "@/auth";

function isPrivateRelayEmail(email: string) {
  return email.endsWith("@privaterelay.appleid.com");
}

function isValidContactEmail(email: string) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

interface ContactEmailRequiredDialogProps {
  open: boolean;
  sessionToken: string;
  onCompleted: () => void;
}

export function ContactEmailRequiredDialog({
  open,
  sessionToken,
  onCompleted,
}: ContactEmailRequiredDialogProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const loadGenerationRef = useRef(0);

  const formLocked = !statusReady || loading || statusLoading;

  const loadStatus = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setStatusLoading(true);
    setStatusLoadError(null);
    setStatusReady(false);
    try {
      const status = await getContactEmailStatus(sessionToken);
      if (generation !== loadGenerationRef.current) return;
      if (!status.success) {
        setStatusLoadError(
          status.error ||
            "Could not load contact email status. Please try again.",
        );
        return;
      }
      if (!isContactEmailRequired(status)) {
        onCompleted();
        return;
      }
      setEmail(status.contactEmail ?? "");
      setPendingVerification(
        Boolean(status.contactEmail && !status.isVerified),
      );
      setError(null);
      setStatusReady(true);
    } finally {
      if (generation === loadGenerationRef.current) {
        setStatusLoading(false);
      }
    }
  }, [sessionToken, onCompleted]);

  useEffect(() => {
    if (!open) {
      loadGenerationRef.current += 1;
      setStatusReady(false);
      setStatusLoadError(null);
      return;
    }
    void loadStatus();
  }, [open, loadStatus]);

  useEffect(() => {
    if (!open || !pendingVerification || !statusReady) return;

    let cancelled = false;
    const checkVerified = async () => {
      const status = await getContactEmailStatus(sessionToken);
      if (cancelled) return;
      if (status.success && !isContactEmailRequired(status)) {
        onCompleted();
      }
    };

    const interval = window.setInterval(() => {
      void checkVerified();
    }, 8000);

    const onFocus = () => {
      void checkVerified();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [open, pendingVerification, statusReady, sessionToken, onCompleted]);

  async function handleVerify() {
    if (formLocked) return;
    const normalized = email.trim().toLowerCase();
    if (!isValidContactEmail(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    if (isPrivateRelayEmail(normalized)) {
      setError(
        "Please enter a reachable email address (not Apple Hide My Email).",
      );
      return;
    }

    setLoading(true);
    setError(null);
    const saved = await saveContactEmail(sessionToken, normalized);
    if (!saved.success) {
      setError(saved.error || "Could not save this email.");
      setLoading(false);
      return;
    }
    const sent = await sendContactEmailVerification(sessionToken);
    setLoading(false);
    if (!sent.success) {
      setError(sent.error || "Saved, but the verification email was not sent.");
      return;
    }
    setPendingVerification(true);
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        hideCloseButton
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add your email</DialogTitle>
          <DialogDescription>
            Enter an email address where you can receive important KeenVPN
            account and subscription updates.
          </DialogDescription>
        </DialogHeader>
        {statusLoadError ? (
          <p className="text-sm text-red-500">{statusLoadError}</p>
        ) : null}
        {pendingVerification ? (
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <strong>{email}</strong>. Open that
            email to finish setting up your account. This window stays open
            until the address is verified.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email Address</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={formLocked}
          />
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <DialogFooter>
          {statusLoadError ? (
            <Button onClick={() => void loadStatus()} disabled={statusLoading}>
              {statusLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry"
              )}
            </Button>
          ) : (
            <Button onClick={() => void handleVerify()} disabled={formLocked}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : statusLoading || !statusReady ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : pendingVerification ? (
                "Resend verification"
              ) : (
                "Verify Email"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
