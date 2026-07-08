import type {
  AiPendingApproval,
  WorkflowState,
  WorkflowSummary,
} from "@/auth/backend";

/** Non-terminal workflow states — shared by Applications card and Perks selection. */
export const ACTIVE_WORKFLOW_STATES: WorkflowState[] = [
  "CREATED",
  "WAITING_FOR_INPUT",
  "WAITING_FOR_VAULT_CONSENT",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTNER_ACTION",
];

/** States the engine advances without user input — poll for updates. */
export const AUTO_PROGRESS_WORKFLOW_STATES: WorkflowState[] = [
  "CREATED",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "WAITING_FOR_PARTNER_ACTION",
];

/** Mirrors backend workflow-state.util.ts isCancellableState. */
export const CANCELLABLE_WORKFLOW_STATES: WorkflowState[] = [
  "CREATED",
  "WAITING_FOR_INPUT",
  "WAITING_FOR_VAULT_CONSENT",
  "READY_TO_EXECUTE",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTNER_ACTION",
];

const ACTIVE_STATE_PRIORITY: Partial<Record<WorkflowState, number>> = {
  WAITING_FOR_VAULT_CONSENT: 0,
  WAITING_FOR_APPROVAL: 1,
  WAITING_FOR_INPUT: 2,
  WAITING_FOR_PARTNER_ACTION: 3,
  EXECUTING: 4,
  READY_TO_EXECUTE: 5,
  CREATED: 6,
};

export type WorkflowBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function workflowStateBadge(state: WorkflowState): {
  label: string;
  variant: WorkflowBadgeVariant;
} {
  switch (state) {
    case "COMPLETED":
      return { label: "Completed", variant: "default" };
    case "FAILED":
      return { label: "Failed", variant: "destructive" };
    case "CANCELLED":
      return { label: "Cancelled", variant: "outline" };
    case "WAITING_FOR_INPUT":
      return { label: "Needs info", variant: "secondary" };
    case "WAITING_FOR_VAULT_CONSENT":
      return { label: "Vault access needed", variant: "secondary" };
    case "WAITING_FOR_APPROVAL":
      return { label: "Needs approval", variant: "secondary" };
    case "WAITING_FOR_PARTNER_ACTION":
      return { label: "Partner review", variant: "secondary" };
    default:
      return { label: "In progress", variant: "secondary" };
  }
}

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

export function pendingVaultConsentFromWorkflows(
  workflows: WorkflowSummary[],
): WorkflowSummary | null {
  return (
    workflows.find(
      (workflow) => workflow.state === "WAITING_FOR_VAULT_CONSENT",
    ) ?? null
  );
}

export function humanizeWorkflowKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
