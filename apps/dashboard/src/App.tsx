import { useEffect, useState, type PointerEvent } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { ChatComposer } from "./components/ChatComposer";
import { IntelligenceStatus } from "./components/IntelligenceStatus";
import { MessageBubble } from "./components/MessageBubble";
import { SignalCard } from "./components/SignalCard";
import { getRuntimeStatus, hideCompanion, hideToTray, showCompanion, stopSpeech } from "./lib/tauriBridge";
import { useRuntimeChat } from "./hooks/useRuntimeChat";

const COMPANION_ENABLED_KEY = "live-runtime.companion.enabled";
const THEME_KEY = "live-runtime.theme";
const START_LOGIN_KEY = "live-runtime.start-login";
const AUTO_OLLAMA_KEY = "live-runtime.auto-ollama";
const AUTOMATIONS_KEY = "live-runtime.automations";
const SKILLS_KEY = "live-runtime.skills";
const SEARCH_PROVIDER_KEY = "live-runtime.search.provider";
const COMPANION_COMPACT_SIZE = new LogicalSize(390, 64);
const COMPANION_EXPANDED_SIZE = new LogicalSize(340, 410);
const COMPANION_COMPACT_MIN_SIZE = new LogicalSize(340, 64);
const COMPANION_EXPANDED_MIN_SIZE = new LogicalSize(300, 92);

type Page = "chat" | "settings" | "automation" | "skills" | "intelligence";
type ThemeMode = "system" | "light" | "dark";

interface AutomationItem {
  id: string;
  title: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
}

interface SkillItem {
  id: string;
  name: string;
  status: "Learning" | "Ready" | "Draft";
  detail: string;
}

const automationExamples = [
  { title: "Morning brief", prompt: "Give me a short news brief with tech, AI, India, and world headlines.", schedule: "Every day at 8 AM" },
  { title: "World Cup alerts", prompt: "Send major goal updates, match news, injuries, and context from the FIFA World Cup.", schedule: "When major updates happen" },
  { title: "Docs cleanup", prompt: "Turn rough project notes into clean markdown documentation.", schedule: "On demand" }
];

const defaultSkills: SkillItem[] = [
  { id: "preferences", name: "Preferences", status: "Learning", detail: "Tone, theme, shortcuts" },
  { id: "web-research", name: "Web research", status: "Draft", detail: "Search, read, summarize" },
  { id: "docs", name: "Docs helper", status: "Draft", detail: "Clean notes into docs" }
];

