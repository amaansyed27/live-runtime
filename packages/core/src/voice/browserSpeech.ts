export interface SpeechRecognitionController {
  readonly supported: boolean;
  start(callbacks: SpeechRecognitionCallbacks): void;
  stop(): void;
}

export interface SpeechRecognitionCallbacks {
  onPartial?(text: string): void;
  onFinal(text: string): void;
  onError?(error: string): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function createBrowserSpeechRecognition(language = "en-US"): SpeechRecognitionController {
  const SpeechRecognition = typeof window === "undefined"
    ? undefined
    : (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      supported: false,
      start(callbacks) {
        callbacks.onError?.("Speech recognition is not available in this WebView/browser.");
      },
      stop() {}
    };
  }

  let recognition: SpeechRecognitionLike | null = null;

  return {
    supported: true,
    start(callbacks) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0].transcript.trim();
          if (!transcript) continue;
          if (result.isFinal) callbacks.onFinal(transcript);
          else callbacks.onPartial?.(transcript);
        }
      };
      recognition.onerror = (event) => callbacks.onError?.(event.error ?? "Unknown speech error");
      recognition.start();
    },
    stop() {
      recognition?.stop();
      recognition = null;
    }
  };
}

export function speakWithBrowser(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
