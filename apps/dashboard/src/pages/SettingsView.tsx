import type { BrowserVoiceOption, VoiceSettings } from "@live-runtime/core";
import type { useRuntimeChat } from "../hooks/useRuntimeChat";
import { HelpTip } from "../components/HelpTip";
import { SignalCard } from "../components/SignalCard";
import { speakText, stopSpeech } from "../lib/tauriBridge";

type ThemeMode = "system" | "light" | "dark";

interface SettingsViewProps {
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
  voiceSettings: VoiceSettings;
  setVoiceSettings(value: VoiceSettings | ((current: VoiceSettings) => VoiceSettings)): void;
  browserVoices: BrowserVoiceOption[];
}

export function SettingsView(props: SettingsViewProps) {
  const { chat, status, shortcut, setShortcut, companionEnabled, setCompanionEnabled, theme, setTheme, startAtLogin, setStartAtLogin, autoStartOllama, setAutoStartOllama, voiceSettings, setVoiceSettings, browserVoices } = props;
  const updateVoice = (patch: Partial<VoiceSettings>) => setVoiceSettings((current) => ({ ...current, ...patch }));
  const voiceNameControl = voiceSettings.engine === "browser" ? (
    <select id="voiceName" value={voiceSettings.voiceName} onChange={(event) => updateVoice({ voiceName: event.target.value })} title="Browser voice">
      <option value="">Auto-pick natural voice</option>
      {browserVoices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}
    </select>
  ) : (
    <input id="voiceName" value={voiceSettings.voiceName} onChange={(event) => updateVoice({ voiceName: event.target.value })} placeholder="Optional OS voice name" title="Native OS voice name" />
  );

  return (
    <section className="page-panel settings-page">
      <div className="page-header"><p className="eyebrow">Settings</p><h2>Preferences</h2></div>
      <div className="settings-grid">
        <section className="settings-card"><label htmlFor="theme">Theme <HelpTip text="System follows your OS theme." /></label><select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)} title="Choose app theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark mint</option></select></section>
        <section className="settings-card"><label htmlFor="baseUrl">Ollama URL <HelpTip text="Default local Ollama server." /></label><input id="baseUrl" title="Ollama server URL" value={chat.baseUrl} onChange={(event) => chat.setBaseUrl(event.target.value)} /></section>
        <section className="settings-card"><div className="section-title-row"><label htmlFor="model">Model <HelpTip text="Pick an installed Ollama model." /></label><button type="button" title="Reload installed models" onClick={() => void chat.reloadModels()}>Refresh</button></div><select id="model" value={chat.model} onChange={(event) => chat.setModel(event.target.value)} title="Selected model">{chat.models.length === 0 && <option value={chat.model}>{chat.model}</option>}{chat.models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}</select></section>
        <section className="settings-card toggle-card"><label title="Show or hide the floating companion window"><input type="checkbox" checked={companionEnabled} onChange={(event) => setCompanionEnabled(event.target.checked)} />Companion <HelpTip text="Floating mini chat window." /></label><button type="button" title="Toggle companion window" onClick={() => setCompanionEnabled((value) => !value)}>{companionEnabled ? "Disable" : "Enable"}</button></section>
        <section className="settings-card toggle-card"><label title="Read assistant replies aloud"><input type="checkbox" checked={chat.speakResponses} onChange={(event) => chat.setSpeakResponses(event.target.checked)} />Speak replies <HelpTip text="Reads assistant responses aloud." /></label><button type="button" title="Stop current speech" onClick={() => void stopSpeech()}>Stop voice</button></section>
        <section className="settings-card voice-settings-card"><div className="section-title-row"><label htmlFor="speechEngine">Voice output <HelpTip text="Use Browser for more natural Microsoft/Google voices if available." /></label><button type="button" title="Preview voice" onClick={() => void speakText("Voice preview. Live Runtime is ready.", voiceSettings)}>Test</button></div><div className="voice-grid"><label htmlFor="speechEngine">Engine<select id="speechEngine" value={voiceSettings.engine} onChange={(event) => updateVoice({ engine: event.target.value as VoiceSettings["engine"] })} title="Speech engine"><option value="native">Native OS</option><option value="browser">Browser natural voices</option></select></label><label htmlFor="voiceName">Voice{voiceNameControl}</label><label htmlFor="voiceRate">Rate <strong>{voiceSettings.rate.toFixed(2)}x</strong><input id="voiceRate" type="range" min="0.5" max="1.5" step="0.05" value={voiceSettings.rate} onChange={(event) => updateVoice({ rate: Number(event.target.value) })} /></label><label htmlFor="voicePitch">Pitch <strong>{voiceSettings.pitch.toFixed(2)}x</strong><input id="voicePitch" type="range" min="0.5" max="1.5" step="0.05" value={voiceSettings.pitch} onChange={(event) => updateVoice({ pitch: Number(event.target.value) })} /></label><label htmlFor="voiceVolume">Volume <strong>{Math.round(voiceSettings.volume * 100)}%</strong><input id="voiceVolume" type="range" min="0" max="1" step="0.05" value={voiceSettings.volume} onChange={(event) => updateVoice({ volume: Number(event.target.value) })} /></label></div><small>{voiceSettings.engine === "browser" ? `${browserVoices.length} browser voices detected. Natural output depends on installed WebView/Edge voices.` : "Native mode uses macOS say, Windows System.Speech, or Linux spd-say/espeak."}</small></section>
        <section className="settings-card"><label htmlFor="shortcut">Shortcut <HelpTip text="Saved now. Global shortcut wiring comes next." /></label><input id="shortcut" title="Companion shortcut" value={shortcut} onChange={(event) => setShortcut(event.target.value)} /></section>
        <section className="settings-card toggle-card"><label title="Launch setting is saved locally for now"><input type="checkbox" checked={startAtLogin} onChange={(event) => setStartAtLogin(event.target.checked)} />Start at login</label></section>
        <section className="settings-card toggle-card"><label title="Ollama supervisor is the next native layer"><input type="checkbox" checked={autoStartOllama} onChange={(event) => setAutoStartOllama(event.target.checked)} />Auto-start Ollama</label></section>
        <section className="settings-card status-card"><span>Runtime</span><div className="status-grid"><SignalCard label="Platform" value={status.platform} tone="good" /><SignalCard label="Arch" value={status.arch} /><SignalCard label="Speech" value={status.speechOutput} /><SignalCard label="Tray" value={status.trayEnabled ? "enabled" : "off"} tone={status.trayEnabled ? "good" : "warn"} /></div></section>
        <section className="settings-card reset-card"><span>Reset</span><small>Clears local chat, memories, settings, routines, and saved preferences.</small><button type="button" title="Reset all local app data" onClick={() => chat.resetAll()}>Clear all local data</button></section>
      </div>
    </section>
  );
}