export function App() {
  const chat = useRuntimeChat();
  const [status, setStatus] = useState({ platform: "loading", arch: "-", speechOutput: "-", trayEnabled: false });
  const [windowLabel, setWindowLabel] = useState(() => readWindowLabel());
  const [page, setPage] = useState<Page>("chat");
  const [shortcut, setShortcut] = useState(() => window.localStorage.getItem("live-runtime.shortcut") ?? "Ctrl+Shift+Space");
  const [companionEnabled, setCompanionEnabled] = useState(() => window.localStorage.getItem(COMPANION_ENABLED_KEY) === "true");
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [startAtLogin, setStartAtLogin] = useState(() => window.localStorage.getItem(START_LOGIN_KEY) === "true");
  const [autoStartOllama, setAutoStartOllama] = useState(() => window.localStorage.getItem(AUTO_OLLAMA_KEY) === "true");
  const [automations, setAutomations] = useState<AutomationItem[]>(() => readAutomations());
  const [skills, setSkills] = useState<SkillItem[]>(() => readSkills());
  const [searchProvider, setSearchProvider] = useState(() => window.localStorage.getItem(SEARCH_PROVIDER_KEY) ?? "https://searx.be");
  const [automationDraft, setAutomationDraft] = useState({ title: "", prompt: "", schedule: "" });

  useEffect(() => {
    void getRuntimeStatus().then(setStatus);
    setWindowLabel(readWindowLabel());
  }, []);

  useEffect(() => { window.localStorage.setItem("live-runtime.shortcut", shortcut); }, [shortcut]);
  useEffect(() => { window.localStorage.setItem(COMPANION_ENABLED_KEY, String(companionEnabled)); if (windowLabel === "main") void (companionEnabled ? showCompanion() : hideCompanion()); }, [companionEnabled, windowLabel]);
  useEffect(() => { document.documentElement.dataset.theme = theme; window.localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.windowLabel = windowLabel; }, [windowLabel]);
  useEffect(() => { window.localStorage.setItem(START_LOGIN_KEY, String(startAtLogin)); }, [startAtLogin]);
  useEffect(() => { window.localStorage.setItem(AUTO_OLLAMA_KEY, String(autoStartOllama)); }, [autoStartOllama]);
  useEffect(() => { window.localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(automations)); }, [automations]);
  useEffect(() => { window.localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)); }, [skills]);
  useEffect(() => { window.localStorage.setItem(SEARCH_PROVIDER_KEY, searchProvider); }, [searchProvider]);

  if (windowLabel === "companion") {
    return <CompanionWindow chat={chat} />;
  }

  return (
    <main className="desktop-frame">
      <header className="custom-titlebar" data-tauri-drag-region>
        <Brand label="Live Runtime" />
        <div className="titlebar-actions">
          <button type="button" title="Minimize" onClick={() => void getCurrentWindow().minimize()}>—</button>
          <button type="button" title="Hide to tray" onClick={() => void hideToTray()}>×</button>
        </div>
      </header>
      <section className="app-body">
        <nav className="page-rail page-rail-five" aria-label="Main sections">
          <button className={page === "chat" ? "active" : ""} type="button" title="Chat" onClick={() => setPage("chat")}>Chat</button>
          <button className={page === "settings" ? "active" : ""} type="button" title="Settings" onClick={() => setPage("settings")}>Settings</button>
          <button className={page === "automation" ? "active" : ""} type="button" title="Scheduled prompts" onClick={() => setPage("automation")}>Routines</button>
          <button className={page === "skills" ? "active" : ""} type="button" title="Learned capabilities" onClick={() => setPage("skills")}>Skills</button>
          <button className={page === "intelligence" ? "active" : ""} type="button" title="Personal memory engine" onClick={() => setPage("intelligence")}>Intelligence</button>
        </nav>
        {page === "chat" && <ChatPage chat={chat} />}
        {page === "settings" && <SettingsPage chat={chat} status={status} shortcut={shortcut} setShortcut={setShortcut} companionEnabled={companionEnabled} setCompanionEnabled={setCompanionEnabled} theme={theme} setTheme={setTheme} startAtLogin={startAtLogin} setStartAtLogin={setStartAtLogin} autoStartOllama={autoStartOllama} setAutoStartOllama={setAutoStartOllama} />}
        {page === "automation" && <AutomationPage automations={automations} setAutomations={setAutomations} draft={automationDraft} setDraft={setAutomationDraft} />}
        {page === "skills" && <SkillsPage skills={skills} setSkills={setSkills} searchProvider={searchProvider} setSearchProvider={setSearchProvider} />}
        {page === "intelligence" && <IntelligencePage baseUrl={chat.baseUrl} />}
      </section>
    </main>
  );
}

