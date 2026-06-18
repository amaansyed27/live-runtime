import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SettingsResetInjector } from "./components/SettingsResetInjector";
import "./styles.css";
import "./scrollbars.css";
import "./skills.css";
import "./voice-settings.css";
import "./alpha-polish.css";
import "./components/companion-window.css";
import "./components/companion-final-polish.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <SettingsResetInjector />
  </React.StrictMode>
);
