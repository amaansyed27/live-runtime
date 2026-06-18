import { useState } from "react";
import { ChatComposer } from "./ChatComposer";
import { MessageBubble } from "./MessageBubble";
import { hideCompanion } from "../lib/tauriBridge";
import type { useRuntimeChat } from "../hooks/useRuntimeChat";

interface CompanionPanelProps {
  chat: ReturnType<typeof useRuntimeChat>;
}

export function CompanionPanel({ chat }: CompanionPanelProps) {
  const [compact, setCompact] = useState(false);

  if (compact) {
    return (
      <main className="floating-panel companion-compact-panel">
        <button type="button" className="compact-restore" title="Restore companion" onClick={() => setCompact(false)}>↑</button>
        <section className="compact-companion-bar" data-tauri-drag-region>
          <ChatComposer disabled={chat.isLoading} onSend={chat.send} onNewChat={chat.clear} compact />
        </section>
      </main>
    );
  }

  return (
    <main className="floating-panel companion-normal-panel">
      <header className="floating-titlebar" data-tauri-drag-region>
        <div className="brand-block brand-compact" data-tauri-drag-region>
          <img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" />
          <div><p>Companion</p><small>Local AI</small></div>
        </div>
        <div className="titlebar-actions">
          <button type="button" title="Compact bar" onClick={() => setCompact(true)}>↓</button>
          <button type="button" title="Minimize companion" onClick={() => setCompact(true)}>—</button>
          <button type="button" title="Hide companion" onClick={() => void hideCompanion()}>×</button>
        </div>
      </header>
      <section className="floating-body">
        <div className="mini-status companion-status-row">
          <div><span>Ready</span><strong>Ask or dictate</strong></div>
          <div className="companion-status-actions"><ChatComposer disabled={chat.isLoading} onSend={chat.send} onNewChat={chat.clear} controlsOnly /></div>
        </div>
        <section className="mini-conversation" aria-label="Recent companion chat">
          {chat.messages.slice(-4).map((message) => <MessageBubble key={message.id} message={message} />)}
        </section>
        <ChatComposer disabled={chat.isLoading} onSend={chat.send} compactInput />
      </section>
    </main>
  );
}