function CompanionWindow({ chat }: { chat: ReturnType<typeof useRuntimeChat> }) {
  const [compact, setCompact] = useState(false);

  async function setCompanionCompact(nextCompact: boolean) {
    setCompact(nextCompact);
    try {
      const window = getCurrentWindow();
      if (nextCompact) {
        await window.setMinSize(COMPANION_COMPACT_MIN_SIZE);
        await window.setSize(COMPANION_COMPACT_SIZE);
        return;
      }
      await window.setMinSize(COMPANION_EXPANDED_MIN_SIZE);
      await window.setSize(COMPANION_EXPANDED_SIZE);
    } catch (error) {
      console.warn("Unable to resize companion window", error);
    }
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, textarea, input, select, a, [role='button']")) return;
    void getCurrentWindow().startDragging().catch((error) => {
      console.warn("Unable to drag companion window", error);
    });
  }

  function startGripDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    void getCurrentWindow().startDragging().catch((error) => {
      console.warn("Unable to drag companion window", error);
    });
  }

  return (
    <main className={`floating-panel companion-window ${compact ? "companion-bar" : ""}`}>
      <header className="floating-titlebar companion-titlebar" onPointerDown={compact ? undefined : startDrag}>
        {!compact && <Brand label="Companion" compact draggable={false} />}
        <div className="titlebar-actions" onPointerDown={(event) => event.stopPropagation()}>
          <button className="companion-bar-toggle" type="button" title={compact ? "Restore companion" : "Compact companion"} aria-label={compact ? "Restore companion" : "Compact companion"} onClick={() => void setCompanionCompact(!compact)}>{compact ? "↑" : "⌄"}</button>
          {!compact && <button type="button" title="Hide companion" onClick={() => void hideCompanion()}>×</button>}
        </div>
      </header>
      {compact && <div className="companion-drag-grip" role="button" aria-label="Drag companion" title="Drag companion" onPointerDown={startGripDrag} />}
      <section className="floating-body">
        <div className="mini-status"><span>Ready</span><strong>Ask or dictate</strong></div>
        <section className="mini-conversation" aria-label="Recent companion chat">{chat.messages.slice(-4).map((message) => <MessageBubble key={message.id} message={message} />)}</section>
        <ChatComposer disabled={chat.isLoading} onSend={chat.send} onNewChat={chat.clear} />
      </section>
    </main>
  );
}

function Brand({ label, compact = false, draggable = true }: { label: string; compact?: boolean; draggable?: boolean }) {
  const dragProps = draggable ? { "data-tauri-drag-region": "" } : {};
  return (
    <div className={`brand-block ${compact ? "brand-compact" : ""}`} {...dragProps}>
      <img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" />
      <div><p>{label}</p><small>Local AI</small></div>
    </div>
  );
}

function Tip({ text }: { text: string }) { return <span className="tip" title={text}>?</span>; }

function ChatPage({ chat }: { chat: ReturnType<typeof useRuntimeChat> }) {
  return <section className="page-panel chat-page"><div className="page-hero"><p className="eyebrow">Local AI</p><h1>Ask anything.</h1><span>Saved until New Chat.</span></div>{chat.error && <div className="error-banner">{chat.error}</div>}<section className="conversation" aria-label="Conversation">{chat.messages.map((message) => <MessageBubble key={message.id} message={message} />)}</section><ChatComposer disabled={chat.isLoading} onSend={chat.send} onNewChat={chat.clear} /></section>;
}

