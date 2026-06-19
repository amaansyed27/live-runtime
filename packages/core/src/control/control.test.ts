import { createActionAuditEntry, createYoloState, defaultCapabilities, findCapability, resolveControlPolicy, summarizeActionLog, updateActionAuditEntry } from "../index";
import type { ActionRequest } from "./schema";

const requestBase: Omit<ActionRequest, "capabilityId" | "inputSummary"> = {
  requestedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
  source: "chat"
};

function runControlFoundationTests(): void {
  expect(defaultCapabilities.length >= 6, "expected default capabilities");
  expect(findCapability("getActiveWindow")?.riskLevel === "safe", "active window should be safe");
  expect(findCapability("missing") === null, "missing capability should return null");

  const guardedSafe = resolveControlPolicy({ ...requestBase, capabilityId: "getActiveWindow", inputSummary: "Read active window" });
  expect(guardedSafe.allowed, "safe guarded action should be allowed");
  expect(!guardedSafe.requiresApproval, "safe guarded action should not need approval");

  const guardedMedium = resolveControlPolicy({ ...requestBase, capabilityId: "openTarget", inputSummary: "Open a folder" });
  expect(guardedMedium.allowed, "medium guarded action should be allowed");
  expect(guardedMedium.requiresApproval, "medium guarded action should need approval");

  const unapprovedWorkspace = resolveControlPolicy({ ...requestBase, capabilityId: "workspaceWrite", inputSummary: "Update workspace file", workspaceRoot: "C:/repo" });
  expect(!unapprovedWorkspace.allowed, "workspace capability should require approved scope");

  const yolo = createYoloState(10, ["openTarget", "projectTask"], ["C:/repo"]);
  const yoloAllowed = resolveControlPolicy({ ...requestBase, capabilityId: "projectTask", inputSummary: "Start approved task", workspaceRoot: "C:/repo/app" }, yolo);
  expect(yoloAllowed.allowed, "approved YOLO scoped action should be allowed");
  expect(!yoloAllowed.requiresApproval, "medium YOLO scoped action should not need repeated approval");

  const yoloDenied = resolveControlPolicy({ ...requestBase, capabilityId: "workspaceWrite", inputSummary: "Update workspace file", workspaceRoot: "C:/repo" }, yolo);
  expect(!yoloDenied.allowed, "YOLO should reject unapproved capability");

  const audit = createActionAuditEntry({ ...requestBase, capabilityId: "openTarget", inputSummary: "Open folder" }, guardedMedium, "approved", new Date("2026-01-01T00:00:00Z"));
  expect(audit.mode === "guarded", "audit should include mode");
  expect(audit.status === "approved", "audit should include status");
  const completed = updateActionAuditEntry(audit, "completed", "Opened target", new Date("2026-01-01T00:00:01Z"));
  expect(completed.outputSummary === "Opened target", "audit update should preserve output summary");
  const summary = summarizeActionLog([audit, completed]);
  expect(summary.total === 2 && summary.guarded === 2, "audit summary should count entries");
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

runControlFoundationTests();
console.log("Computer control foundation tests passed");
