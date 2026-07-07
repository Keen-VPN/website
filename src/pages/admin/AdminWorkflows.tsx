import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminGetWorkflow,
  adminListWorkflows,
  adminUpdateWorkflowHandoffStatus,
  type AdminWorkflowDetailResult,
  type AdminWorkflowSummary,
  type WorkflowExecutionHandoff,
  type WorkflowExecutionHandoffStatus,
  type WorkflowState,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const WORKFLOW_STATES: Array<WorkflowState | ""> = [
  "",
  "CREATED",
  "WAITING_FOR_INPUT",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTNER_ACTION",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const TERMINAL_HANDOFF_STATUSES: WorkflowExecutionHandoffStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function stateTone(state: string) {
  if (state === "FAILED" || state === "CANCELLED") return "destructive";
  if (state === "COMPLETED") return "secondary";
  return "outline";
}

function metadataString(
  handoff: WorkflowExecutionHandoff,
  key: string,
): string | null {
  const value = handoff.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function metadataStringArray(
  handoff: WorkflowExecutionHandoff,
  key: string,
): string[] {
  const value = handoff.metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function HandoffAutomationMetadata({
  handoff,
}: {
  handoff: WorkflowExecutionHandoff;
}) {
  const adapterKind = metadataString(handoff, "adapterKind");
  const automationSessionId = metadataString(handoff, "automationSessionId");
  const reviewUrl = metadataString(handoff, "reviewUrl");
  const currentUrl = metadataString(handoff, "currentUrl");
  const filledFieldKeys = metadataStringArray(handoff, "filledFieldKeys");
  const unfilledFieldKeys = metadataStringArray(handoff, "unfilledFieldKeys");

  if (
    !adapterKind &&
    !automationSessionId &&
    !reviewUrl &&
    !currentUrl &&
    filledFieldKeys.length === 0 &&
    unfilledFieldKeys.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
      {adapterKind ? (
        <p>
          <span className="text-slate-500">Adapter:</span> {adapterKind}
        </p>
      ) : null}
      {automationSessionId ? (
        <p>
          <span className="text-slate-500">Session:</span> {automationSessionId}
        </p>
      ) : null}
      {reviewUrl ? (
        <p>
          <span className="text-slate-500">Review:</span>{" "}
          <a
            href={reviewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 underline-offset-4 hover:underline"
          >
            Open worker session
          </a>
        </p>
      ) : null}
      {currentUrl ? (
        <p className="break-all">
          <span className="text-slate-500">Current URL:</span> {currentUrl}
        </p>
      ) : null}
      {filledFieldKeys.length ? (
        <p>
          <span className="text-slate-500">Filled:</span>{" "}
          {filledFieldKeys.join(", ")}
        </p>
      ) : null}
      {unfilledFieldKeys.length ? (
        <p>
          <span className="text-slate-500">Needs manual mapping:</span>{" "}
          {unfilledFieldKeys.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function HandoffActions({
  handoff,
  disabled,
  onUpdate,
}: {
  handoff: WorkflowExecutionHandoff;
  disabled: boolean;
  onUpdate: (
    handoffId: string,
    status: WorkflowExecutionHandoffStatus,
  ) => Promise<void>;
}) {
  if (TERMINAL_HANDOFF_STATUSES.includes(handoff.status)) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {handoff.status === "PENDING" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => void onUpdate(handoff.id, "IN_PROGRESS")}
        >
          Mark in progress
        </Button>
      ) : null}
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => void onUpdate(handoff.id, "COMPLETED")}
      >
        Mark completed
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => void onUpdate(handoff.id, "FAILED")}
      >
        Mark failed
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => void onUpdate(handoff.id, "CANCELLED")}
      >
        Cancel
      </Button>
    </div>
  );
}

export default function AdminWorkflows() {
  const { can } = useAdminAuth();
  const [workflows, setWorkflows] = useState<AdminWorkflowSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminWorkflowDetailResult | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<WorkflowState | "">("");
  const [workflowTypeDraft, setWorkflowTypeDraft] = useState("");
  const [workflowType, setWorkflowType] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingHandoffId, setUpdatingHandoffId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);

  const canWrite = can("workflows.write");
  const limit = 25;

  const loadWorkflows = useCallback(async () => {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    setLoading(true);
    setError(null);

    const res = await adminListWorkflows({
      page,
      limit,
      state,
      workflowType,
    });
    if (listRequestRef.current !== requestId) return;
    setLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to load workflows");
      setWorkflows([]);
      setTotal(0);
      return;
    }

    const rows = res.data?.workflows ?? [];
    setWorkflows(rows);
    setTotal(res.data?.total ?? 0);
  }, [page, state, workflowType]);

  const loadDetail = useCallback(async (workflowId: string) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailLoading(true);
    setError(null);

    const res = await adminGetWorkflow(workflowId);
    if (detailRequestRef.current !== requestId) return;
    setDetailLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to load workflow detail");
      setDetail(null);
      return;
    }
    setDetail(res.data ?? null);
  }, []);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    if (!selectedId && workflows[0]) {
      setSelectedId(workflows[0].id);
    }
  }, [selectedId, workflows]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  function handleFilter() {
    if (loading) return;
    setPage(1);
    setWorkflowType(workflowTypeDraft.trim());
    setSelectedId(null);
  }

  async function updateHandoff(
    handoffId: string,
    status: WorkflowExecutionHandoffStatus,
  ) {
    if (!canWrite) return;
    setUpdatingHandoffId(handoffId);
    const res = await adminUpdateWorkflowHandoffStatus(handoffId, status);
    setUpdatingHandoffId(null);

    if (!res.ok) {
      setError(res.error ?? "Failed to update handoff");
      return;
    }
    if (selectedId) {
      await loadDetail(selectedId);
    }
    await loadWorkflows();
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Workflows</h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor VIG execution and Chase handoffs that need support review.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <select
          value={state}
          onChange={(event) => {
            setState(event.target.value as WorkflowState | "");
            setPage(1);
            setSelectedId(null);
          }}
          className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white"
        >
          {WORKFLOW_STATES.map((item) => (
            <option key={item || "all"} value={item}>
              {item || "All states"}
            </option>
          ))}
        </select>
        <Input
          placeholder="Workflow type, e.g. chase_signup"
          value={workflowTypeDraft}
          onChange={(event) => setWorkflowTypeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleFilter();
          }}
          className="max-w-sm bg-slate-950 border-slate-700"
        />
        <Button onClick={handleFilter} disabled={loading}>
          Filter
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setWorkflowTypeDraft("");
            setWorkflowType("");
            setState("");
            setPage(1);
            setSelectedId(null);
          }}
          disabled={loading}
        >
          Clear
        </Button>
        <Button
          variant="outline"
          onClick={() => void loadWorkflows()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Handoffs</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {workflows.map((workflow) => (
                <tr
                  key={workflow.id}
                  className={[
                    "cursor-pointer transition-colors hover:bg-slate-800/70",
                    selectedId === workflow.id ? "bg-slate-800" : "",
                  ].join(" ")}
                  onClick={() => setSelectedId(workflow.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {workflow.user.displayName || "No name"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {workflow.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {workflow.partnerName ?? "Unknown partner"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {workflow.workflowType}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={stateTone(workflow.state)}>
                      {workflow.state}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {workflow.completionPercent}%
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {workflow.pendingExecutionHandoffCount ?? 0} pending
                    <span className="text-slate-500">
                      {" "}
                      / {workflow.executionHandoffCount ?? 0} total
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(workflow.updatedAt)}
                  </td>
                </tr>
              ))}
              {!loading && workflows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No workflows found
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Loading workflows...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-lg font-semibold text-white">Workflow detail</h2>
          {detailLoading ? (
            <p className="mt-4 text-sm text-slate-400">Loading detail...</p>
          ) : detail ? (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-sm text-slate-400">Owner</p>
                <p className="font-medium text-white">{detail.user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Partner</p>
                  <p className="text-white">
                    {detail.workflow.partnerName ?? "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">State</p>
                  <Badge variant={stateTone(detail.workflow.state)}>
                    {detail.workflow.state}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500">Started</p>
                  <p className="text-white">
                    {formatDate(detail.workflow.startedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Updated</p>
                  <p className="text-white">
                    {formatDate(detail.workflow.updatedAt)}
                  </p>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-white">Handoffs</h3>
                <div className="mt-2 space-y-3">
                  {detail.executionHandoffs.length ? (
                    detail.executionHandoffs.map((handoff) => (
                      <div
                        key={handoff.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">
                              {handoff.partnerName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {handoff.action}
                            </p>
                          </div>
                          <Badge variant={stateTone(handoff.status)}>
                            {handoff.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Created {formatDate(handoff.createdAt)}
                        </p>
                        <HandoffAutomationMetadata handoff={handoff} />
                        <HandoffActions
                          handoff={handoff}
                          disabled={
                            !canWrite || updatingHandoffId === handoff.id
                          }
                          onUpdate={updateHandoff}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-500">
                      No external execution handoffs for this workflow.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-white">Steps</h3>
                <div className="mt-2 space-y-2">
                  {detail.steps.map((step) => (
                    <div
                      key={step.stepKey}
                      className="flex items-center justify-between gap-3 rounded-md bg-slate-950/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {step.stepKey}
                        </p>
                        {step.errorMessage ? (
                          <p className="text-xs text-red-300">
                            {step.errorMessage}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={stateTone(step.status)}>
                        {step.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Select a workflow to inspect its steps and handoffs.
            </p>
          )}
        </aside>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={page <= 1 || loading}
          onClick={() => {
            setSelectedId(null);
            setPage((current) => Math.max(1, current - 1));
          }}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-400">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages || loading}
          onClick={() => {
            setSelectedId(null);
            setPage((current) => current + 1);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
