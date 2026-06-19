export type ControlMode = "guarded" | "yolo";
export type RiskLevel = "safe" | "medium" | "high";
export type ActionStatus = "planned" | "approved" | "rejected" | "completed" | "failed" | "canceled";

export interface Capability {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  platforms: Array<"windows" | "macos" | "linux" | "web">;
  requiresWorkspaceScope: boolean;
  timeoutMs: number;
  enabled: boolean;
}

export interface ControlModeState {
  mode: ControlMode;
  approvedCapabilityIds: string[];
  approvedWorkspaceRoots: string[];
  yoloEnabledUntil?: string;
  emergencyStopped: boolean;
}

export interface ActionRequest {
  capabilityId: string;
  inputSummary: string;
  workspaceRoot?: string;
  requestedAt: string;
  source: "chat" | "dashboard" | "routine" | "skill";
}

export interface PolicyDecision {
  mode: ControlMode;
  capabilityId: string;
  riskLevel: RiskLevel;
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

export interface ActionAuditEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: ControlMode;
  capabilityId: string;
  inputSummary: string;
  workspaceRoot?: string;
  riskLevel: RiskLevel;
  source: ActionRequest["source"];
  status: ActionStatus;
  decisionReason: string;
  outputSummary?: string;
}

export const defaultControlModeState: ControlModeState = {
  mode: "guarded",
  approvedCapabilityIds: [],
  approvedWorkspaceRoots: [],
  emergencyStopped: false
};
