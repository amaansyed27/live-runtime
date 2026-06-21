import { useState, type PointerEvent } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import type { useRuntimeChat } from "../hooks/useRuntimeChat";
import { ChatComposer } from "../components/ChatComposer";
import { MessageBubble } from "../components/MessageBubble";
import { UiBrand } from "../components/UiBrand";
import { ArrowGlyph, XGlyph } from "../components/WindowGlyphs";
import { hideCompanion } from "../lib/tauriBridge";

const COMPANION_COMPACT_SIZE = new LogicalSize(520, 64);
const COMPANION_EXPANDED_SIZE = new LogicalSize(340, 410);
const COMPANION_COMPACT_MIN_SIZE = new LogicalSize(480, 64);
const COMPANION_EXPANDED_MIN_SIZE = new LogicalSize(300, 92);

export function CompanionWindow({ chat }: { chat: ReturnType<typeof useRuntimeChat> }) {
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

  const compactRestoreButton = (
    <button className="companion-bar-toggle companion-icon-button" type="button" title="Restore companion" aria-label="Restore companion" onClick={() => void setCompanionCompact(false)}>
      <ArrowGlyph direction="up" />
    </button>
  );

  return (
    <main className={`floating-panel companion-window ${compact ? "companion-bar" : ""}`}>
      <header className="floating-titlebar companion-titlebar" onPointerDown={compact ? undefined : startDrag}>
        {!compact && <UiBrand label="Companion" compact />}
        {!compact && <div className="titlebar-actions companion-window-actions" onPointerDown={(event) => event.stopPropagation()}>
          <button className="companion-bar-toggle companion-icon-button" type="button" title="Compact companion" aria-label="Compact companion" onClick={() => void setCompanionCompact(true)}>
            <ArrowGlyph direction="down" />
          </button>
          <button className="companion-icon-button" type="button" title="Hide companion" aria-label="Hide companion" onClick={() => void hideCompanion()}><XGlyph /></button>
        </div>}
      </header>
      {compact && <div className="companion-drag-grip" role="button" aria-label="Drag companion" title="Drag companion" onPointerDown={startGripDrag} />}
      <section className="floating-body">
        <div className="mini-status"><span>Ready</span><strong>Ask or dictate</strong></div>
        <section className="mini-conversation" aria-label="Recent companion chat">{chat.messages.slice(-4).map((message) => <MessageBubble key={message.id} message={message} />)}</section>
        <ChatComposer disabled={chat.isLoading} onSend={chat.send} onNewChat={chat.clear} compactBar={compact} compactAccessory={compact ? compactRestoreButton : undefined} />
      </section>
    </main>
  );
}
