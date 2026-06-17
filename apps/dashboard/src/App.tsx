import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChatComposer } from "./components/ChatComposer";
import { MessageBubble } from "./components/MessageBubble";
import { SignalCard } from "./components/SignalCard";
import { getRuntimeStatus, hideCompanion, hideToTray, showCompanion, stopSpeech } from "./lib/tauriBridge";
import { useRuntimeChat } from "./hooks/useRuntimeChat";

const COMPANION_ENABLED_KEY = "live-runtime.companion.enabled";
const THEME_KEY = "live-runtime.theme";
const START_LOGIN_KEY = "live-runtime.start-login";
const AUTO_OLLAMA_KEY = "live-runtime.auto-ollama";
const AUTOMATIONS_KEY = "live-runtime.automations";

type Page = "chat" | "settings" | "automation";
type ThemeMode = "system" | "light" | "dark";

interface AutomationItem {
  id: string;
  title: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
}

const automationExamples = [
  {
    title: "Morning brief",
    prompt: "Give me a short news brief with tech, AI, India, and world headlines.",
    schedule: "Every day at 8 AM"
  },
  {
    title: "World Cup alerts",
    prompt: "Send major goal updates, match news, injuries, and context from the FIFA World Cup.",
    schedule: "When major updates happen"
  },
  {
    title: "Docs cleanup",
    prompt: "Turn rough project notes into clean markdown documentation.",
    schedule: "On demand"
  }
];

export function App() {
  const chat = useRuntimeChat();
  const [status, setStatus] = useState({ platform: "loading", arch: "-", speechOutput: "-", trayEnabled: false });
  const [windowLabel, setWindowLabel] = useState("main");
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState<Page>("chat");
  const [shortcut, setShortcut] = useState(() => window.localStorage.getItem("live-runtime.shortcut") ?? "Ctrl+Shift+Space");
  const [companionEnabled, setCompanionEnabled] = useState(() => window.localStorage.getItem(COMPANION_ENABLED_KEY) === "true");
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [startAtLogin, setStartAtLogin] = useState(() => window.localStorage.getItem(START_LOGIN_KEY) === "true");
  const [autoStartOllama, setAutoStartOllama] = useState(() => window.localStorage.getItem(AUTO_OLLAMA_KEY) === "true");
  const [automations, setAutomations] = useState<AutomationItem[]>(() => readAutomations());
  const [automationDraft, setAutomationDraft] = useState({ title: "", prompt: "", schedule: "" });

  useEffect(() => {
    void getRuntimeStatus().then(setStatus);
    try { setWindowLabel(getCurrentWindow().label); } catch { setWindowLabel("main"); }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("live-runtime.shortcut", shortcut);
  }, [shortcut]);

  useEffect(() => {
    window.localStorage.setItem(COMPANION_ENABLED_KEY, String(companionEnabled));
    if (windowLabel === "main") {
      void (companionEnabled ? showCompanion() : hideCompanion());
    }
  }, [companionEnabled, windowLabel]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(START_LOGIN_KEY, String(startAtLogin));
  }, [startAtLogin]);

  useEffect(() => {
    window.localStorage.setItem(AUTO_OLLAMA_KEY, String(autoStartOllama));
  }, [autoStartOllama]);

  useEffect(() => {
    window.localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(automations));
  }, [automations]);

  if (windowLabel === "companion") {
    return (
      <main className="floating-panel">
        <header className="floating-titlebar" data-tauri-drag-region>
          <Brand label="Companion" compact />
          <div className="titlebar-actions">
            <button type="button" title="Collapse companion" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "Open" : "—"}</button>
            <button type="button" title="Hide companion" onClick={() => void hideCompanion()}>×</button>
          </div>
        </header>
        {!collapsed && (
          <section className="floating-body">
            <div className="mini-status">
              <span>Ready</span>
              <strong>Ask or dictate</strong>
            </div>
            <section className="mini-conversation" aria-label="Recent companion chat">
              {chat.messages.slice(-4).map((message) => <MessageBubble key={message.id} message={message} />)}
            </section>
            <ChatComposer disabled={chat.isLoading} onSend={chat.send} />
            <button type="button" title="Clear this conversation" onClick={chat.clear}>New chat</button>
          </section>
        )}
      </main>
    );
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
        <nav className="page-rail" aria-label="Main sections">
          <button className={page === "chat" ? "active" : ""} type="button" title="Chat with your local model" onClick={() => setPage("chat")}>Chat</button>
          <button className={page === "settings" ? "active" : ""} type="button" title="Change model, theme, voice, and companion" onClick={() => setPage("settings")}>Settings</button>
          <button className={page === "automation" ? "active" : ""} type="button" title="Create scheduled prompts and routines" onClick={() => setPage("automation")}>Routines</button>
        </nav>

        {page === "chat" && <ChatPage chat={chat} />}
        {page === "settings" && (
          <SettingsPage
            chat={chat}
            status={status}
            shortcut={shortcut}
            setShortcut={setShortcut}
            companionEnabled={companionEnabled}
            setCompanionEnabled={setCompanionEnabled}
            theme={theme}
            setTheme={setTheme}
            startAtLogin={startAtLogin}
            setStartAtLogin={setStartAtLogin}
            autoStartOllama={autoStartOllama}
            setAutoStartOllama={setAutoStartOllama}
          />
        )}
        {page === "automation" && (
          <AutomationPage
            automations={automations}
            setAutomations={setAutomations}
            draft={automationDraft}
            setDraft={setAutomationDraft}
          />
        )}
      </section>
    </main>
  );
}

