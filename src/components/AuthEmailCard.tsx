import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { workspaceSectionSurface } from "@/components/workspace/workspace-ui";
import {
  cancelAuthEmailChange,
  getAuthEmailStatus,
  requestAuthEmailChange,
  resendAuthEmailChange,
  type AuthEmailPending,
} from "@/auth/backend";
import { cn } from "@/lib/utils";

interface AuthEmailCardProps {
  sessionToken: string;
  onEmailUpdated?: (email: string) => void;
  /** Skip WorkspacePanel chrome (e.g. dashboard Profile card). */
  embedded?: boolean;
  className?: string;
}

export function AuthEmailCard({
  sessionToken,
  onEmailUpdated,
  embedded = false,
  className,
}: AuthEmailCardProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<AuthEmailPending | null>(null);
  const [hasLinkedOAuth, setHasLinkedOAuth] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const onEmailUpdatedRef = useRef(onEmailUpdated);

  useEffect(() => {
    onEmailUpdatedRef.current = onEmailUpdated;
  }, [onEmailUpdated]);

  const loadStatus = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(null);
    const response = await getAuthEmailStatus(sessionToken);
    if (generation !== loadGeneration.current) return;
    if (response.success && response.email) {
      setEmail(response.email);
      setPending(response.pending ?? null);
      setHasLinkedOAuth(Boolean(response.hasLinkedOAuth));
      onEmailUpdatedRef.current?.(response.email);
    } else {
      setLoadError(response.error ?? "Could not load authentication email");
    }
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void loadStatus();
    return () => {
      loadGeneration.current += 1;
    };
  }, [loadStatus]);

  async function handleRequestChange(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      setFormError("Enter a new email address.");
      return;
    }
    if (trimmed === email.trim().toLowerCase()) {
      setFormError("That is already your current login email.");
      return;
    }
    setSaving(true);
    const response = await requestAuthEmailChange(sessionToken, trimmed);
    setSaving(false);
    if (!response.success) {
      setFormError(response.error ?? "Could not start email change");
      return;
    }
    setPending(response.pending ?? null);
    setEditing(false);
    setNewEmail("");
    toast({
      title: "Verification email sent",
      description:
        response.message ??
        "Check the new inbox to confirm your login email change.",
    });
  }

  async function handleResend() {
    setSaving(true);
    const response = await resendAuthEmailChange(sessionToken);
    setSaving(false);
    if (!response.success) {
      toast({
        title: "Could not resend verification",
        description: response.error ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setPending(response.pending ?? null);
    toast({
      title: "Verification email resent",
      description: response.message ?? "Check the new inbox again.",
    });
  }

  async function handleCancel() {
    setSaving(true);
    const response = await cancelAuthEmailChange(sessionToken);
    setSaving(false);
    if (!response.success) {
      toast({
        title: "Could not cancel change",
        description: response.error ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setPending(null);
    toast({
      title: "Email change cancelled",
      description: response.message ?? "Your current login email is unchanged.",
    });
  }

  const muted = embedded ? "text-dash-muted" : "text-muted-foreground";
  const ink = embedded ? "text-dash-ink" : undefined;
  const pendingBox = embedded
    ? "space-y-3 rounded-[10px] border border-dash-border bg-dash-surface-muted p-4"
    : "space-y-3 rounded-md border border-border bg-muted/30 p-3";

  const body = (
    <div
      className={cn(
        embedded ? "space-y-4" : `${workspaceSectionSurface} space-y-4`,
        className,
      )}
    >
      {loading ? (
        <div className={cn("flex items-center gap-2 text-sm", muted)}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : loadError ? (
        <div className="space-y-1">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => void loadStatus()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {!embedded ? (
            <div>
              <Label className="text-muted-foreground">Current email</Label>
              <p className="mt-1 break-all font-medium">{email}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Used for sign-in codes and magic links.
                {hasLinkedOAuth
                  ? " Linked Google or Apple sign-in still opens this account."
                  : ""}
              </p>
            </div>
          ) : null}

          {pending ? (
            <div className={pendingBox}>
              <p className={cn("text-sm", ink)}>
                Waiting for verification of{" "}
                <span className="font-medium">{pending.newEmail}</span>
              </p>
              <p className={cn("text-xs", muted)}>
                Expires {new Date(pending.expiresAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleResend()}
                >
                  Resend verification
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void handleCancel()}
                >
                  Cancel change
                </Button>
              </div>
            </div>
          ) : editing ? (
            <form className="space-y-3" onSubmit={(e) => void handleRequestChange(e)}>
              <div className="space-y-2">
                <Label htmlFor="auth-email-new">New email</Label>
                <Input
                  id="auth-email-new"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className={
                    embedded
                      ? "h-10 rounded-[8px] border-dash-border-strong"
                      : undefined
                  }
                />
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={saving || !newEmail.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send verification"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setFormError(null);
                    setNewEmail("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : embedded ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Label className={cn(muted, "text-[12px] font-medium")}>
                  Email address
                </Label>
                <p className="mt-1 break-all text-[14px] font-medium text-dash-ink">
                  {email}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0 rounded-[8px] border-dash-ink/25 text-dash-ink"
                onClick={() => setEditing(true)}
              >
                Change email
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Change email
            </Button>
          )}
        </>
      )}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <WorkspacePanel
      title="Authentication email"
      description="The email used for KeenVPN sign-in codes and magic links"
    >
      {body}
    </WorkspacePanel>
  );
}
