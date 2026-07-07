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
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  approveWorkflowStep,
  cancelWorkflow,
  getWorkflow,
  submitWorkflowInputs,
  type WorkflowDetailResult,
} from "@/auth/backend";
import { getUserProfileInformation, type ProfileQuestion } from "@/auth";
import { getVisibleWorkflowQuestionKeys } from "@/components/WorkflowQuestionFields";
import { getVaultAnswersValidationError } from "@/lib/vault-fields";
import { WorkflowMissingInputFields } from "@/components/WorkflowMissingInputFields";
import { WorkflowVaultConsentPanel } from "@/components/WorkflowVaultConsentPanel";
import {
  AUTO_PROGRESS_WORKFLOW_STATES,
  CANCELLABLE_WORKFLOW_STATES,
  workflowStateBadge,
} from "@/lib/workflow-ui";
import { useToast } from "@/hooks/use-toast";
import { trackPerksEvent } from "@/lib/product-analytics";

const POLL_INTERVAL_MS = 4000;

function humanize(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stepIcon(step: { status: string }) {
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
  onSettled?: () => void;
}

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
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
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

  const loadWorkflow = useCallback(
    async (id: string) => {
      const workflowRes = await getWorkflow(sessionToken, id);
      if (!workflowRes.ok || !workflowRes.data) {
        setError(workflowRes.error ?? "Failed to load application");
        setLoading(false);
        return;
      }
      setDetail({
        workflow: workflowRes.data.workflow,
        steps: workflowRes.data.steps,
      });
      setError(null);
      setLoading(false);
      if (!AUTO_PROGRESS_WORKFLOW_STATES.includes(workflowRes.data.workflow.state)) {
        clearPoll();
      }
    },
    [sessionToken, clearPoll],
  );

  const loadQuestions = useCallback(async () => {
    const profileRes = await getUserProfileInformation(sessionToken);
    if (profileRes.success) {
      setQuestions(profileRes.questions);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!open || !workflowId) return;
    settledNotified.current = false;
    setLoading(true);
    setDetail(null);
    setAnswers({});
    void loadWorkflow(workflowId);
    return () => {
      clearPoll();
    };
  }, [open, workflowId, loadWorkflow, clearPoll]);

  const workflowState = detail?.workflow.state;

  useEffect(() => {
    clearPoll();
    if (
      open &&
      workflowState &&
      AUTO_PROGRESS_WORKFLOW_STATES.includes(workflowState) &&
      workflowId
    ) {
      pollRef.current = setInterval(() => {
        void loadWorkflow(workflowId);
      }, POLL_INTERVAL_MS);
    }
    return clearPoll;
  }, [open, workflowState, workflowId, loadWorkflow, clearPoll]);

  useEffect(() => {
    if (open && workflowState === "WAITING_FOR_INPUT") {
      void loadQuestions();
    }
  }, [open, workflowState, loadQuestions]);

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
    if (!workflowState || settledNotified.current) return;
    if (
      workflowState === "COMPLETED" ||
      workflowState === "FAILED" ||
      workflowState === "CANCELLED"
    ) {
      settledNotified.current = true;
      onSettled?.();
    }
  }, [workflowState, onSettled]);

  const questionByKey = useMemo(() => {
    const map = new Map<string, ProfileQuestion>();
    for (const question of questions) map.set(question.key, question);
    return map;
  }, [questions]);

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
    const vaultValidationError = getVaultAnswersValidationError(
      visibleQuestionKeys,
      answers,
    );
    if (vaultValidationError) {
      setError(vaultValidationError);
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
  const badge = workflow ? workflowStateBadge(workflow.state) : null;

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

            {workflow.state === "WAITING_FOR_VAULT_CONSENT" && workflowId && (
              <WorkflowVaultConsentPanel
                sessionToken={sessionToken}
                workflowId={workflowId}
                submitting={submitting}
                setSubmitting={setSubmitting}
                onUpdated={(updated) => setDetail(updated)}
                showCancel
                onCancel={() => void handleCancel()}
              />
            )}

            {workflow.state === "WAITING_FOR_INPUT" && (
              <div className="space-y-4 rounded-md bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  We need a bit more information to continue.
                </p>
                <WorkflowMissingInputFields
                  visibleQuestionKeys={visibleQuestionKeys}
                  inputQuestions={workflow.inputQuestions}
                  questionByKey={questionByKey}
                  answers={answers}
                  onAnswerChange={(key, value) =>
                    setAnswers((current) => ({ ...current, [key]: value }))
                  }
                  disabled={submitting}
                  idPrefix="perk-workflow"
                />
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
          CANCELLABLE_WORKFLOW_STATES.includes(workflow.state) &&
          workflow.state !== "WAITING_FOR_APPROVAL" &&
          workflow.state !== "WAITING_FOR_VAULT_CONSENT" ? (
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