function SettingsPage({ chat, status, shortcut, setShortcut, companionEnabled, setCompanionEnabled, theme, setTheme, startAtLogin, setStartAtLogin, autoStartOllama, setAutoStartOllama }: { chat: ReturnType<typeof useRuntimeChat>; status: { platform: string; arch: string; speechOutput: string; trayEnabled: boolean }; shortcut: string; setShortcut(value: string): void; companionEnabled: boolean; setCompanionEnabled(value: boolean | ((current: boolean) => boolean)): void; theme: ThemeMode; setTheme(value: ThemeMode): void; startAtLogin: boolean; setStartAtLogin(value: boolean): void; autoStartOllama: boolean; setAutoStartOllama(value: boolean): void; }) {
  return <section className="page-panel settings-page"><div className="page-header"><p className="eyebrow">Settings</p><h2>Preferences</h2></div><div className="settings-grid"><section className="settings-card"><label htmlFor="theme">Theme <Tip text="System follows your OS theme." /></label><select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)} title="Choose app theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark mint</option></select></section><section className="settings-card"><label htmlFor="baseUrl">Ollama URL <Tip text="Default local Ollama server." /></label><input id="baseUrl" title="Ollama server URL" value={chat.baseUrl} onChange={(event) => chat.setBaseUrl(event.target.value)} /></section><section className="settings-card"><div className="section-title-row"><label htmlFor="model">Model <Tip text="Pick an installed Ollama model." /></label><button type="button" title="Reload installed models" onClick={() => void chat.reloadModels()}>Refresh</button></div><select id="model" value={chat.model} onChange={(event) => chat.setModel(event.target.value)} title="Selected model">{chat.models.length === 0 && <option value={chat.model}>{chat.model}</option>}{chat.models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}</select></section><section className="settings-card toggle-card"><label title="Show or hide the floating companion window"><input type="checkbox" checked={companionEnabled} onChange={(event) => setCompanionEnabled(event.target.checked)} />Companion <Tip text="Floating mini chat window." /></label><button type="button" title="Toggle companion window" onClick={() => setCompanionEnabled((value) => !value)}>{companionEnabled ? "Disable" : "Enable"}</button></section><section className="settings-card"><label htmlFor="shortcut">Shortcut <Tip text="Saved now. Global shortcut wiring comes next." /></label><input id="shortcut" title="Companion shortcut" value={shortcut} onChange={(event) => setShortcut(event.target.value)} /></section><section className="settings-card toggle-card"><label title="Launch setting is saved locally for now"><input type="checkbox" checked={startAtLogin} onChange={(event) => setStartAtLogin(event.target.checked)} />Start at login</label></section><section className="settings-card toggle-card"><label title="Ollama supervisor is the next native layer"><input type="checkbox" checked={autoStartOllama} onChange={(event) => setAutoStartOllama(event.target.checked)} />Start Ollama</label></section><section className="settings-card toggle-card"><label><input type="checkbox" checked={chat.speakResponses} onChange={(event) => chat.setSpeakResponses(event.target.checked)} />Voice replies</label><button type="button" title="Stop current speech" onClick={() => void stopSpeech()}>Stop</button></section><section className="settings-card"><div className="status-grid"><SignalCard label="Host" value={status.platform} tone="good" /><SignalCard label="Arch" value={status.arch} /><SignalCard label="Speech" value={status.speechOutput} tone="good" /><SignalCard label="Tray" value={status.trayEnabled ? "on" : "web"} /></div></section></div></section>;
}

function AutomationPage({ automations, setAutomations, draft, setDraft }: { automations: AutomationItem[]; setAutomations(value: AutomationItem[] | ((current: AutomationItem[]) => AutomationItem[])): void; draft: { title: string; prompt: string; schedule: string }; setDraft(value: { title: string; prompt: string; schedule: string }): void; }) {
  const canCreate = draft.title.trim() && draft.prompt.trim() && draft.schedule.trim();
  const createAutomation = () => { if (!canCreate) return; setAutomations((current) => [{ id: crypto.randomUUID(), title: draft.title.trim(), prompt: draft.prompt.trim(), schedule: draft.schedule.trim(), enabled: true }, ...current]); setDraft({ title: "", prompt: "", schedule: "" }); };
  return <section className="page-panel automation-page"><div className="page-header"><p className="eyebrow">Routines</p><h2>Scheduled prompts</h2></div><div className="automation-layout routine-layout"><section className="automation-card automation-builder routine-builder"><div className="section-title-row"><span>Create</span><small>Like Codex automations</small></div><input placeholder="Routine name" title="Name this routine" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><textarea placeholder="Prompt to run" title="Prompt to run" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} rows={3} /><input placeholder="Schedule" title="Schedule text" value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} /><button type="button" title="Save routine" disabled={!canCreate} onClick={createAutomation}>Create</button></section><section className="automation-card template-card"><span>Templates</span><div className="template-list">{automationExamples.map((example) => <button key={example.title} type="button" title={`Use ${example.title}`} onClick={() => setDraft(example)}>{example.title}</button>)}</div></section><section className="automation-list routine-list">{automations.length === 0 && <div className="empty-state compact-empty"><strong>No routines yet.</strong><p>Pick a template or create one.</p></div>}{automations.map((automation) => <article className="automation-item" key={automation.id}><div><span>{automation.enabled ? "On" : "Paused"}</span><h3>{automation.title}</h3><p>{automation.prompt}</p><small>{automation.schedule}</small></div><div className="automation-actions"><button type="button" title="Pause or enable routine" onClick={() => setAutomations((current) => current.map((item) => item.id === automation.id ? { ...item, enabled: !item.enabled } : item))}>{automation.enabled ? "Pause" : "Enable"}</button><button type="button" title="Delete routine" onClick={() => setAutomations((current) => current.filter((item) => item.id !== automation.id))}>Delete</button></div></article>)}</section></div></section>;
}