function Brand({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`brand-block ${compact ? "brand-compact" : ""}`} data-tauri-drag-region>
      <img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" />
      <div>
        <p>{label}</p>
        <small>Local AI</small>
      </div>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return <span className="tip" title={text}>?</span>;
}

function ChatPage({ chat }: { chat: ReturnType<typeof useRuntimeChat> }) {
  return (
    <section className="page-panel chat-page">
      <div className="page-hero">
        <p className="eyebrow">Local AI</p>
        <h1>Ask anything.</h1>
        <span>Saved until New chat.</span>
      </div>
      {chat.error && <div className="error-banner">Failed to connect. Is Ollama running?</div>}
      <section className="conversation" aria-label="Conversation">
        {chat.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
      </section>
      <ChatComposer disabled={chat.isLoading} onSend={chat.send} />
    </section>
  );
}

function SettingsPage({
  chat,
  status,
  shortcut,
  setShortcut,
  companionEnabled,
  setCompanionEnabled,
  theme,
  setTheme,
  startAtLogin,
  setStartAtLogin,
  autoStartOllama,
  setAutoStartOllama
}: {
  chat: ReturnType<typeof useRuntimeChat>;
  status: { platform: string; arch: string; speechOutput: string; trayEnabled: boolean };
  shortcut: string;
  setShortcut(value: string): void;
  companionEnabled: boolean;
  setCompanionEnabled(value: boolean | ((current: boolean) => boolean)): void;
  theme: ThemeMode;
  setTheme(value: ThemeMode): void;
  startAtLogin: boolean;
  setStartAtLogin(value: boolean): void;
  autoStartOllama: boolean;
  setAutoStartOllama(value: boolean): void;
}) {
  return (
    <section className="page-panel settings-page">
      <div className="page-header">
        <p className="eyebrow">Settings</p>
        <h2>Preferences</h2>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <label htmlFor="theme">Theme <Tip text="System follows your OS theme." /></label>
          <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)} title="Choose app theme">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark mint</option>
          </select>
        </section>

        <section className="settings-card">
          <label htmlFor="baseUrl">Ollama URL <Tip text="Default local Ollama server." /></label>
          <input id="baseUrl" title="Ollama server URL" value={chat.baseUrl} onChange={(event) => chat.setBaseUrl(event.target.value)} />
        </section>

        <section className="settings-card">
          <div className="section-title-row">
            <label htmlFor="model">Model <Tip text="Pick an installed Ollama model." /></label>
            <button type="button" title="Reload installed models" onClick={() => void chat.reloadModels()}>Refresh</button>
          </div>
          <select id="model" value={chat.model} onChange={(event) => chat.setModel(event.target.value)} title="Selected model">
            {chat.models.length === 0 && <option value={chat.model}>{chat.model}</option>}
            {chat.models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
          </select>
        </section>

        <section className="settings-card toggle-card">
          <label title="Show or hide the floating companion window">
            <input type="checkbox" checked={companionEnabled} onChange={(event) => setCompanionEnabled(event.target.checked)} />
            Companion <Tip text="Floating mini chat window." />
          </label>
          <button type="button" title="Toggle companion window" onClick={() => setCompanionEnabled((value) => !value)}>{companionEnabled ? "Disable" : "Enable"}</button>
        </section>

        <section className="settings-card">
          <label htmlFor="shortcut">Shortcut <Tip text="Saved now. Global shortcut wiring comes next." /></label>
          <input id="shortcut" title="Companion shortcut" value={shortcut} onChange={(event) => setShortcut(event.target.value)} />
        </section>

        <section className="settings-card toggle-card">
          <label title="Launch setting is saved locally for now">
            <input type="checkbox" checked={startAtLogin} onChange={(event) => setStartAtLogin(event.target.checked)} />
            Start at login
          </label>
        </section>

        <section className="settings-card toggle-card">
          <label title="Ollama supervisor is the next native layer">
            <input type="checkbox" checked={autoStartOllama} onChange={(event) => setAutoStartOllama(event.target.checked)} />
            Start Ollama
          </label>
        </section>

        <section className="settings-card toggle-card">
          <label>
            <input type="checkbox" checked={chat.speakResponses} onChange={(event) => chat.setSpeakResponses(event.target.checked)} />
            Voice replies
          </label>
          <button type="button" title="Stop current speech" onClick={() => void stopSpeech()}>Stop</button>
        </section>

        <section className="settings-card">
          <div className="status-grid">
            <SignalCard label="Host" value={status.platform} tone="good" />
            <SignalCard label="Arch" value={status.arch} />
            <SignalCard label="Speech" value={status.speechOutput} tone="good" />
            <SignalCard label="Tray" value={status.trayEnabled ? "on" : "web"} />
          </div>
        </section>
      </div>
    </section>
  );
}

