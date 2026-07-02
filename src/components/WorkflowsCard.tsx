import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  approveWorkflowStep,
  cancelWorkflow,
  createWorkflow,
  getWorkflow,
  listWorkflows,
  submitWorkflowInputs,
  type WorkflowDetailResult,
  type WorkflowState,
  type WorkflowStepRunData,
  type WorkflowSummary,
} from "@/auth/backend";
import { getUserProfileInformation, type ProfileQuestion } from "@/auth";

interface WorkflowsCardProps {
  sessionToken: string;
}

/** The one workflow type available to users in this phase — see backend workflow-types/index.ts. */
const DEMO_WORKFLOW_TYPE = "demo_partner_signup";

const ACTIVE_STATES: WorkflowState[] = [
  "CREATED",
  "WAITING_FOR_INPUT",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "WAITING_FOR_APPROVAL",
];

/** States that progress on their own (via cron/engine) and are worth polling for updates.
 * WAITING_FOR_INPUT / WAITING_FOR_APPROVAL only change once the user acts, so no need to poll those. */
const AUTO_PROGRESS_STATES: WorkflowState[] = [
  "CREATED",
  "READY_TO_EXECUTE",
  "EXECUTING",
];

/** Mirrors backend workflow-state.util.ts isCancellableState — EXECUTING is intentionally
 * excluded since a step run may already be in flight when the cancel request arrives. */
const CANCELLABLE_STATES: WorkflowState[] = [
  "CREATED",
  "WAITING_FOR_INPUT",
  "READY_TO_EXECUTE",
  "WAITING_FOR_APPROVAL",
];

const POLL_INTERVAL_MS = 4000;