function SkillsPage({ skills, setSkills, searchProvider, setSearchProvider }: { skills: SkillItem[]; setSkills(value: SkillItem[] | ((current: SkillItem[]) => SkillItem[])): void; searchProvider: string; setSearchProvider(value: string): void; }) {
  return <section className="page-panel skills-page"><div className="page-header"><p className="eyebrow">Skills</p><h2>Capabilities</h2></div><div className="skills-layout"><section className="skill-hero"><span>Skill loop</span><strong>Notice → Package → Reuse</strong></section><section className="settings-card"><label htmlFor="searchProvider">Search provider <Tip text="Use your own SearXNG instance for reliable free JSON search." /></label><input id="searchProvider" value={searchProvider} onChange={(event) => setSearchProvider(event.target.value)} title="SearXNG instance URL" /></section><section className="skill-grid">{skills.map((skill) => <article className="skill-card" key={skill.id}><span>{skill.status}</span><h3>{skill.name}</h3><p>{skill.detail}</p></article>)}</section><button type="button" title="Restore starter skills" onClick={() => setSkills(defaultSkills)}>Reset starter skills</button></div></section>;
}

function IntelligencePage({ baseUrl }: { baseUrl: string }) {
  return <section className="page-panel intelligence-page"><div className="page-header"><p className="eyebrow">Intelligence</p><h2>Personal engine</h2></div><div className="intelligence-layout"><section className="intel-hero"><span>Core idea</span><strong>One chat. Long memory.</strong></section><IntelligenceStatus baseUrl={baseUrl} /><section className="intel-grid"><article><span>Profile</span><strong>Learns how you work</strong></article><article><span>Memory DB</span><strong>Chats, tasks, docs</strong></article><article><span>Vectors</span><strong>Semantic recall</strong></article><article><span>Reflection</span><strong>Turns patterns into skills</strong></article></section><section className="automation-card compact-note"><span>Local first</span><strong>SQLite + vector index + Ollama embeddings.</strong><p>Not a single memory file. The database becomes the assistant’s long-term context.</p></section><section className="intel-flow"><span>Capture</span><span>Embed</span><span>Store</span><span>Retrieve</span><span>Reflect</span></section></div></section>;
}

function readWindowLabel() {
  try { return getCurrentWindow().label; } catch { return "main"; }
}

function readTheme(): ThemeMode { const stored = window.localStorage.getItem(THEME_KEY); return stored === "dark" || stored === "light" || stored === "system" ? stored : "system"; }
function readAutomations(): AutomationItem[] { try { const raw = window.localStorage.getItem(AUTOMATIONS_KEY); if (!raw) return []; const parsed = JSON.parse(raw) as AutomationItem[]; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function readSkills(): SkillItem[] { try { const raw = window.localStorage.getItem(SKILLS_KEY); if (!raw) return defaultSkills; const parsed = JSON.parse(raw) as SkillItem[]; return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultSkills; } catch { return defaultSkills; } }
