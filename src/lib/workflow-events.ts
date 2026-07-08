/** Cross-component signal when workflow state may have changed (e.g. vault consent). */
export const WORKFLOW_UPDATED_EVENT = "keen:workflows-updated";

export function notifyWorkflowsUpdated(): void {
  window.dispatchEvent(new CustomEvent(WORKFLOW_UPDATED_EVENT));
}