function humanize(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stateBadge(state: WorkflowState): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
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
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />;
  }
  return (
    <span
      className="h-4 w-4 rounded-full border border-muted-foreground/40"
      aria-hidden
    />
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkflowsCard({ sessionToken }: WorkflowsCardProps) {
  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkflowSummary[]>([]);
  const [active, setActive] = useState<WorkflowDetailResult | null>(null);
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadGeneration = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadActive = useCallback(
    async (workflowId: string) => {
      const res = await getWorkflow(sessionToken, workflowId);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to load workflow");
        return;
      }
      setActive({ workflow: res.data.workflow, steps: res.data.steps });
      if (!ACTIVE_STATES.includes(res.data.workflow.state)) {
        clearPoll();
      }
    },
    [sessionToken, clearPoll],
  );

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    setFeatureDisabled(false);

    const [listRes, profileRes] = await Promise.all([
      listWorkflows(sessionToken),
      getUserProfileInformation(sessionToken),
    ]);
    if (generation !== loadGeneration.current) return;

    if (!listRes.ok || !listRes.data) {
      if (listRes.error?.includes("not available")) {
        setFeatureDisabled(true);
      } else {
        setError(listRes.error ?? "Could not load workflows.");
      }
      setLoading(false);
      return;
    }

    if (profileRes.success) {
      setQuestions(profileRes.questions);
    }

    const workflows = listRes.data.workflows;
    const activeSummary = workflows.find((w) => ACTIVE_STATES.includes(w.state));
    setHistory(workflows.filter((w) => w !== activeSummary));

    if (activeSummary) {
      await loadActive(activeSummary.id);
    } else {
      setActive(null);
    }
    setLoading(false);
  }, [sessionToken, loadActive]);

  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current += 1;
      clearPoll();
    };
  }, [load, clearPoll]);

  useEffect(() => {
    clearPoll();
    if (active && AUTO_PROGRESS_STATES.includes(active.workflow.state)) {
      pollRef.current = setInterval(() => {
        void loadActive(active.workflow.id);
      }, POLL_INTERVAL_MS);
    }
    return clearPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.workflow.id, active?.workflow.state]);

  useEffect(() => {
    if (active?.workflow.missingInputKeys?.length) {
      setAnswers((current) => {
        const next = { ...current };
        for (const key of active.workflow.missingInputKeys) {
          if (!(key in next)) next[key] = "";
        }
        return next;
      });
    }
  }, [active?.workflow.missingInputKeys]);

  const questionByKey = useMemo(() => {
    const map = new Map<string, ProfileQuestion>();
    for (const question of questions) map.set(question.key, question);
    return map;
  }, [questions]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await createWorkflow(sessionToken, DEMO_WORKFLOW_TYPE);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to start workflow");
        return;
      }
      if (active && !ACTIVE_STATES.includes(active.workflow.state)) {
        setHistory((current) => [active.workflow, ...current]);
      }
      setActive({ workflow: res.data.workflow, steps: res.data.steps });
      setAnswers({});
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmitInputs() {
    if (!active) return;
    const missing = active.workflow.missingInputKeys;
    const sanitized = Object.fromEntries(
      missing
        .map((key) => [key, (answers[key] ?? "").trim()])
        .filter(([, value]) => value.length > 0),
    );
    if (Object.keys(sanitized).length < missing.length) {
      setError("Please answer all questions above before continuing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitWorkflowInputs(sessionToken, active.workflow.id, sanitized);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to submit information");
        return;
      }
      setActive({ workflow: res.data.workflow, steps: res.data.steps });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!active?.workflow.currentStepKey) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await approveWorkflowStep(
        sessionToken,
        active.workflow.id,
        active.workflow.currentStepKey,
      );
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to approve step");
        return;
      }
      setActive({ workflow: res.data.workflow, steps: res.data.steps });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await cancelWorkflow(sessionToken, active.workflow.id);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Failed to cancel workflow");
        return;
      }
      setActive(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (featureDisabled) {
    return null;
  }

  const badge = active ? stateBadge(active.workflow.state) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Applications
        </CardTitle>
        <CardDescription>
          Let KeenVPN guide you through partner applications, step by step. We&apos;ll
          only submit anything on your behalf after you explicitly approve it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!active ? (
          <div className="rounded-md border border-dashed p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No application in progress. Try our demo partner application to
              see how KeenVPN can complete applications for you.
            </p>
            <Button onClick={() => void handleStart()} disabled={starting}>
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Starting…
                </>
              ) : (
                "Start demo application"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {active.workflow.partnerName ?? humanize(active.workflow.workflowType)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Started {formatDate(active.workflow.startedAt ?? active.workflow.createdAt)}
                </p>
              </div>
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>

            <div className="space-y-1.5">
              <Progress value={active.workflow.completionPercent} />
              <p className="text-xs text-muted-foreground">
                {active.workflow.completionPercent}% complete
              </p>
            </div>

            <ul className="space-y-2">
              {active.steps.map((step) => (
                <li key={step.stepKey} className="flex items-center gap-2 text-sm">
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

            {active.workflow.state === "WAITING_FOR_INPUT" && (
              <div className="space-y-4 rounded-md bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  We need a bit more information to continue.
                </p>
                {active.workflow.missingInputKeys.map((key) => {
                  const question = questionByKey.get(key);
                  return (
                    <div key={key} className="space-y-2">
                      <Label>{question?.label ?? humanize(key)}</Label>
                      {question?.options?.length ? (
                        <RadioGroup
                          value={answers[key] ?? ""}
                          onValueChange={(value) =>
                            setAnswers((current) => ({ ...current, [key]: value }))
                          }
                          className="space-y-1.5"
                        >
                          {question.options.map((option) => (
                            <div key={option.value} className="flex items-center gap-2">
                              <RadioGroupItem
                                value={option.value}
                                id={`${key}-${option.value}`}
                                disabled={submitting}
                              />
                              <Label htmlFor={`${key}-${option.value}`} className="font-normal">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <Input
                          value={answers[key] ?? ""}
                          onChange={(e) =>
                            setAnswers((current) => ({ ...current, [key]: e.target.value }))
                          }
                          disabled={submitting}
                        />
                      )}
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            )}

            {active.workflow.state === "WAITING_FOR_APPROVAL" && (
              <div className="space-y-3 rounded-md bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  Your approval is needed for &quot;
                  {humanize(active.workflow.currentStepKey ?? "")}&quot; before we
                  continue. Nothing is submitted without your say-so.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void handleApprove()} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
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

            {(active.workflow.state === "CREATED" ||
              active.workflow.state === "READY_TO_EXECUTE" ||
              active.workflow.state === "EXECUTING") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Working on it — this page updates automatically.
              </div>
            )}

            {active.workflow.state === "COMPLETED" && (
              <div className="space-y-2 rounded-md bg-primary/10 p-3">
                <p className="text-sm font-medium text-primary">
                  Application completed successfully.
                </p>
                <Button size="sm" variant="outline" onClick={() => void handleStart()} disabled={starting}>
                  Start another
                </Button>
              </div>
            )}

            {active.workflow.state === "FAILED" && (
              <div className="space-y-2 rounded-md bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  This application failed
                  {active.workflow.failureReason ? `: ${active.workflow.failureReason}` : "."}
                </p>
                <Button size="sm" variant="outline" onClick={() => void handleStart()} disabled={starting}>
                  Try again
                </Button>
              </div>
            )}

            {active.workflow.state !== "WAITING_FOR_APPROVAL" &&
              CANCELLABLE_STATES.includes(active.workflow.state) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => void handleCancel()}
                  disabled={submitting}
                >
                  Cancel application
                </Button>
              )}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? (
                <>
                  Hide history <ChevronUp className="ml-1 h-3 w-3" aria-hidden />
                </>
              ) : (
                <>
                  Show history ({history.length}){" "}
                  <ChevronDown className="ml-1 h-3 w-3" aria-hidden />
                </>
              )}
            </Button>
            {showHistory && (
              <ul className="mt-2 divide-y rounded-md border">
                {history.map((workflow) => {
                  const historyBadge = stateBadge(workflow.state);
                  return (
                    <li
                      key={workflow.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">
                          {workflow.partnerName ?? humanize(workflow.workflowType)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(workflow.completedAt ?? workflow.createdAt)}
                        </p>
                      </div>
                      <Badge variant={historyBadge.variant}>{historyBadge.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
