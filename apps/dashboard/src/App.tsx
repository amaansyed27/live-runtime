import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChatComposer } from "./components/ChatComposer";
import { MessageBubble } from "./components/MessageBubble";
import { SignalCard } from "./components/SignalCard";
import { getRuntimeStatus, hideCompanion, hideToTray, showCompanion, stopSpeech } from "./lib/tauriBridge";
import { useRuntimeChat } from "./hooks/useRuntimeChat";

const COMPANION_ENABLED_KEY = "live-runtime.companion.enabled";
type Page = "chat" | "settings" | "automation";

export function App() {
  const chat = useRuntimeChat();
  const [status, setStatus] = useState({ platform: "loading", arch: "-", speechOutput: "-", trayEnabled: false });
  const [windowLabel, setWindowLabel] = useState("main");
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState<Page>("chat");
  const [shortcut, setShortcut] = useState(() => window.localStorage.getItem("live-runtime.shortcut") ?? "Ctrl+Shift+Space");
  const [companionEnabled, setCompanionEnabled] = useState(() => window.localStorage.getItem(COMPANION_ENABLED_KEY) === "true");

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

  if (windowLabel === "companion") {
    return (
      <main className="floating-panel">
        <header className="floating-titlebar" data-tauri-drag-region>
          <Brand label="Companion" compact />
          <div className="titlebar-actions">
            <button type="button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "Open" : "—"}</button>
            <button type="button" onClick={() => void hideCompanion()}>×</button>
          </div>
        </header>
        {!collapsed && (
          <section className="floating-body">
            <div className="mini-status">
              <span>Command center</span>
              <strong>Chat, dictate, plan actions</strong>
            </div>
            <section className="mini-conversation" aria-label="Recent companion chat">
              {chat.messages.slice(-4).map((message) => <MessageBubble key={message.id} message={message} />)}
            </section>
            <ChatComposer disabled={chat.isLoading} onSend={chat.send} />
            <button type="button" onClick={chat.clear}>New chat</button>
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
          <button type="button" onClick={() => void getCurrentWindow().minimize()}>—</button>
          <button type="button" onClick={() => void hideToTray()}>×</button>
        </div>
      </header>

      <section className="app-body">
        <nav className="page-rail" aria-label="Main sections">
          <button className={page === "chat" ? "active" : ""} type="button" onClick={() => setPage("chat")}>Chat</button>
          <button className={page === "settings" ? "active" : ""} type="button" onClick={() => setPage("settings")}>Settings</button>
          <button className={page === "automation" ? "active" : ""} type="button" onClick={() => setPage("automation")}>Automation</button>
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
          />
        )}
        {page === "automation" && <AutomationPage />}
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
        <small>Local Ollama runtime</small>
      </div>
    </div>
  );
}

function ChatPage({ chat }: { chat: ReturnType<typeof useRuntimeChat> }) {
  return (
    <section className="page-panel chat-page">
      <div className="page-hero">
        <p className="eyebrow">Loom-style local runtime</p>
        <h1>Small desktop AI companion.</h1>
        <span>Chat context persists until New chat.</span>
      </div>
      {chat.error && <div className="error-banner">{chat.error}</div>}
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
  setCompanionEnabled
}: {
  chat: ReturnType<typeof useRuntimeChat>;
  status: { platform: string; arch: string; speechOutput: string; trayEnabled: boolean };
  shortcut: string;
  setShortcut(value: string): void;
  companionEnabled: boolean;
  setCompanionEnabled(value: boolean | ((current: boolean) => boolean)): void;
}) {
  return (
    <section className="page-panel settings-page">
      <div className="page-header">
        <p className="eyebrow">Settings</p>
        <h2>Runtime controls</h2>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <label htmlFor="baseUrl">Provider URL</label>
          <input id="baseUrl" value={chat.baseUrl} onChange={(event) => chat.setBaseUrl(event.target.value)} />
        </section>

        <section className="settings-card">
          <div className="section-title-row">
            <label htmlFor="model">Model</label>
            <button type="button" onClick={() => void chat.reloadModels()}>Refresh</button>
          </div>
          <select id="model" value={chat.model} onChange={(event) => chat.setModel(event.target.value)}>
            {chat.models.length === 0 && <option value={chat.model}>{chat.model}</option>}
            {chat.models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
          </select>
        </section>

        <section className="settings-card toggle-card">
          <label>
            <input type="checkbox" checked={companionEnabled} onChange={(event) => setCompanionEnabled(event.target.checked)} />
            Companion window
          </label>
          <button type="button" onClick={() => setCompanionEnabled((value) => !value)}>{companionEnabled ? "Disable companion" : "Enable companion"}</button>
        </section>

        <section className="settings-card">
          <label htmlFor="shortcut">Companion shortcut</label>
          <input id="shortcut" value={shortcut} onChange={(event) => setShortcut(event.target.value)} />
          <small>Saved locally. Native global registration is next.</small>
        </section>

        <section className="settings-card toggle-card">
          <label>
            <input type="checkbox" checked={chat.speakResponses} onChange={(event) => chat.setSpeakResponses(event.target.checked)} />
            Speak responses
          </label>
          <button type="button" onClick={() => void stopSpeech()}>Stop speech</button>
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

function AutomationPage() {
  return (
    <section className="page-panel automation-page">
      <div className="page-header">
        <p className="eyebrow">Automation</p>
        <h2>Action approvals</h2>
      </div>
      <div className="automation-stack">
        <section className="automation-card good">
          <span>Safe by default</span>
          <strong>Open browser, search, and app-control actions will require approval.</strong>
        </section>
        <section className="automation-card">
          <span>Examples</span>
          <p>“Open Chrome and search for Tauri borderless window”, “open Notion”, “play lofi music”.</p>
        </section>
        <section className="automation-card">
          <span>Next layer</span>
          <p>Native automation should be implemented as a permissioned action broker rather than raw unrestricted system access.</p>
        </section>
      </div>
    </section>
  );
}
