import type { Capability } from "./schema";

export const defaultCapabilities: Capability[] = [
  {
    id: "getActiveWindow",
    name: "Get active window",
    description: "Read the active app or window title where the platform supports it.",
    riskLevel: "safe",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: false,
    timeoutMs: 1500,
    enabled: true
  },
  {
    id: "listWindows",
    name: "List windows",
    description: "Read visible window titles where the platform supports it.",
    riskLevel: "safe",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: false,
    timeoutMs: 2000,
    enabled: true
  },
  {
    id: "readApprovedPath",
    name: "Read approved path",
    description: "Read metadata or text from a path inside an approved workspace.",
    riskLevel: "safe",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: true,
    timeoutMs: 3000,
    enabled: true
  },
  {
    id: "openTarget",
    name: "Open target",
    description: "Open an approved app, URL, file, or folder.",
    riskLevel: "medium",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: false,
    timeoutMs: 5000,
    enabled: true
  },
  {
    id: "focusWindow",
    name: "Focus window",
    description: "Bring a supported window to focus.",
    riskLevel: "medium",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: false,
    timeoutMs: 3000,
    enabled: true
  },
  {
    id: "projectTask",
    name: "Project task",
    description: "Start an approved project task inside an approved workspace.",
    riskLevel: "medium",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: true,
    timeoutMs: 30000,
    enabled: true
  },
  {
    id: "workspaceWrite",
    name: "Workspace write",
    description: "Create or update files inside an approved workspace.",
    riskLevel: "high",
    platforms: ["windows", "macos", "linux"],
    requiresWorkspaceScope: true,
    timeoutMs: 10000,
    enabled: true
  }
];

export function listCapabilities(capabilities = defaultCapabilities): Capability[] {
  return capabilities.filter((capability) => capability.enabled);
}

export function findCapability(id: string, capabilities = defaultCapabilities): Capability | null {
  return listCapabilities(capabilities).find((capability) => capability.id === id) ?? null;
}
