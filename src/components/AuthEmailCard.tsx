import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
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

const dashOutlineBtn =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-[#dbe2ec] bg-white px-4 text-[13px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50";

const dashPrimaryBtn =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-[8px] bg-[#0f2040] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0f2040]/90 disabled:cursor-not-allowed disabled:opacity-50";

const dashGhostBtn =
  "inline-flex h-9 items-center px-3 text-[13px] font-semibold text-[#627086] hover:text-[#0f2040] disabled:cursor-not-allowed disabled:opacity-50";

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

  useEffect(() => {
    if (!embedded || !editing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        setEditing(false);
        setFormError(null);
        setNewEmail("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [embedded, editing, saving]);

  function closeEditModal() {
    if (saving) return;
    setEditing(false);
    setFormError(null);
    setNewEmail("");
  }

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

  // ── Dashboard Profile (branded card + modal) ──────────────────────────────
  if (embedded) {
    if (loading) {
      return (
        <div className={cn("flex items-center gap-2 text-[13px] text-[#627086]", className)}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      );
    }

    if (loadError) {
      return (
        <div className={cn("space-y-1", className)}>
          <p className="text-[13px] text-[#d14343]">{loadError}</p>
          <button type="button" className={dashGhostBtn} onClick={() => void loadStatus()}>
            Retry
          </button>
        </div>
      );
    }

    const changeEmailModal =
      editing && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100]">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/40"
                onClick={closeEditModal}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="change-email-title"
                className="absolute inset-x-0 bottom-0 z-10 flex max-h-[90dvh] w-full flex-col rounded-t-[16px] bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,560px)] sm:w-full sm:max-w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px]"
              >
                <form
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  onSubmit={(e) => void handleRequestChange(e)}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-[#e3e8f0] px-5 py-4 sm:px-6">
                    <h2
                      id="change-email-title"
                      className="text-[17px] font-semibold text-[#0f2040]"
                    >
                      Change email address
                    </h2>
                    <button
                      type="button"
                      aria-label="Close"
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#627086] hover:bg-[#f5f7fb] hover:text-[#0f2040]"
                      onClick={closeEditModal}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                    <div>
                      <label
                        htmlFor="auth-email-current"
                        className="text-[13px] font-semibold text-[#0f2040]"
                      >
                        Current email address
                      </label>
                      <Input
                        id="auth-email-current"
                        type="email"
                        value={email}
                        readOnly
                        className="mt-2 h-11 rounded-[8px] border-[#dbe2ec] bg-[#f8fafc] text-[14px] text-[#0f2040]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="auth-email-new"
                        className="text-[13px] font-semibold text-[#0f2040]"
                      >
                        New email address
                      </label>
                      <Input
                        id="auth-email-new"
                        type="email"
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        placeholder="Enter new email"
                        className="mt-2 h-11 rounded-[8px] border-[#dbe2ec] bg-white text-[14px] text-[#0f2040] placeholder:text-[#8d9ab1]"
                      />
                    </div>
                    {formError ? (
                      <p className="text-[13px] text-[#d14343]">{formError}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e3e8f0] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <button
                      type="button"
                      className={dashOutlineBtn}
                      disabled={saving}
                      onClick={closeEditModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={dashPrimaryBtn}
                      disabled={saving || !newEmail.trim()}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null;

    return (
      <div className={cn("space-y-4", className)}>
        {pending ? (
          <div className="space-y-3 rounded-[10px] border border-[#e3e8f0] bg-[#f8fafc] p-4">
            <p className="text-[14px] text-[#0f2040]">
              Waiting for verification of{" "}
              <span className="font-semibold">{pending.newEmail}</span>
            </p>
            <p className="text-[12px] text-[#627086]">
              Expires {new Date(pending.expiresAt).toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={dashOutlineBtn}
                disabled={saving}
                onClick={() => void handleResend()}
              >
                Resend verification
              </button>
              <button
                type="button"
                className={dashGhostBtn}
                disabled={saving}
                onClick={() => void handleCancel()}
              >
                Cancel change
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#627086]">
                Email address
              </p>
              <p className="mt-1 break-all text-[14px] font-medium text-[#0f2040]">
                {email}
              </p>
            </div>
            <button
              type="button"
              className={dashOutlineBtn}
              onClick={() => {
                setFormError(null);
                setNewEmail("");
                setEditing(true);
              }}
            >
              Change email
            </button>
          </div>
        )}
        {changeEmailModal}
      </div>
    );
  }

  // ── Workspace / Account (unchanged inline flow) ───────────────────────────
  const body = (
    <div className={cn(`${workspaceSectionSurface} space-y-4`, className)}>
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
            <p className="mt-1 break-all font-medium">{email}</p>
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
            <form
              className="space-y-3"
              onSubmit={(e) => void handleRequestChange(e)}
            >
              <div className="space-y-2">
                <Label htmlFor="auth-email-new-workspace">New email</Label>
                <Input
                  id="auth-email-new-workspace"
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
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !newEmail.trim()}
                >
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
  );

  return (
    <WorkspacePanel
      title="Authentication email"
      description="The email used for KeenVPN sign-in codes and magic links"
    >
      {body}
    </WorkspacePanel>
  );
}
