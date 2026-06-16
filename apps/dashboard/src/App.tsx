import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChatComposer } from "./components/ChatComposer";
import { MessageBubble } from "./components/MessageBubble";
import { SignalCard } from "./components/SignalCard";
import { getRuntimeStatus, hideCompanion, hideToTray, showCompanion, stopSpeech } from "./lib/tauriBridge";
import { useRuntimeChat } from "./hooks/useRuntimeChat";

export function App() {
  const chat = useRuntimeChat();
  const [status, setStatus] = useState({ platform: "loading", arch: "-", speechOutput: "-", trayEnabled: false });
  const [windowLabel, setWindowLabel] = useState("main");
  const [collapsed, setCollapsed] = useState(false);
  const [shortcut, setShortcut] = useState(() => window.localStorage.getItem("live-runtime.shortcut") ?? "Ctrl+Shift+Space");

  useEffect(() => {
    void getRuntimeStatus().then(setStatus);
    try { setWindowLabel(getCurrentWindow().label); } catch { setWindowLabel("main"); }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("live-runtime.shortcut", shortcut);
  }, [shortcut]);

  if (windowLabel === "companion") {
    return (
      <main className="sidebar glass-panel">
        <header className="brand-block">
          <img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" />
          <div>
            <p>Live Runtime</p>
            <small>Always-on-top companion</small>
          </div>
        </header>
        <div className="sidebar-actions">
          <button type="button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "Open" : "Collapse"}</button>
          <button type="button" onClick={() => void hideCompanion()}>Hide</button>
        </div>
        {!collapsed && (
          <>
            <section className="signal-card signal-good">
              <span>Command center</span>
              <strong>Chat, dictate, plan actions</strong>
            </section>
            <section className="conversation" aria-label="Recent companion chat">
              {chat.messages.slice(-4).map((message) => <MessageBubble key={message.id} message={message} />)}
            </section>
            <ChatComposer disabled={chat.isLoading} onSend={chat.send} />
            <button type="button" onClick={chat.clear}>New chat</button>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="app-shell compact-shell">
      <aside className="sidebar glass-panel">
        <div className="brand-block">
          <img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" />
          <div>
            <p>Live Runtime</p>
            <small>Local Ollama companion</small>
          </div>
        </div>

        <section className="side-section">
          <label htmlFor="baseUrl">Provider URL</label>
          <input id="baseUrl" value={chat.baseUrl} onChange={(event) => chat.setBaseUrl(event.target.value)} />
        </section>

        <section className="side-section">
          <div className="section-title-row">
            <label htmlFor="model">Model</label>
            <button type="button" onClick={() => void chat.reloadModels()}>Refresh</button>
          </div>
          <select id="model" value={chat.model} onChange={(event) => chat.setModel(event.target.value)}>
            {chat.models.length === 0 && <option value={chat.model}>{chat.model}</option>}
            {chat.models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
          </select>
        </section>

        <section className="side-section">
          <label htmlFor="shortcut">Companion shortcut</label>
          <input id="shortcut" value={shortcut} onChange={(event) => setShortcut(event.target.value)} />
          <small className="hint-text">Saved in app settings. Native global registration is next.</small>
        </section>

        <section className="side-section toggles">
          <label>
            <input type="checkbox" checked={chat.speakResponses} onChange={(event) => chat.setSpeakResponses(event.target.checked)} />
            Speak responses
          </label>
        </section>

        <div className="status-grid">
          <SignalCard label="Host" value={status.platform} tone="good" />
          <SignalCard label="Arch" value={status.arch} />
          <SignalCard label="Speech" value={status.speechOutput} tone="good" />
          <SignalCard label="Tray" value={status.trayEnabled ? "on" : "web"} />
        </div>

        <div className="sidebar-actions stacked-actions">
          <button type="button" onClick={() => void showCompanion()}>Show companion</button>
          <button type="button" onClick={chat.clear}>New chat</button>
          <button type="button" onClick={() => void stopSpeech()}>Stop speech</button>
          <button type="button" onClick={() => void hideToTray()}>Hide</button>
        </div>
      </aside>

      <section className="workspace glass-panel compact-workspace">
        <header className="hero compact-hero">
          <div>
            <p className="eyebrow">Loom-style local runtime</p>
            <h1>Small desktop AI companion.</h1>
            <span>Chat context persists until New chat.</span>
          </div>
        </header>

        <section className="signal-card signal-good">
          <span>Command center</span>
          <strong>Secure automation approvals will be added next.</strong>
        </section>

        {chat.error && <div className="error-banner">{chat.error}</div>}
        <section className="conversation" aria-label="Conversation">
          {chat.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        </section>
        <ChatComposer disabled={chat.isLoading} onSend={chat.send} />
      </section>
    </main>
  );
}
