import type { ActionAuditEntry, ActionRequest, ActionStatus, ControlMode, PolicyDecision } from "./schema";

export function createActionAuditEntry(
  request: ActionRequest,
  decision: PolicyDecision,
  status: ActionStatus = "planned",
  now = new Date()
): ActionAuditEntry {
  const timestamp = now.toISOString();
  return {
    id: createAuditId(request.capabilityId, timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
    mode: decision.mode,
    capabilityId: request.capabilityId,
    inputSummary: request.inputSummary,
    workspaceRoot: request.workspaceRoot,
    riskLevel: decision.riskLevel,
    source: request.source,
    status,
    decisionReason: decision.reason
  };
}

export function updateActionAuditEntry(
  entry: ActionAuditEntry,
  status: ActionStatus,
  outputSummary?: string,
  now = new Date()
): ActionAuditEntry {
  return {
    ...entry,
    status,
    outputSummary,
    updatedAt: now.toISOString()
  };
}

export function summarizeActionLog(entries: ActionAuditEntry[]): Record<ControlMode | "total", number> {
  return entries.reduce<Record<ControlMode | "total", number>>((summary, entry) => {
    summary.total += 1;
    summary[entry.mode] += 1;
    return summary;
  }, { total: 0, guarded: 0, yolo: 0 });
}

function createAuditId(capabilityId: string, timestamp: string): string {
  const cleanCapability = capabilityId.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  return `${cleanCapability}-${timestamp.replace(/[^0-9]/g, "")}`;
}
