import { FormEvent, useMemo, useState } from "react";
import { createBrowserSpeechRecognition } from "@live-runtime/core";

interface ChatComposerProps {
  disabled?: boolean;
  onSend(content: string): Promise<void>;
}

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [partial, setPartial] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognition = useMemo(() => createBrowserSpeechRecognition(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    await onSend(content);
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

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-input-wrap">
        <textarea
          value={input}
          disabled={disabled}
          rows={3}
          placeholder="Ask Live Runtime anything..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit(event);
            }
          }}
        />
        {partial && <span className="voice-partial">{partial}</span>}
      </div>
      <div className="composer-actions">
        <button type="button" className={isListening ? "recording" : ""} onClick={toggleListening}>
          {isListening ? "Listening" : "Voice"}
        </button>
        <button type="submit" disabled={disabled || !input.trim()}>
          Send
        </button>
      </div>
    </form>
  );
}
