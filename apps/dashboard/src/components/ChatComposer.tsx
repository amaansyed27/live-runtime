import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSpeechRecognition } from "@live-runtime/core";
import { stopSpeech } from "../lib/tauriBridge";

interface ChatComposerProps {
  disabled?: boolean;
  onSend(content: string): Promise<void>;
  onNewChat?: () => void;
  compactBar?: boolean;
}

type IconName = "new" | "live" | "mic" | "send";

export function ChatComposer({ disabled, onSend, onNewChat, compactBar = false }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [partial, setPartial] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const liveModeRef = useRef(false);
  const recognition = useMemo(() => createBrowserSpeechRecognition(), []);

  useEffect(() => { liveModeRef.current = liveMode; }, [liveMode]);

  async function sendCurrentInput() {
    const content = input.trim();
    if (!content || disabled) return;
    setInput("");
    await onSend(content);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCurrentInput();
  }

  function startListening(sendOnFinal = false) {
    if (!recognition.supported) {
      setPartial("Voice input is unavailable in this WebView. Type instead.");
      return;
    }

    void stopSpeech();
    setPartial("");
    setIsListening(true);
    recognition.start({
      onPartial: setPartial,
      onFinal(text) {
        const clean = text.trim();
        setPartial("");
        setIsListening(false);
        if (sendOnFinal && clean) {
          void onSend(clean);
          if (liveModeRef.current) window.setTimeout(() => startListening(true), 350);
          return;
        }
        if (clean) setInput((current) => [current, clean].filter(Boolean).join(" "));
      },
      onError(error) {
        setPartial(error);
        setIsListening(false);
        if (sendOnFinal && liveModeRef.current) window.setTimeout(() => startListening(true), 700);
      }
    });
  }

  function toggleDictation() {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }
    startListening(false);
  }

  function toggleLiveMode() {
    const next = !liveModeRef.current;
    liveModeRef.current = next;
    setLiveMode(next);
    if (next) {
      startListening(true);
      return;
    }
    recognition.stop();
    setIsListening(false);
    setPartial("");
  }

  const inputActions = (
    <div className="input-inline-actions">
      <button type="button" aria-label="Dictate" title="Dictate" className={isListening ? "recording" : ""} onClick={toggleDictation}><Icon name="mic" /></button>
      <button type="submit" aria-label="Send" title="Send" disabled={disabled || !input.trim()}><Icon name="send" /></button>
    </div>
  );

  const inputField = (
    <div className="composer-input-wrap">
      <textarea
        value={input}
        disabled={disabled}
        rows={2}
        placeholder="Ask Live Runtime anything..."
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void sendCurrentInput();
          }
        }}
      />
      {partial && <span className="voice-partial">{partial}</span>}
      {!compactBar && inputActions}
    </div>
  );

  return (
    <form className={`composer ${liveMode ? "live-mode-on" : ""} ${compactBar ? "composer-compact-bar" : ""}`} onSubmit={submit}>
      <div className="composer-header-actions" aria-label="Chat header controls">
        {onNewChat && <button type="button" aria-label="Start new topic" title="New topic" onClick={onNewChat}><Icon name="new" /></button>}
        <button type="button" aria-label="Live mode" title="Live mode" className={liveMode ? "active-live" : ""} onClick={toggleLiveMode}><Icon name="live" /></button>
      </div>

      {liveMode ? (
        <div className="live-mode-surface" aria-live="polite">
          <div className="live-orb"><span /></div>
          <strong>{isListening ? "Listening" : "Live mode"}</strong>
          <small>{partial || "Speak naturally. I will stop talking when you interrupt."}</small>
        </div>
      ) : compactBar ? (
        <>
          {inputField}
          {inputActions}
        </>
      ) : inputField}
    </form>
  );
}

function Icon({ name }: { name: IconName }) {
  if (name === "new") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.3 7.6A7 7 0 1 1 5 12.8" /><path d="M7.3 3.8v3.8h3.8" /></svg>;
  if (name === "live") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M6.3 7.2a8 8 0 0 0 0 9.6" /><path d="M17.7 7.2a8 8 0 0 1 0 9.6" /></svg>;
  if (name === "mic") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="4" width="6" height="10" rx="3" /><path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0" /><path d="M12 17.7v2.8" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
}