function AutomationPage({
  automations,
  setAutomations,
  draft,
  setDraft
}: {
  automations: AutomationItem[];
  setAutomations(value: AutomationItem[] | ((current: AutomationItem[]) => AutomationItem[])): void;
  draft: { title: string; prompt: string; schedule: string };
  setDraft(value: { title: string; prompt: string; schedule: string }): void;
}) {
  const canCreate = draft.title.trim() && draft.prompt.trim() && draft.schedule.trim();

  const createAutomation = () => {
    if (!canCreate) return;
    setAutomations((current) => [
      {
        id: crypto.randomUUID(),
        title: draft.title.trim(),
        prompt: draft.prompt.trim(),
        schedule: draft.schedule.trim(),
        enabled: true
      },
      ...current
    ]);
    setDraft({ title: "", prompt: "", schedule: "" });
  };

  return (
    <section className="page-panel automation-page">
      <div className="page-header">
        <p className="eyebrow">Routines</p>
        <h2>Automate prompts</h2>
      </div>

      <div className="automation-layout">
        <section className="automation-card automation-builder">
          <span>Create</span>
          <input placeholder="Routine name" title="Name this routine" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <textarea placeholder="What should it do?" title="Prompt to run" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} rows={3} />
          <input placeholder="When should it run?" title="Schedule text" value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} />
          <button type="button" title="Save routine" disabled={!canCreate} onClick={createAutomation}>Create</button>
        </section>

        <section className="automation-card">
          <span>Templates</span>
          <div className="template-list">
            {automationExamples.map((example) => (
              <button key={example.title} type="button" title={`Use ${example.title}`} onClick={() => setDraft(example)}>
                {example.title}
              </button>
            ))}
          </div>
        </section>

        <section className="automation-card good compact-note">
          <span>Skills</span>
          <strong>Saved as reusable routines.</strong>
        </section>

        <section className="automation-list">
          {automations.length === 0 && (
            <div className="empty-state">
              <strong>No routines yet.</strong>
              <p>Use a template or create one.</p>
            </div>
          )}
          {automations.map((automation) => (
            <article className="automation-item" key={automation.id}>
              <div>
                <span>{automation.enabled ? "On" : "Paused"}</span>
                <h3>{automation.title}</h3>
                <p>{automation.prompt}</p>
                <small>{automation.schedule}</small>
              </div>
              <div className="automation-actions">
                <button type="button" title="Pause or enable routine" onClick={() => setAutomations((current) => current.map((item) => item.id === automation.id ? { ...item, enabled: !item.enabled } : item))}>{automation.enabled ? "Pause" : "Enable"}</button>
                <button type="button" title="Delete routine" onClick={() => setAutomations((current) => current.filter((item) => item.id !== automation.id))}>Delete</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}

function readTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
}

function readAutomations(): AutomationItem[] {
  try {
    const raw = window.localStorage.getItem(AUTOMATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AutomationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
