interface AutomationItem {
  id: string;
  title: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
}

const automationExamples = [
  { title: "Morning brief", prompt: "Give me a short news brief with tech, AI, India, and world headlines.", schedule: "Every day at 8 AM" },
  { title: "World Cup alerts", prompt: "Send major goal updates, match news, injuries, and context from the FIFA World Cup.", schedule: "When major updates happen" },
  { title: "Docs cleanup", prompt: "Turn rough project notes into clean markdown documentation.", schedule: "On demand" }
];

export function AutomationView({ automations, setAutomations, draft, setDraft }: { automations: AutomationItem[]; setAutomations(value: AutomationItem[] | ((current: AutomationItem[]) => AutomationItem[])): void; draft: { title: string; prompt: string; schedule: string }; setDraft(value: { title: string; prompt: string; schedule: string }): void; }) {
  const canCreate = draft.title.trim() && draft.prompt.trim() && draft.schedule.trim();
  const createAutomation = () => { if (!canCreate) return; setAutomations((current) => [{ id: crypto.randomUUID(), title: draft.title.trim(), prompt: draft.prompt.trim(), schedule: draft.schedule.trim(), enabled: true }, ...current]); setDraft({ title: "", prompt: "", schedule: "" }); };
  return <section className="page-panel automation-page"><div className="page-header"><p className="eyebrow">Routines</p><h2>Scheduled prompts</h2></div><div className="automation-layout routine-layout"><section className="automation-card automation-builder routine-builder"><div className="section-title-row"><span>Create</span><small>Like Codex automations</small></div><input placeholder="Routine name" title="Name this routine" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><textarea placeholder="Prompt to run" title="Prompt to run" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} rows={3} /><input placeholder="Schedule" title="Schedule text" value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} /><button type="button" title="Save routine" disabled={!canCreate} onClick={createAutomation}>Create</button></section><section className="automation-card template-card"><span>Templates</span><div className="template-list">{automationExamples.map((example) => <button key={example.title} type="button" title={`Use ${example.title}`} onClick={() => setDraft(example)}>{example.title}</button>)}</div></section><section className="automation-list routine-list">{automations.length === 0 && <div className="empty-state compact-empty"><strong>No routines yet.</strong><p>Pick a template or create one.</p></div>}{automations.map((automation) => <article className="automation-item" key={automation.id}><div><span>{automation.enabled ? "On" : "Paused"}</span><h3>{automation.title}</h3><p>{automation.prompt}</p><small>{automation.schedule}</small></div><div className="automation-actions"><button type="button" title="Pause or enable routine" onClick={() => setAutomations((current) => current.map((item) => item.id === automation.id ? { ...item, enabled: !item.enabled } : item))}>{automation.enabled ? "Pause" : "Enable"}</button><button type="button" title="Remove routine" onClick={() => setAutomations((current) => current.filter((item) => item.id !== automation.id))}>Remove</button></div></article>)}</section></div></section>;
}

export { automationExamples };
export type { AutomationItem };
