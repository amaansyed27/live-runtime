import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getBrowserVoiceOptions, type BrowserVoiceOption, type VoiceSettings } from "@live-runtime/core";
import { UiBrand } from "./components/UiBrand";
import { ChatPage } from "./pages/ChatPage";
import { ControlPage } from "./pages/ControlPage";
import { AutomationView, type AutomationItem } from "./pages/AutomationView";
import { SettingsView } from "./pages/SettingsView";
import { SkillsView, defaultSkills, type SkillItem } from "./pages/SkillsView";
import { IntelView } from "./views/IntelView";
import { CompanionWindow } from "./windows/CompanionWindow";
import { getRuntimeStatus, hideCompanion, hideToTray, readVoiceSettings, showCompanion, writeVoiceSettings } from "./lib/tauriBridge";
import { useRuntimeChat } from "./hooks/useRuntimeChat";

const COMPANION_ENABLED_KEY = "live-runtime.companion.enabled";
const THEME_KEY = "live-runtime.theme";
const START_LOGIN_KEY = "live-runtime.start-login";
const AUTO_OLLAMA_KEY = "live-runtime.auto-ollama";
const AUTOMATIONS_KEY = "live-runtime.automations";
const SKILLS_KEY = "live-runtime.skills";
const SEARCH_PROVIDER_KEY = "live-runtime.search.provider";

type Page = "chat" | "settings" | "automation" | "skills" | "intelligence" | "control";
type ThemeMode = "system" | "light" | "dark";

export function App() {
  const chat = useRuntimeChat();
  const [status, setStatus] = useState({ platform: "loading", arch: "-", speechOutput: "-", trayEnabled: false });
  const [windowLabel, setWindowLabel] = useState(() => readWindowLabel());
  const [page, setPage] = useState<Page>("chat");
  const [shortcut, setShortcut] = useState(() => window.localStorage.getItem("live-runtime.shortcut") ?? "Ctrl+Shift+Space");
  const [companionEnabled, setCompanionEnabled] = useState(() => window.localStorage.getItem(COMPANION_ENABLED_KEY) === "true");
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [startAtLogin, setStartAtLogin] = useState(() => window.localStorage.getItem(START_LOGIN_KEY) === "true");
  const [autoStartOllama, setAutoStartOllama] = useState(() => window.localStorage.getItem(AUTO_OLLAMA_KEY) === "true");
  const [automations, setAutomations] = useState<AutomationItem[]>(() => readAutomations());
  const [skills, setSkills] = useState<SkillItem[]>(() => readSkills());
  const [searchProvider, setSearchProvider] = useState(() => window.localStorage.getItem(SEARCH_PROVIDER_KEY) ?? "https://searx.be");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => readVoiceSettings());
  const [browserVoices, setBrowserVoices] = useState<BrowserVoiceOption[]>([]);
  const [automationDraft, setAutomationDraft] = useState({ title: "", prompt: "", schedule: "" });

  useEffect(() => {
    void getRuntimeStatus().then(setStatus);
    setWindowLabel(readWindowLabel());
  }, []);

  useEffect(() => { window.localStorage.setItem("live-runtime.shortcut", shortcut); }, [shortcut]);
  useEffect(() => { window.localStorage.setItem(COMPANION_ENABLED_KEY, String(companionEnabled)); if (windowLabel === "main") void (companionEnabled ? showCompanion() : hideCompanion()); }, [companionEnabled, windowLabel]);
  useEffect(() => { document.documentElement.dataset.theme = theme; window.localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.windowLabel = windowLabel; }, [windowLabel]);
  useEffect(() => { window.localStorage.setItem(START_LOGIN_KEY, String(startAtLogin)); }, [startAtLogin]);
  useEffect(() => { window.localStorage.setItem(AUTO_OLLAMA_KEY, String(autoStartOllama)); }, [autoStartOllama]);
  useEffect(() => { window.localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(automations)); }, [automations]);
  useEffect(() => { window.localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)); }, [skills]);
  useEffect(() => { window.localStorage.setItem(SEARCH_PROVIDER_KEY, searchProvider); }, [searchProvider]);
  useEffect(() => { writeVoiceSettings(voiceSettings); }, [voiceSettings]);

  useEffect(() => {
    const loadVoices = () => setBrowserVoices(getBrowserVoiceOptions());
    loadVoices();
    const timer = window.setTimeout(loadVoices, 300);
    if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.clearTimeout(timer);
      if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  if (windowLabel === "companion") {
    return <CompanionWindow chat={chat} />;
  }

  return (
    <main className="desktop-frame">
      <header className="custom-titlebar" data-tauri-drag-region>
        <UiBrand label="Live Runtime" />
        <div className="titlebar-actions">
          <button type="button" title="Minimize" onClick={() => void getCurrentWindow().minimize()}>—</button>
          <button type="button" title="Hide to tray" onClick={() => void hideToTray()}>×</button>
        </div>
      </header>
      <section className="app-body">
        <nav className="page-rail page-rail-six" aria-label="Main sections">
          <button className={page === "chat" ? "active" : ""} type="button" title="Chat" onClick={() => setPage("chat")}>Chat</button>
          <button className={page === "settings" ? "active" : ""} type="button" title="Settings" onClick={() => setPage("settings")}>Settings</button>
          <button className={page === "automation" ? "active" : ""} type="button" title="Scheduled prompts" onClick={() => setPage("automation")}>Routines</button>
          <button className={page === "skills" ? "active" : ""} type="button" title="Learned capabilities" onClick={() => setPage("skills")}>Skills</button>
          <button className={page === "intelligence" ? "active" : ""} type="button" title="Personal memory engine" onClick={() => setPage("intelligence")}>Intelligence</button>
          <button className={page === "control" ? "active" : ""} type="button" title="Computer control" onClick={() => setPage("control")}>Control</button>
        </nav>
        {page === "chat" && <ChatPage chat={chat} />}
        {page === "settings" && <SettingsView chat={chat} status={status} shortcut={shortcut} setShortcut={setShortcut} companionEnabled={companionEnabled} setCompanionEnabled={setCompanionEnabled} theme={theme} setTheme={setTheme} startAtLogin={startAtLogin} setStartAtLogin={setStartAtLogin} autoStartOllama={autoStartOllama} setAutoStartOllama={setAutoStartOllama} voiceSettings={voiceSettings} setVoiceSettings={setVoiceSettings} browserVoices={browserVoices} />}
        {page === "automation" && <AutomationView automations={automations} setAutomations={setAutomations} draft={automationDraft} setDraft={setAutomationDraft} />}
        {page === "skills" && <SkillsView skills={skills} setSkills={setSkills} searchProvider={searchProvider} setSearchProvider={setSearchProvider} />}
        {page === "intelligence" && <IntelView baseUrl={chat.baseUrl} />}
        {page === "control" && <ControlPage />}
      </section>
    </main>
  );
}

function readWindowLabel() {
  try { return getCurrentWindow().label; } catch { return "main"; }
}

function readTheme(): ThemeMode { const stored = window.localStorage.getItem(THEME_KEY); return stored === "dark" || stored === "light" || stored === "system" ? stored : "system"; }
function readAutomations(): AutomationItem[] { try { const raw = window.localStorage.getItem(AUTOMATIONS_KEY); if (!raw) return []; const parsed = JSON.parse(raw) as AutomationItem[]; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function readSkills(): SkillItem[] { try { const raw = window.localStorage.getItem(SKILLS_KEY); if (!raw) return defaultSkills; const parsed = JSON.parse(raw) as SkillItem[]; return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultSkills; } catch { return defaultSkills; } }
