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

interface AuthEmailCardProps {
  sessionToken: string;
  onEmailUpdated?: (email: string) => void;
}

export function AuthEmailCard({
  sessionToken,
  onEmailUpdated,
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

  return (
    <WorkspacePanel
      title="Authentication email"
      description="The email used for KeenVPN sign-in codes and magic links"
    >
      <div className={`${workspaceSectionSurface} space-y-4`}>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <div>
              <Label className="text-muted-foreground">Current email</Label>
              <p className="mt-1 font-medium break-all">{email}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Used for sign-in codes and magic links.
                {hasLinkedOAuth
                  ? " Linked Google or Apple sign-in still opens this account."
                  : ""}
              </p>
            </div>

            {pending ? (
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm">
                  Waiting for verification of{" "}
                  <span className="font-medium">{pending.newEmail}</span>
                </p>
                <p className="text-xs text-muted-foreground">
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
              <form className="space-y-3" onSubmit={handleRequestChange}>
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
    </WorkspacePanel>
  );
}
