import {
  createActionAuditEntry,
  createYoloState,
  defaultCapabilities,
  defaultControlModeState,
  listCapabilities,
  resolveControlPolicy,
  type ActionAuditEntry,
  type ActionRequest,
  type Capability,
  type ControlModeState,
  type PolicyDecision
} from "@live-runtime/core";

const CONTROL_STATE_KEY = "live-runtime.control.state";
const CONTROL_AUDIT_KEY = "live-runtime.control.audit";
const MAX_AUDIT_ENTRIES = 200;

export function getAvailableCapabilities(): Capability[] {
  return listCapabilities(defaultCapabilities);
}

export function readControlModeState(): ControlModeState {
  const raw = window.localStorage.getItem(CONTROL_STATE_KEY);
  if (!raw) return defaultControlModeState;
  try {
    const parsed = JSON.parse(raw) as Partial<ControlModeState>;
    return {
      ...defaultControlModeState,
      ...parsed,
      approvedCapabilityIds: Array.isArray(parsed.approvedCapabilityIds) ? parsed.approvedCapabilityIds : [],
      approvedWorkspaceRoots: Array.isArray(parsed.approvedWorkspaceRoots) ? parsed.approvedWorkspaceRoots : []
    };
  } catch {
    return defaultControlModeState;
  }
}

export function writeControlModeState(state: ControlModeState): void {
  window.localStorage.setItem(CONTROL_STATE_KEY, JSON.stringify(state));
}

export function enableYoloMode(minutes: number, capabilityIds: string[], workspaceRoots: string[]): ControlModeState {
  const state = createYoloState(minutes, capabilityIds, workspaceRoots);
  writeControlModeState(state);
  return state;
}

export function disableYoloMode(): ControlModeState {
  const state: ControlModeState = { ...readControlModeState(), mode: "guarded", yoloEnabledUntil: undefined, emergencyStopped: false };
  writeControlModeState(state);
  return state;
}

export function activateEmergencyStop(): ControlModeState {
  const state: ControlModeState = { ...readControlModeState(), emergencyStopped: true };
  writeControlModeState(state);
  return state;
}

export function evaluateControlRequest(request: ActionRequest): PolicyDecision {
  return resolveControlPolicy(request, readControlModeState(), defaultCapabilities);
}

export function recordPlannedAction(request: ActionRequest): ActionAuditEntry {
  const decision = evaluateControlRequest(request);
  const entry = createActionAuditEntry(request, decision, decision.allowed && !decision.requiresApproval ? "approved" : "planned");
  appendActionAuditEntry(entry);
  return entry;
}

export function readActionAuditLog(): ActionAuditEntry[] {
  const raw = window.localStorage.getItem(CONTROL_AUDIT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ActionAuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendActionAuditEntry(entry: ActionAuditEntry): void {
  const next = [entry, ...readActionAuditLog()].slice(0, MAX_AUDIT_ENTRIES);
  window.localStorage.setItem(CONTROL_AUDIT_KEY, JSON.stringify(next));
}

export function clearActionAuditLog(): void {
  window.localStorage.removeItem(CONTROL_AUDIT_KEY);
}
