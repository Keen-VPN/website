import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import {
  approveWorkflowVaultAccess,
  denyWorkflowVaultAccess,
  getWorkflowVaultAccess,
  type VaultAccessRequestInfo,
  type WorkflowDetailResult,
} from "@/auth/backend";
import { notifyWorkflowsUpdated } from "@/lib/workflow-events";

interface WorkflowVaultConsentPanelProps {
  sessionToken: string;
  workflowId: string;
  onUpdated: (detail: WorkflowDetailResult) => void;
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  showCancel?: boolean;
  onCancel?: () => void;
}

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function WorkflowVaultConsentPanel({
  sessionToken,
  workflowId,
  onUpdated,
  submitting,
  setSubmitting,
  showCancel,
  onCancel,
}: WorkflowVaultConsentPanelProps) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<VaultAccessRequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getWorkflowVaultAccess(sessionToken, workflowId);
    if (!res.ok) {
      setRequest(null);
      setError(res.error ?? "Could not load vault access request");
    } else {
      setRequest(res.data?.request ?? null);
    }
    setLoading(false);
  }, [sessionToken, workflowId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await approveWorkflowVaultAccess(sessionToken, workflowId);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to approve vault access");
        return;
      }
      onUpdated({ workflow: res.data.workflow, steps: res.data.steps });
      notifyWorkflowsUpdated();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeny() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await denyWorkflowVaultAccess(sessionToken, workflowId);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to deny vault access");
        return;
      }
      onUpdated({ workflow: res.data.workflow, steps: res.data.steps });
      notifyWorkflowsUpdated();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading vault access request…
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-3 rounded-md bg-muted/40 p-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No pending vault access request was found.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          If you haven&apos;t stored the required details yet, add them in your{" "}
          <a href="#vault" className="font-medium underline">
            Secure Vault
          </a>{" "}
          and refresh this page.
        </p>
        {error ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={submitting}
          >
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            This application needs access to information in your secure vault
          </p>
          <p className="text-sm text-muted-foreground">
            We found the required details already stored. Approve access so this
            workflow can use them — nothing is shared with the partner until you
            approve the final submission step.
          </p>
        </div>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {request.fields.map((field) => (
          <li key={field.fieldKey}>{field.label}</li>
        ))}
      </ul>
      {request.expiresAt ? (
        <p className="text-xs text-muted-foreground">
          This request expires {formatExpiry(request.expiresAt)}.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void handleApprove()} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Allow access
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleDeny()}
          disabled={submitting}
        >
          Deny
        </Button>
        {showCancel && onCancel ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel application
          </Button>
        ) : null}
      </div>
    </div>
  );
}
