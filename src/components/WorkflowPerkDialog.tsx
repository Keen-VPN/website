import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  approveWorkflowStep,
  cancelWorkflow,
  getWorkflow,
  submitWorkflowInputs,
  type WorkflowDetailResult,
  type WorkflowState,
  type WorkflowStepRunData,
} from "@/auth/backend";
import {
  WorkflowQuestionField,
  getVisibleWorkflowQuestionKeys,
} from "@/components/WorkflowQuestionFields";
import { humanizeWorkflowKey } from "@/lib/workflow-ui";
import { useToast } from "@/hooks/use-toast";
import { trackPerksEvent } from "@/lib/product-analytics";

/** States that progress on their own (via cron/engine) — worth polling for updates.
 * Mirrors WorkflowsCard.tsx AUTO_PROGRESS_STATES. */
const AUTO_PROGRESS_STATES: WorkflowState[] = [
  "CREATED",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "WAITING_FOR_PARTNER_ACTION",
];

const CANCELLABLE_STATES: WorkflowState[] = [
  "CREATED",
  "WAITING_FOR_INPUT",
  "READY_TO_EXECUTE",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTNER_ACTION",
];

const POLL_INTERVAL_MS = 4000;

function humanize(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stateBadge(
  state: WorkflowState,
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (state) {
    case "COMPLETED":
      return { label: "Completed", variant: "default" };
    case "FAILED":
      return { label: "Failed", variant: "destructive" };
    case "CANCELLED":
      return { label: "Cancelled", variant: "outline" };
    case "WAITING_FOR_INPUT":
      return { label: "Needs info", variant: "secondary" };
    case "WAITING_FOR_APPROVAL":
      return { label: "Needs approval", variant: "secondary" };
    case "WAITING_FOR_PARTNER_ACTION":
      return { label: "Partner review", variant: "secondary" };
    default:
      return { label: "In progress", variant: "secondary" };
  }
}

function stepIcon(step: WorkflowStepRunData) {
  if (step.status === "COMPLETED") {
    return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />;
  }
  if (step.status === "FAILED") {
    return <XCircle className="h-4 w-4 text-destructive" aria-hidden />;
  }
  if (step.status === "RUNNING") {
    return (
      <Loader2
        className="h-4 w-4 animate-spin text-muted-foreground"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="h-4 w-4 rounded-full border border-muted-foreground/40"
      aria-hidden
    />
  );
}

interface WorkflowPerkDialogProps {
  open: boolean;
  sessionToken: string;
  workflowId: string | null;
  perkTitle: string;
  onOpenChange: (open: boolean) => void;
  /** Called after the workflow completes/is cancelled so the Perks list can refresh. */
  onSettled?: () => void;
}

/** Renders a Chase-style VIG questionnaire + step tracker as a dialog on the Perks page,
 * reusing the same field/step rendering as the account-dashboard WorkflowsCard. */
export function WorkflowPerkDialog({
  open,
  sessionToken,
  workflowId,
  perkTitle,
  onOpenChange,
  onSettled,
}: WorkflowPerkDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetailResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settledNotified = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (id: string) => {
      const res = await getWorkflow(sessionToken, id);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to load application");
        setLoading(false);
        return;
      }
      setDetail({ workflow: res.data.workflow, steps: res.data.steps });
      setError(null);
      setLoading(false);
      if (!AUTO_PROGRESS_STATES.includes(res.data.workflow.state)) {
        clearPoll();
      }
    },
    [sessionToken, clearPoll],
  );

  useEffect(() => {
    if (!open || !workflowId) return;
    settledNotified.current = false;
    setLoading(true);
    setDetail(null);
    setAnswers({});
    void load(workflowId);
    return () => {
      clearPoll();
    };
  }, [open, workflowId, load, clearPoll]);

  useEffect(() => {
    clearPoll();
    if (
      open &&
      detail &&
      AUTO_PROGRESS_STATES.includes(detail.workflow.state) &&
      workflowId
    ) {
      pollRef.current = setInterval(() => {
        void load(workflowId);
      }, POLL_INTERVAL_MS);
    }
    return clearPoll;
  }, [open, detail?.workflow.state, workflowId, load, clearPoll]);

  useEffect(() => {
    const keys = new Set(detail?.workflow.missingInputKeys ?? []);
    for (const question of detail?.workflow.inputQuestions ?? []) {
      keys.add(question.key);
    }
    if (keys.size > 0) {
      setAnswers((current) => {
        const next = { ...current };
        for (const key of keys) {
          if (!(key in next)) next[key] = "";
        }
        return next;
      });
    }
  }, [detail?.workflow.missingInputKeys, detail?.workflow.inputQuestions]);

  useEffect(() => {
    if (!detail || settledNotified.current) return;
    if (
      detail.workflow.state === "COMPLETED" ||
      detail.workflow.state === "FAILED" ||
      detail.workflow.state === "CANCELLED"
    ) {
      settledNotified.current = true;
      onSettled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.workflow.state]);

  const visibleQuestionKeys = useMemo(() => {
    if (!detail) return [];
    return getVisibleWorkflowQuestionKeys({
      missingInputKeys: detail.workflow.missingInputKeys,
      inputQuestions: detail.workflow.inputQuestions,
      answers,
    });
  }, [detail, answers]);

  async function handleSubmitInputs() {
    if (!detail) return;
    const missing = detail.workflow.missingInputKeys;
    const missingUnanswered = missing.filter(
      (key) => !(answers[key] ?? "").trim(),
    );
    if (missingUnanswered.length > 0) {
      setError("Please answer all questions above before continuing.");
      return;
    }
    const sanitized = Object.fromEntries(
      visibleQuestionKeys
        .map((key) => [key, (answers[key] ?? "").trim()])
        .filter(([, value]) => value.length > 0),
    );
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitWorkflowInputs(
        sessionToken,
        detail.workflow.id,
        sanitized,
      );
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to submit information");
        return;
      }
      setDetail({ workflow: res.data.workflow, steps: res.data.steps });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!detail?.workflow.currentStepKey) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await approveWorkflowStep(
        sessionToken,
        detail.workflow.id,
        detail.workflow.currentStepKey,
      );
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to approve step");
        return;
      }
      setDetail({ workflow: res.data.workflow, steps: res.data.steps });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await cancelWorkflow(sessionToken, detail.workflow.id);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to cancel application");
        return;
      }
      trackPerksEvent("perk_workflow_cancelled", {
        workflowId: detail.workflow.id,
      });
      toast({ title: "Application cancelled" });
      onSettled?.();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const workflow = detail?.workflow;
  const badge = workflow ? stateBadge(workflow.state) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{perkTitle}</DialogTitle>
          <DialogDescription>
            We&apos;ll only submit anything on your behalf after you
            explicitly approve it.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : !workflow ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-destructive">
              {error ?? "Could not load this application."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>

            <div className="space-y-1.5">
              <Progress value={workflow.completionPercent} />
              <p className="text-xs text-muted-foreground">
                {workflow.completionPercent}% complete
              </p>
            </div>

            {detail && detail.steps.length > 0 ? (
              <ul className="space-y-2">
                {detail.steps.map((step) => (
                  <li
                    key={step.stepKey}
                    className="flex items-center gap-2 text-sm"
                  >
                    {stepIcon(step)}
                    <span
                      className={
                        step.status === "COMPLETED"
                          ? "text-muted-foreground line-through"
                          : ""
                      }
                    >
                      {humanize(step.stepKey)}
                    </span>
                    {step.requiresApproval && step.status !== "COMPLETED" && (
                      <Badge variant="outline" className="text-[10px]">
                        Needs approval
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}

            {workflow.state === "WAITING_FOR_INPUT" && (
              <div className="space-y-4 rounded-md bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  We need a bit more information to continue.
                </p>
                {visibleQuestionKeys.map((key) => {
                  const question = workflow.inputQuestions?.find(
                    (q) => q.key === key,
                  );
                  if (question) {
                    return (
                      <WorkflowQuestionField
                        key={key}
                        question={question}
                        value={answers[key] ?? ""}
                        onChange={(value) =>
                          setAnswers((current) => ({ ...current, [key]: value }))
                        }
                        disabled={submitting}
                        idPrefix="perk-workflow"
                      />
                    );
                  }
                  return (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`perk-workflow-${key}`}>
                        {humanizeWorkflowKey(key)}
                      </Label>
                      <Input
                        id={`perk-workflow-${key}`}
                        value={answers[key] ?? ""}
                        onChange={(e) =>
                          setAnswers((current) => ({
                            ...current,
                            [key]: e.target.value,
                          }))
                        }
                        disabled={submitting}
                      />
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  onClick={() => void handleSubmitInputs()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      Submitting…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            )}

            {workflow.state === "WAITING_FOR_APPROVAL" && (
              <div className="space-y-3 rounded-md bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  Your approval is needed for &quot;
                  {humanize(workflow.currentStepKey ?? "")}&quot; before we
                  continue. Nothing is submitted without your say-so.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleApprove()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : null}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCancel()}
                    disabled={submitting}
                  >
                    Cancel application
                  </Button>
                </div>
              </div>
            )}

            {(workflow.state === "CREATED" ||
              workflow.state === "READY_TO_EXECUTE" ||
              workflow.state === "EXECUTING") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Working on it — this updates automatically.
                </div>
              )}

            {workflow.state === "WAITING_FOR_PARTNER_ACTION" && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Chase is waiting for browser review or partner action. We will
                update this application after that step is completed.
              </div>
            )}

            {workflow.state === "COMPLETED" && (
              <div className="space-y-2 rounded-md bg-primary/10 p-3">
                <p className="text-sm font-medium text-primary">
                  Application completed successfully.
                </p>
              </div>
            )}

            {workflow.state === "FAILED" && (
              <div className="space-y-2 rounded-md bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  This application failed
                  {workflow.failureReason
                    ? `: ${workflow.failureReason}`
                    : "."}
                </p>
              </div>
            )}

            {workflow.state === "CANCELLED" && (
              <p className="text-sm text-muted-foreground">
                This application was cancelled.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {workflow &&
          CANCELLABLE_STATES.includes(workflow.state) &&
          workflow.state !== "WAITING_FOR_APPROVAL" ? (
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => void handleCancel()}
              disabled={submitting}
            >
              Cancel application
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
