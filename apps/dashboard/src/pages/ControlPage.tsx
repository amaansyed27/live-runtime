import { useMemo, useState } from "react";
import type { ActionAuditEntry, Capability, ControlModeState } from "@live-runtime/core";
import {
  activateEmergencyStop,
  clearActionAuditLog,
  disableYoloMode,
  enableYoloMode,
  getAvailableCapabilities,
  readActionAuditLog,
  readControlModeState,
  writeControlModeState
} from "../lib/controlBridge";

export function ControlPage() {
  const [state, setState] = useState<ControlModeState>(() => readControlModeState());
  const [auditLog, setAuditLog] = useState<ActionAuditEntry[]>(() => readActionAuditLog());
  const [workspaceDraft, setWorkspaceDraft] = useState("");
  const [yoloMinutes, setYoloMinutes] = useState(20);
  const capabilities = useMemo(() => getAvailableCapabilities(), []);
  const approvedCapabilities = new Set(state.approvedCapabilityIds);
  const safeCount = capabilities.filter((capability) => capability.riskLevel === "safe").length;
  const modeLabel = state.mode === "yolo" ? "YOLO" : "Guarded";

  function persist(next: ControlModeState) {
    writeControlModeState(next);
    setState(next);
  }

  function toggleCapability(id: string) {
    const nextIds = approvedCapabilities.has(id)
      ? state.approvedCapabilityIds.filter((item) => item !== id)
      : [...state.approvedCapabilityIds, id];
    persist({ ...state, approvedCapabilityIds: nextIds });
  }

  function addWorkspace() {
    const nextWorkspace = workspaceDraft.trim();
    if (!nextWorkspace || state.approvedWorkspaceRoots.includes(nextWorkspace)) return;
    persist({ ...state, approvedWorkspaceRoots: [...state.approvedWorkspaceRoots, nextWorkspace] });
    setWorkspaceDraft("");
  }

  function removeWorkspace(root: string) {
    persist({ ...state, approvedWorkspaceRoots: state.approvedWorkspaceRoots.filter((item) => item !== root) });
  }

  function startYolo() {
    const selectedIds = state.approvedCapabilityIds.length > 0
      ? state.approvedCapabilityIds
      : capabilities.filter((capability) => capability.riskLevel !== "high").map((capability) => capability.id);
    setState(enableYoloMode(yoloMinutes, selectedIds, state.approvedWorkspaceRoots));
  }

  function stopYolo() {
    setState(disableYoloMode());
  }

  function emergencyStop() {
    setState(activateEmergencyStop());
  }

  function clearLog() {
    clearActionAuditLog();
    setAuditLog([]);
  }

  return (
    <section className="page-panel control-page">
      <div className="page-header">
        <p className="eyebrow">Computer Control</p>
        <h2>Guarded / YOLO</h2>
      </div>
      <div className="control-layout">
        <section className={`control-hero ${state.mode === "yolo" ? "control-yolo" : ""}`}>
          <div>
            <span>Current mode</span>
            <strong>{modeLabel}</strong>
            <p>{state.mode === "yolo" ? `Active until ${state.yoloEnabledUntil ? new Date(state.yoloEnabledUntil).toLocaleTimeString() : "timer missing"}` : "Guarded mode is the default approval layer."}</p>
          </div>
          <div className="control-actions">
            <button type="button" title="Switch to Guarded" onClick={stopYolo}>Guarded</button>
            <button type="button" title="Start YOLO mode" onClick={startYolo}>Start YOLO</button>
            <button type="button" className="danger-button" title="Stop all active control" onClick={emergencyStop}>Emergency stop</button>
          </div>
        </section>

        <section className="control-grid">
          <article className="settings-card control-card">
            <span>Mode setup</span>
            <label htmlFor="yoloMinutes">YOLO minutes<input id="yoloMinutes" type="number" min="1" max="240" value={yoloMinutes} onChange={(event) => setYoloMinutes(Number(event.target.value) || 1)} /></label>
            <small>YOLO applies only to selected capabilities and approved workspaces.</small>
          </article>
          <article className="settings-card control-card"><span>Registry</span><strong>{capabilities.length} capabilities</strong><small>{safeCount} safe · {capabilities.length - safeCount} approval-scoped</small></article>
          <article className="settings-card control-card"><span>Audit</span><strong>{auditLog.length} entries</strong><button type="button" title="Clear local action log" onClick={clearLog}>Clear log</button></article>
        </section>

        <section className="settings-card control-card">
          <div className="section-title-row"><span>Approved workspaces</span><small>{state.approvedWorkspaceRoots.length} selected</small></div>
          <div className="workspace-input-row"><input value={workspaceDraft} onChange={(event) => setWorkspaceDraft(event.target.value)} placeholder="C:/Users/Amaan/downloads/live-runtime" title="Approved workspace path" /><button type="button" title="Add workspace" onClick={addWorkspace}>Add</button></div>
          <div className="scope-list">{state.approvedWorkspaceRoots.length === 0 && <small>No approved workspaces yet.</small>}{state.approvedWorkspaceRoots.map((root) => <button key={root} type="button" title="Remove workspace" onClick={() => removeWorkspace(root)}>{root}</button>)}</div>
        </section>

        <section className="settings-card control-card">
          <div className="section-title-row"><span>YOLO capability scope</span><small>{state.approvedCapabilityIds.length} approved</small></div>
          <div className="capability-grid">{capabilities.map((capability) => <CapabilityToggle key={capability.id} capability={capability} enabled={approvedCapabilities.has(capability.id)} onToggle={() => toggleCapability(capability.id)} />)}</div>
        </section>

        <section className="settings-card control-card">
          <div className="section-title-row"><span>Recent actions</span><small>Local audit log</small></div>
          <div className="audit-list">{auditLog.length === 0 && <div className="empty-state compact-empty"><strong>No actions yet.</strong><p>Computer-control actions will appear here.</p></div>}{auditLog.slice(0, 12).map((entry) => <AuditRow key={entry.id} entry={entry} />)}</div>
        </section>
      </div>
    </section>
  );
}

function CapabilityToggle({ capability, enabled, onToggle }: { capability: Capability; enabled: boolean; onToggle(): void }) {
  return <button type="button" className={`capability-item ${enabled ? "selected" : ""}`} title={`Toggle ${capability.name}`} onClick={onToggle}><span>{capability.riskLevel}</span><strong>{capability.name}</strong><small>{capability.requiresWorkspaceScope ? "Workspace scoped" : "Global scoped"}</small></button>;
}

function AuditRow({ entry }: { entry: ActionAuditEntry }) {
  return <article className="audit-row"><span>{entry.mode} · {entry.riskLevel}</span><strong>{entry.capabilityId}</strong><p>{entry.inputSummary}</p><small>{entry.status} · {new Date(entry.updatedAt).toLocaleString()}</small></article>;
}
