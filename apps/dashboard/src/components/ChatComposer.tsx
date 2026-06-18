import { FormEvent, useMemo, useState } from "react";
import { createBrowserSpeechRecognition } from "@live-runtime/core";

interface ChatComposerProps {
  disabled?: boolean;
  onSend(content: string): Promise<void>;
  onNewChat?: () => void;
}

export function ChatComposer({ disabled, onSend, onNewChat }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [partial, setPartial] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const recognition = useMemo(() => createBrowserSpeechRecognition(), []);

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

  function toggleListening() {
    if (!recognition.supported) {
      setPartial("Voice input is unavailable in this WebView. Type instead.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setPartial("");
    setIsListening(true);
    recognition.start({
      onPartial: setPartial,
      onFinal(text) {
        setInput((current) => [current, text].filter(Boolean).join(" "));
        setPartial("");
        setIsListening(false);
      },
      onError(error) {
        setPartial(error);
        setIsListening(false);
      }
    });
  }

  function toggleLiveMode() {
    setLiveMode((current) => !current);
    if (!isListening) toggleListening();
  }

  return (
    <form className={`composer ${liveMode ? "live-mode-on" : ""}`} onSubmit={submit}>
      <div className="composer-header-actions" aria-label="Chat header controls">
        {onNewChat && <button type="button" aria-label="Start new topic" title="New topic" onClick={onNewChat}>↺</button>}
        <button type="button" aria-label="Live mode" title="Live mode" className={liveMode ? "active-live" : ""} onClick={toggleLiveMode}>◉</button>
      </div>
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
        <div className="input-inline-actions">
          <button type="button" aria-label="Dictate" title="Dictate" className={isListening ? "recording" : ""} onClick={toggleListening}>🎙</button>
          <button type="submit" aria-label="Send" title="Send" disabled={disabled || !input.trim()}>➤</button>
        </div>
      </div>
    </form>
  );
}
