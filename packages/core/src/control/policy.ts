import type { ActionRequest, Capability, ControlModeState, PolicyDecision } from "./schema";
import { defaultControlModeState } from "./schema";
import { findCapability } from "./registry";

export function resolveControlPolicy(
  request: ActionRequest,
  state: ControlModeState = defaultControlModeState,
  capabilities?: Capability[]
): PolicyDecision {
  const capability = findCapability(request.capabilityId, capabilities);
  if (!capability) {
    return denied(request.capabilityId, state.mode, "safe", "Capability is not registered or is disabled.");
  }

  if (state.emergencyStopped) {
    return denied(capability.id, state.mode, capability.riskLevel, "Emergency stop is active.");
  }

  if (capability.requiresWorkspaceScope && !isWorkspaceApproved(request.workspaceRoot, state.approvedWorkspaceRoots)) {
    return denied(capability.id, state.mode, capability.riskLevel, "Workspace is not approved for computer control.");
  }

  if (state.mode === "guarded") {
    return {
      mode: "guarded",
      capabilityId: capability.id,
      riskLevel: capability.riskLevel,
      allowed: true,
      requiresApproval: capability.riskLevel !== "safe",
      reason: capability.riskLevel === "safe" ? "Safe action allowed in Guarded mode." : "Approval required in Guarded mode."
    };
  }

  if (!isYoloActive(state)) {
    return denied(capability.id, "yolo", capability.riskLevel, "YOLO mode has expired or is inactive.");
  }

  if (!state.approvedCapabilityIds.includes(capability.id)) {
    return denied(capability.id, "yolo", capability.riskLevel, "Capability is not approved for YOLO mode.");
  }

  return {
    mode: "yolo",
    capabilityId: capability.id,
    riskLevel: capability.riskLevel,
    allowed: true,
    requiresApproval: capability.riskLevel === "high",
    reason: capability.riskLevel === "high" ? "High-risk action still requires approval." : "Allowed by YOLO approved scope."
  };
}

export function isYoloActive(state: ControlModeState, now = new Date()): boolean {
  if (state.mode !== "yolo" || !state.yoloEnabledUntil) return false;
  return new Date(state.yoloEnabledUntil).getTime() > now.getTime();
}

export function createYoloState(minutes: number, capabilityIds: string[], workspaceRoots: string[]): ControlModeState {
  const enabledUntil = new Date(Date.now() + Math.max(1, minutes) * 60_000).toISOString();
  return {
    mode: "yolo",
    yoloEnabledUntil: enabledUntil,
    approvedCapabilityIds: Array.from(new Set(capabilityIds)),
    approvedWorkspaceRoots: Array.from(new Set(workspaceRoots)),
    emergencyStopped: false
  };
}

function isWorkspaceApproved(workspaceRoot: string | undefined, approvedRoots: string[]): boolean {
  if (!workspaceRoot) return false;
  return approvedRoots.some((root) => workspaceRoot === root || workspaceRoot.startsWith(`${root}/`) || workspaceRoot.startsWith(`${root}\\`));
}

function denied(capabilityId: string, mode: ControlModeState["mode"], riskLevel: PolicyDecision["riskLevel"], reason: string): PolicyDecision {
  return {
    mode,
    capabilityId,
    riskLevel,
    allowed: false,
    requiresApproval: false,
    reason
  };
}
