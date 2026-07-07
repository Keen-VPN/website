import type {
  AiPendingApproval,
  WorkflowState,
  WorkflowSummary,
} from "@/auth/backend";

/** Non-terminal workflow states — shared by Applications card and Perks selection. */
export const ACTIVE_WORKFLOW_STATES: WorkflowState[] = [
  "CREATED",
  "WAITING_FOR_INPUT",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTNER_ACTION",
];

const ACTIVE_STATE_PRIORITY: Partial<Record<WorkflowState, number>> = {
  WAITING_FOR_APPROVAL: 0,
  WAITING_FOR_INPUT: 1,
  WAITING_FOR_PARTNER_ACTION: 2,
  EXECUTING: 3,
  READY_TO_EXECUTE: 4,
  CREATED: 5,
};

/** Prefer workflows that need user action, then the most recently updated run. */
export function selectPrimaryActiveWorkflow(
  workflows: WorkflowSummary[],
): WorkflowSummary | undefined {
  const active = workflows.filter((workflow) =>
    ACTIVE_WORKFLOW_STATES.includes(workflow.state),
  );
  if (active.length === 0) return undefined;

  return active.sort((a, b) => {
    const priorityDiff =
      (ACTIVE_STATE_PRIORITY[a.state] ?? 99) -
      (ACTIVE_STATE_PRIORITY[b.state] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })[0];
}

export function pendingApprovalFromWorkflows(
  workflows: WorkflowSummary[],
): AiPendingApproval | null {
  const waiting = workflows.find(
    (workflow) => workflow.state === "WAITING_FOR_APPROVAL",
  );
  if (!waiting) return null;
  return {
    workflowId: waiting.id,
    stepKey: waiting.currentStepKey,
  };
}

export function humanizeWorkflowKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
