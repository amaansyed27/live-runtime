import { useEffect, useState } from "react";
import { ChatComposer } from "./components/ChatComposer";
import { MessageBubble } from "./components/MessageBubble";
import { SignalCard } from "./components/SignalCard";
import { getRuntimeStatus, hideToTray, stopSpeech } from "./lib/tauriBridge";
import { useRuntimeChat } from "./hooks/useRuntimeChat";

export function App() {
  const chat = useRuntimeChat();
  const [status, setStatus] = useState({ platform: "loading", arch: "-", speechOutput: "-", trayEnabled: false });

  useEffect(() => {
    void getRuntimeStatus().then(setStatus);
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar glass-panel">
        <div className="brand-block">
          <span className="brand-mark">LR</span>
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

        <div className="sidebar-actions">
          <button type="button" onClick={() => void stopSpeech()}>Stop speech</button>
          <button type="button" onClick={() => void hideToTray()}>Hide to tray</button>
        </div>
      </aside>

      <section className="workspace glass-panel">
        <header className="hero">
          <div>
            <p className="eyebrow">System tray AI runtime</p>
            <h1>Talk to a local model without leaving your desktop.</h1>
            <span>Powered by Ollama, wrapped in a modular Tauri + React architecture.</span>
          </div>
          <div className="orb" aria-hidden="true" />
        </header>

        {chat.error && <div className="error-banner">{chat.error}</div>}

        <section className="conversation" aria-label="Conversation">
          {chat.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        </section>

        <ChatComposer disabled={chat.isLoading} onSend={chat.send} />
      </section>
    </main>
  );
}
